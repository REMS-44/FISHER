
const KEY='fisher-control-v4';

const seed={classes:[],tasks:[],projects:[],notes:[]};
const state=load();
let currentYear=(new Date()).getFullYear();
let selectedMonthOffset=0;
let selectedDate=isoToday();

function load(){try{return {...seed,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){return structuredClone(seed)}}
function save(){
  localStorage.setItem(KEY,JSON.stringify(state));
  renderAll();
  const overlay=document.getElementById('dayOverlay');
  if(overlay && !overlay.classList.contains('hidden')) renderDayOverlay();
}
function uid(p='x'){return p+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6)}
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function isoToday(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
function dateObj(s){if(!s)return null;const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
const months=['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];
const monthsNom=['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
const weekdays=['Неділя','Понеділок','Вівторок','Середа','Четвер','Пʼятниця','Субота'];
const weekShort=['ПН','ВТ','СР','ЧТ','ПТ','СБ','НД'];

function fmtDate(s){const d=dateObj(s); if(!d)return '—'; return `${d.getDate()} ${months[d.getMonth()]}`}
function fmtShort(s){const d=dateObj(s); if(!d)return '—'; return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`}
function startOfWeek(){const d=new Date(); const wd=d.getDay(); d.setDate(d.getDate()+(wd===0?-6:1-wd)); d.setHours(0,0,0,0); return d;}
function isoLocal(d){const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)}
function priorityClass(p){return p==='Високий'||p==='Критично'?'high':p==='Низький'?'low':'medium'}
function typeColor(i){return ['blue','green','purple','orange','red'][i%5]}
const lessonSlots=[
  ['09:00','10:20'],
  ['10:40','12:00'],
  ['12:30','13:50'],
  ['14:10','15:30'],
  ['15:40','17:00'],
  ['17:10','18:30'],
  ['18:40','20:00']
];
function pairNumber(start,end){
  const idx=lessonSlots.findIndex(([s,e])=>s===start && e===end);
  return idx>=0 ? `${idx+1} пара` : (start ? 'інший час' : 'час не вказано');
}
const lessonTypes=['Лекція','Практичне','Лабораторне','Семінар','Індивідуальне','Залік','Іспит','Консультація','Репетиція','Контрольна робота','Інше'];
function slotValue(start,end){return start&&end?`${start}|${end}`:''}
function lessonTypeLabel(x){return x.lessonType==='Інше'?(x.lessonTypeCustom||'Інше'):(x.lessonType||'—')}
function lessonSlotSelect(x){
  const current=slotValue(x.time,x.end);
  const exact=lessonSlots.some(([s,e])=>slotValue(s,e)===current);
  return `<div class="field full"><label>Пара / час</label>
    <select name="lessonSlot" id="lessonSlotSelect" onchange="applyLessonSlot(this.value)">
      <option value="">Оберіть час заняття</option>
      ${lessonSlots.map(([s,e],i)=>`<option value="${s}|${e}" ${current===slotValue(s,e)?'selected':''}>${i+1} пара · ${s}–${e}</option>`).join('')}
      <option value="custom" ${current && !exact?'selected':''}>Інший час</option>
    </select>
  </div>`;
}
function lessonTypeSelect(x){
  return `<div class="field"><label>Вид заняття</label>
    <select name="lessonType" id="lessonTypeSelect" onchange="toggleCustomLessonType(this.value)">
      ${lessonTypes.map(t=>`<option ${t===(x.lessonType||'')?'selected':''}>${t}</option>`).join('')}
    </select>
  </div>
  <div class="field ${x.lessonType==='Інше'?'':'hidden'}" id="customLessonTypeField">
    <label>Свій вид заняття</label>
    <input name="lessonTypeCustom" type="text" value="${esc(x.lessonTypeCustom||'')}" placeholder="Введіть свій варіант">
  </div>`;
}
const roomOptions=['325','230','324','322а','321','238'];
function roomSelect(x){
  const room=x.room||'';
  const known=roomOptions.includes(room);
  return `<div class="field"><label>Аудиторія</label>
    <select name="roomChoice" id="roomChoiceSelect" onchange="toggleCustomRoom(this.value)">
      <option value="">Оберіть аудиторію</option>
      ${roomOptions.map(r=>`<option ${r===room?'selected':''}>${r}</option>`).join('')}
      <option value="Інше" ${room && !known?'selected':''}>Інше</option>
    </select>
  </div>
  <div class="field ${room && !known?'':'hidden'}" id="customRoomField">
    <label>Своя аудиторія / місце</label>
    <input name="roomCustom" type="text" value="${esc(room && !known?room:'')}" placeholder="Введіть свій варіант">
  </div>`;
}
function toggleCustomRoom(value){
  const f=document.getElementById('customRoomField');
  if(f) f.classList.toggle('hidden',value!=='Інше');
}
function applyLessonSlot(value){
  const start=document.querySelector('[name="time"]');
  const end=document.querySelector('[name="end"]');
  if(!start||!end)return;
  if(value && value!=='custom'){
    const [s,e]=value.split('|'); start.value=s; end.value=e;
  }
}
function toggleCustomLessonType(value){
  const f=document.getElementById('customLessonTypeField');
  if(f) f.classList.toggle('hidden',value!=='Інше');
}
function todayClasses(){return state.classes.filter(x=>x.date===isoToday()).sort((a,b)=>(a.time||'').localeCompare(b.time||''))}
function openTasks(){return state.tasks.filter(x=>!x.done)}
function activeProjects(){return state.projects.filter(x=>x.status!=='Завершено')}

function pluralEvents(n){
  if(n%10===1 && n%100!==11) return `${n} подія`;
  if([2,3,4].includes(n%10) && ![12,13,14].includes(n%100)) return `${n} події`;
  return `${n} подій`;
}
function monthCursor(offset=selectedMonthOffset){
  const now=new Date();
  return new Date(now.getFullYear(), now.getMonth()+offset, 1);
}
function monthOffsetForDate(iso){
  const d=dateObj(iso); const now=new Date();
  return (d.getFullYear()-now.getFullYear())*12 + (d.getMonth()-now.getMonth());
}
function setPlannerMonth(offset){
  selectedMonthOffset=Number(offset);
  const base=monthCursor(selectedMonthOffset);
  const selected=dateObj(selectedDate);
  if(!selected || selected.getFullYear()!==base.getFullYear() || selected.getMonth()!==base.getMonth()){
    selectedDate=`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-01`;
  }
  renderHome();
}
function stepPlannerMonth(delta){ setPlannerMonth(selectedMonthOffset + Number(delta)); }
function openDay(iso){
  selectedDate=iso;
  selectedMonthOffset=monthOffsetForDate(iso);
  renderHome();
  renderDayOverlay();
  document.getElementById('dayOverlay').classList.remove('hidden');
}
function getItemsForDate(iso){
  return [
    ...state.classes.filter(x=>x.date===iso).map((x,i)=>({
      kind:'class',
      id:x.id,
      time:x.time||'—',
      end:x.end||'',
      title:x.subject||'Заняття',
      sub:[x.group, lessonTypeLabel(x)!=='—'&&lessonTypeLabel(x), x.room&&`ауд. ${x.room}`, x.location].filter(Boolean).join(' · '),
      topic:x.topic||'',
      prep:x.prep||'',
      note:'',
      color:typeColor(i)
    })),
    ...state.tasks.filter(x=>!x.done && x.date===iso).map((x,i)=>({
      kind:'task',
      id:x.id,
      time:x.time||'—',
      end:'',
      title:x.title,
      sub:[x.category, x.project].filter(Boolean).join(' · '),
      note:x.notes||'',
      color:typeColor(i+2)
    })),
    ...state.projects.filter(x=>x.status!=='Завершено' && x.deadline===iso).map((x,i)=>({
      kind:'project',
      id:x.id,
      time:'—',
      end:'',
      title:x.title,
      sub:[x.category, x.status&&`статус: ${x.status}`].filter(Boolean).join(' · '),
      note:x.next||x.notes||'',
      color:'green'
    }))
  ].sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
}
function renderMonthTabs(){
  return `<div class="planner-tabs">${
    Array.from({length:12},(_,i)=>{
      const d=monthCursor(i);
      return `<button class="planner-tab ${i===selectedMonthOffset?'active':''}" onclick="setPlannerMonth(${i})">${monthsNom[d.getMonth()]} ${d.getFullYear()}</button>`;
    }).join('')
  }</div>`;
}
function renderMonthPlanner(){
  const base=monthCursor(selectedMonthOffset);
  const year=base.getFullYear(), month=base.getMonth();
  const first=new Date(year,month,1);
  const start=new Date(first);
  start.setDate(first.getDate()-((first.getDay()+6)%7));

  let cells='';
  for(let i=0;i<42;i++){
    const d=new Date(start); d.setDate(start.getDate()+i);
    const iso=isoLocal(d);

    const dayClasses=state.classes
      .filter(x=>x.date===iso && x.status!=='Скасовано')
      .sort((a,b)=>(a.time||'').localeCompare(b.time||''));

    const dayTasks=state.tasks
      .filter(x=>!x.done && x.date===iso)
      .sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));

    const dayProjects=state.projects
      .filter(x=>x.status!=='Завершено' && x.deadline===iso);

    const total=dayClasses.length+dayTasks.length+dayProjects.length;
    const inMonth=d.getMonth()===month;

    const cls=['month-cell'];
    if(!inMonth) cls.push('muted');
    if(iso===isoToday()) cls.push('today');
    if(iso===selectedDate) cls.push('active');
    if(total) cls.push('has-items');

    const classesHtml=dayClasses.map(x=>`
      <div class="cal-entry cal-class">
        <div class="cal-entry-line">
          <span class="cal-pair">${esc(pairNumber(x.time,x.end))}</span>
          <span class="cal-time">${esc(x.time||'—')}${x.end?`–${esc(x.end)}`:''}</span>
        </div>
        <div class="cal-title">${esc(x.subject||'Заняття')}</div>
        <div class="cal-info"><b>${esc(x.group||'—')}</b> · ${esc(lessonTypeLabel(x))} · ${x.room?`ауд. ${esc(x.room)}`:'ауд. —'}</div>
        ${x.topic?`<div class="cal-topic">Тема: ${esc(x.topic)}</div>`:''}
        ${x.prep?`<div class="cal-prep"><b>Підготувати:</b> ${esc(x.prep)}</div>`:''}
      </div>`).join('');

    const tasksHtml=dayTasks.map(x=>`
      <div class="cal-entry cal-task">
        <div class="cal-entry-line">
          <span class="cal-kind">СПРАВА</span>
          ${x.time?`<span class="cal-time">${esc(x.time)}</span>`:''}
        </div>
        <div class="cal-title">${esc(x.title)}</div>
        <div class="cal-info">${esc(x.category||'Без категорії')} · ${esc(x.priority||'Середній')}</div>
        ${x.project?`<div class="cal-note">Проєкт: ${esc(x.project)}</div>`:''}
      </div>`).join('');

    const projectsHtml=dayProjects.map(x=>`
      <div class="cal-entry cal-project">
        <div class="cal-entry-line"><span class="cal-kind">ДЕДЛАЙН</span></div>
        <div class="cal-title">${esc(x.title)}</div>
        <div class="cal-info">${esc(x.category||'Проєкт')} · ${Number(x.progress)||0}%</div>
        ${x.next?`<div class="cal-note">Далі: ${esc(x.next)}</div>`:''}
      </div>`).join('');

    cells += `<button type="button" class="${cls.join(' ')}" onclick="openDay('${iso}')" title="${tooltipForDate(iso)}">
      <div class="month-cell-head">
        <div class="month-num">${d.getDate()}</div>
      </div>
      <div class="cal-day-content">
        ${classesHtml}
        ${tasksHtml}
        ${projectsHtml}
        ${!total?`<div class="cal-empty">—</div>`:''}
      </div>
    </button>`;
  }

  return `<div class="planner-shell">
    ${renderMonthTabs()}
    <div class="planner-headline">
      <div>
        <div class="planner-label">${monthsNom[month]} ${year}</div>
        <div class="planner-subhint">У календарі одразу видно все на день. Натисни на клітинку лише коли хочеш відкрити день і редагувати записи.</div>
      </div>
      <div class="planner-nav">
        <button onclick="stepPlannerMonth(-1)">← Попередній</button>
        <button onclick="stepPlannerMonth(1)">Наступний →</button>
      </div>
    </div>
    <div class="planner-scroll">
      <div class="planner-grid">
        <div class="planner-weekdays">${weekShort.map(d=>`<div>${d}</div>`).join('')}</div>
        <div class="planner-cells">${cells}</div>
      </div>
    </div>
  </div>`;
}
function closeDayOverlay(){
  document.getElementById('dayOverlay').classList.add('hidden');
}
function moveSelectedDay(delta){
  const d=dateObj(selectedDate)||new Date();
  d.setDate(d.getDate()+Number(delta));
  selectedDate=isoLocal(d);
  selectedMonthOffset=monthOffsetForDate(selectedDate);
  renderHome();
  renderDayOverlay();
}
function openAddForDate(type,iso){
  const preset=type==='project'?{deadline:iso}:{date:iso};
  openModal();
  showForm(type,preset);
}
function dayEdit(type,id){
  editEntry(type,id);
}
function renderDayOverlay(){
  const d=dateObj(selectedDate);
  if(!d)return;
  const items=getItemsForDate(selectedDate);
  const counts={
    classes:items.filter(x=>x.kind==='class').length,
    tasks:items.filter(x=>x.kind==='task').length,
    projects:items.filter(x=>x.kind==='project').length
  };
  const html=`
    <div class="day-screen-head">
      <div>
        <h2 class="day-screen-date">${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}</h2>
        <div class="day-screen-meta">Усе, що заплановано на цей день. Тут можна одразу відкрити й відредагувати кожен запис.</div>
      </div>
      <div class="day-screen-controls">
        <button onclick="moveSelectedDay(-1)">← День</button>
        <button onclick="moveSelectedDay(1)">День →</button>
        <button class="day-close" onclick="closeDayOverlay()">×</button>
      </div>
    </div>
    <div class="day-screen-body">
      <div class="day-summary">
        <div class="day-summary-card"><small>ЗАНЯТТЯ</small><b>${counts.classes}</b></div>
        <div class="day-summary-card"><small>СПРАВИ</small><b>${counts.tasks}</b></div>
        <div class="day-summary-card"><small>ДЕДЛАЙНИ ПРОЄКТІВ</small><b>${counts.projects}</b></div>
      </div>

      <div class="day-addbar">
        <button class="add-class" onclick="openAddForDate('class','${selectedDate}')">＋ Заняття</button>
        <button class="add-task" onclick="openAddForDate('task','${selectedDate}')">＋ Справа</button>
        <button class="add-project" onclick="openAddForDate('project','${selectedDate}')">＋ Проєкт</button>
      </div>

      ${items.length?`<div class="day-records">${items.map(x=>`
        <div class="day-record">
          <div class="day-record-time">${esc(x.time)}${x.end?`<small>до ${esc(x.end)}</small>`:''}</div>
          <div class="day-record-kind ${x.kind}">${x.kind==='class'?'ЗАНЯТТЯ':x.kind==='task'?'СПРАВА':'ПРОЄКТ'}</div>
          <div class="day-record-main">
            <b>${esc(x.title)}</b>
            <small>${esc(x.sub||'')}</small>
            ${x.topic?`<small class="day-topic">Тема: ${esc(x.topic)}</small>`:''}
            ${x.prep?`<small class="day-prep"><b>Підготувати:</b> ${esc(x.prep)}</small>`:''}
            ${x.note?`<small>${esc(x.note)}</small>`:''}
          </div>
          <div class="day-record-actions">
            <button title="Редагувати" onclick="dayEdit('${x.kind}','${x.id}')">✎</button>
            <button title="Видалити" onclick="deleteEntry('${x.kind}','${x.id}'); renderDayOverlay()">×</button>
          </div>
        </div>`).join('')}</div>`:
        `<div class="day-no-records">На цей день поки нічого не заплановано. Додай заняття, справу або дедлайн проєкту кнопками вище.</div>`}
    </div>`;
  document.getElementById('dayScreenContent').innerHTML=html;
}

function headerDate(){
  const d=new Date();
  document.getElementById('todayLabel').textContent=`${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function renderAll(){
  headerDate();
  renderHome();
  renderWeek();
  renderClasses();
  renderTasks();
  renderProjects();
  renderNotes();
}

function renderHome(){
  const tClasses=todayClasses();
  const todayTasks=openTasks().filter(x=>x.date===isoToday());
  const timeline=[
    ...tClasses.map((x,i)=>({time:x.time||'—',end:x.end||'',title:x.subject||'Заняття',sub:[x.group,lessonTypeLabel(x)!=='—'&&lessonTypeLabel(x),x.room&&`ауд. ${x.room}`].filter(Boolean).join(' · '),topic:x.topic||'',prep:x.prep||'',badge:'ЗАНЯТТЯ',color:typeColor(i)})),
    ...todayTasks.map((x,i)=>({time:x.time||'—',title:x.title,sub:x.category||'',badge:'СПРАВА',color:typeColor(i+2)}))
  ].sort((a,b)=>(a.time||'').localeCompare(b.time||''));

  const upcoming=[
    ...openTasks().filter(x=>x.date && x.date>=isoToday()).map(x=>({date:x.date,title:x.title,sub:x.category||'',time:x.time||''})),
    ...state.classes.filter(x=>x.date>isoToday()).map(x=>({date:x.date,title:x.subject||'Заняття',sub:[x.group,lessonTypeLabel(x)!=='—'&&lessonTypeLabel(x)].filter(Boolean).join(' · '),time:x.time||''}))
  ].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,6);

  const classesNext=[...state.classes].filter(x=>x.date>=isoToday()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,5);
  const tasksNext=[...openTasks()].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')).slice(0,5);
  const projects=activeProjects().slice(0,4);
  const notes=[...state.notes].sort((a,b)=>(b.updated||'').localeCompare(a.updated||'')).slice(0,3);

  document.getElementById('homeView').innerHTML=`
    <div class="dashboard-top">
      <div class="card">
        <div class="card-head">
          <div class="card-title"><span class="icon">▣</span>СЬОГОДНІ</div>
          <div class="card-link">${fmtDate(isoToday())}</div>
        </div>
        <div class="card-body">
          ${timeline.length?`<div class="today-list">${timeline.map((x,i)=>`
            <div class="today-row">
              <div class="today-time"><b>${esc(x.time)}</b><small>${esc(x.end||'')}</small></div>
              <div class="type-line" style="background:${['#4c8df7','#49af78','#8a72d8','#d99043','#e36565'][i%5]}"></div>
              <div class="today-main">
                <b>${esc(x.title)}</b>
                <small>${esc(x.sub)}</small>
                ${x.topic?`<small class="today-topic">Тема: ${esc(x.topic)}</small>`:''}
                ${x.prep?`<small class="today-prep"><b>Підготувати:</b> ${esc(x.prep)}</small>`:''}
              </div>
              <span class="badge ${x.color}">${x.badge}</span>
            </div>`).join('')}</div>`:
            `<div class="empty-state">На сьогодні поки нічого не внесено.</div>`}
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title"><span class="icon">▣</span>НАЙБЛИЖЧЕ</div>
          <button class="card-link" onclick="switchView('week')">Мій тиждень →</button>
        </div>
        <div class="card-body">
          ${upcoming.length?`<div class="upcoming-list">${upcoming.map(x=>{
            const d=dateObj(x.date);
            return `<div class="upcoming-row">
              <div class="date-box"><div><b>${d.getDate()}</b><small>${months[d.getMonth()].slice(0,4)}</small></div></div>
              <div class="upcoming-main"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></div>
              <div class="upcoming-time">${esc(x.time)}</div>
            </div>`;
          }).join('')}</div>`:`<div class="empty-state">Немає найближчих подій.</div>`}
        </div>
      </div>
    </div>

    <div class="card year-card">
      <div class="card-head">
        <div class="card-title"><span class="icon">▤</span>КАЛЕНДАР ПО МІСЯЦЯХ</div>
        <button class="card-link" onclick="switchView('year')">Відкрити календар окремо →</button>
      </div>
      ${renderMonthPlanner()}
    </div>


    <div class="dashboard-bottom">
      <div class="card">
        <div class="card-head"><div class="card-title"><span class="icon">◫</span>ЗАНЯТТЯ</div><button class="card-link" onclick="switchView('classes')">Всі заняття →</button></div>
        <div class="card-body">
          ${classesNext.length?`<table class="mini-table"><thead><tr><th>Дата</th><th>Час</th><th>Дисципліна</th><th>Група</th><th>Ауд.</th></tr></thead><tbody>
            ${classesNext.map(x=>`<tr><td>${fmtShort(x.date)}</td><td class="blue-text">${esc(x.time||'—')}</td><td>${esc(x.subject||'—')}</td><td>${esc(x.group||'—')}</td><td>${esc(x.room||'—')}</td></tr>`).join('')}
          </tbody></table>`:`<div class="empty-state">Занять ще немає.</div>`}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div class="card-title"><span class="icon">✓</span>СПРАВИ</div><button class="card-link" onclick="switchView('tasks')">Всі справи →</button></div>
        <div class="card-body">
          ${tasksNext.length?tasksNext.map(x=>`
            <div class="task-row ${x.done?'done':''}">
              <button class="check ${x.done?'done':''}" onclick="toggleTask('${x.id}')">${x.done?'✓':''}</button>
              <div class="task-name">${esc(x.title)}</div>
              <span class="priority ${priorityClass(x.priority)}">${esc((x.priority||'Середній').toUpperCase())}</span>
              <span class="task-date">${x.date?fmtShort(x.date):'—'}</span>
            </div>`).join(''):`<div class="empty-state">Справ ще немає.</div>`}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><div class="card-title"><span class="icon">▣</span>ПРОЄКТИ</div><button class="card-link" onclick="switchView('projects')">Всі проєкти →</button></div>
        <div class="card-body">
          ${projects.length?projects.map(x=>`
            <div class="project-row">
              <div class="project-icon">${esc((x.title||'П')[0].toUpperCase())}</div>
              <div class="project-name"><b>${esc(x.title)}</b><small>${esc(x.category||'Проєкт')}</small></div>
              <div class="progress"><span style="width:${Number(x.progress)||0}%"></span></div>
              <div class="progress-num">${Number(x.progress)||0}%</div>
            </div>`).join(''):`<div class="empty-state">Проєктів ще немає.</div>`}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><div class="card-title"><span class="icon">✎</span>ШВИДКІ НОТАТКИ</div><button class="card-link" onclick="openAdd('note')">＋</button></div>
      <div class="notes-strip">
        ${notes.map(x=>`<div class="quick-note"><b>${esc(x.title||'Нотатка')}</b><br>${esc((x.text||'').slice(0,100))}</div>`).join('')}
        <button class="quick-note add" onclick="openAdd('note')">＋ Нова нотатка</button>
      </div>
    </div>`;
}

function tooltipForDate(iso){
  const items=[
    ...state.classes.filter(x=>x.date===iso).map(x=>`Заняття: ${x.subject||''} ${x.group?`(${x.group})`:''}`),
    ...state.tasks.filter(x=>!x.done && x.date===iso).map(x=>`Справа: ${x.title}`),
    ...state.projects.filter(x=>x.status!=='Завершено' && x.deadline===iso).map(x=>`Проєкт: ${x.title}`)
  ];
  return items.join(' | ') || fmtDate(iso);
}

function renderWeek(){
  const start=startOfWeek();
  let html='<div class="week-full">';
  for(let i=0;i<7;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);const iso=isoLocal(d);
    const items=[
      ...state.classes.filter(x=>x.date===iso).map((x,j)=>({kind:'class',color:typeColor(j),time:x.time,title:`${x.group||''} · ${x.subject||'Заняття'}`,sub:[lessonTypeLabel(x)!=='—'&&lessonTypeLabel(x),x.room&&`ауд. ${x.room}`].filter(Boolean).join(' · ')})),
      ...openTasks().filter(x=>x.date===iso).map((x,j)=>({kind:'task',color:typeColor(j+2),time:x.time,title:x.title,sub:x.category||''})),
      ...activeProjects().filter(x=>x.deadline===iso).map((x,j)=>({kind:'project',color:'green',time:'',title:`Дедлайн: ${x.title}`,sub:''}))
    ].sort((a,b)=>(a.time||'99').localeCompare(b.time||'99'));
    html+=`<div class="week-col">
      <div class="week-col-head ${iso===isoToday()?'today':''}"><b>${['Понеділок','Вівторок','Середа','Четвер','Пʼятниця','Субота','Неділя'][i]}</b><small>${d.getDate()} ${months[d.getMonth()]}</small></div>
      <div class="week-col-body">
        ${items.length?items.map(x=>`<div class="full-event ${x.color}">${x.time?`<b>${esc(x.time)}</b>`:''}${esc(x.title)}<br><small>${esc(x.sub)}</small></div>`).join(''):`<div class="empty-state" style="padding:25px 5px">—</div>`}
      </div>
    </div>`;
  }
  document.getElementById('weekView').innerHTML=html+'</div>';
}

function renderClasses(){
  const items=[...state.classes].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  document.getElementById('classesView').innerHTML=`
    <div class="page-toolbar">
      <div class="left"><input id="classSearch" placeholder="Пошук за групою, дисципліною, темою або аудиторією…" oninput="filterRows('classesTable',this.value)"></div>
      <button class="gold-btn" onclick="openAdd('class')">＋ Додати заняття</button>
    </div>
    <div class="data-card">${items.length?`
      <table class="data-table" id="classesTable">
        <thead><tr><th>Дата</th><th>Час</th><th>Група</th><th>Дисципліна</th><th>Вид заняття</th><th>Тема</th><th>Що підготувати</th><th>Місце</th><th></th></tr></thead>
        <tbody>${items.map(x=>`<tr data-search="${esc(`${x.group} ${x.subject} ${x.lessonType||''} ${x.lessonTypeCustom||''} ${x.topic} ${x.prep||''} ${x.room}`.toLowerCase())}">
          <td>${fmtDate(x.date)}</td><td class="blue-text">${esc(x.time||'—')}</td><td>${esc(x.group||'—')}</td>
          <td><b>${esc(x.subject||'—')}</b></td><td>${esc(lessonTypeLabel(x))}</td><td>${esc(x.topic||'—')}</td><td>${esc(x.prep||'—')}</td><td><b>${esc(x.room||'—')}</b><small>${esc(x.location||'')}</small></td>
          <td>${actions('class',x.id)}</td>
        </tr>`).join('')}</tbody>
      </table>`:`<div class="empty-state">Занять ще немає.</div>`}</div>`;
}

function renderTasks(){
  const items=[...state.tasks].sort((a,b)=>(a.done-b.done)||((a.date||'9999').localeCompare(b.date||'9999')));
  document.getElementById('tasksView').innerHTML=`
    <div class="page-toolbar">
      <div class="left">
        <input placeholder="Пошук справ…" oninput="filterRows('tasksTable',this.value)">
        <select onchange="filterTaskStatus(this.value)"><option value="all">Усі</option><option value="open">Відкриті</option><option value="done">Готові</option></select>
      </div>
      <button class="gold-btn" onclick="openAdd('task')">＋ Додати справу</button>
    </div>
    <div class="data-card">${items.length?`
      <table class="data-table" id="tasksTable">
        <thead><tr><th>✓</th><th>Справа</th><th>Категорія</th><th>Дедлайн</th><th>Час</th><th>Пріоритет</th><th>Проєкт</th><th></th></tr></thead>
        <tbody>${items.map(x=>`<tr data-done="${x.done?'1':'0'}" data-search="${esc(`${x.title} ${x.category} ${x.project}`.toLowerCase())}" style="${x.done?'opacity:.5':''}">
          <td><button class="check ${x.done?'done':''}" onclick="toggleTask('${x.id}')">${x.done?'✓':''}</button></td>
          <td><b>${esc(x.title)}</b><small>${esc(x.notes||'')}</small></td><td>${esc(x.category||'—')}</td>
          <td>${x.date?fmtDate(x.date):'—'}</td><td>${esc(x.time||'—')}</td><td><span class="priority ${priorityClass(x.priority)}">${esc(x.priority||'Середній')}</span></td>
          <td>${esc(x.project||'—')}</td><td>${actions('task',x.id)}</td>
        </tr>`).join('')}</tbody>
      </table>`:`<div class="empty-state">Справ ще немає.</div>`}</div>`;
}

function renderProjects(){
  const items=[...state.projects].sort((a,b)=>(a.status==='Завершено')-(b.status==='Завершено'));
  document.getElementById('projectsView').innerHTML=`
    <div class="page-toolbar">
      <div class="left"><input placeholder="Пошук проєктів…" oninput="filterCards('projectGrid',this.value)"></div>
      <button class="gold-btn" onclick="openAdd('project')">＋ Додати проєкт</button>
    </div>
    <div class="project-grid" id="projectGrid">
      ${items.length?items.map(x=>`<div class="project-card" data-search="${esc(`${x.title} ${x.category} ${x.next}`.toLowerCase())}">
        <h3>${esc(x.title)}</h3><div class="meta">${esc(x.category||'Проєкт')} · ${esc(x.status||'Активний')}</div>
        <div class="progress"><span style="width:${Number(x.progress)||0}%"></span></div>
        <div class="meta">${Number(x.progress)||0}% · дедлайн ${x.deadline?fmtDate(x.deadline):'не задано'}</div>
        <div class="next"><b>Наступний крок:</b><br>${esc(x.next||'—')}</div>
        <div class="project-actions">${actionsInner('project',x.id)}</div>
      </div>`).join(''):`<div class="empty-state">Проєктів ще немає.</div>`}
    </div>`;
}

function renderNotes(){
  const items=[...state.notes].sort((a,b)=>(b.updated||'').localeCompare(a.updated||''));
  document.getElementById('notesView').innerHTML=`
    <div class="page-toolbar">
      <div class="left"><input placeholder="Пошук нотаток…" oninput="filterCards('noteGrid',this.value)"></div>
      <button class="gold-btn" onclick="openAdd('note')">＋ Додати нотатку</button>
    </div>
    <div class="note-grid" id="noteGrid">
      ${items.length?items.map(x=>`<div class="note-card" data-search="${esc(`${x.title} ${x.text} ${x.tag}`.toLowerCase())}">
        <h3>${esc(x.title||'Без назви')}</h3><p>${esc(x.text||'')}</p>
        <footer><span>${esc(x.tag||'Нотатка')}</span><span>${x.updated?fmtDate(x.updated.slice(0,10)):'—'}</span></footer>
        <div class="project-actions">${actionsInner('note',x.id)}</div>
      </div>`).join(''):`<div class="empty-state">Нотаток ще немає.</div>`}
    </div>`;
}

function actions(type,id){return `<div class="actions">${actionsInner(type,id)}</div>`}
function actionsInner(type,id){return `<button class="action-btn" onclick="editEntry('${type}','${id}')">✎</button><button class="action-btn" onclick="deleteEntry('${type}','${id}')">×</button>`}

function filterRows(id,q){
  q=q.toLowerCase();
  document.querySelectorAll(`#${id} tbody tr`).forEach(r=>r.style.display=(r.dataset.search||'').includes(q)?'':'none');
}
function filterTaskStatus(v){
  document.querySelectorAll('#tasksTable tbody tr').forEach(r=>{
    r.style.display=v==='all'||(v==='done'&&r.dataset.done==='1')||(v==='open'&&r.dataset.done==='0')?'':'none';
  });
}
function filterCards(id,q){
  q=q.toLowerCase();
  document.querySelectorAll(`#${id} [data-search]`).forEach(x=>x.style.display=(x.dataset.search||'').includes(q)?'':'none');
}

function switchView(v){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.getElementById(v+'View').classList.add('active');
  document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===v));
  window.scrollTo({top:0,behavior:'smooth'});
}

function openModal(){
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('typeGrid').classList.remove('hidden');
  document.getElementById('entryForm').classList.add('hidden');
  document.getElementById('modalTitle').textContent='Що додаємо?';
}
function closeModal(){document.getElementById('modal').classList.add('hidden')}
function openAdd(type){openModal();showForm(type)}
function showForm(type,item={}){
  document.getElementById('typeGrid').classList.add('hidden');
  document.getElementById('entryForm').classList.remove('hidden');
  document.getElementById('entryType').value=type;
  document.getElementById('entryId').value=item.id||'';
  const name={class:'Заняття',task:'Справа',project:'Проєкт',note:'Нотатка'}[type];
  document.getElementById('modalTitle').textContent=(item.id?'Редагувати · ':'Додати · ')+name;
  document.getElementById('formFields').innerHTML=formMarkup(type,item);
}

function inputField(name,label,type='text',value='',placeholder='',full=false,required=false){
  return `<div class="field ${full?'full':''}"><label>${label}</label><input name="${name}" type="${type}" value="${esc(value??'')}" placeholder="${esc(placeholder)}" ${required?'required':''}></div>`;
}
function textareaField(name,label,value=''){return `<div class="field full"><label>${label}</label><textarea name="${name}">${esc(value??'')}</textarea></div>`}
function selectField(name,label,opts,value=''){return `<div class="field"><label>${label}</label><select name="${name}">${opts.map(o=>`<option ${o===value?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`}
function formMarkup(type,x){
  if(type==='class')return `<div class="form-grid">
    ${inputField('group','Група','text',x.group,'РЕМС-44',false,true)}
    ${inputField('subject','Дисципліна','text',x.subject,'Режисура естради і шоу',false,true)}
    ${inputField('date','Дата','date',x.date||isoToday(),'',false,true)}
    ${lessonSlotSelect(x)}
    ${inputField('time','Час початку','time',x.time)}
    ${inputField('end','Час завершення','time',x.end)}
    ${lessonTypeSelect(x)}
    ${roomSelect(x)}
    ${inputField('location','Уточнення місця','text',x.location,'КНУКіМ / онлайн')}
        ${inputField('topic','Тема / що робимо','text',x.topic,'',true)}
    ${textareaField('prep','Що підготувати',x.prep)}
  </div>`;
  if(type==='task')return `<div class="form-grid">
    ${inputField('title','Що треба зробити?','text',x.title,'',true,true)}
    ${selectField('category','Категорія',['Викладання','Студенти','Кафедра','Проєкти','Наука','Особисте'],x.category||'Викладання')}
    ${inputField('date','Дедлайн','date',x.date)}
    ${inputField('time','Час','time',x.time)}
    ${selectField('priority','Пріоритет',['Критично','Високий','Середній','Низький'],x.priority||'Середній')}
    ${inputField('project','Проєкт','text',x.project,'Необовʼязково')}
    ${textareaField('notes','Нотатка',x.notes)}
  </div>`;
  if(type==='project')return `<div class="form-grid">
    ${inputField('title','Назва проєкту','text',x.title,'',true,true)}
    ${selectField('category','Категорія',['Викладання','Студенти','Кафедра','Проєкти','Наука','Особисте'],x.category||'Проєкти')}
    ${inputField('deadline','Дедлайн','date',x.deadline)}
    ${selectField('status','Статус',['Ідея','Активний','Пауза','Завершено'],x.status||'Активний')}
    ${inputField('progress','Прогрес, %','number',x.progress??0,'0–100')}
    ${inputField('next','Наступний крок','text',x.next,'Що робимо далі?',true)}
    ${textareaField('notes','Нотатки',x.notes)}
  </div>`;
  return `<div class="form-grid">
    ${inputField('title','Назва','text',x.title,'',true,true)}
    ${inputField('tag','Тег','text',x.tag,'Ідея')}
    ${textareaField('text','Текст нотатки',x.text)}
  </div>`;
}

function editEntry(type,id){
  const key=type==='class'?'classes':type==='task'?'tasks':type==='project'?'projects':'notes';
  const item=state[key].find(x=>x.id===id);if(!item)return;
  openModal();showForm(type,item);
}
function deleteEntry(type,id){
  const key=type==='class'?'classes':type==='task'?'tasks':type==='project'?'projects':'notes';
  const item=state[key].find(x=>x.id===id);if(!item)return;
  if(!confirm(`Видалити «${item.title||item.subject||'цей запис'}»?`))return;
  state[key]=state[key].filter(x=>x.id!==id);save();toast('Видалено');
}
function toggleTask(id){
  const x=state.tasks.find(x=>x.id===id);if(!x)return;
  x.done=!x.done;save();toast(x.done?'Готово ✓':'Повернуто в роботу');
}
function submitEntry(e){
  e.preventDefault();
  const type=document.getElementById('entryType').value;
  const id=document.getElementById('entryId').value;
  const data=Object.fromEntries(new FormData(e.target).entries());
  delete data.lessonSlot;
  if(type==='class'){
    if(data.lessonType!=='Інше') data.lessonTypeCustom='';
    data.room=data.roomChoice==='Інше'?(data.roomCustom||''):data.roomChoice;
    delete data.roomChoice;
    delete data.roomCustom;
  }
  const key=type==='class'?'classes':type==='task'?'tasks':type==='project'?'projects':'notes';
  if(type==='project')data.progress=Math.max(0,Math.min(100,Number(data.progress)||0));
  if(type==='task'&&!id)data.done=false;
  if(type==='note')data.updated=new Date().toISOString();
  if(id){
    const i=state[key].findIndex(x=>x.id===id);
    state[key][i]={...state[key][i],...data};
  }else{
    data.id=uid(type);state[key].push(data);
  }
  closeModal();save();toast(id?'Оновлено':'Додано');
}

function doSearch(){
  const q=document.getElementById('searchInput').value.toLowerCase().trim();
  const box=document.getElementById('searchResults');
  if(!q){box.innerHTML='';return}
  const hits=[];
  state.classes.forEach(x=>{if(`${x.group} ${x.subject} ${x.topic} ${x.prep||''} ${x.room}`.toLowerCase().includes(q))hits.push(['ЗАНЯТТЯ',`${x.group} · ${x.subject}`])});
  state.tasks.forEach(x=>{if(`${x.title} ${x.category} ${x.project}`.toLowerCase().includes(q))hits.push(['СПРАВА',x.title])});
  state.projects.forEach(x=>{if(`${x.title} ${x.category} ${x.next}`.toLowerCase().includes(q))hits.push(['ПРОЄКТ',x.title])});
  state.notes.forEach(x=>{if(`${x.title} ${x.text}`.toLowerCase().includes(q))hits.push(['НОТАТКА',x.title])});
  box.innerHTML=hits.length?hits.slice(0,20).map(x=>`<div class="search-hit"><b>${x[0]}</b>${esc(x[1])}</div>`).join(''):`<div class="search-hit">Нічого не знайдено</div>`;
}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window._toast);window._toast=setTimeout(()=>t.classList.remove('show'),1700)}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`FISHER-control-${isoToday()}.json`;a.click();URL.revokeObjectURL(a.href)}
function importData(file){const r=new FileReader();r.onload=()=>{try{Object.assign(state,seed,JSON.parse(r.result));save();toast('Дані імпортовано')}catch(e){alert('Не вдалося прочитати файл.')}};r.readAsText(file)}

document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
document.getElementById('fab').addEventListener('click',openModal);
document.getElementById('closeModal').addEventListener('click',closeModal);
document.getElementById('cancelBtn').addEventListener('click',closeModal);
document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
document.getElementById('dayOverlay').addEventListener('click',e=>{if(e.target.id==='dayOverlay')closeDayOverlay()});
document.querySelectorAll('#typeGrid [data-type]').forEach(b=>b.addEventListener('click',()=>showForm(b.dataset.type)));
document.getElementById('entryForm').addEventListener('submit',submitEntry);
document.getElementById('searchBtn').addEventListener('click',()=>document.getElementById('searchBox').classList.toggle('hidden'));
document.getElementById('searchInput').addEventListener('input',doSearch);
document.getElementById('exportBtn').addEventListener('click',exportData);
document.getElementById('importFile').addEventListener('change',e=>e.target.files[0]&&importData(e.target.files[0]));

renderAll();

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
