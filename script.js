
const KEY='fisher-control-v3';

const seed={classes:[],tasks:[],projects:[],notes:[]};
const state=load();
let currentYear=(new Date()).getFullYear();

function load(){try{return {...seed,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(e){return structuredClone(seed)}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));renderAll()}
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
function todayClasses(){return state.classes.filter(x=>x.date===isoToday()).sort((a,b)=>(a.time||'').localeCompare(b.time||''))}
function openTasks(){return state.tasks.filter(x=>!x.done)}
function activeProjects(){return state.projects.filter(x=>x.status!=='Завершено')}

function headerDate(){
  const d=new Date();
  document.getElementById('todayLabel').textContent=`${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function renderAll(){
  headerDate();
  renderHome();
  renderYearPage();
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
    ...tClasses.map((x,i)=>({time:x.time||'—',end:x.end||'',title:x.subject||'Заняття',sub:[x.group,x.room&&`ауд. ${x.room}`].filter(Boolean).join(' · '),badge:'ЗАНЯТТЯ',color:typeColor(i)})),
    ...todayTasks.map((x,i)=>({time:x.time||'—',title:x.title,sub:x.category||'',badge:'СПРАВА',color:typeColor(i+2)}))
  ].sort((a,b)=>(a.time||'').localeCompare(b.time||''));

  const upcoming=[
    ...openTasks().filter(x=>x.date && x.date>=isoToday()).map(x=>({date:x.date,title:x.title,sub:x.category||'',time:x.time||''})),
    ...state.classes.filter(x=>x.date>isoToday()).map(x=>({date:x.date,title:x.subject||'Заняття',sub:x.group||'',time:x.time||''}))
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
              <div class="today-main"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></div>
              <span class="badge ${x.color}">${x.badge}</span>
            </div>`).join('')}</div>`:
            `<div class="empty-state">На сьогодні поки нічого не внесено.</div>`}
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="card-title"><span class="icon">▣</span>НАЙБЛИЖЧЕ</div>
          <button class="card-link" onclick="switchView('tasks')">Усі події →</button>
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
        <div class="card-title"><span class="icon">▤</span>КАЛЕНДАР НА РІК</div>
        <div class="year-toolbar">
          <button onclick="changeYear(-1)">←</button>
          <select id="yearSelect" onchange="setYear(this.value)">
            ${yearOptions()}
          </select>
          <button onclick="changeYear(1)">→</button>
        </div>
      </div>
      ${renderYearCalendar(currentYear)}
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

function yearOptions(){
  const start=(new Date()).getFullYear()-2;
  return Array.from({length:7},(_,i)=>start+i).map(y=>`<option ${y===currentYear?'selected':''}>${y}</option>`).join('');
}
function setYear(y){currentYear=Number(y); renderHome(); renderYearPage();}
function changeYear(delta){currentYear+=delta; renderHome(); renderYearPage();}

function eventMapForYear(year){
  const map={};
  state.classes.forEach(x=>{if(x.date?.startsWith(String(year))) {map[x.date]=map[x.date]||new Set(); map[x.date].add('class');}});
  state.tasks.filter(x=>!x.done).forEach(x=>{if(x.date?.startsWith(String(year))) {map[x.date]=map[x.date]||new Set(); map[x.date].add('task');}});
  state.projects.filter(x=>x.status!=='Завершено').forEach(x=>{if(x.deadline?.startsWith(String(year))) {map[x.deadline]=map[x.deadline]||new Set(); map[x.deadline].add('project');}});
  return map;
}

function renderYearCalendar(year){
  const map=eventMapForYear(year);
  let html=`<div class="year-grid">`;
  for(let m=0;m<12;m++){
    html+=renderMonth(year,m,map);
  }
  html+=`</div>
    <div class="calendar-legend">
      <div class="legend-item"><span class="legend-swatch s-class"></span> заняття</div>
      <div class="legend-item"><span class="legend-swatch s-task"></span> справи</div>
      <div class="legend-item"><span class="legend-swatch s-project"></span> дедлайни проєктів</div>
      <div class="legend-item"><span class="legend-swatch s-today"></span> сьогодні</div>
    </div>`;
  return html;
}

function renderMonth(year, month, map){
  const first=new Date(year,month,1);
  const lastDay=new Date(year,month+1,0).getDate();
  const startOffset=(first.getDay()+6)%7;
  let days=`<div class="month-card"><div class="month-head"><b>${monthsNom[month]}</b><small>${year}</small></div>
    <div class="month-weekdays">${weekShort.map(d=>`<span>${d}</span>`).join('')}</div>
    <div class="month-days">`;
  for(let i=0;i<startOffset;i++) days+=`<div class="day empty"></div>`;
  for(let d=1;d<=lastDay;d++){
    const iso=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const ev=map[iso]?[...map[iso]]:[];
    let cls='';
    if(ev.length>1) cls='multi';
    else if(ev.includes('class')) cls='has-class';
    else if(ev.includes('task')) cls='has-task';
    else if(ev.includes('project')) cls='has-project';
    if(iso===isoToday()) cls=(cls?cls+' ':'')+'today';
    days+=`<div class="day ${cls}" title="${tooltipForDate(iso)}">${d}${ev.length?`<span class="dot"></span>`:''}</div>`;
  }
  days+='</div></div>';
  return days;
}
function tooltipForDate(iso){
  const items=[
    ...state.classes.filter(x=>x.date===iso).map(x=>`Заняття: ${x.subject||''} ${x.group?`(${x.group})`:''}`),
    ...state.tasks.filter(x=>!x.done && x.date===iso).map(x=>`Справа: ${x.title}`),
    ...state.projects.filter(x=>x.status!=='Завершено' && x.deadline===iso).map(x=>`Проєкт: ${x.title}`)
  ];
  return items.join(' | ') || fmtDate(iso);
}

function renderYearPage(){
  document.getElementById('yearView').innerHTML=`
    <div class="card year-card">
      <div class="card-head">
        <div class="card-title"><span class="icon">▤</span>РІЧНИЙ КАЛЕНДАР</div>
        <div class="year-toolbar">
          <button onclick="changeYear(-1)">←</button>
          <select onchange="setYear(this.value)">${yearOptions()}</select>
          <button onclick="changeYear(1)">→</button>
        </div>
      </div>
      ${renderYearCalendar(currentYear)}
    </div>`;
}

function renderWeek(){
  const start=startOfWeek();
  let html='<div class="week-full">';
  for(let i=0;i<7;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);const iso=isoLocal(d);
    const items=[
      ...state.classes.filter(x=>x.date===iso).map((x,j)=>({kind:'class',color:typeColor(j),time:x.time,title:`${x.group||''} · ${x.subject||'Заняття'}`,sub:x.room?`ауд. ${x.room}`:''})),
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
        <thead><tr><th>Дата</th><th>Час</th><th>Група</th><th>Дисципліна</th><th>Тема</th><th>Місце</th><th>Статус</th><th></th></tr></thead>
        <tbody>${items.map(x=>`<tr data-search="${esc(`${x.group} ${x.subject} ${x.topic} ${x.room}`.toLowerCase())}">
          <td>${fmtDate(x.date)}</td><td class="blue-text">${esc(x.time||'—')}</td><td>${esc(x.group||'—')}</td>
          <td><b>${esc(x.subject||'—')}</b></td><td>${esc(x.topic||'—')}</td><td><b>${esc(x.room||'—')}</b><small>${esc(x.location||'')}</small></td>
          <td>${esc(x.status||'Заплановано')}</td><td>${actions('class',x.id)}</td>
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
    ${inputField('time','Час початку','time',x.time)}
    ${inputField('end','Час завершення','time',x.end)}
    ${inputField('room','Аудиторія / місце','text',x.room,'324')}
    ${inputField('location','Уточнення місця','text',x.location,'КНУКіМ / онлайн')}
    ${selectField('status','Статус',['Заплановано','Проведено','Перенесено','Скасовано'],x.status||'Заплановано')}
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
  state.classes.forEach(x=>{if(`${x.group} ${x.subject} ${x.topic} ${x.room}`.toLowerCase().includes(q))hits.push(['ЗАНЯТТЯ',`${x.group} · ${x.subject}`])});
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
