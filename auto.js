(()=>{
if(document.getElementById('vk-auto-panel'))return;
const panel=document.createElement('div');panel.id='vk-auto-panel';Object.assign(panel.style,{position:'fixed',right:'12px',top:'65px',width:'300px',background:'#171b23',color:'#fff',zIndex:2147483647,padding:'14px',border:'1px solid #657086',borderRadius:'12px',font:'14px Arial',boxShadow:'0 4px 20px #0008'});const root=panel.attachShadow({mode:'open'});root.innerHTML='<style>button{padding:9px;margin:4px;background:#2879dd;color:white;border:0;border-radius:6px;cursor:pointer} pre{white-space:pre-wrap;max-height:250px;overflow:auto} </style><b>AntiSpam 0.5</b><p>Автоматически удаляет только сообщества с явными рекламными признаками. Обычные люди и беседы пропускаются.</p><button id="start">Запустить автоочистку</button><p>Старые переписки: последнее сообщение не менее 30 суток назад. Личные диалоги, сообщества и групповые беседы.</p><button id="old">Удалить старые переписки</button><button id="stop">Стоп</button><button id="close">Закрыть</button><pre id="log"></pre>';document.body.append(panel);
let running=false;const log=t=>{root.querySelector('#log').textContent=t+'\n'+root.querySelector('#log').textContent};const wait=ms=>new Promise(r=>setTimeout(r,ms));const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';const norm=t=>String(t||'').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim();const id=()=>location.pathname.match(/^\/im\/convo\/(-?\d+)\/?$/)?.[1]||new URL(location.href).searchParams.get('sel')?.match(/^-?\d+$/)?.[0];
function peer(e){const href=e.getAttribute('href');if(href){try{const u=new URL(href,location.href);if(u.origin===location.origin)return u.pathname.match(/^\/im\/convo\/(-?\d+)\/?$/)?.[1]||u.searchParams.get('sel')?.match(/^-?\d+$/)?.[0]}catch{}}for(const k of ['data-peer','data-peer-id','data-peerid']){const v=e.getAttribute(k);if(/^ -?\d+$/.test(' '+v))return v}return null}
function validPeer(p){return /^-?\d+$/.test(p||'')&&Number(p)!==0&&Number.isSafeInteger(Number(p));} function candidates(){const m=new Map();for(const e of document.querySelectorAll('a[href],[data-peer],[data-peer-id],[data-peerid]')){const p=peer(e);if(validPeer(p)&&visible(e))m.set(p,e)}return m}
function spam(t){t=norm(t);return /tastydrop/.test(t)&&/кейс|бонус|промокод/.test(t)||/анонимн[а-я]* сообщени|узнать отправителя|посмотреть отправителя/.test(t)&&/сообщени|отправител/.test(t)||/казино|фрибет|ставки на спорт/.test(t)&&/бонус|промокод|депозит|подарок/.test(t)}
function pane(){const input=[...document.querySelectorAll('[contenteditable="true"],textarea')].filter(visible).find(e=>e.getBoundingClientRect().left>innerWidth*.25);if(!input)return null;let e=input;for(let i=0;e&&i<12;i++,e=e.parentElement){const r=e.getBoundingClientRect();if(r.height>innerHeight*.55&&r.width>250&&r.width<innerWidth*.65&&r.left>innerWidth*.25)return e}return null}
const controls=()=>[...document.querySelectorAll('button,[role="button"],[role="menuitem"],a,[tabindex="0"]')].filter(visible);const label=e=>norm(e.innerText||e.getAttribute('aria-label')||e.title);function unique(nodes){return nodes.length===1?nodes[0]:null}

function parseVKDate(raw, now=new Date()){
 const t=norm(raw).replace(/\.$/,'');
 const months=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
 const m=t.match(/^(\d{1,2})\s+(янв(?:аря)?|фев(?:раля)?|мар(?:та)?|апр(?:еля)?|ма[йя]|июн[ья]?|июл[ья]?|авг(?:уста)?|сен(?:тября)?|окт(?:ября)?|ноя(?:бря)?|дек(?:абря)?)(?:\.?\s+(\d{4}))?\.?$/);
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
 const nodes=[...row.querySelectorAll('time,[class*="date" i],[class*="time" i]')].filter(visible);
 const values=[];
 for(const e of nodes){
   const t=norm(e.innerText);
   if(/^(сегодня|вчера|только что|\d{1,2}:\d{2}|\d+\s*(мин|ч|д|час|дн)\.?)$/.test(t))return null;
   const v=parseVKDate(t);if(v!==null)values.push(v);
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
function oldEnough(row){const t=lastActivity(row);return t!==null&&Date.now()-t>=30*86400000;}

async function clean(p,mode='spam',row=null){if(!running||id()!==p||!validPeer(p))return false;if(mode==='spam'&&Number(p)>=0)return false;if(mode==='old'&&!oldEnough(row)){log('Дата неизвестна или диалог свежий: '+p);return false}const region=pane();if(!region){log('Не удалось выделить область сообщений. Пропуск '+p);return false}if(mode==='spam'&&!spam(region.innerText)){log('Нет уверенных признаков: '+p);return false}const bounds=region.getBoundingClientRect();const menu=unique(controls().filter(e=>{const r=e.getBoundingClientRect();return r.left>=bounds.left&&r.right<=bounds.right+8&&r.top<=bounds.top+100&&/^(ещ[её]|действия|меню|дополнительно|настройки чата|⋯|…|\.\.\.)$/.test(label(e))}));if(!menu){log('Не найдено однозначное меню ⋯. Остановлено.');running=false;return false}const r=menu.getBoundingClientRect();const opts={bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,relatedTarget:null};for(const type of ['pointerover','pointerenter','mouseover','mouseenter','mousemove']){menu.dispatchEvent(type.startsWith('pointer')?new PointerEvent(type,opts):new MouseEvent(type,opts))}await wait(250);if(!running||id()!==p)return false;const deletion=/^(удалить чат|удалить диалог|удалить переписку|очистить историю сообщений|очистить историю)$/;function findDelete(){const nodes=[...document.querySelectorAll('button,[role="button"],[role="menuitem"],a,div,span,li')].filter(e=>visible(e)&&deletion.test(norm(e.innerText))&&!Array.from(e.children).some(c=>visible(c)&&deletion.test(norm(c.innerText))));return unique(nodes)}let del=findDelete();if(!del){menu.click();await wait(350);del=findDelete()}if(!del){log('Пункт «Очистить историю» не найден. Остановлено.');running=false;return false}if(!running||id()!==p||(mode==='old'&&(!oldEnough(row)||peer(row)!==p)))return false;del.click();await wait(700);if(!running||id()!==p)return false;const dialogs=[...document.querySelectorAll('[role="dialog"],[aria-modal="true"]')].filter(visible);const d=unique(dialogs.filter(e=>/удал|очист/.test(norm(e.innerText))&&/истори|переписк|чат|диалог|сообщени/.test(norm(e.innerText))));const confirm=d&&unique([...d.querySelectorAll('button,[role="button"]')].filter(e=>visible(e)&&/^(удалить|очистить|удалить чат|удалить диалог|очистить историю|очистить историю сообщений)$/.test(label(e))));if(!confirm){log('Не найдено безопасное подтверждение VK. Остановлено; проверь окно.');running=false;return false}if(!running||id()!==p||(mode==='old'&&!oldEnough(row)))return false;confirm.click();await wait(1500);log('Команда удаления отправлена: '+p+' (результат не подтверждён сервером)');return true}
root.querySelector('#start').onclick=async()=>{if(running)return;running=true;try{const rows=candidates();const current=id();log('Найдено сообществ в DOM: '+rows.size);if(current&&Number(current)<0)await clean(current);for(const [p,e] of rows){if(!running)break;if(p===current||Number(p)>=0)continue;if(!e.isConnected){log('Список изменился; остановлено.');break}e.click();await wait(1300);if(id()!==p){log('Не удалось открыть '+p);continue}await clean(p);await wait(900)}if(!rows.size)log('VK не предоставил идентификаторы строк. Другие диалоги не обработаны.');}catch(e){log('Ошибка: '+e.message)}finally{running=false;log('Цикл завершён.')}};root.querySelector('#old').onclick=async()=>{
 if(running)return;
 const all=[...candidates()]; const rows=all.filter(([p,e])=>validPeer(p)&&oldEnough(e)); log('Найдено диалогов: '+all.length+'; старых с распознанной датой: '+rows.length);
 if(!rows.length){log('Нет диалогов с подтверждённой датой старше 30 суток. Неизвестные даты пропущены.');return}
 if(!window.confirm('Очистить историю '+rows.length+' диалогов, сообществ и бесед без сообщений 30 суток? Удаление необратимо.'))return;
 running=true;
 try{for(const [p,e] of rows){if(!running)break;if(!oldEnough(e))continue;if(id()!==p){e.click();await wait(1300)}if(id()!==p){log('Не удалось открыть '+p);continue}await clean(p,'old',e);await wait(900)}}catch(e){log('Ошибка: '+e.message)}finally{running=false;log('Очистка старых переписок завершена.')}
};root.querySelector('#stop').onclick=()=>{running=false;log('Стоп')};root.querySelector('#close').onclick=()=>{running=false;panel.remove()};
})();
