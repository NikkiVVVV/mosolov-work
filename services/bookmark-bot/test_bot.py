import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from store import Store, canonical_url, record, search
from worker import Bot, Telegram, Vision, MAX_IMAGE

ENTRY={'url':'https://example.com/','title':'Example','ownerNote':'Шрифтовые пары и типографика',
       'noteEN':'Font pairing and typography','tags':['Шрифты','Типографика']}

class FakeTelegram:
    def __init__(self):
        self.messages=[];self.calls=[];self.exports=[]
    def send(self, chat, text, keyboard=None):
        self.messages.append((chat,text,keyboard))
    def call(self, method, payload):
        self.calls.append((method,payload))
        if method in ('sendWidget','sendMessage'):return {'message_id':len(self.calls)}
    def image(self, file_id):
        return b'fake-image','image/png'
    def export(self,chat,items):
        self.exports.append((chat,items))

class FakeVision:
    def extract(self,data,mime):
        return [ENTRY,{**ENTRY,'url':'https://www.example.com/'}]

def update(text=None, photo=None, actor=42, update_id=1):
    msg={'from':{'id':actor},'chat':{'id':actor,'type':'private'},'message_id':3}
    if text is not None:msg['text']=text
    if photo is not None:msg['photo']=photo
    return {'update_id':update_id,'message':msg}

class BotTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.path=Path(self.temp.name)/'state.sqlite'
        self.store=Store(self.path)
        self.telegram=FakeTelegram()
        self.bot=Bot(self.store,self.telegram,[record(ENTRY)],{42},FakeVision())
    def tearDown(self):
        self.temp.cleanup()
    def test_public_user_can_search_but_group_is_ignored(self):
        self.bot.handle(update('font',actor=99))
        self.assertIn('https://example.com',self.telegram.calls[-1][1]['chat_data'])
        self.telegram.messages.clear()
        u=update('font');u['message']['chat']['type']='group';self.bot.handle(u)
        self.assertEqual(self.telegram.messages,[])
    def test_start_menu_and_owner_only_help(self):
        self.bot.handle(update('/start',actor=99))
        self.assertNotIn('/export',self.telegram.messages[-1][1])
        keyboard=self.telegram.messages[-1][2]
        self.assertEqual([b['text'] for r in keyboard['keyboard'] for b in r],['Найти закладки','Материалы с митапа','Плеер анимации','Уютный ТГ'])
        self.bot.handle(update('/start'))
        self.assertIn('/export',self.telegram.messages[-1][1])
    def test_public_cannot_upload_export_or_confirm_even_forged_callback(self):
        token=self.store.preview(42,1,[ENTRY])
        with patch.object(self.telegram,'image',side_effect=AssertionError('must not download')):
            self.bot.handle(update(photo=[{'file_id':'a'}],actor=99))
        self.bot.handle(update('/export',actor=99))
        self.bot.handle({'callback_query':{'id':'c','from':{'id':99},'data':'save:'+token,
            'message':{'message_id':4,'chat':{'id':99,'type':'private'}}}})
        self.assertEqual(self.store.items(),[])
        self.assertEqual(self.telegram.exports,[])
    def test_owner_imports_are_not_exposed_to_public_search(self):
        token=self.store.preview(42,1,[{**ENTRY,'url':'https://draft.example.com','ownerNote':'privatewordxyz','noteEN':'privatewordxyz'}])
        self.store.confirm(token,42,True)
        self.bot.handle(update('privatewordxyz',actor=99))
        self.assertEqual(json.loads(self.telegram.calls[-1][1]['chat_data'])['n'],0)
        self.bot.handle(update('privatewordxyz'))
        self.assertIn('draft.example.com',self.telegram.calls[-1][1]['chat_data'])
    def test_search_limit_is_per_user(self):
        self.assertTrue(self.store.allow_search(99,maximum=1))
        self.assertFalse(self.store.allow_search(99,maximum=1))
        self.assertTrue(self.store.allow_search(42,maximum=1))
    def test_archive_search_without_model_and_payment_synonyms(self):
        self.bot.vision=None;self.bot.handle(update('типографика'))
        self.assertIn('https://example.com',self.telegram.calls[-1][1]['chat_data'])
        payment=record({**ENTRY,'url':'https://pricing.example.com','ownerNote':'Примеры paywall и pricing'})
        self.assertEqual(search('платёжный экран',[payment],[]),[payment])
        self.assertEqual(search('qzxqzxqzx',[payment],[]),[])
    def test_photo_preview_requires_confirmation_then_searches_saved_data(self):
        self.bot.handle(update(photo=[{'file_id':'a','width':600,'height':900}]))
        self.assertEqual(self.store.items(),[])
        keyboard=self.telegram.messages[-1][2]
        token=keyboard[0][0]['callback_data'].split(':')[1]
        self.assertEqual(len(self.store.draft(token,42)),1)
        cb={'callback_query':{'id':'cb','from':{'id':42},'data':'save:'+token,
            'message':{'message_id':4,'chat':{'id':42,'type':'private'}}}}
        self.bot.handle(cb);self.bot.handle(cb)
        self.assertEqual(len(self.store.items()),1)
        self.assertEqual(len(search('font',[],self.store.items())),1)
    def test_other_user_cannot_confirm_draft(self):
        token=self.store.preview(42,1,[ENTRY])
        self.assertEqual(self.store.confirm(token,99,True),0)
        self.assertEqual(self.store.items(),[])
    def test_cancel_and_restart_cursor_persist(self):
        token=self.store.preview(42,1,[ENTRY])
        self.store.confirm(token,42,False);self.store.advance(12);self.store.advance(2)
        reopened=Store(self.path)
        self.assertEqual(reopened.offset(),12)
        self.assertEqual(reopened.items(),[])
        with self.assertRaises(ValueError):reopened.draft(token,42)
    def test_quota_and_invalid_vision_output(self):
        self.store.spend_vision(42,maximum=1)
        with self.assertRaises(ValueError):self.store.spend_vision(42,maximum=1)
        with self.assertRaises(ValueError):self.store.preview(42,1,[])
        with self.assertRaises(ValueError):self.store.preview(42,1,[{**ENTRY,'tags':'bad'}])
    def test_no_vision_or_oversize_never_downloads(self):
        self.bot.vision=None;self.bot.handle(update(photo=[{'file_id':'a'}]))
        self.assertIn('не подключён',self.telegram.messages[-1][1])
        self.bot.vision=FakeVision()
        with patch.object(self.telegram,'image',side_effect=AssertionError('must not download')):
            self.bot.handle(update(photo=[{'file_id':'a','file_size':MAX_IMAGE+1}]))
    def test_export_only_confirmed_records(self):
        self.store.preview(42,1,[ENTRY]);self.bot.handle(update('/export'))
        self.assertEqual(self.telegram.exports,[])
        token=self.store.preview(42,2,[ENTRY]);self.store.confirm(token,42,True)
        self.bot.handle(update('/export'))
        self.assertEqual(len(self.telegram.exports[0][1]),1)
    def test_url_validation_and_canonical_duplicates(self):
        self.assertEqual(canonical_url('https://www.example.com/'),'https://example.com')
        for url in ['http://example.com','https://127.0.0.1','https://[::1]','https://user:pass@example.com',
                    'https://example.com/?token=secret','https://bookmark-search-api-production.up.railway.app']:
            with self.subTest(url=url),self.assertRaises(ValueError):canonical_url(url)
    def test_vision_sends_image_and_rejects_broken_json(self):
        vision=Vision('https://vision.example/v1','private-key','vision-model')
        with patch('worker.request_json',return_value={'choices':[{'message':{'content':json.dumps({'items':[ENTRY]})}}]}) as call:
            self.assertEqual(vision.extract(b'png','image/png'),[ENTRY])
            payload=call.call_args.args[1]
            self.assertEqual(payload['model'],'vision-model')
            self.assertTrue(payload['messages'][0]['content'][1]['image_url']['url'].startswith('data:image/png;base64,'))
        with patch('worker.request_json',return_value={'choices':[{'message':{'content':'not json'}}]}):
            with self.assertRaises(ValueError):vision.extract(b'png','image/png')
    def test_telegram_document_is_json_multipart(self):
        response=io.BytesIO(b'{"ok":true}')
        with patch('worker.urllib.request.urlopen',return_value=response) as call:
            Telegram('test-token').export(42,[record(ENTRY)])
            body=call.call_args.args[0].data
            self.assertIn(b'filename="bookmarks.json"',body)
            self.assertIn(b'"items"',body)

if __name__=='__main__':
    unittest.main()
