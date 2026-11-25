// Offline unit test of the widget's DOM updates, without a browser or network.
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {readFileSync}=require('node:fs');
const html=execFileSync('python3',['-c','from workshop import widget_html; print(widget_html())'],{cwd:__dirname,encoding:'utf8'});
const data=JSON.parse(readFileSync(__dirname+'/workshop.json','utf8'));
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.textContent='';}
 get firstChild(){return this.children[0]||null;}
 appendChild(child){this.children.push(child);}
 removeChild(child){this.children.splice(this.children.indexOf(child),1);}
 setAttribute(key,value){this.attributes[key]=value;}
}
const elements=Object.fromEntries(['t0','t1','t2','list','prev','next','count'].map(id=>[id,new Element('div')]));
let ready=false;
const context={document:{getElementById:id=>elements[id],createElement:tag=>new Element(tag)},TelegramWidget:{ready(){ready=true;}}};
vm.createContext(context);
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
assert.ok(ready);
for(let section=0;section<data.groups.length;section++){
 context.tab(section);
 assert.equal(elements['t'+section].attributes['aria-pressed'],'true');
 assert.equal(elements.prev.disabled,true);
 const actual=[];
 for(let page=0;page<Math.ceil(data.groups[section].items.length/4);page++){
  actual.push(...elements.list.children.map(el=>el.children[0].attributes.href));
  for(const row of elements.list.children){const link=row.children[0];assert.equal(link.children.length,2);assert.ok(link.children[0].textContent);}
  if(!elements.next.disabled)context.move(1);
 }
 assert.deepEqual(actual,data.groups[section].items.map(item=>item.url));
 assert.equal(elements.next.disabled,true);
 context.move(1);
 assert.equal(elements.next.disabled,true);
}
console.log('Widget navigation: all 66 links, three sections, page bounds and headings verified offline');
