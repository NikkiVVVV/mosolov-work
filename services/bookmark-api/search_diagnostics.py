"""Opt-in deployment check of provider connectivity. No user data or secrets logged."""
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

def survey_check():
    check=os.environ.get('SURVEY_DIAGNOSTICS','')
    token=os.environ.get('SURVEY_BOT_TOKEN','')
    if not check or not token: return
    path=Path(os.environ.get('RAILWAY_VOLUME_MOUNT_PATH') or os.environ.get('STATE_DIR','data'))
    path.mkdir(parents=True,exist_ok=True)
    marker=path/'survey-delivery-check-20261016'
    try:
        # Claim before sending: restarts/workers must not send the test twice.
        with marker.open('x') as file: file.write('started')
    except FileExistsError: return
    try:
        with urllib.request.urlopen('https://api.telegram.org/bot'+token+'/getMe',timeout=8) as response:
            bot=json.load(response).get('result',{})
        username=bot.get('username','')
        print('Survey diagnostic: bot='+username,flush=True)
        if username.lower()!='mosolov_abmin_bot':
            print('Survey diagnostic: unexpected bot; no message sent',flush=True);return
        body=json.dumps({'chat_id':os.environ['SURVEY_CHAT_ID'],'message_thread_id':int(os.environ['SURVEY_THREAD_ID']),'text':'Закладки · проверка доставки опроса.\nТестовое сообщение, не ответ пользователя.'},ensure_ascii=False).encode()
        request=urllib.request.Request('https://api.telegram.org/bot'+token+'/sendMessage',data=body,headers={'Content-Type':'application/json'})
        with urllib.request.urlopen(request,timeout=8) as response: data=json.load(response)
        result=data.get('result',{})
        print('Survey diagnostic: sent='+str(data.get('ok'))+' message='+str(result.get('message_id'))+' thread='+str(result.get('message_thread_id')),flush=True)
    except urllib.error.HTTPError as error:
        print('Survey diagnostic: HTTP '+str(error.code),flush=True)
    except Exception as error:
        print('Survey diagnostic: '+type(error).__name__,flush=True)

def run():
    survey_check()
    if os.environ.get('SEARCH_DIAGNOSTICS') != 'true': return
    token=os.environ.get('TAVILY_API_KEY','')
    if not token:
        print('Provider diagnostic: Tavily key missing',flush=True);return
    body=json.dumps({'query':'Blender official website','search_depth':'basic','max_results':1,'include_answer':False}).encode()
    request=urllib.request.Request('https://api.tavily.com/search',data=body,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json','User-Agent':'BookmarkSearch/1.0'})
    try:
        with urllib.request.urlopen(request,timeout=8) as response:
            data=json.load(response)
            print('Provider diagnostic: Tavily HTTP '+str(response.status)+' results='+str(len(data.get('results',[]))),flush=True)
    except urllib.error.HTTPError as error:
        print('Provider diagnostic: Tavily HTTP '+str(error.code),flush=True)
    except Exception as error:
        print('Provider diagnostic: Tavily '+type(error).__name__,flush=True)
