'use strict';
const PRIZES = [
 {name:'200 元代金券',detail:'无门槛使用',amount:200,weight:25},
 {name:'100 元代金券',detail:'无门槛使用',amount:100,weight:50},
 {name:'500 元代金券',detail:'满 5000 元可用',amount:500,weight:10},
 {name:'300 元代金券',detail:'满 3000 元可用',amount:300,weight:10},
 {name:'舒敏之星',detail:'护理礼遇',amount:null,weight:5},
 {name:'张杰演唱会门票',detail:'演唱会门票',amount:null,weight:0}
];
// 展示奖池与可中奖项分开；中奖记录保留原有五项奖品索引，新增门票追加在末尾。
const DISPLAY_PRIZES = [
 {name:'张杰演唱会门票',winIndex:5,lines:['张杰演唱会门票']},
 {name:'野口勇Akari纸灯',lines:['野口勇 Akari 纸灯']},
 {name:"月光系列'黑胶唱片",lines:['月光系列','黑胶唱片']},
 {name:'观夏全月食香膏礼盒',lines:['观夏全月食','香膏礼盒']},
 {name:'黑松露玫瑰鲜炖燕窝',lines:['黑松露玫瑰','鲜炖燕窝']},
 {name:'保妥适50U',lines:['保妥适 50U']},
 {name:'超声v拉美贵妇版（全面部）',lines:['超声v拉美贵妇版','（全面部）']},
 {name:'固态童颜',lines:['固态童颜']},
 {name:'超光子4S',lines:['超光子 4S']},
 {name:'丽珠兰黑',lines:['丽珠兰黑']},
 {name:'丝爤朵1号玻尿酸',lines:['丝爤朵1号','玻尿酸']},
 {name:'塑妍萃',lines:['塑妍萃']},
 {name:'黑白天鹅颈纹',lines:['黑白天鹅颈纹']},
 {name:'欧洲之星FOTONA PRO（全面部）',lines:['欧洲之星 FOTONA PRO','（全面部）']},
 {name:'1000 元代金券',lines:['1000 元代金券']},
 ...PRIZES.slice(0,5).map((p,winIndex)=>({...p,winIndex,lines:[p.name,p.detail]}))
];
const SECTOR_ANGLE=360/DISPLAY_PRIZES.length;
function winningSector(index){return DISPLAY_PRIZES.findIndex(p=>p.winIndex===index);}
function targetAngle(index){return (360-winningSector(index)*SECTOR_ANGLE)%360;}
const KEY='moonlit-lottery-v1', $=id=>document.getElementById(id);
let state={config:null,locked:false,records:[],pending:null},spinning=false,rotation=0,storageOK=true;
try{const saved=localStorage.getItem(KEY);if(saved){const parsed=JSON.parse(saved);if(!Array.isArray(parsed.records)||typeof parsed.locked!=='boolean'||(parsed.locked&&!parsed.config))throw Error('invalid');if(parsed.config&&Array.isArray(parsed.config.weights)&&parsed.config.weights.length===5){parsed.config.weights.push(0);}state=parsed;}localStorage.setItem(KEY,JSON.stringify(state));}catch{storageOK=false;}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,4500);}
function save(next){try{localStorage.setItem(KEY,JSON.stringify(next));state=next;return true;}catch{toast('本机记录无法保存，请检查浏览器存储空间后重试。');return false;}}
async function hash(value){if(!window.crypto||!crypto.subtle){throw new Error('当前浏览器无法使用安全口令功能。请确认使用 HTTPS，并更新 iPad 系统后重试。');}const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');}
// Use getRandomValues instead of randomUUID for older iPad Safari.
function createUUID(){
 if(!window.crypto||!crypto.getRandomValues)throw new Error('当前浏览器不支持安全随机数，请更新系统后重试。');
 const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
 const hex=Array.from(b,x=>x.toString(16).padStart(2,'0'));
 return hex.slice(0,4).join('')+'-'+hex.slice(4,6).join('')+'-'+hex.slice(6,8).join('')+'-'+hex.slice(8,10).join('')+'-'+hex.slice(10).join('');
}
// Safari before 15.4 needs a modal fallback. Keep focus and background interaction contained.
let fallbackDialog=null,previousFocus=null,previousOverflow='';
function showDialog(dialog){
 if(typeof dialog.showModal==='function'){if(!dialog.open)dialog.showModal();return;}
 if(fallbackDialog===dialog)return;
 if(fallbackDialog)closeDialog(fallbackDialog);
 previousFocus=document.activeElement;previousOverflow=document.body.style.overflow;fallbackDialog=dialog;
 let overlay=$('dialog-backdrop');if(!overlay){overlay=document.createElement('div');overlay.id='dialog-backdrop';document.body.append(overlay);}
 overlay.hidden=false;dialog.setAttribute('open','');dialog.classList.add('fallback-dialog');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('tabindex','-1');document.body.style.overflow='hidden';
 (dialog.querySelector('input,button,textarea')||dialog).focus();
}
function closeDialog(dialog){
 if(fallbackDialog!==dialog){if(typeof dialog.close==='function')dialog.close();return;}
 dialog.removeAttribute('open');dialog.classList.remove('fallback-dialog');$('dialog-backdrop').hidden=true;fallbackDialog=null;document.body.style.overflow=previousOverflow;
 if(previousFocus&&previousFocus.isConnected)previousFocus.focus();
}
document.addEventListener('focusin',e=>{if(fallbackDialog&&!fallbackDialog.contains(e.target))(fallbackDialog.querySelector('input,button')||fallbackDialog).focus();});
document.addEventListener('keydown',e=>{
 if(!fallbackDialog)return;
 if(e.key==='Escape'){e.preventDefault();if(fallbackDialog.id!=='result-dialog')closeDialog(fallbackDialog);return;}
 if(e.key==='Tab'){const items=Array.from(fallbackDialog.querySelectorAll('input,button,textarea,[tabindex="0"]')).filter(el=>!el.disabled);const first=items[0],last=items[items.length-1];if(!first){e.preventDefault();fallbackDialog.focus();}else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
});

function randomUnit(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;}
function selectPrize(weights,u){let sum=0;for(let i=0;i<weights.length;i++){sum+=weights[i];if(u*100<sum)return i;}for(let i=weights.length-1;i>=0;i--){if(weights[i]>0)return i;}throw new Error("没有可抽取的奖品");}
function values(){return PRIZES.map((_,i)=>Number($('p'+i).value));}
function validWeights(weights){return weights.length===PRIZES.length&&weights.every(v=>Number.isFinite(v)&&v>=0&&v<=100)&&Math.abs(weights.reduce((a,b)=>a+b,0)-100)<.000001;}
function updateTotal(){const weights=values(),sum=Math.round(weights.reduce((a,b)=>a+b,0)*100)/100,valid=validWeights(weights)&&PRIZES.every((_,i)=>$('p'+i).value.trim()!=='');$('total').textContent=valid?'合计 100% · 可以开启活动':`合计 ${sum}% · ${sum>100?'超出 '+Math.round((sum-100)*100)/100:'还差 '+Math.round((100-sum)*100)/100}%`;$('total').classList.toggle('invalid',!valid);$('launch').disabled=!valid||!storageOK;return valid;}
function setup(){ $('setup').hidden=false;$('activity').hidden=true;$('probabilities').replaceChildren();PRIZES.forEach((p,i)=>{const row=document.createElement('label');row.className='prize-row';row.innerHTML=`<span>${p.name}<small>${p.detail}</small></span><span class="percent-field"><input id="p${i}" type="number" min="0" max="100" step="0.01" required aria-label="${p.name}中奖概率" value="${state.config?.weights[i]??p.weight}">%</span>`;$('probabilities').append(row);$('p'+i).addEventListener('input',updateTotal);});$('organizer').value=state.config?.organizer??'中秋答谢礼';$('terms').value=state.config?.terms??'';$('password').value='';$('confirm').value='';$('password').placeholder=state.config?'留空沿用现有口令':'至少 6 位，用于退出活动';$('confirm').placeholder=state.config?'更换口令时需再次输入':'再次输入口令';$('config-error').textContent=storageOK?'':'浏览器存储不可用，暂时无法开启活动。请启用本地存储后刷新。';$('record-tools').hidden=!state.records.length;$('record-count').textContent=`共 ${state.records.length} 次`;updateTotal();}
function drawWheel(){
 const ns='http://www.w3.org/2000/svg',svg=$('wheel');svg.replaceChildren();
 const colors=['#fbfaf2','#f3efbb'];
 const pt=(r,a)=>[300+r*Math.cos(a*Math.PI/180),300+r*Math.sin(a*Math.PI/180)];
 DISPLAY_PRIZES.forEach((p,i)=>{
  const start=-90-SECTOR_ANGLE/2+i*SECTOR_ANGLE,end=start+SECTOR_ANGLE,a=pt(298,start),b=pt(298,end);
  const path=document.createElementNS(ns,'path');path.setAttribute('d',`M300 300 L${a} A298 298 0 0 1 ${b} Z`);path.setAttribute('fill',colors[i%2]);path.setAttribute('stroke','#7e7c66');path.setAttribute('stroke-width','.8');svg.append(path);
  const g=document.createElementNS(ns,'g');g.setAttribute('transform',`rotate(${i*SECTOR_ANGLE-90} 300 300)`);
  const title=document.createElementNS(ns,'title');title.textContent=p.name;g.append(title);
  p.lines.forEach((line,j)=>{const t=document.createElementNS(ns,'text');t.setAttribute('x','573');t.setAttribute('y',p.lines.length===1?305:296+j*18);t.setAttribute('text-anchor','end');t.setAttribute('font-size',line.length>17?'13':'15');t.setAttribute('font-family','"PingFang SC", "Microsoft YaHei", sans-serif');t.setAttribute('fill','#25251f');t.textContent=line;g.append(t);});svg.append(g);
 });
}
function sizeLegacyWheel(){if(window.CSS&&CSS.supports('aspect-ratio','1'))return;const stage=document.querySelector('.wheel-stage');stage.style.height=stage.getBoundingClientRect().width+'px';$('spin').style.height=$('spin').getBoundingClientRect().width+'px';}
window.addEventListener('resize',sizeLegacyWheel);
function activity(){ $('setup').hidden=true;$('activity').hidden=false;$('event-organizer').textContent=state.config.organizer||'中秋答谢礼';drawWheel();sizeLegacyWheel();if(typeof $('wheel').getAnimations==='function')$('wheel').getAnimations().forEach(a=>a.cancel());rotation=state.pending?targetAngle(state.pending.index):0;$('wheel').style.transform=`rotate(${rotation}deg)`;$('spin').disabled=Boolean(state.pending);if(state.pending)showResult(state.pending);}
$('config').addEventListener('submit',async e=>{e.preventDefault();if(!updateTotal())return;const password=$('password').value,confirm=$('confirm').value;if((!state.config||password||confirm)&&(password.length<6||password!==confirm)){$('config-error').textContent=password.length<6?'请设置至少 6 位的管理员口令。':'两次输入的口令不一致。';return;}$('launch').disabled=true;try{const salt=password?createUUID():state.config.salt;const passwordHash=password?await hash(salt+password):state.config.passwordHash;const config={weights:values(),organizer:$('organizer').value.trim(),terms:$('terms').value.trim(),salt,passwordHash};if(save({...state,config,locked:true})){ $('password').value='';$('confirm').value='';activity();}}catch(error){console.error('活动启动失败',error);$('config-error').textContent=error.message||'活动启动失败，请刷新后重试。';}finally{updateTotal();}});
$('defaults').onclick=()=>{PRIZES.forEach((p,i)=>$('p'+i).value=p.weight);updateTotal();};
$('spin').onclick=async()=>{if(spinning||state.pending||!state.locked)return;spinning=true;$('spin').disabled=true;const index=selectPrize(state.config.weights,randomUnit());const record={id:createUUID().slice(0,8).toUpperCase(),index,time:new Date().toISOString(),name:PRIZES[index].name,detail:PRIZES[index].detail};if(!save({...state,records:[...state.records,record],pending:record})){spinning=false;$('spin').disabled=false;return;}$('spin-status').textContent='月光流转，好礼将至…';const desired=targetAngle(index);const end=rotation+6*360+(desired-rotation%360+360)%360;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const animation=$('wheel').animate([{transform:`rotate(${rotation}deg)`},{transform:`rotate(${end}deg)`}],{duration:reduced?250:5800,easing:'cubic-bezier(.12,.72,.13,1)',fill:'forwards'});rotation=end;try{await animation.finished;}catch{}spinning=false;$('spin-status').textContent='今夜的好运，已为你停留';showResult(record);};
function showResult(record){const p=PRIZES[record.index];$('spin').disabled=true;$('result-value').replaceChildren();if(p.amount){$('result-value').append(document.createTextNode(p.amount));const small=document.createElement('small');small.textContent=' 元';$('result-value').append(small);}else{$('result-value').textContent=p.name;$('result-value').style.fontSize='44px';}$('result-value').style.fontSize=p.amount?'':(record.index===5?'30px':'44px');$('result-name').textContent=p.amount?'恭喜获得代金券':(record.index===5?'恭喜获得演唱会门票':'恭喜获得护理礼遇');$('result-detail').textContent=p.detail;$('result-id').textContent=record.id;if(!$('result-dialog').hasAttribute('open'))showDialog($('result-dialog'));}
$('result-dialog').addEventListener('cancel',e=>e.preventDefault());
$('next').onclick=()=>{if(!save({...state,pending:null}))return;closeDialog($('result-dialog'));$('spin').disabled=false;$('spin-status').textContent='月圆时分，让美好发生';};
function openAdmin(){if(!state.locked||spinning)return;$('unlock-password').value='';$('unlock-error').textContent='';showDialog($('admin-dialog'));$('unlock-password').focus();}
$('brand').addEventListener('click',openAdmin);document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='l'){e.preventDefault();openAdmin();}});
$('cancel-admin').onclick=()=>closeDialog($('admin-dialog'));let unlockAttempts=0,blockedUntil=0;
$('admin-form').addEventListener('submit',async e=>{e.preventDefault();if(Date.now()<blockedUntil){$('unlock-error').textContent='尝试次数较多，请 30 秒后再试。';return;}const entered=await hash(state.config.salt+$('unlock-password').value);if(entered!==state.config.passwordHash){unlockAttempts++;if(unlockAttempts>=5){blockedUntil=Date.now()+30000;unlockAttempts=0;}$('unlock-error').textContent='口令不正确，请重新输入。';return;}if(save({...state,locked:false})){unlockAttempts=0;$('unlock-password').value='';closeDialog($('admin-dialog'));if($('result-dialog').hasAttribute('open'))closeDialog($('result-dialog'));setup();}});
$('rules').onclick=()=>{$('rules-list').replaceChildren();DISPLAY_PRIZES.forEach(p=>{const row=document.createElement('div');row.className='prize-row';const label=document.createElement('span');label.textContent=p.name+(p.detail?' · '+p.detail:'');const percent=document.createElement('span');percent.textContent=p.winIndex===undefined?'展示礼品':state.config.weights[p.winIndex]+'%';row.append(label,percent);$('rules-list').append(row);});$('public-terms').textContent=state.config.terms||'';showDialog($('rules-dialog'));};$('close-rules').onclick=()=>closeDialog($('rules-dialog'));
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else toast('当前浏览器不支持网页全屏，可使用“添加到主屏幕”。');}catch{toast('当前浏览器未允许全屏，可继续正常抽奖。');}};
$('export').onclick=()=>{const rows=[['抽奖编号','时间','奖品','使用条件'],...state.records.map(r=>[r.id,new Date(r.time).toLocaleString('zh-CN'),r.name,r.detail])];const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='中秋抽奖记录.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
window.addEventListener('storage',e=>{if(e.key===KEY)location.reload();});
if(state.locked&&state.config&&validWeights(state.config.weights))activity();else setup();
