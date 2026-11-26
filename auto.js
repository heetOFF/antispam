(()=>{
if(document.getElementById('vk-auto-panel'))return;
const panel=document.createElement('div');panel.id='vk-auto-panel';Object.assign(panel.style,{position:'fixed',left:'8px',bottom:'8px',right:'auto',top:'auto',boxSizing:'border-box',width:'min(300px, calc(100vw - 16px))',maxHeight:'55vh',overflowY:'auto',background:'#171b23',color:'#fff',zIndex:2147483647,padding:'14px',border:'1px solid #657086',borderRadius:'12px',font:'14px Arial',boxShadow:'0 4px 20px #0008'});const root=panel.attachShadow({mode:'open'});root.innerHTML='<style>:host([data-compact]) #settings,:host([data-compact]) #start,:host([data-compact]) #progress,:host([data-compact]) #log{display:none}#hover-note{margin:4px 0}button{padding:9px;margin:4px;background:#2879dd;color:white;border:0;border-radius:6px;cursor:pointer} pre{white-space:pre-wrap;max-height:250px;overflow:auto} </style><b>AntiSpam 0.8.5</b><p id="hover-note" hidden>Если меню закрыто, задержи курсор над ⋯.</p><fieldset id="settings"><legend>Что проверить</legend><label><input id="spamRule" type="checkbox" checked> Рекламный спам</label><br><label><input id="oldRule" type="checkbox" checked> Без сообщений больше</label> <input aria-label="Срок в сутках" id="days" type="number" min="1" max="36500" value="30" style="width:65px"> суток<fieldset><legend>Типы диалогов</legend><label><input type="checkbox" data-kind="user" checked> ЛС</label><br><label><input type="checkbox" data-kind="chat" checked> Беседы</label><br><label><input type="checkbox" data-kind="group" checked> Сообщества</label><br><label><input type="checkbox" data-kind="bot" checked> Боты с меткой ВК</label><br></fieldset></fieldset><button id="start">Проверить диалоги</button><p id="progress"></p><button id="finish" hidden>Завершить поиск и показать найденные</button><button id="apply" hidden>Подтвердить очистку</button><button id="stop">Стоп</button><button id="close">Закрыть</button><button id="copyReport">Скопировать отчёт</button><button id="saveReport">Скачать отчёт</button><div id="exportStatus" role="status"></div><pre id="log"></pre>';document.body.append(panel);
let events=[], totals={}, options={}, summary={}, started=Date.now();
function record(stage, facts={}){
 totals[stage]=(totals[stage]||0)+1;
 events.push({ms:Date.now()-started,stage,...facts});
 if(events.length>200)events.shift();
}
function report(){
 return JSON.stringify({version:'0.8.5',options,summary,totals,lastEvents:events},null,2);
}
const exportStatus=root.querySelector('#exportStatus');
root.querySelector('#copyReport').onclick=async()=>{
 try{
  await navigator.clipboard.writeText(report());
  exportStatus.textContent='Отчёт скопирован.';
 }catch{
  exportStatus.textContent='Копирование недоступно. Нажми «Скачать отчёт».';
 }
};
root.querySelector('#saveReport').onclick=()=>{
 const url=URL.createObjectURL(new Blob([report()],{type:'application/json'}));
 const a=document.createElement('a');
 a.href=url;a.download='antispam-report.json';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 exportStatus.textContent='Отчёт подготовлен к скачиванию.';
};

const daysInput=root.querySelector('#days');
const finish=root.querySelector('#finish');
const progress=root.querySelector('#progress');
let limitDays=30, finishScan=false;
finish.onclick=()=>{finishScan=true;};
let running=false;const log=t=>{root.querySelector('#log').textContent=t+'\n'+root.querySelector('#log').textContent};const wait=ms=>new Promise(r=>setTimeout(r,ms));const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';const norm=t=>String(t||'').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim();const id=()=>location.pathname.match(/^\/im\/convo\/(-?\d+)\/?$/)?.[1]||new URL(location.href).searchParams.get('sel')?.match(/^-?\d+$/)?.[0];
function peer(e){const href=e.getAttribute('href');if(href){try{const u=new URL(href,location.href);if(u.origin===location.origin)return u.pathname.match(/^\/im\/convo\/(-?\d+)\/?$/)?.[1]||u.searchParams.get('sel')?.match(/^-?\d+$/)?.[0]}catch{}}for(const k of ['data-peer','data-peer-id','data-peerid']){const v=e.getAttribute(k);if(/^ -?\d+$/.test(' '+v))return v}return null}
function validPeer(p){return /^-?\d+$/.test(p||'')&&Number(p)!==0&&Number.isSafeInteger(Number(p));} function candidates(scope=document){const m=new Map();for(const e of scope.querySelectorAll('a[href],[data-peer],[data-peer-id],[data-peerid]')){const p=peer(e);if(validPeer(p)&&visible(e))m.set(p,e)}return m}
function spam(t){t=norm(t);return /начислили бесплатные сутки и скидки/.test(t)||/скидк[аиу].{0,60}(?:на покупку подписки|на все тарифы)/.test(t)||/tastydrop/.test(t)&&/кейс|бонус|промокод/.test(t)||/анонимн[а-я]* сообщени|узнать отправителя|посмотреть отправителя/.test(t)&&/сообщени|отправител/.test(t)||/казино|фрибет|ставки на спорт/.test(t)&&/бонус|промокод|депозит|подарок/.test(t)}
function currentRow(list,p,row){
 if(!list?.isConnected)return null;
 if(row?.isConnected && list.contains(row) && peer(row)===p)return row;
 return candidates(list).get(p)??null;
}
function composerPane(){const input=[...document.querySelectorAll('[contenteditable="true"],textarea')].filter(visible).find(e=>e.getBoundingClientRect().left>innerWidth*.25);if(!input)return null;let e=input;for(let i=0;e&&i<12;i++,e=e.parentElement){const r=e.getBoundingClientRect();if(r.height>innerHeight*.55&&r.width>250&&r.width<innerWidth*.65&&r.left>innerWidth*.25)return e}return null}
function pane(list){
 const primary=composerPane();
 if(primary && !primary.contains(list))return primary;
 // VK may replace the composer with a bot keyboard. Locate the conversation
 // column alongside the list without relying on a writable message field.
 const left=list.getBoundingClientRect();
 for(let branch=list;branch.parentElement && branch.parentElement!==document.body;branch=branch.parentElement){
  const matches=[...branch.parentElement.children].filter(el=>{
   if(el===branch || !visible(el))return false;
   const r=el.getBoundingClientRect();
   return r.left>=left.right-12 && r.width>=250 && r.height>=left.height*.65 &&
    Math.min(r.bottom,left.bottom)-Math.max(r.top,left.top)>left.height*.5;
  });
  if(matches.length)return unique(matches);
 }
 return null;
}
const controls=()=>[...document.querySelectorAll('button,[role="button"],[role="menuitem"],a,[tabindex="0"]')].filter(visible);const label=e=>norm(e.innerText||e.getAttribute('aria-label')||e.title);function unique(nodes){return nodes.length===1?nodes[0]:null}

function parseVKDate(raw, now=new Date()){
 const t=norm(raw).replace(/\.$/,'');
 const months=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
 const clock=t.match(/^(сегодня|вчера)(?:[, ]+в)?(?:\s+\d{1,2}:\d{2})?$/);
 if(clock || /^\d{1,2}:\d{2}$/.test(t)){
  const recent=new Date(now);
  if(clock?.[1]==='вчера')recent.setDate(recent.getDate()-1);
  recent.setHours(23,59,59,999);
  return recent.getTime();
 }
 const iso=t.match(/^(\d{4})-(\d{2})-(\d{2})(?:t.*)?$/);
 const numeric=t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[, ]+(?:в )?\d{1,2}:\d{2})?$/);
 if(iso||numeric){
  const year=Number(iso?iso[1]:numeric[3]), month=Number(iso?iso[2]:numeric[2]), day=Number(iso?iso[3]:numeric[1]);
  const date=new Date(year,month-1,day,23,59,59,999);
  if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day)return null;
  if(iso && t.includes('t')){
   if(!/^\d{4}-\d{2}-\d{2}t\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:z|[+-]\d{2}:\d{2})?$/i.test(t))return null;
   const instant=Date.parse(t.toUpperCase());return Number.isFinite(instant)?instant:null;
  }
  return date.getTime();
 }
 const m=t.replace(/(?:,?\s+в\s+|,\s*)\d{1,2}:\d{2}$/,'').replace(/\s*г\.?$/,'').trim().match(/^(\d{1,2})\s+(янв(?:аря)?|фев(?:раля)?|мар(?:та)?|апр(?:еля)?|ма[йя]|июн[ья]?|июл[ья]?|авг(?:уста)?|сен(?:тября)?|окт(?:ября)?|ноя(?:бря)?|дек(?:абря)?)(?:\.?\s+(\d{4}))?\.?$/);
 if(!m)return null;
 const month=m[2]==='мая'?4:months.indexOf(m[2].slice(0,3));
 if(month<0)return null;
 const year=m[3]?Number(m[3]):now.getFullYear();
 const d=new Date(year,month,Number(m[1]),23,59,59,999);
 if(d.getMonth()!==month||d.getDate()!==Number(m[1])||d.getFullYear()!==year)return null;
 // Without an explicit year, do not guess a previous year for a future date.
 if(d>now)return null;
 return d.getTime();
}
function rowDate(row){
 if(!row||!row.isConnected)return null;
 const p=peer(row);
 if(!validPeer(p))return null;
 const nodes=[...row.querySelectorAll('time,[datetime],[data-timestamp],[class*="date" i],[class*="time" i]')].filter(visible);
 const values=[];
 for(const e of nodes){
   const t=norm(e.innerText);
   const stamp=e.getAttribute('data-timestamp');
   const samples=[e.getAttribute('datetime'),e.title,e.getAttribute('aria-label'),t];
   if(/^\d{10}(?:\d{3})?$/.test(stamp||''))values.push(Number(stamp)*(stamp.length===10?1000:1));
   for(const sample of samples){const v=parseVKDate(sample);if(v!==null)values.push(v);}
   if(/^(только что|\d+\s*(мин|ч|час)\.?)/.test(t))values.push(Date.now());

 }
 // Fallback: VK conversation preview ends with a middle-dot followed by a date.
 const lines=String(row.innerText||'').split('\n').map(x=>x.trim()).filter(Boolean);
 for(const line of lines.slice(1)){
   const match=line.match(/[·•]\s*(\d{1,2}\s+[а-яё.]+(?:\s+\d{4})?)\s*(?:\d+|[✓✔]+)?\s*$/i);
   if(match){const v=parseVKDate(match[1]);if(v!==null)values.push(v);}
   if(/[·•]\s*(?:вчера|сегодня|\d{1,2}:\d{2}|\d+\s*[чдм])(?:\s|$)/i.test(line))return null;
 }
 return values.length?Math.max(...values):null;
}
function lastActivity(row){return rowDate(row);}
function oldEnough(row){const t=lastActivity(row);return t!==null&&Date.now()-t>limitDays*86400000;}

function modals(){
 const selector='dialog[open],[role="dialog"],[role="alertdialog"],[aria-modal="true"],.box_layout,.vkuiAlert,[class*="Alert__root"],[data-testid*="confirm-modal"]';
 const all=[...document.querySelectorAll(selector)].filter(visible);
 return all.filter(e=>!all.some(other=>other!==e&&e.contains(other)));
}
function confirmation(previous){
 const modal=unique(modals().filter(e=>!previous.has(e)));
 if(!modal)return null;
 const body=norm(modal.innerText);
 if(!/(удал|очист)/.test(body)||!/(переписк|диалог|истори|сообщени|чат)/.test(body))return null;
 if(/у всех|для всех|также у|покинуть|выйти из|заблокировать/.test(body))return null;
 return unique([...modal.querySelectorAll('button,[role="button"],input[type="submit"],.flat_button')].filter(e=>
  visible(e)&&!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&
  /^(?:да,? )?(?:удалить|очистить)(?: (?:чат|диалог|переписку|историю(?: сообщений)?|сообщения))?$/.test(norm(e.innerText||e.value||e.getAttribute('aria-label')))));
}
function historyItem(region){
 const area=region.getBoundingClientRect();
 // A portal can be outside the conversation DOM. Identify its compact action list.
 const matches=document.evaluate(
  '//text()[contains(., "Очистить") or contains(., "очистить")]',
  document,null,XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,null);
 const actions=new Set();
 for(let i=0;i<matches.snapshotLength;i++){
  const text=matches.snapshotItem(i).parentElement;
  if(!text || !/^очистить историю(?: сообщений)?$/.test(norm(text.innerText)))continue;
  const r=text.getBoundingClientRect();
  if(!r.width || !r.height || r.right<area.left || r.left>area.right)continue;
  const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
  const action=text.closest('button,a,[role="button"],[role="menuitem"],li,[tabindex]') || text;
  if(!hit || !(action===hit || action.contains(hit) || (hit.contains(text) && /^очистить историю(?: сообщений)?$/.test(norm(hit.innerText)))))continue;
  if(!/^очистить историю(?: сообщений)?$/.test(norm(action.innerText)))continue;
  for(let box=action.parentElement;box && box!==document.body;box=box.parentElement){
   const bounds=box.getBoundingClientRect();
   if(bounds.width>500 || bounds.height>800)break;
   const lines=new Set(normLines(box.innerText));
   if(['архивировать','отметить непрочитанным','закрепить чат','открепить чат','показать вложения','отключить уведомления'].filter(label=>lines.has(label)).length>=2){
    actions.add(action);
    break;
   }
  }
 }
 return unique([...actions]);
}
function normLines(value){return String(value||'').split(/\r?\n/).map(norm);}
async function openHistory(p,row,mode,region,list){
 const area=region.getBoundingClientRect();
 const insideHeader=e=>{
  const r=e.getBoundingClientRect();
  return r.left>=area.left && r.right<=area.right+8 && r.top>=area.top-4 && r.top<=area.top+100;
 };
 const buttons=controls().filter(insideHeader);
 const menu=unique(buttons.filter(e=>[label(e),e.title,e.getAttribute('aria-label')].some(v=>/^(ещ[её]|действия(?: с чатом)?|меню|дополнительно|настройки чата|⋯|…|\.\.\.)$/i.test(v||''))));
 record('menu_search',{headerControls:buttons.length,triggerFound:!!menu});
 if(menu){
  const r=menu.getBoundingClientRect();
  for(const type of ['pointerover','pointerenter','mouseover','mouseenter','mousemove']){
   const EventType=type.startsWith('pointer')?PointerEvent:MouseEvent;
   menu.dispatchEvent(new EventType(type,{bubbles:!type.endsWith('enter'),clientX:r.left+r.width/2,clientY:r.top+r.height/2}));
  }
 }
 let hint=false;
 for(let i=0;i<600 && running && id()===p;i++){
  const item=historyItem(region);
  if(item){
   record('history_item_found');
   const current=currentRow(list,p,row);
   if(!reasons(p,current).includes(mode) || !item.isConnected || modals().length){record('menu_recheck_failed',{eligible:reasons(p,current).includes(mode),attached:item.isConnected,modalCount:modals().length});return null;}
   const previous=new Set(modals());
   log('Найден пункт «Очистить историю». Ожидаю подтверждения ВК.');
   item.click();record('history_item_clicked');
   return previous;
  }
  if(!hint && i>=16){
   hint=true;
   log('Наведи курсор на ⋯ в шапке открытого чата и задержи его там. AntiSpam сам выберет «Очистить историю».');
  }
  await wait(50);
 }
 record('menu_wait_ended',{running,sameChat:id()===p});
 log('Меню не распознано или проверка прервана. Очистка остановлена.');
 running=false;
 return null;
}

async function clean(p,mode,row,list){if(!running||id()!==p||!validPeer(p))return false;if(mode==='old'&&!oldEnough(row)){log('Дата неизвестна или диалог свежий: '+p);return false}const region=pane(list);if(!region){record('chat_pane_missing');log('Не удалось выделить область сообщений. Пропуск '+p);return false}if(mode==='spam'&&!spam(region.innerText)){record('spam_recheck_failed');log('Нет уверенных признаков: '+p);return false}const previous=await openHistory(p,row,mode,region,list);
if(!previous)return false;

let confirm=null;
for(let i=0;i<40 && running && id()===p;i++){
 await wait(125);
 confirm=confirmation(previous);
 if(confirm)break;
}
if(!running||id()!==p)return false;
if(!confirm){
 const boxes=modals();record('confirmation_missing',{visibleModals:boxes.length,newModals:boxes.filter(b=>!previous.has(b)).length,buttons:boxes.reduce((n,b)=>n+b.querySelectorAll('button,[role=button],input[type=submit]').length,0)});
 log('ВК открыл нестандартное окно или выполнил действие сразу. Проверь экран ВК. Автоочистка остановлена до нового запуска.');
 running=false;return false;
}
row=currentRow(list,p,row);
if(!reasons(p,row).includes(mode)||!confirm.isConnected){record('confirmation_recheck_failed',{eligible:reasons(p,row).includes(mode),attached:confirm.isConnected});return false;}
confirm.click();record('confirmation_clicked');await wait(1500);log('Команда удаления отправлена: '+p+' (результат не подтверждён сервером)');return true}
let busy = false;
let decide = null;
const apply = root.querySelector('#apply');

function requestApproval(count) {
 apply.hidden = false;
 return new Promise(resolve => {
  decide = value => {
   apply.hidden = true;
   decide = null;
   resolve(value);
  };
  apply.onclick = () => decide?.(window.confirm(`Удалить историю в ${count} диалогах из списка в панели? Действие необратимо.`));
 });
}

function findList() {
 const votes = new Map();
 for (const [peerId, row] of candidates()) {
  for (let parent = row.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
   if (parent.clientHeight < 100 || !/^(auto|scroll|overlay)$/.test(getComputedStyle(parent).overflowY)) continue;
   if (!votes.has(parent)) votes.set(parent, new Set());
   votes.get(parent).add(peerId);
   break;
  }
 }
 const ranked = [...votes].sort((a, b) => b[1].size - a[1].size);
 if (!ranked.length || ranked[0][1].size === ranked[1]?.[1].size) return null;
 return ranked[0][0];
}

async function walkList(list, visit, pending = null) {
 list.scrollTop = 0;
 await wait(500);
 let idle = 0;
 let bottom = null;
 for (let step = 0; running && list.isConnected && step < 600; step++) {
  if (!pending && finishScan) return 'done';
  const rows = candidates(list);
  let restart = false;
  for (const [peerId, row] of rows) {
   if (!running || !list.isConnected) return 'stopped';
   if (row.isConnected && peer(row) === peerId && await visit(peerId, row)) {
    restart = true;
    break;
   }
  }
  if (pending?.size === 0) return 'done';
  if (!running || !list.isConnected) return 'stopped';
  if (restart) {
   bottom = null;
   idle = 0;
   await wait(500);
   continue;
  }
  const position = list.scrollTop;
  const height = list.scrollHeight;
  const signature = [position, height, ...rows.keys()].join('|');
  list.scrollTop = position + Math.max(1, Math.floor(list.clientHeight * .7));
  if (list.scrollTop === position && position + list.clientHeight + 2 < height) return 'incomplete';
  idle = list.scrollTop === position && signature === bottom ? idle + 1 : 0;
  bottom = signature;
  if (idle >= 5) return 'done';
  await wait(list.scrollTop === position ? 850 : 350);
 }
 return running ? 'incomplete' : 'stopped';
}

function kind(peerId,row) {
 if(Number(peerId)>=2000000000)return 'chat';
 const marker='[data-peer-type="bot"],[data-is-bot="true"],[data-is-bot="1"]';
 if(row.matches(marker)||row.querySelector(marker))return 'bot';
 return Number(peerId)<0?'group':'user';
}

function reasons(peerId,row) {
 if(!row?.isConnected || peer(row)!==peerId || !selectedTypes.has(kind(peerId,row)))return [];
 const found=[];
 if(oldRule.checked && oldEnough(row))found.push('old');
 if(spamRule.checked && ['bot','group'].includes(kind(peerId,row)) && spam(row.innerText))found.push('spam');
 return found;
}
const oldRule=root.querySelector('#oldRule'), spamRule=root.querySelector('#spamRule');
const settings=root.querySelector('#settings');
let selectedTypes=new Set();
async function run() {
 if(busy)return;
 selectedTypes=new Set([...settings.querySelectorAll('[data-kind]:checked')].map(e=>e.dataset.kind));
 events=[];totals={};summary={};started=Date.now();exportStatus.textContent='';
 options={old:oldRule.checked,spam:spamRule.checked,days:daysInput.valueAsNumber,types:[...selectedTypes]};
 record('start');
 if(!selectedTypes.size || !(oldRule.checked || spamRule.checked)){record("invalid_filters");log('Выберите тип диалога и условие проверки.');return;}
 if(oldRule.checked){
  limitDays=daysInput.valueAsNumber;
  if(!Number.isInteger(limitDays)||limitDays<1||limitDays>36500){record('invalid_days');daysInput.reportValidity();log('Введите срок от 1 до 36500 суток.');return;}
 }
 const list = findList();
 if (!list) {
  record('list_not_found');log('Не удалось однозначно найти список. Открой список сообщений ВК.');
  return;
 }
 busy = running = true;
 settings.disabled=true;
 finishScan=false; finish.hidden=false;
 const unknown=new Set();
 const seen = new Set();
 const approved = new Map();
 const originalPosition = list.scrollTop;
 let sent = 0;
 try {
  log('Прокручиваю список и проверяю диалоги…');
  const scan = await walkList(list, (peerId, row) => {
   seen.add(peerId);
   const stamp=oldRule.checked?rowDate(row):null;
   if(oldRule.checked && stamp===null)unknown.add(peerId);else unknown.delete(peerId);
   const why=reasons(peerId,row);
   if (why.length) {
    const name = (row.innerText || '').split('\n').map(line => line.trim()).find(Boolean);
    approved.set(peerId, {why, title:why.map(v=>v==='spam'?'Спам':'Срок').join(' + ')+' · '+(name?.slice(0, 100) || 'Диалог') + (stamp===null?'':' · '+new Date(stamp).toLocaleDateString('ru-RU'))});
   } else approved.delete(peerId);
   summary={...summary,checked:seen.size,eligible:approved.size,unknown:unknown.size};
   progress.textContent='Проверено: '+seen.size+' · Подходят: '+approved.size+(oldRule.checked?' · Дата неизвестна: '+unknown.size:'');
   return false;
  });
  log(`Проверено: ${seen.size}. Кандидатов: ${approved.size}.`);
  record('scan_finished',{result:scan});
  if (scan !== 'done') {
   log('Проход не завершён. Очистка не запущена.');
   return;
  }
  finish.hidden=true;
  if (!approved.size){log('Подходящих диалогов среди проверенных нет.');return;}
  const names = [...approved].map(([peerId, name]) => `${name.title} · ${peerId}`);
  log(names.join('\n'));
  record('awaiting_user_confirmation');
  if (!await requestApproval(approved.size) || !running){record('batch_cancelled');return;}
  record('batch_approved');
  panel.setAttribute('data-compact','');
  root.querySelector('#hover-note').hidden=false;
  const attempted = new Set();
  await walkList(list, async (peerId, row) => {
   if (!approved.has(peerId) || attempted.has(peerId) || !reasons(peerId,row).some(r=>approved.get(peerId).why.includes(r))) return false;
   attempted.add(peerId);record('opening_candidate',{number:attempted.size,type:kind(peerId,row)});
   if (id() !== peerId) {
    row.click();
    await wait(1300);
   }
   row = currentRow(list,peerId,row);
   if (!running || id() !== peerId || !row?.isConnected || peer(row) !== peerId || !reasons(peerId,row).some(r=>approved.get(peerId).why.includes(r))){record('candidate_recheck_failed',{sameChat:id()===peerId,rowConnected:!!row?.isConnected,sameRow:!!row && peer(row)===peerId});return false;}
   const mode=reasons(peerId,row).find(r=>approved.get(peerId).why.includes(r));
   if (!mode || !await clean(peerId, mode, row,list)) return false;
   approved.delete(peerId);
   sent += 1;
   return true;
  }, approved);
  summary.commandsSent=sent;summary.remaining=approved.size;record('cleanup_finished');
  log(`Отправлено команд ВК: ${sent}. Пропущено или осталось: ${approved.size}.`);
 } catch (error) {
  record('exception',{category:['TypeError','RangeError','ReferenceError','SyntaxError','SecurityError'].includes(error?.name)?error.name:'OtherError'});
  log(`Остановлено: ${error.message}. Отправлено команд ВК: ${sent}.`);
 } finally {
  panel.removeAttribute('data-compact');
  root.querySelector('#hover-note').hidden=true;
  if (running && list.isConnected) list.scrollTop = originalPosition;
  finish.hidden=true; settings.disabled=false; running = busy = false;
 }
}

root.querySelector('#start').onclick = run;

root.querySelector('#stop').onclick = () => { record('stop_requested');running = false; decide?.(false); log('Стоп. Уже отправленные команды отменить нельзя.'); };
root.querySelector('#close').onclick = () => { running = false; decide?.(false); panel.remove(); };
})();
