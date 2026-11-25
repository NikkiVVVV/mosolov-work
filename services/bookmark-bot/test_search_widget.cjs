// Test the real widget script in an offline DOM model; no browser or network.
const assert=require('node:assert/strict'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const html=execFileSync('python3',['-c','from search_widget import search_html; print(search_html())'],{cwd:__dirname,encoding:'utf8'});
class Element{
 constructor(){this.children=[];this.attributes={};this.textContent='';this.hidden=false;this.disabled=false;}
 get firstChild(){return this.children[0]||null}
 appendChild(child){this.children.push(child)}
 removeChild(child){this.children.splice(this.children.indexOf(child),1)}
 setAttribute(key,value){this.attributes[key]=value}
}
const elements=Object.fromEntries(['title','query','hint','groups','chips','g-1','g0','g1','g2','list','empty','prev','next','count'].map(id=>[id,new Element()]));
const initial={s:'archive',q:'',p:0,n:3,g:-1,r:[['One','https://one.example','First'],['Two','https://two.example','Second']]};
const events={},requests=[];let answer={s:'archive',q:'шрифты',p:0,n:1,g:-1,r:[['Font','https://font.example','Font pairing']]},reject=false;
const api={chatData:JSON.stringify(initial),ready(){},onEvent:(name,cb)=>events[name]=cb,
 request(data){requests.push(data);return reject?Promise.reject(Error()):Promise.resolve({result:JSON.stringify(answer)})}};
const context={document:{getElementById:id=>elements[id],createElement:()=>new Element()},TelegramWidget:api};
vm.createContext(context);vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
(async()=>{
 assert.equal(elements.list.children.length,2);assert.equal(elements.prev.disabled,true);assert.equal(elements.next.disabled,false);
 context.ask('q:fonts');await new Promise(setImmediate);
 assert.equal(requests[0],'q:fonts');assert.equal(elements.list.children[0].children[0].textContent,'Font');
 assert.ok(elements.query.textContent.includes('шрифты'));assert.equal(elements.next.disabled,true);
 api.chatData=JSON.stringify({s:'workshop',q:'zzzzz',p:0,n:0,g:1,r:[]});events.chatDataChanged();
 assert.equal(elements.empty.hidden,false);assert.equal(elements.list.hidden,true);assert.equal(elements.groups.hidden,false);
 answer={error:'Попробуй через минуту'};context.ask('q:fonts');await new Promise(setImmediate);
 assert.equal(elements.hint.textContent,'Попробуй через минуту');
 reject=true;context.ask('q:payment');await new Promise(setImmediate);
 assert.ok(elements.hint.textContent.includes('Нажми ещё раз'));
 assert.equal(elements.prev.disabled,true);
 console.log('Reactive widget: request, in-place data change, scope, empty, error and retry verified offline');
})().catch(error=>{console.error(error);process.exitCode=1});
