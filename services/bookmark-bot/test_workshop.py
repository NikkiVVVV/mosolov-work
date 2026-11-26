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
    def test_materials_opens_scoped_website(self):
        self.click('workshop_links')
        self.assertEqual(self.telegram.messages[-1][2][0][0]['url'],'https://links.mosolov.dev/?collection=meetup')
        self.assertFalse(any(method=='sendWidget' for method,_ in self.telegram.calls))
    def test_fallback_preserves_all_links_across_pages(self):
        for section,g in enumerate(DATA['groups']):
            urls=[]
            for page in range((len(g['items'])+4)//5):
                _,keyboard=fallback(section,page)
                urls += [button['url'] for row in keyboard for button in row if 'url' in button]
            self.assertEqual(urls,[i['url'] for i in g['items']])
    def test_materials_menu_uses_direct_url_and_zip_still_downloads(self):
        self.bot.workshop_zip='telegram-file-id'
        self.click('workshop')
        self.assertEqual(self.telegram.messages[-1][2][0][0]['url'],'https://links.mosolov.dev/?collection=meetup')
        self.click('workshop_zip')
        self.assertEqual(self.telegram.calls[-1],('sendDocument',{'chat_id':99,'document':'telegram-file-id','caption':'Плеер анимации'}))

if __name__=='__main__':unittest.main()
