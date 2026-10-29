/* finesse · register=h5 · morph=A-app-shell · portal revision v3 */
const $=s=>document.querySelector(s);
const REDUCE=matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollPane=$('#app-scroll'),sheet=$('#sheet'),content=$('#sheet-content'),title=$('#sheet-title');
const motionBehavior=()=>REDUCE?'instant':'smooth';
const icons=name=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escapeHTML=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
const catalog=[
 {id:'moon',name:'赏月指南',desc:'留一点时间，给月色与相聚',icon:'moon',type:'节日指南',keywords:'月亮赏月去处指南'},
 {id:'gathering',name:'月下游园会',desc:'寻灯 · 品秋 · 共赏月',icon:'pavilion',type:'游园灵感',keywords:'活动雅集游园灯会赏月'},
 {id:'riddle',name:'月下灯谜',desc:'在线趣味挑战，随时开始',icon:'lantern',type:'在线互动',keywords:'游戏灯谜猜谜活动挑战'},
 {id:'diy',name:'花灯手作',desc:'三步手作灵感，点亮秋夜',icon:'craft',type:'手作指南',keywords:'做灯笼花灯手作教程活动'},
 {id:'tea-guide',name:'桂香茶会',desc:'三种茶席灵感，慢叙家常',icon:'tea',type:'秋日灵感',keywords:'茶会桂花喝茶茶席活动'},
 {id:'wish',name:'心意卡片',desc:'写句中秋寄语，留给想念',icon:'card',type:'在线互动',keywords:'祝福留言心愿寄语卡片'},
 {id:'mooncake',name:'月满 · 团圆礼盒',desc:'一口月饼，一份惦念',icon:'gift',type:'团圆好礼',keywords:'礼盒月饼送礼团圆好礼'},
 {id:'tea',name:'桂月 · 秋日茶礼',desc:'桂香入盏，慢叙家常',icon:'flower',type:'团圆好礼',keywords:'茶礼桂花礼盒送礼好礼'}
];
const byId=id=>catalog.find(item=>item.id===id);
const plannable=new Set(['moon','gathering','riddle','diy','tea-guide']);
const normalizeIds=value=>Array.isArray(value)?[...new Set(value)].filter(id=>byId(id)):[];
let favorites=normalizeIds(read('yue-favorites',[])),plans=normalizeIds(read('yue-plans',[])).filter(id=>plannable.has(id));
let wish=read('yue-wish',''),checkedDate=read('yue-checkin','');
if(typeof wish!=='string')wish='';if(typeof checkedDate!=='string')checkedDate='';
let riddleIndex=0,toastTimer,lastFocus,sheetCurrent=null,sheetStack=[],searchQuery='';
const note='<p class="sheet-note">概念设计演示 · 活动与礼品为虚构内容，无真实预约、购买或发送功能。</p>';
function toast(text){clearTimeout(toastTimer);$('.toast').textContent=text;$('.toast').classList.add('visible');toastTimer=setTimeout(()=>$('.toast').classList.remove('visible'),2300)}
function results(items){return `<div class="result-list">${items.map(item=>`<button data-sheet="${item.id}">${icons(item.icon)}<span><strong>${item.name}</strong><small>${item.type} · ${item.desc}</small></span><span class="arrow">›</span></button>`).join('')}</div>`}
function detail(icon,words){return `<div class="detail-art">${icons(icon)}<span>${words}</span></div>`}
function dayKey(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const fields=Object.fromEntries(parts.map(p=>[p.type,p.value]));return `${fields.year}-${fields.month}-${fields.day}`}

let sheetAnimation=null,dragState=null,suppressGripClick=false;
function sheetY(){const transform=getComputedStyle(sheet).transform;return transform==='none'?0:new DOMMatrixReadOnly(transform).m42}
function settleSheet(from,to,done){
  sheetAnimation?.cancel();sheet.style.transform=`translateY(${to}px)`;
  if(REDUCE||!sheet.animate){done?.();return}
  const animation=sheet.animate([{transform:`translateY(${from}px)`},{transform:`translateY(${to}px)`}],{duration:to>0?190:260,easing:'cubic-bezier(.22,.72,.25,1)'});
  sheetAnimation=animation;
  animation.onfinish=()=>{if(sheetAnimation===animation){sheetAnimation=null;done?.()}};
}
function closeSheet(){if(!sheet.open)return;const current=sheetY();settleSheet(current,sheet.offsetHeight+10,()=>{sheet.close();sheet.style.transform='translateY(0)'})}
sheet.addEventListener('cancel',e=>{e.preventDefault();closeSheet()});
sheet.addEventListener('close',()=>{document.body.classList.remove('modal-open');lastFocus?.focus({preventScroll:true})});
sheet.addEventListener('click',e=>{if(e.target===sheet){const b=sheet.getBoundingClientRect();if(e.clientY<b.top||e.clientX<b.left||e.clientX>b.right)closeSheet()}});
$('.close-sheet').addEventListener('click',closeSheet);
const grip=$('.sheet-grip');
grip.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  const start=sheetY();sheetAnimation?.cancel();sheetAnimation=null;sheet.style.transform=`translateY(${start}px)`;
  dragState={pointerId:e.pointerId,startY:e.clientY,origin:start,position:start,samples:[{t:performance.now(),y:start}],moved:false};
  grip.setPointerCapture(e.pointerId);
},{passive:true});
grip.addEventListener('pointermove',e=>{
  if(!dragState||e.pointerId!==dragState.pointerId)return;
  const displacement=e.clientY-dragState.startY;
  if(Math.abs(displacement)>5)dragState.moved=true;
  const raw=dragState.origin+displacement;
  const next=raw<0?Math.max(-24,raw*.22):Math.min(raw,sheet.offsetHeight+10);
  dragState.position=next;sheet.style.transform=`translateY(${next}px)`;
  const now=performance.now();dragState.samples.push({t:now,y:next});dragState.samples=dragState.samples.filter(p=>now-p.t<110);
},{passive:true});
function endDrag(e,cancelled=false){
  if(!dragState||e.pointerId!==dragState.pointerId)return;
  const state=dragState;dragState=null;suppressGripClick=state.moved;
  const last=state.samples.at(-1),first=state.samples[0];
  const elapsed=last.t-first.t,velocity=elapsed>0?(last.y-first.y)/elapsed:0;
  if(!cancelled&&(state.position>sheet.offsetHeight*.27||(state.position>32&&velocity>.65))){closeSheet()}else{settleSheet(state.position,0)}
  setTimeout(()=>{suppressGripClick=false},50);
}
grip.addEventListener('pointerup',e=>endDrag(e),{passive:true});
grip.addEventListener('pointercancel',e=>endDrag(e,true),{passive:true});
grip.addEventListener('click',()=>{if(!suppressGripClick)closeSheet()});


function syncUI(){
 document.querySelectorAll('[data-favorite]').forEach(button=>{const item=byId(button.dataset.favorite);if(!item)return;const active=favorites.includes(item.id);button.setAttribute('aria-pressed',active);button.setAttribute('aria-label',`${active?'取消收藏':'收藏'}${item.name}`);const label=button.querySelector('[data-fav-label]');if(label)label.textContent=active?'已收藏':'收藏心意'});
 $('#favorite-count').hidden=favorites.length===0;$('#favorite-count').textContent=favorites.length;
 $('#checkin-label').textContent=checkedDate===dayKey()?'已签到':'签到';
 $('#plan-summary-copy').textContent=plans.length?`已留好 ${plans.length} 件小事，等一个团圆时刻。`:'选几件喜欢的小事，留给团圆。';
}
function toggleFavorite(id){if(!byId(id))return;const had=favorites.includes(id);favorites=had?favorites.filter(x=>x!==id):[...favorites,id];const persisted=write('yue-favorites',favorites);syncUI();toast(had?'已取消收藏':persisted?'已加入「收藏」':'已在本次预览中收藏');if(sheetCurrent==='favorites')renderSheet('favorites')}
function togglePlan(id){if(!plannable.has(id))return;const had=plans.includes(id);plans=had?plans.filter(x=>x!==id):[...plans,id];const saved=write('yue-plans',plans);syncUI();toast(had?'已从我的安排移除':saved?'已加入我的安排，仅本地保存':'已加入本次预览安排');const currentTop=sheet.scrollTop;renderSheet(sheetCurrent);sheet.scrollTop=currentTop;($('#plan-action')||$('#sheet-content .plan-open')||$('#sheet-content [data-sheet]')||$('.close-sheet')).focus({preventScroll:true})}
function detailActions(id){return `<div class="detail-actions">${plannable.has(id)?`<button id="plan-action" class="primary-button" data-plan="${id}">${plans.includes(id)?'已加入 · 点击移除':'加入我的安排'} ${icons(plans.includes(id)?'check':'calendar')}</button>`:''}<button class="outline-button ${plannable.has(id)?'':'primary-button'}" data-favorite="${id}" aria-pressed="${favorites.includes(id)}">${icons('heart')}<span data-fav-label>${favorites.includes(id)?'已收藏':'收藏心意'}</span></button></div>`}
function renderSearch(){const query=searchQuery.trim().toLowerCase();const found=catalog.filter(item=>(item.name+item.desc+item.type+item.keywords).toLowerCase().includes(query));$('#search-results').innerHTML=found.length?results(found):'<div class="empty-state">'+icons('search')+'<p>暂时没有找到，试试「茶会」「灯谜」或「月饼」。</p></div>'}
function planList(){return `<div class="plan-list">${plans.map(id=>{const item=byId(id);return `<div class="plan-row"><button class="plan-open" data-sheet="${id}">${icons(item.icon)}<span><strong>${item.name}</strong><small>${item.type}</small></span></button><button class="remove-plan" data-remove-plan="${id}" aria-label="移除${item.name}">移除</button></div>`}).join('')}</div>`}
function renderSheet(type){
 sheetCurrent=type;sheet.dataset.current=type;$('.sheet-back').hidden=sheetStack.length===0;
 switch(type){
 case 'search':
  title.textContent='找到你的中秋心意';content.innerHTML=`<div class="search-field">${icons('search')}<input id="search-input" aria-label="搜索活动或好礼" placeholder="搜赏月、灯谜、团圆好礼" value="${escapeHTML(searchQuery)}" autocomplete="off" maxlength="60"></div><div id="search-results"></div>`;renderSearch();$('#search-input').addEventListener('input',e=>{searchQuery=e.target.value;renderSearch()});break;
 case 'events':
  title.textContent='一起过中秋';content.innerHTML='<p>在线玩一会儿，或为相聚留一点灵感。</p>'+results(catalog.filter(i=>['riddle','wish','diy','gathering','tea-guide','moon'].includes(i.id)))+note;break;
 case 'gifts':
  title.textContent='把惦念，装进礼物';content.innerHTML='<p>好礼不必隆重，心意自有分量。</p>'+results(catalog.filter(i=>['mooncake','tea'].includes(i.id)))+note;break;
 case 'moon':
  title.textContent='今夜，一起抬头看月亮';content.innerHTML=detail('moon','月色正好<br>人间团圆')+'<p>把这三件小事放进赏月安排里，让相聚慢一点。</p><ul><li>找一处开阔的窗边、庭院或露台。</li><li>带上喜欢的茶与月饼，给聊天留点时间。</li><li>和惦念的人写一句中秋祝福。</li></ul>'+detailActions(type)+'<p class="sheet-note">这是赏月灵感指南，未提供实时天气、地点地图或观测条件。</p>';break;
 case 'gathering':
  title.textContent='月下游园会';content.innerHTML=detail('pavilion','灯火可亲<br>团圆有时')+'<p>一条慢慢走的游园小径，三件值得停下来的小事。</p><ul><li>寻灯：把一盏暖灯，装进今晚的记忆。</li><li>品秋：伴一缕茶香，和熟悉的人叙家常。</li><li>望月：在明月下，写一句想说的话。</li></ul>'+detailActions(type)+'<button class="secondary-button" data-sheet="riddle" style="margin-top:12px;width:100%">先猜一盏灯谜</button>'+note;break;
 case 'diy':
  title.textContent='亲手做盏中秋花灯';content.innerHTML=detail('craft','一纸灯影<br>照见团圆')+'<p>把手作当成一次相聚。这里是一份纸灯造型的设计灵感。</p><div class="guide-steps"><details open><summary>01　准备一张喜欢的彩纸</summary><p>选一张有柔韧度的彩纸，搭配细绳、胶贴和一支画笔。</p></details><details><summary>02　折出圆润的灯身</summary><p>将纸面折叠、展开，围合成灯笼轮廓。用自己的纹样为灯身作装饰。</p></details><details><summary>03　添上挂绳与祝福</summary><p>加一段挂绳，把寄语写在小卡片上。若需要光源，可选小型 LED 灯。</p></details></div>'+detailActions(type)+note;break;
 case 'tea-guide':
  title.textContent='桂香茶会，慢叙家常';content.innerHTML=detail('tea','桂香入席<br>好话慢说')+'<p>从桌面的颜色与小物开始，布置一场轻松的中秋茶会。</p><ul><li>桂花色：一枝花、一只白瓷杯，点亮桌面。</li><li>青玉色：用浅绿桌布与木色托盘，留出呼吸。</li><li>月白色：少一点装饰，多一点坐下来聊天的时间。</li></ul>'+detailActions(type)+'<button class="secondary-button" data-sheet="tea" style="margin-top:12px;width:100%">看看秋日茶礼</button>'+note;break;
 case 'mooncake':case 'tea':{
  const isTea=type==='tea';title.textContent=byId(type).name;content.innerHTML=detail(isTea?'flower':'gift',isTea?'桂香入盏<br>慢叙家常':'花好月圆<br>把爱分甜')+`<p>${isTea?'以一盏秋茶，留住相聚的温度。将桂香与月色收进礼盒，送给想一起坐下来聊天的人。':'把明月装进盒子，把牵挂送到身边。一份以团圆为题的月饼包装概念，让礼物替你说一句：中秋，想和你一起过。'}</p>`+detailActions(type)+note;break;}
 case 'riddle':title.textContent='猜一盏，月下灯谜';renderRiddle();break;
 case 'wish':
  title.textContent='把想念，说给月亮听';content.innerHTML='<p>写一句祝福，留给你心里惦念的人。</p><label for="wish-input" style="margin-top:18px">你的中秋寄语</label><textarea id="wish-input" maxlength="40" aria-describedby="wish-error" placeholder="愿每一份想念，都能迎来团圆。">'+escapeHTML(wish)+'</textarea><p id="wish-error" class="form-error" role="alert" hidden></p><div class="wish-caption"><span>仅保存在当前浏览器</span><span id="wish-count">'+wish.length+'/40</span></div><button class="primary-button" id="save-wish">留住这份心意 '+icons('check')+'</button>';
  $('#wish-input').addEventListener('input',e=>{$('#wish-count').textContent=e.target.value.length+'/40';$('#wish-error').hidden=true;e.target.removeAttribute('aria-invalid')});
  $('#save-wish').addEventListener('click',()=>{const next=$('#wish-input').value.trim();if(!next){$('#wish-error').textContent='先写一句想说的话，再保存心意。';$('#wish-error').hidden=false;$('#wish-input').setAttribute('aria-invalid','true');$('#wish-input').focus();return}wish=next;toast(write('yue-wish',wish)?'祝福已留在「我的」里':'已保留在本次预览中');closeSheet()});break;
 case 'favorites':
  title.textContent='收藏的中秋心意';content.innerHTML=favorites.length?results(favorites.map(byId)):'<div class="empty-state">'+icons('heart')+'<p>还没有收藏，先去挑一份喜欢的中秋心意吧。</p><button class="primary-button" data-sheet="gifts">看看团圆好礼 '+icons('arrow')+'</button></div>';break;
 case 'plans':
  title.textContent='我的中秋安排';content.innerHTML='<p>把想做的小事留在这里。安排仅本地保存，不等于报名、预约或提醒。</p>'+(plans.length?planList():'<div class="empty-state">'+icons('calendar')+'<p>还没有安排，先选一件喜欢的小事。</p><button class="primary-button" data-sheet="events">看看中秋活动 '+icons('arrow')+'</button></div>');break;
 case 'checkin':{
  const checked=checkedDate===dayKey();title.textContent=checked?'今天，也为团圆留一步':'给今天一点节日仪式感';content.innerHTML=detail('calendar',checked?'今日已相聚<br>心意慢慢积':'点亮今天<br>留住团圆')+'<p>签到仅在当前浏览器记录，不含积分、优惠券或奖品。</p><button id="checkin-commit" class="primary-button" '+(checked?'disabled':'')+'>'+(checked?'今日已签到':'记录今日签到')+'</button>';
  $('#checkin-commit').addEventListener('click',()=>{if(checkedDate===dayKey())return;checkedDate=dayKey();const saved=write('yue-checkin',checkedDate);syncUI();renderSheet('checkin');toast(saved?'今日签到已记录':'今日签到已在本次预览中记录')});break;}
 case 'profile':
  title.textContent='月下，见字如面';content.innerHTML='<p>把喜欢的事、想送的礼和没说完的话，留在这里。</p>'+`<div class="profile-counts"><button data-sheet="plans"><b>${plans.length}</b><span>我的安排</span></button><button data-sheet="favorites"><b>${favorites.length}</b><span>我的收藏</span></button></div><h3>我的中秋寄语</h3>${wish?'<div class="saved-wish">'+escapeHTML(wish)+'</div>':'<p>给想念的人留一句祝福，也给自己一份温柔。</p>'}<button class="primary-button" data-sheet="wish">${wish?'编辑寄语':'写下第一句祝福'} ${icons('arrow')}</button><p class="sheet-note">本地概念原型 · 收藏、安排与寄语仅保存在当前浏览器，无需登录。</p>`;break;
 default:title.textContent='月下 · 好事团圆';content.innerHTML='<p>一轮明月，一份心意。</p>';
 }
 syncUI();
}
const riddles=[{q:'十五的月亮',kind:'打一字',answer:'胖',explain:'「月」和「半」合在一起，便是「胖」。'},{q:'举头望明月',kind:'打一字',answer:'仰',explain:'抬头向上看，就是「仰」。'},{q:'中秋菊开',kind:'打一成语',answer:'花好月圆',explain:'菊花正好，中秋月圆。'}];
function renderRiddle(){const r=riddles[riddleIndex];content.innerHTML=`<div class="riddle-box"><p class="riddle-kind">${r.kind} · ${riddleIndex+1} / ${riddles.length}</p><p class="riddle-question">${r.q}</p><div id="answer" hidden><p class="riddle-answer">谜底：${r.answer}</p><p>${r.explain}</p></div></div><div class="riddle-buttons"><button class="primary-button" id="reveal-answer">揭晓谜底</button><button class="secondary-button" id="next-riddle">再猜一盏</button></div><p class="sheet-note">在线灯谜演示 · 无积分或奖品。</p>`;$('#reveal-answer').addEventListener('click',()=>{$('#answer').hidden=false;$('#reveal-answer').textContent='谜底已揭晓';$('#reveal-answer').disabled=true});$('#next-riddle').addEventListener('click',()=>{riddleIndex=(riddleIndex+1)%riddles.length;renderRiddle()})}
function openSheet(type){if(type===sheetCurrent&&sheet.open)return;const fresh=!sheet.open;if(fresh){lastFocus=document.activeElement;sheetStack=[]}else if(sheetCurrent){sheetStack.push({type:sheetCurrent,scroll:sheet.scrollTop})}renderSheet(type);if(fresh){sheet.style.transform='translateY(0)';sheet.showModal();document.body.classList.add('modal-open');settleSheet(sheet.offsetHeight+10,0)}sheet.scrollTop=0;requestAnimationFrame(()=>{if(type==='search')$('#search-input').focus({preventScroll:true});else $('.close-sheet').focus({preventScroll:true})})}
function goBack(){const previous=sheetStack.pop();if(!previous)return;renderSheet(previous.type);sheet.scrollTop=previous.scroll;$('.sheet-back').hidden=sheetStack.length===0;if(previous.type==='search')$('#search-input').focus({preventScroll:true});else $('.close-sheet').focus({preventScroll:true})}
$('.sheet-back').addEventListener('click',goBack);
sheet.addEventListener('close',()=>{sheetCurrent=null;sheetStack=[]});
function scrollToSection(id){const target=document.getElementById(id);if(target)scrollPane.scrollTo({top:Math.max(0,scrollPane.scrollTop+target.getBoundingClientRect().top-scrollPane.getBoundingClientRect().top-12),behavior:motionBehavior()})}
document.addEventListener('click',e=>{
 const favorite=e.target.closest('[data-favorite]');if(favorite){toggleFavorite(favorite.dataset.favorite);return}
 const plan=e.target.closest('[data-plan]');if(plan){togglePlan(plan.dataset.plan);return}
 const remove=e.target.closest('[data-remove-plan]');if(remove){togglePlan(remove.dataset.removePlan);return}
 const destination=e.target.closest('[data-sheet]');if(destination){openSheet(destination.dataset.sheet);return}
 const scroll=e.target.closest('[data-scroll]');if(scroll)scrollToSection(scroll.dataset.scroll);
});
$('#home-tab').addEventListener('click',()=>scrollPane.scrollTo({top:0,behavior:motionBehavior()}));
const exportMode=new URLSearchParams(location.search).has('export');
function updateClock(){const now=new Date();$('#status-time').textContent=exportMode?'9:41':`${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;$('#status-time').dateTime=now.toISOString();syncUI()}
updateClock();if(!exportMode)setInterval(updateClock,30000);
