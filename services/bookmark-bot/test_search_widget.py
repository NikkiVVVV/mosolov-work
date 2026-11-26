import json
import unittest
import zlib
import test_bot
from search_widget import pack_state,search_html
from store import Store
from worker import TelegramAPIError

class SearchWidgetTests(unittest.TestCase):
    setUp=test_bot.BotTests.setUp
    tearDown=test_bot.BotTests.tearDown
    def callback(self,action,actor=99):
        self.bot.handle({'callback_query':{'id':'cb','from':{'id':actor},'data':action,
            'message':{'message_id':7,'chat':{'id':actor,'type':'private'}}}})
    def request(self,data,actor=99,message=None):
        message=message if message is not None else self.store.widget(actor)[0]
        self.bot.handle({'widget_query':{'id':'wq','from':{'id':actor},'chat':{'id':actor,'type':'private'},
                        'message_id':message,'data':data,'type':{'type':'data'}}})
    def test_search_button_opens_reactive_not_static_card(self):
        self.bot.open_search(99)
        call=self.telegram.calls[-1]
        self.assertEqual(call[0],'sendWidget')
        self.assertTrue(call[1]['allow_queries'])
        self.assertEqual(json.loads(call[1]['chat_data'])['n'],1)
    def test_typed_query_edits_same_message_without_result_spam(self):
        self.bot.open_search(99);message=self.store.widget(99)[0]
        self.bot.handle(test_bot.update('font',actor=99))
        method,payload=self.telegram.calls[-1]
        self.assertEqual(method,'editMessageWidgetData')
        self.assertEqual(payload['message_id'],message)
        self.assertEqual(json.loads(payload['chat_data'])['q'],'font')
        self.assertEqual(self.telegram.messages,[])
    def test_preset_and_empty_state(self):
        self.bot.open_search(99);self.request('q:fonts')
        self.assertEqual(json.loads(self.telegram.calls[-1][1]['chat_data'])['n'],1)
        self.request('q:payment')
        self.assertEqual(json.loads(self.telegram.calls[-1][1]['chat_data'])['n'],0)
    def test_workshop_group_paging_and_search_stay_in_scope(self):
        self.bot.open_search(99,'workshop')
        self.assertEqual(json.loads(self.telegram.calls[-1][1]['chat_data'])['n'],66)
        self.request('g:2')
        self.assertEqual(json.loads(self.telegram.calls[-1][1]['chat_data'])['n'],13)
        self.request('page:999')
        self.assertEqual(json.loads(self.telegram.calls[-1][1]['chat_data'])['p'],6)
        self.bot.handle(test_bot.update('Spline',actor=99))
        packed=json.loads(self.telegram.calls[-1][1]['chat_data'])
        self.assertEqual(packed['s'],'workshop');self.assertEqual(packed['n'],1)
        self.assertEqual(packed['r'][0][0],'Spline')
    def test_ask_uses_native_chat_keyboard(self):
        self.bot.open_search(99);self.request('ask')
        method,payload=self.telegram.calls[-1]
        self.assertEqual(method,'sendMessage')
        self.assertTrue(payload['reply_markup']['force_reply'])
    def test_cannot_edit_another_users_widget(self):
        self.bot.open_search(42);message=self.store.widget(42)[0]
        self.request('q:fonts',actor=99,message=message)
        self.assertEqual(self.telegram.calls[-1][0],'answerWidgetQuery')
        self.assertIn('error',json.loads(self.telegram.calls[-1][1]['data']))
        self.assertIsNone(self.store.widget(99))
    def test_widget_context_survives_restart(self):
        self.bot.open_search(99,'workshop')
        message=self.store.widget(99)[0]
        self.assertEqual(Store(self.path).widget(99,message)[1]['scope'],'workshop')
    def test_data_and_html_fit_telegram_limits_even_with_long_unicode(self):
        html=search_html().encode()
        self.assertLessEqual(len(html),32768)
        self.assertLessEqual(len(zlib.compress(html,9)),4096)
        item={'url':'https://example.com/'+'x'*230,'title':'Ж'*60,'ownerNote':'😀'*100}
        payload=pack_state('archive','😀'*80,[item,item])
        self.assertLessEqual(len(payload.encode()),1024)
        self.assertEqual(len(json.loads(payload)['r']),2)
        self.assertNotIn('<input',html.decode())
    def test_api_without_widget_keeps_plain_search(self):
        original=self.telegram.call
        def fail(method,payload):
            if method=='sendWidget':raise TelegramAPIError(404)
            return original(method,payload)
        self.telegram.call=fail
        self.bot.handle(test_bot.update('font',actor=99))
        self.assertIn('example.com',self.telegram.messages[-1][1])

if __name__=='__main__':unittest.main()

class PersistentMenuTests(unittest.TestCase):
    setUp=test_bot.BotTests.setUp
    tearDown=test_bot.BotTests.tearDown
    def test_menu_is_persistent_and_buttons_are_actions(self):
        from worker import PERSISTENT_MENU
        self.assertTrue(PERSISTENT_MENU['is_persistent'])
        self.assertFalse(PERSISTENT_MENU['one_time_keyboard'])
        self.bot.handle(test_bot.update('Найти закладки',actor=99))
        self.assertIn('Введи тему',self.telegram.messages[-1][1])
        self.bot.handle(test_bot.update('Уютный ТГ',actor=99))
        self.assertEqual(self.telegram.messages[-1][2][0][0]['url'],'https://t.me/nikir_public')
