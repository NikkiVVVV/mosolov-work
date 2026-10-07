"""Read-only public WSGI API. No static files, reviews, secret files or arbitrary URLs."""
import ipaddress
import json
import os
from http import HTTPStatus
from pathlib import Path
from ai_search import SearchEngine, SearchError, eligible
from query_notifications import QueryNotifications


def create_app(items, engine, *, origins, hosts, enabled=False, railway_proxy=False, notifier=None):
    public_items = [x for x in items if eligible(x)]

    def app(environ, start_response):
        origin = environ.get('HTTP_ORIGIN', '')
        allowed_origin = origin in origins

        def send(status, data, retry=0):
            body = b'' if status == 204 else json.dumps(data, ensure_ascii=False).encode()
            headers = [('Content-Type','application/json; charset=utf-8'),
                       ('Content-Length',str(len(body))), ('Cache-Control','no-store'),
                       ('X-Content-Type-Options','nosniff'), ('Vary','Origin')]
            if allowed_origin:
                headers += [('Access-Control-Allow-Origin',origin),
                            ('Access-Control-Allow-Methods','POST, GET, OPTIONS'),
                            ('Access-Control-Allow-Headers','Content-Type')]
            if retry:
                headers.append(('Retry-After',str(retry)))
            start_response(f'{status} {HTTPStatus(status).phrase}', headers)
            return [body]

        method, path = environ.get('REQUEST_METHOD'), environ.get('PATH_INFO')
        host = environ.get('HTTP_HOST', '')
        if host not in hosts and not (host == 'healthcheck.railway.app' and path == '/api/health' and method == 'GET'):
            return send(403, {'error':'Неизвестный хост.'})
        if path == '/api/health' and method == 'GET':
            return send(200, {'ok':True,'aiSearch':enabled,'items':len(public_items),'queryNotifications':notifier is not None})
        if path not in {'/api/search', '/api/query-event'}:
            return send(404, {'error':'not found'})
        if not allowed_origin:
            return send(403, {'error':'Этот сайт не подключён к поиску.'})
        if method == 'OPTIONS':
            if environ.get('HTTP_ACCESS_CONTROL_REQUEST_METHOD') != 'POST':
                return send(405, {'error':'method not allowed'})
            return send(204, {})
        if method != 'POST':
            return send(405, {'error':'method not allowed'})
        if path == '/api/search' and not enabled:
            return send(503, {'error':'AI-поиск пока не включён.','code':'disabled'})
        if environ.get('CONTENT_TYPE','').split(';')[0] != 'application/json':
            return send(415, {'error':'Нужен JSON-запрос.'})
        try:
            length = int(environ.get('CONTENT_LENGTH','0'))
            if not 0 < length <= 8192 or environ.get('HTTP_TRANSFER_ENCODING'):
                raise ValueError()
            raw = environ['wsgi.input'].read(length)
            if len(raw) != length:
                raise ValueError()
            payload = json.loads(raw)
            # Railway documents X-Real-IP as edge-provided. Never trust X-Forwarded-For.
            # Enable only on Railway HTTP ingress, never on an exposed direct TCP port.
            client = environ.get('HTTP_X_REAL_IP','') if railway_proxy else environ.get('REMOTE_ADDR','')
            client = str(ipaddress.ip_address(client))
        except (ValueError, OSError):
            return send(400, {'error':'Некорректный запрос.'})
        try:
            if path == '/api/query-event':
                if notifier is None:
                    return send(503, {'code':'disabled'})
                code, result = notifier.notify(payload, client, len(public_items))
                return send(code, {'status':result}, 60 if code == 429 else 0)
            return send(200, engine.search(payload, public_items, client))
        except SearchError as error:
            print(f'AI search: {error.code} (HTTP {error.status})', flush=True)
            return send(error.status, {'error':str(error),'code':error.code,'retryAfter':error.retry}, error.retry)
        except Exception:
            # Do not serialize exception bodies, prompts, upstream headers or secrets.
            print('AI search: internal_error', flush=True)
            return send(500, {'error':'Ошибка поиска. Попробуй позже.','code':'server_error'})

    return app


def from_environment():
    on_railway = bool(os.environ.get('RAILWAY_ENVIRONMENT_ID'))
    mount = os.environ.get('RAILWAY_VOLUME_MOUNT_PATH')
    if on_railway and not mount:
        raise RuntimeError('Attach a persistent Railway volume for request limits before starting.')
    state_dir = Path(mount or os.environ.get('STATE_DIR','data'))
    items = json.loads(Path(os.environ.get('CATALOG_FILE','bookmarks.json')).read_text())['items']
    origins = {x.strip() for x in os.environ.get('ALLOWED_ORIGINS','https://mosolov.work').split(',') if x.strip()}
    hosts = {x.strip() for x in os.environ.get('ALLOWED_HOSTS','').split(',') if x.strip()}
    railway_domain = os.environ.get('RAILWAY_PUBLIC_DOMAIN')
    if railway_domain:
        hosts.add(railway_domain)
    if not hosts:
        raise RuntimeError('Set ALLOWED_HOSTS or generate a Railway public domain.')
    if '*' in origins or '*' in hosts:
        raise RuntimeError('Wildcard origins/hosts are not allowed.')
    enabled = os.environ.get('AI_ENABLED') == 'true' and bool(os.environ.get('SILICONFLOW_API_KEY'))
    token = os.environ.get('BOOKMARK_TELEGRAM_BOT_TOKEN', '')
    chat_id = os.environ.get('BOOKMARK_TELEGRAM_CHAT_ID', '')
    notifier = None
    if os.environ.get('NOTIFICATIONS_ENABLED') == 'true':
        if not token or not chat_id.isdigit() or int(chat_id) <= 0:
            raise RuntimeError('Notifications need a bot token and a private chat ID.')
        notifier = QueryNotifications(state_dir/'query-notifications.sqlite', token, chat_id)
    return create_app(items, SearchEngine(state_dir/'search-limits.sqlite', token_day=250_000), origins=origins,
                      hosts=hosts, enabled=enabled, railway_proxy=on_railway, notifier=notifier)
