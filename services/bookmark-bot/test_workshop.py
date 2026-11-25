import unittest
import zlib
from urllib.parse import urlsplit
from workshop import DATA,widget_html,fallback
from worker import TelegramAPIError
import test_bot

class WorkshopTests(unittest.TestCase):
    setUp=test_bot.BotTests.setUp
    tearDown=test_bot.BotTests.tearDown
    def test_widget_has_all_exact_destinations_and_fits_limits(self):
        html=widget_html()
        self.assertEqual([len(g['items']) for g in DATA['groups']],[22,31,13])
        self.assertLessEqual(len(html.encode()),32768)
        self.assertLessEqual(len(zlib.compress(html.encode(),9)),4096)
        for group in DATA['groups']:
            for item in group['items']:
                self.assertIn(item['url'],html)
                self.assertLessEqual(len(item['url']),256)
                self.assertEqual(urlsplit(item['url']).scheme,'https')
        self.assertNotIn('fetch(',html)
        self.assertNotIn('https://bookmark-search-api',html)
    def click(self,data):
        self.bot.handle({'callback_query':{'id':'cb','from':{'id':99},'data':data,
            'message':{'message_id':4,'chat':{'id':99,'type':'private'}}}})
    def test_materials_opens_widget_for_public_user(self):
        self.click('workshop_links')
        self.assertEqual(self.telegram.calls[-1][0],'sendWidget')
        buttons=self.telegram.calls[-1][1]['reply_markup']['inline_keyboard']
        self.assertEqual(buttons[0][0]['text'],'Открыть в Figma')
        self.assertFalse(any(b.get('callback_data')=='workshop_zip' for row in buttons for b in row))
    def test_fallback_preserves_all_links_across_pages(self):
        for section,g in enumerate(DATA['groups']):
            urls=[]
            for page in range((len(g['items'])+4)//5):
                _,keyboard=fallback(section,page)
                urls += [button['url'] for row in keyboard for button in row if 'url' in button]
            self.assertEqual(urls,[i['url'] for i in g['items']])
    def test_unsupported_api_falls_back_without_broken_message(self):
        original=self.telegram.call
        def fail(method,payload):
            if method=='sendWidget':raise TelegramAPIError(404)
            return original(method,payload)
        self.telegram.call=fail
        self.click('workshop_links')
        self.assertIn('Материалы с воркшопа',self.telegram.messages[-1][1])
    def test_zip_button_is_enabled_only_when_file_is_connected(self):
        self.bot.workshop_zip='telegram-file-id'
        self.click('workshop_links')
        self.assertEqual(self.telegram.calls[-1][1]['reply_markup']['inline_keyboard'][-1][0]['text'],'Интерфейс для работы с анимацией')
        self.click('workshop_zip')
        self.assertEqual(self.telegram.calls[-1],('sendDocument',{'chat_id':99,'document':'telegram-file-id','caption':'Интерфейс для работы с анимацией'}))
    def test_timeout_does_not_create_duplicate_fallback(self):
        original=self.telegram.call
        def fail(method,payload):
            if method=='sendWidget':raise TimeoutError()
            return original(method,payload)
        self.telegram.call=fail
        with self.assertRaises(TimeoutError):self.click('workshop_links')
        self.assertEqual(self.telegram.messages,[])

if __name__=='__main__':unittest.main()
