"""Workshop links extracted from the exact Figma frame; no website/API fetches."""
import json
import zlib
from pathlib import Path
from urllib.parse import urlsplit

DATA = json.loads(Path(__file__).with_name('workshop.json').read_text())

def widget_html():
    # Keep titles + destinations in the offline widget; full source notes stay in the JSON.
    groups = [[g['name'], [[i['title'],i['url']] for i in g['items']]] for g in DATA['groups']]
    payload = json.dumps(groups,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    source = DATA['source']
    html = TEMPLATE.replace('__DATA__',payload).replace('__FIGMA__',source)
    raw=html.encode()
    if len(raw)>32768 or len(zlib.compress(raw,9))>4096:
        raise ValueError('Workshop widget exceeds Telegram limits')
    return html

def fallback(section=0, page=0):
    section=max(0,min(section,len(DATA['groups'])-1))
    group=DATA['groups'][section];size=5
    page=max(0,min(page,(len(group['items'])-1)//size))
    rows=[[{'text':i['title'],'url':i['url']}] for i in group['items'][page*size:(page+1)*size]]
    rows.insert(0,[{'text':label,'callback_data':'workshop:'+str(i)+':0'} for i,label in enumerate(['Рефы','Код','Инструменты'])])
    nav=[]
    if page:nav.append({'text':'←','callback_data':f'workshop:{section}:{page-1}'})
    if (page+1)*size<len(group['items']):nav.append({'text':'→','callback_data':f'workshop:{section}:{page+1}'})
    if nav:rows.append(nav)
    return 'Материалы с воркшопа\n'+group['name']+' · '+str(page+1)+'/'+str((len(group['items'])+size-1)//size),rows

TEMPLATE = r"""<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
body{margin:0;padding:16px;color:var(--tg-theme-text-color,#eeefeb);background:var(--tg-theme-bg-color,#191a1b);font-family:system-ui,sans-serif}
h1{font-size:22px;line-height:28px;font-weight:500;margin:0 0 16px}
nav{display:flex;gap:4px;margin-bottom:12px}
button{font:inherit;color:inherit;border:0;border-radius:8px;padding:8px;background:var(--tg-theme-secondary-bg-color,#252729)}
nav button{font-size:13px;line-height:20px;flex:1}
button[aria-pressed=true]{background:var(--tg-theme-button-color,#454749);color:var(--tg-theme-button-text-color,#eeefeb)}
#list{list-style:none;margin:0;padding:0;border:1px solid var(--tg-theme-section-separator-color,#3d4041);border-radius:12px;overflow:hidden}
#list a{display:block;padding:8px 12px;color:inherit;text-decoration:none;border-bottom:1px solid var(--tg-theme-section-separator-color,#3d4041)}
#list li:last-child a{border:0}strong{display:block;font-size:16px;line-height:20px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
small{display:block;font-size:12px;line-height:16px;color:var(--tg-theme-hint-color,#a6a8a2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
footer{display:flex;align-items:center;justify-content:space-between;margin-top:12px;gap:8px}
#count{font-size:12px;color:var(--tg-theme-hint-color,#a6a8a2)}
footer button{min-width:44px}a.source{display:block;font-size:13px;line-height:20px;margin-top:12px;color:var(--tg-theme-link-color,#a6a8a2)}
</style></head><body><h1>Материалы<br>с воркшопа</h1>
<nav aria-label="Разделы"><button id="t0" onclick="tab(0)">Рефы</button><button id="t1" onclick="tab(1)">Код</button><button id="t2" onclick="tab(2)">Инструменты</button></nav>
<ul id="list"></ul><footer><button id="prev" aria-label="Предыдущая страница" onclick="move(-1)">←</button><span id="count" aria-live="polite"></span><button id="next" aria-label="Следующая страница" onclick="move(1)">→</button></footer>
<a class="source" href="__FIGMA__">Все материалы в Figma ↗</a>
<script>
const groups=__DATA__;let section=0,page=0;const size=4;
function draw(){const rows=groups[section][1],pages=Math.ceil(rows.length/size);for(let i=0;i<3;i++)document.getElementById('t'+i).setAttribute('aria-pressed',String(i===section));
const list=document.getElementById('list');while(list.firstChild)list.removeChild(list.firstChild);
rows.slice(page*size,(page+1)*size).forEach(function(row){const a=document.createElement('a');a.setAttribute('href',row[1]);const title=document.createElement('strong');title.textContent=row[0];const domain=document.createElement('small');domain.textContent=row[1].replace('https://','').replace(/\/$/,'');a.appendChild(title);a.appendChild(domain);const li=document.createElement('li');li.appendChild(a);list.appendChild(li)});
document.getElementById('count').textContent=(page+1)+' / '+pages+' · '+rows.length+' ссылок';document.getElementById('prev').disabled=page===0;document.getElementById('next').disabled=page===pages-1}
function tab(value){section=value;page=0;draw()}function move(delta){page=Math.max(0,Math.min(page+delta,Math.ceil(groups[section][1].length/size)-1));draw()}
draw();if(typeof TelegramWidget!=='undefined')TelegramWidget.ready();
</script></body></html>"""
