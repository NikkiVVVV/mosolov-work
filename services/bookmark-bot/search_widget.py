"""Bounded Telegram state + fixed HTML for reactive archive/workshop search."""
import json
import zlib

PRESETS={'motion':'анимация','fonts':'шрифты','payment':'платёжный экран','ui':'UI компоненты','all':''}

def pack_state(scope, query, results, page=0, group=-1):
    pages=max(1,(len(results)+1)//2)
    page=max(0,min(page,pages-1))
    state={'s':scope,'q':query[:80],'p':page,'n':len(results),'g':group,
           'r':[[str(i.get('title') or i.get('domain') or i['url'])[:60],i['url'],i.get('ownerNote','')[:100]]
                for i in results[page*2:page*2+2]]}
    def encode():return json.dumps(state,ensure_ascii=False,separators=(',',':'))
    for note_size in (100,60,30,0):
        for row in state['r']:row[2]=row[2][:note_size]
        if len(encode().encode())<=1024:return encode()
    state['q']=state['q'][:20]
    for row in state['r']:row[0]=row[0][:20]
    if len(encode().encode())>1024:raise ValueError('Search state exceeds Telegram limit')
    return encode()

def search_html():
    raw=TEMPLATE.encode()
    if len(raw)>32768 or len(zlib.compress(raw,9))>4096:raise ValueError('Search widget exceeds Telegram limit')
    return TEMPLATE

TEMPLATE=r"""<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
body{margin:0;padding:16px;font-family:system-ui,sans-serif;color:var(--tg-theme-text-color,#eeefeb);background:var(--tg-theme-bg-color,#191a1b)}
h1{font-size:22px;line-height:28px;font-weight:500;margin:0 0 12px}
button{font:inherit;color:inherit;background:var(--tg-theme-secondary-bg-color,#252729);border:0;border-radius:8px;padding:8px;cursor:pointer}
#query{width:100%;text-align:left;border-radius:24px;padding:12px 16px;font-size:14px;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#hint{font-size:12px;line-height:16px;color:var(--tg-theme-hint-color,#a6a8a2);margin:8px 0 12px}
#chips{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:12px}
#chips button,#groups button{font-size:12px;line-height:16px}
#groups{display:flex;gap:4px;margin-bottom:12px}
#groups button{flex:1}
[hidden]{display:none!important}
button[aria-pressed=true]{background:var(--tg-theme-button-color,#454749);color:var(--tg-theme-button-text-color,#eeefeb)}
#list{list-style:none;padding:0;margin:0;border:1px solid var(--tg-theme-section-separator-color,#3d4041);border-radius:12px;overflow:hidden}
li{padding:12px;border-bottom:1px solid var(--tg-theme-section-separator-color,#3d4041)}li:last-child{border:0}
a{display:block;text-decoration:none;color:inherit;font-size:16px;line-height:20px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
small{display:block;font-size:12px;line-height:16px;color:var(--tg-theme-hint-color,#a6a8a2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
footer{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:12px}footer button{min-width:44px}
#count,#empty{font-size:12px;line-height:16px;color:var(--tg-theme-hint-color,#a6a8a2)}#empty{margin:12px 0}
</style></head><body>
<h1 id="title">Избранные закладки</h1>
<button id="query" onclick="ask('ask')" aria-label="Изменить поисковый запрос">⌕ Что найти?</button>
<p id="hint" aria-live="polite">Запрос можно отправить сообщением боту</p>
<nav id="chips" aria-label="Быстрый поиск"><button onclick="ask('q:motion')">Анимация</button><button onclick="ask('q:fonts')">Шрифты</button><button onclick="ask('q:payment')">Оплата</button><button onclick="ask('q:ui')">UI-компоненты</button></nav>
<nav id="groups" aria-label="Разделы митапа" hidden><button id="g-1" onclick="ask('g:-1')">Все</button><button id="g0" onclick="ask('g:0')">Рефы</button><button id="g1" onclick="ask('g:1')">Код</button><button id="g2" onclick="ask('g:2')">Инструменты</button></nav>
<ul id="list"></ul><p id="empty" hidden>Ничего не нашёл. Попробуй другое слово или название сайта.</p>
<footer><button id="prev" aria-label="Предыдущие результаты" onclick="ask('page:'+(state.p-1))">←</button><span id="count"></span><button id="next" aria-label="Следующие результаты" onclick="ask('page:'+(state.p+1))">→</button></footer>
<script>
let state={s:'archive',q:'',p:0,n:0,g:-1,r:[]},busy=false;
function readState(value){try{const next=JSON.parse(value||'{}');if(Array.isArray(next.r)){state=next;draw()}}catch(e){document.getElementById('hint').textContent='Не удалось обновить результаты'}}
function draw(){document.getElementById('title').textContent=state.s==='workshop'?'Материалы с митапа':'Избранные закладки';document.getElementById('query').textContent='⌕ '+(state.q||'Что найти?');
document.getElementById('groups').hidden=state.s!=='workshop';document.getElementById('chips').hidden=state.s==='workshop';
for(let i=-1;i<3;i++)document.getElementById('g'+i).setAttribute('aria-pressed',String(state.g===i));
const list=document.getElementById('list');while(list.firstChild)list.removeChild(list.firstChild);
state.r.forEach(function(row){const li=document.createElement('li'),a=document.createElement('a'),note=document.createElement('small');a.textContent=row[0];a.setAttribute('href',row[1]);note.textContent=row[2]||row[1].replace('https://','');li.appendChild(a);li.appendChild(note);list.appendChild(li)});
list.hidden=state.n===0;document.getElementById('empty').hidden=state.n!==0;
document.getElementById('count').textContent=state.n?((state.p*2+1)+'–'+Math.min(state.p*2+2,state.n)+' из '+state.n):'0 результатов';
document.getElementById('prev').disabled=busy||state.p===0;document.getElementById('next').disabled=busy||(state.p+1)*2>=state.n;}
function ask(data){if(busy)return;busy=true;document.getElementById('hint').textContent=data==='ask'?'Напиши запрос в поле сообщения':'Ищу в закладках…';draw();
TelegramWidget.request(data).then(function(answer){busy=false;if(answer.result){try{const reply=JSON.parse(answer.result);if(reply.error){document.getElementById('hint').textContent=reply.error;draw();return}}catch(e){}readState(answer.result)}document.getElementById('hint').textContent=data==='ask'?'Напиши запрос в поле сообщения':'Запрос можно отправить сообщением боту';draw()},function(){busy=false;document.getElementById('hint').textContent='Не удалось обновить. Нажми ещё раз';draw()})}
readState(TelegramWidget.chatData);TelegramWidget.onEvent('chatDataChanged',function(){readState(TelegramWidget.chatData)});TelegramWidget.ready();
</script></body></html>"""
