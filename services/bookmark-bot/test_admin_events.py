import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import test_bot
from admin_events import AdminEvents

class AdminEventTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.path=Path(self.tmp.name)/'events.sqlite'
        self.telegram=test_bot.FakeTelegram();self.now=1000
        self.events=AdminEvents(self.path,self.telegram,-100123,3,clock=lambda:self.now)
    def tearDown(self):self.tmp.cleanup()
    def test_one_message_per_user_is_updated_and_owner_is_excluded(self):
        self.events.excluded={42}
        self.events.record('bot.started',test_bot.update('/start',actor=42),{})
        self.assertFalse(self.events.flush())
        update=test_bot.update('/start',actor=99)
        update['message']['from'].update(first_name='Гость',username='guest')
        self.events.record('bot.started',update,{})
        self.events.record('bot.started',update,{})
        self.assertTrue(self.events.flush())
        self.events.record('search.requested',update,{'query':'шрифты','results':3})
        self.assertTrue(self.events.flush());self.assertFalse(self.events.flush())
        self.assertEqual([x[0] for x in self.telegram.calls],['sendMessage','editMessageText'])
        first=self.telegram.calls[0][1];last=self.telegram.calls[1][1]
        self.assertEqual(first['message_thread_id'],3)
        self.assertIn('@guest',last['text']);self.assertIn('ID 99',last['text'])
        self.assertIn('Пользователь запустил бота',last['text']);self.assertIn('шрифты',last['text'])
        self.assertEqual(last['message_id'],1)
    def test_delivery_retry_survives_restart(self):
        self.events.record('bot.started',test_bot.update('/start'),{})
        original=self.telegram.call
        self.telegram.call=lambda *args: (_ for _ in ()).throw(TimeoutError())
        self.assertFalse(self.events.flush())
        self.now+=10;self.telegram.call=original
        restarted=AdminEvents(self.path,self.telegram,-100123,3,clock=lambda:self.now)
        self.assertTrue(restarted.flush())
    def test_no_secret_or_import_token_in_admin_message(self):
        self.events.record('menu.selected',test_bot.update(),{'choice':'save:abcdef123456','token':'secret','file':'private.png'})
        self.events.flush();text=self.telegram.calls[-1][1]['text']
        self.assertIn('Сохранить импорт',text)
        self.assertNotIn('abcdef',text);self.assertNotIn('secret',text);self.assertNotIn('private.png',text)

class ArchiveDeliveryTests(unittest.TestCase):
    setUp=test_bot.BotTests.setUp
    tearDown=test_bot.BotTests.tearDown
    def click(self,action):
        self.bot.handle({'update_id':10,'callback_query':{'id':'cb','from':{'id':99},'data':action,
            'message':{'message_id':4,'chat':{'id':99,'type':'private'}}}})
    def test_main_menu_opens_links_and_sends_zip_directly(self):
        self.bot.workshop_zip_path=Path(__file__).with_name('Animation Player.zip')
        self.bot.handle(test_bot.update('Ссылки',actor=99))
        self.assertEqual(self.telegram.messages[-1][2][0][0]['url'],'https://links.mosolov.dev/?collection=workshop')
        with patch.object(self.telegram,'send_file',create=True) as send:
            self.bot.handle(test_bot.update('Плеер анимации',actor=99))
            send.assert_called_once_with(99,self.bot.workshop_zip_path)
    def test_materials_menu_lists_presentation_and_real_archive(self):
        self.bot.workshop_zip_path=Path(__file__).with_name('Animation Player.zip')
        self.click('workshop')
        labels=[r[0]['text'] for r in self.telegram.messages[-1][2]]
        self.assertEqual(labels,['Ссылки с презентации','Плеер анимации'])
    def test_zip_is_sent_only_after_selection(self):
        self.bot.workshop_zip_path=Path(__file__).with_name('Animation Player.zip')
        with patch.object(self.telegram,'send_file',create=True) as send:
            self.click('workshop');send.assert_not_called()
            self.click('workshop_zip');send.assert_called_once_with(99,self.bot.workshop_zip_path)
    def test_admin_outage_does_not_break_public_search(self):
        class FailedEvents:
            def record(self,*args):raise OSError()
        self.bot.events=FailedEvents()
        self.bot.handle(test_bot.update('font',actor=99))
        self.assertEqual(self.telegram.calls[-1][0],'sendWidget')
    def test_original_zip_hash_matches_packaged_archive(self):
        import hashlib
        data=Path(__file__).with_name('Animation Player.zip').read_bytes()
        self.assertTrue(data.startswith(b'PK'))
        expected=Path(__file__).with_name('archive.sha256').read_text().split()[0]
        self.assertEqual(hashlib.sha256(data).hexdigest(),expected)

if __name__=='__main__':unittest.main()
