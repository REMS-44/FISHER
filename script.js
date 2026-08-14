
const STORAGE_KEY = 'personal-control-v1';

const state = loadState();
let currentView = 'dashboard';

const uaMonths = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];
const uaDays = ['Неділя','Понеділок','Вівторок','Середа','Четвер','Пʼятниця','Субота'];
const shortDays = ['НД','ПН','ВТ','СР','ЧТ','ПТ','СБ'];

function emptyState(){
  return {
    tasks: [],
    classes: [],
    projects: [],
    notes: []
  };
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? {...emptyState(), ...JSON.parse(raw)} : emptyState();
  }catch(e){
    return emptyState();
  }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}

function uid(prefix='id'){
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
}

function isoToday(){
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,10);
}

function parseDate(s){
  if(!s) return null;
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y,m-1,d);
}

function fmtDate(s, long=false){
  const d = parseDate(s);
  if(!d) return '—';
  if(long) return `${d.getDate()} ${uaMonths[d.getMonth()]}`;
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
}

function fmtDayHeading(d){
  return `${d.getDate()} ${uaMonths[d.getMonth()]}`;
}

function dueLabel(date){
  if(!date) return '';
  const today = parseDate(isoToday());
  const target = parseDate(date);
  const diff = Math.round((target - today)/86400000);
  if(diff < 0) return {text:`прострочено ${Math.abs(diff)} дн.`, cls:'red'};
  if(diff === 0) return {text:'сьогодні', cls:'red'};
  if(diff === 1) return {text:'завтра', cls:'yellow'};
  if(diff <= 3) return {text:`через ${diff} дн.`, cls:'yellow'};
  return {text:fmtDate(date), cls:''};
}

function esc(s=''){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function todayHeader(){
  const d = new Date();
  document.getElementById('todayEyebrow').textContent = `${uaDays[d.getDay()].toUpperCase()} · ${d.getDate()} ${uaMonths[d.getMonth()].toUpperCase()}`;
}

function getTodayClasses(){
  return state.classes.filter(x => x.date === isoToday()).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
}
function getOpenTasks(){
  return state.tasks.filter(x => !x.done);
}
function getOverdueTasks(){
  const t = isoToday();
  return state.tasks.filter(x => !x.done && x.date && x.date < t);
}
function getActiveProjects(){
  return state.projects.filter(x => x.status !== 'Завершено');
}

function renderAll(){
  todayHeader();
  renderDashboard();
  renderWeek();
  renderClasses();
  renderTasks();
  renderProjects();
  renderNotes();
  if(!document.getElementById('searchPanel').classList.contains('hidden')) renderSearch();
}

function renderDashboard(){
  const todayClasses = getTodayClasses();
  const openTasks = getOpenTasks();
  const overdue = getOverdueTasks();
  const activeProjects = getActiveProjects();
  const urgent = openTasks
    .filter(x => x.date)
    .sort((a,b)=>a.date.localeCompare(b.date))
    .filter(x => {
      const d = dueLabel(x.date);
      return ['red','yellow'].includes(d.cls);
    }).slice(0,6);

  const timeline = [
    ...todayClasses.map(x => ({
      time:x.time || '—',
      title:`${x.group || 'Заняття'} · ${x.subject || x.title || ''}`,
      sub:[x.room && `ауд. ${x.room}`, x.topic].filter(Boolean).join(' · '),
      tag:'ЗАНЯТТЯ',
      type:'class'
    })),
    ...openTasks.filter(x => x.date === isoToday()).map(x => ({
      time:x.time || '—',
      title:x.title,
      sub:[x.category,x.project].filter(Boolean).join(' · '),
      tag:'СПРАВА',
      type:'task'
    }))
  ].sort((a,b)=>(a.time||'').localeCompare(b.time||''));

  document.getElementById('dashboardView').innerHTML = `
    <div class="dashboard-grid">
      ${kpi('ЗАНЯТЬ СЬОГОДНІ', todayClasses.length, todayClasses.length ? 'розклад на сьогодні' : 'нічого не внесено')}
      ${kpi('ВІДКРИТИХ СПРАВ', openTasks.length, openTasks.length ? 'ще треба зробити' : 'чисто')}
      ${kpi('ПРОСТРОЧЕНО', overdue.length, overdue.length ? 'потребує уваги' : 'усе в строк')}
      ${kpi('АКТИВНИХ ПРОЄКТІВ', activeProjects.length, activeProjects.length ? 'у роботі' : 'немає активних')}
    </div>

    <div class="main-grid">
      <div class="card">
        <div class="card-head"><h3>СЬОГОДНІ</h3><small>${timeline.length} подій</small></div>
        <div class="card-body">
          ${timeline.length ? `<div class="timeline">${timeline.map(item => `
            <div class="timeline-item">
              <div class="time">${esc(item.time)}</div>
              <div><div class="item-title">${esc(item.title)}</div><div class="item-sub">${esc(item.sub || '')}</div></div>
              <span class="pill">${item.tag}</span>
            </div>`).join('')}</div>` : emptyBlock('На сьогодні поки нічого','Додай заняття або справу через «+».')}
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>ЩО ГОРИТЬ</h3><small>найближчі дедлайни</small></div>
        <div class="card-body">
          ${urgent.length ? `<div class="burn-list">${urgent.map(x => {
            const d = dueLabel(x.date);
            return `<div class="burn-item">
              <div class="burn-copy"><span class="dot"></span><div>${esc(x.title)}</div></div>
              <span class="pill ${d.cls}">${esc(d.text)}</span>
            </div>`;
          }).join('')}</div>` : emptyBlock('Нічого критичного','Термінових дедлайнів немає.')}
        </div>
      </div>
    </div>
  `;
}

function kpi(label, value, note){
  return `<div class="kpi"><small>${label}</small><strong>${value}</strong><em>${esc(note)}</em></div>`;
}
function emptyBlock(title, sub){
  return `<div class="empty"><div><b>${title}</b><span>${sub}</span></div></div>`;
}

function startOfWeek(){
  const d = new Date();
  const day = d.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate()+delta);
  d.setHours(0,0,0,0);
  return d;
}
function isoLocal(d){
  const x = new Date(d);
  x.setMinutes(x.getMinutes()-x.getTimezoneOffset());
  return x.toISOString().slice(0,10);
}

function renderWeek(){
  const start = startOfWeek();
  let cols = '';
  for(let i=0;i<7;i++){
    const d = new Date(start);
    d.setDate(start.getDate()+i);
    const iso = isoLocal(d);
    const classes = state.classes.filter(x=>x.date===iso).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    const tasks = state.tasks.filter(x=>x.date===iso && !x.done).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    const projects = state.projects.filter(x=>x.deadline===iso && x.status !== 'Завершено');
    const load = Math.min(100, classes.length*28 + tasks.length*14 + projects.length*18);
    const items = [
      ...classes.map(x=>({kind:'class',time:x.time,title:`${x.group || ''} ${x.subject || x.title || ''}`.trim()})),
      ...tasks.map(x=>({kind:'task',time:x.time,title:x.title})),
      ...projects.map(x=>({kind:'project',time:'',title:`Дедлайн: ${x.title}`}))
    ].sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
    cols += `
      <div class="day-col">
        <div class="day-head ${iso===isoToday()?'today':''}">
          <div class="day-name">${shortDays[d.getDay()]}</div>
          <div class="day-date">${fmtDayHeading(d)}</div>
          <div class="load"><span style="width:${load}%"></span></div>
        </div>
        <div class="day-body">
          ${items.length ? items.map(x=>`
            <div class="week-item ${x.kind}">
              ${x.time ? `<time>${esc(x.time)}</time>`:''}
              <b>${esc(x.title)}</b>
            </div>`).join('') : `<div class="empty" style="min-height:110px;padding:15px">—</div>`}
        </div>
      </div>`;
  }
  document.getElementById('weekView').innerHTML = `
    <div class="section-toolbar">
      <div class="pill">Поточний тиждень</div>
      <small style="color:var(--muted)">Чим більше занять і справ — тим заповненіша смуга навантаження.</small>
    </div>
    <div class="week-board">${cols}</div>`;
}

function renderClasses(){
  const items = [...state.classes].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  document.getElementById('classesView').innerHTML = `
    <div class="section-toolbar">
      <input id="classFilter" placeholder="Пошук за групою, дисципліною або темою…" oninput="filterList('classes',this.value)">
      <button class="ghost-btn" onclick="openAdd('class')">＋ Додати заняття</button>
    </div>
    <div id="classesList" class="list">
      ${items.length ? items.map(x=>classRow(x)).join('') : emptyBlock('Занять ще немає','Додай першу пару, консультацію, репетицію або показ.')}
    </div>`;
}
function classRow(x){
  return `<div class="list-row" data-search="${esc(`${x.group} ${x.subject} ${x.topic} ${x.room}`.toLowerCase())}">
    <div class="list-main"><b>${esc(x.group || 'Без групи')} · ${esc(x.subject || 'Заняття')}</b><small>${esc(x.topic || '')}</small></div>
    <div class="list-cell"><b>${fmtDate(x.date,true)}</b><small>${esc(x.time || 'час не вказано')}</small></div>
    <div class="list-cell"><b>${esc(x.room || '—')}</b><small>аудиторія</small></div>
    <div class="list-cell"><b>${esc(x.status || 'Заплановано')}</b><small>статус</small></div>
    ${rowActions('class',x.id)}
  </div>`;
}

function renderTasks(){
  const items = [...state.tasks].sort((a,b)=>{
    if(a.done!==b.done) return a.done?1:-1;
    return (a.date||'9999').localeCompare(b.date||'9999') || (a.time||'').localeCompare(b.time||'');
  });
  document.getElementById('tasksView').innerHTML = `
    <div class="section-toolbar">
      <input id="taskFilter" placeholder="Пошук справ…" oninput="filterList('tasks',this.value)">
      <select id="taskStatusFilter" onchange="filterTasksStatus(this.value)">
        <option value="all">Усі</option>
        <option value="open">Відкриті</option>
        <option value="done">Готові</option>
      </select>
      <button class="ghost-btn" onclick="openAdd('task')">＋ Додати справу</button>
    </div>
    <div id="tasksList" class="list">
      ${items.length ? items.map(x=>taskRow(x)).join('') : emptyBlock('Справ ще немає','Додай першу задачу через «+».')}
    </div>`;
}
function taskRow(x){
  const d = dueLabel(x.date);
  return `<div class="list-row ${x.done?'completed':''}" data-done="${x.done?'1':'0'}" data-search="${esc(`${x.title} ${x.category} ${x.project}`.toLowerCase())}">
    <div class="list-main">
      <div class="task-title-wrap">
        <button class="checkbox ${x.done?'done':''}" onclick="toggleTask('${x.id}')">${x.done?'✓':''}</button>
        <div><b>${esc(x.title)}</b><small>${esc([x.category,x.project].filter(Boolean).join(' · '))}</small></div>
      </div>
    </div>
    <div class="list-cell"><b>${x.date?fmtDate(x.date,true):'Без дати'}</b><small>${esc(x.time||'')}</small></div>
    <div class="list-cell"><span class="pill ${d.cls}">${esc(d.text || 'без дедлайну')}</span></div>
    <div class="list-cell"><b>${esc(x.priority || 'Середній')}</b><small>пріоритет</small></div>
    ${rowActions('task',x.id)}
  </div>`;
}

function renderProjects(){
  const items = [...state.projects].sort((a,b)=>(a.status==='Завершено')-(b.status==='Завершено') || (a.deadline||'9999').localeCompare(b.deadline||'9999'));
  document.getElementById('projectsView').innerHTML = `
    <div class="section-toolbar">
      <input id="projectFilter" placeholder="Пошук проєктів…" oninput="filterCards('projectsGrid',this.value)">
      <button class="ghost-btn" onclick="openAdd('project')">＋ Додати проєкт</button>
    </div>
    <div id="projectsGrid" class="project-grid">
      ${items.length ? items.map(x=>projectCard(x)).join('') : emptyBlock('Проєктів ще немає','Додай велику історію, яку хочеш тримати окремо від дрібних справ.')}
    </div>`;
}
function projectCard(x){
  const p = Math.max(0,Math.min(100,Number(x.progress)||0));
  return `<article class="project-card" data-search="${esc(`${x.title} ${x.category} ${x.next}`.toLowerCase())}">
    <div class="project-top">
      <div><h3>${esc(x.title)}</h3><div class="project-meta">${esc(x.category||'Проєкт')} · ${esc(x.status||'Активний')}</div></div>
      ${rowActions('project',x.id)}
    </div>
    <div class="progress"><span style="width:${p}%"></span></div>
    <div class="project-meta">${p}% · дедлайн ${x.deadline?fmtDate(x.deadline,true):'не задано'}</div>
    <div style="margin-top:13px"><small style="color:var(--muted)">НАСТУПНИЙ КРОК</small><div style="margin-top:5px">${esc(x.next||'—')}</div></div>
  </article>`;
}

function renderNotes(){
  const items = [...state.notes].sort((a,b)=>(b.updated||'').localeCompare(a.updated||''));
  document.getElementById('notesView').innerHTML = `
    <div class="section-toolbar">
      <input id="noteFilter" placeholder="Пошук нотаток…" oninput="filterCards('notesGrid',this.value)">
      <button class="ghost-btn" onclick="openAdd('note')">＋ Додати нотатку</button>
    </div>
    <div id="notesGrid" class="note-grid">
      ${items.length ? items.map(x=>noteCard(x)).join('') : emptyBlock('Нотаток ще немає','Ідеї, посилання, думки й усе, що не хочеться загубити.')}
    </div>`;
}
function noteCard(x){
  return `<article class="note-card" data-search="${esc(`${x.title} ${x.text}`.toLowerCase())}">
    <h3>${esc(x.title || 'Без назви')}</h3>
    <p>${esc(x.text || '')}</p>
    <footer><span>${esc(x.tag||'Нотатка')}</span><span>${fmtDate((x.updated||'').slice(0,10))}</span></footer>
    <div class="row-actions" style="margin-top:10px">${rowActionsInner('note',x.id)}</div>
  </article>`;
}

function rowActions(type,id){
  return `<div class="row-actions">${rowActionsInner(type,id)}</div>`;
}
function rowActionsInner(type,id){
  return `<button title="Редагувати" onclick="editEntry('${type}','${id}')">✎</button><button title="Видалити" onclick="deleteEntry('${type}','${id}')">×</button>`;
}

function filterList(kind,q){
  q=q.toLowerCase().trim();
  const id = kind==='classes'?'classesList':'tasksList';
  document.querySelectorAll(`#${id} [data-search]`).forEach(el=>{
    el.style.display = el.dataset.search.includes(q)?'grid':'none';
  });
}
function filterTasksStatus(v){
  document.querySelectorAll('#tasksList [data-done]').forEach(el=>{
    el.style.display = v==='all' || (v==='done' && el.dataset.done==='1') || (v==='open' && el.dataset.done==='0') ? 'grid':'none';
  });
}
function filterCards(id,q){
  q=q.toLowerCase().trim();
  document.querySelectorAll(`#${id} [data-search]`).forEach(el=>{
    el.style.display = el.dataset.search.includes(q)?'block':'none';
  });
}

function toggleTask(id){
  const x=state.tasks.find(t=>t.id===id);
  if(!x)return;
  x.done=!x.done;
  saveState();
  toast(x.done?'Готово ✓':'Повернув у роботу');
}

function deleteEntry(type,id){
  const key = type==='class'?'classes':type==='task'?'tasks':type==='project'?'projects':'notes';
  const item=state[key].find(x=>x.id===id);
  if(!item)return;
  if(!confirm(`Видалити «${item.title || item.subject || 'цей запис'}»?`)) return;
  state[key]=state[key].filter(x=>x.id!==id);
  saveState();
  toast('Видалено');
}

function openModal(){
  document.getElementById('modalBackdrop').classList.remove('hidden');
  document.getElementById('typePicker').classList.remove('hidden');
  document.getElementById('entryForm').classList.add('hidden');
  document.getElementById('modalTitle').textContent='Що додаємо?';
}
function closeModal(){
  document.getElementById('modalBackdrop').classList.add('hidden');
}
function openAdd(type){
  openModal();
  showForm(type);
}
function showForm(type, item=null){
  document.getElementById('typePicker').classList.add('hidden');
  document.getElementById('entryForm').classList.remove('hidden');
  document.getElementById('entryType').value=type;
  document.getElementById('entryId').value=item?.id || '';
  const titles={task:'Справа',class:'Заняття',project:'Проєкт',note:'Нотатка'};
  document.getElementById('modalTitle').textContent=(item?'Редагувати · ':'Додати · ')+titles[type];
  document.getElementById('formFields').innerHTML = formMarkup(type,item);
}

function formMarkup(type,x={}){
  if(type==='task') return `<div class="form-grid">
    ${field('title','Що треба зробити?','text',x.title,'Наприклад: підготувати матеріали РЕМС-44',true)}
    ${selectField('category','Категорія',['Викладання','Студенти','Кафедра','Проєкти','Наука','Особисте'],x.category)}
    ${field('date','Дедлайн','date',x.date)}
    ${field('time','Час','time',x.time)}
    ${selectField('priority','Пріоритет',['Критично','Високий','Середній','Низький'],x.priority||'Середній')}
    ${field('project','Проєкт','text',x.project,'Необовʼязково')}
    ${textareaField('notes','Нотатка',x.notes)}
  </div>`;
  if(type==='class') return `<div class="form-grid">
    ${field('group','Група','text',x.group,'РЕМС-44',true)}
    ${field('subject','Дисципліна','text',x.subject,'Режисура естради і шоу',true)}
    ${field('date','Дата','date',x.date||isoToday(),'',true)}
    ${field('time','Час','time',x.time)}
    ${field('room','Аудиторія','text',x.room,'324')}
    ${selectField('status','Статус',['Заплановано','Проведено','Перенесено','Скасовано'],x.status||'Заплановано')}
    ${field('topic','Тема / що робимо','text',x.topic,'')}
    ${textareaField('prep','Що підготувати',x.prep)}
  </div>`;
  if(type==='project') return `<div class="form-grid">
    ${field('title','Назва проєкту','text',x.title,'Наприклад: сайт РЕМС-44',true)}
    ${selectField('category','Категорія',['Викладання','Студенти','Кафедра','Проєкти','Наука','Особисте'],x.category||'Проєкти')}
    ${field('deadline','Дедлайн','date',x.deadline)}
    ${selectField('status','Статус',['Ідея','Активний','Пауза','Завершено'],x.status||'Активний')}
    ${field('progress','Прогрес, %','number',x.progress ?? 0,'0–100')}
    ${field('next','Наступний крок','text',x.next,'Що конкретно робимо далі?')}
    ${textareaField('notes','Нотатки',x.notes)}
  </div>`;
  return `<div class="form-grid">
    ${field('title','Назва','text',x.title,'Коротка назва',true)}
    ${field('tag','Категорія / тег','text',x.tag,'Ідея')}
    ${textareaField('text','Текст нотатки',x.text,true)}
  </div>`;
}
function field(name,label,type='text',value='',placeholder='',full=false){
  return `<div class="field ${full?'full':''}"><label>${label}</label><input name="${name}" type="${type}" value="${esc(value??'')}" placeholder="${esc(placeholder)}" ${full?'required':''}></div>`;
}
function textareaField(name,label,value='',full=true){
  return `<div class="field ${full?'full':''}"><label>${label}</label><textarea name="${name}">${esc(value??'')}</textarea></div>`;
}
function selectField(name,label,options,value=''){
  return `<div class="field"><label>${label}</label><select name="${name}">${options.map(o=>`<option ${o===value?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`;
}

function editEntry(type,id){
  const key = type==='class'?'classes':type==='task'?'tasks':type==='project'?'projects':'notes';
  const item=state[key].find(x=>x.id===id);
  if(!item)return;
  openModal();
  showForm(type,item);
}

function submitEntry(e){
  e.preventDefault();
  const form = new FormData(e.target);
  const type=document.getElementById('entryType').value;
  const id=document.getElementById('entryId').value;
  const data=Object.fromEntries(form.entries());
  const key = type==='class'?'classes':type==='task'?'tasks':type==='project'?'projects':'notes';

  if(type==='project') data.progress=Math.max(0,Math.min(100,Number(data.progress)||0));
  if(type==='task' && !id) data.done=false;
  if(type==='note') data.updated=new Date().toISOString();

  if(id){
    const idx=state[key].findIndex(x=>x.id===id);
    state[key][idx]={...state[key][idx],...data};
  }else{
    data.id=uid(type);
    state[key].push(data);
  }
  closeModal();
  saveState();
  toast(id?'Оновлено':'Додано');
}

function switchView(view){
  currentView=view;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(`${view}View`).classList.add('active');
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const titles={dashboard:'Головна',week:'Мій тиждень',classes:'Заняття',tasks:'Справи',projects:'Проєкти',notes:'Нотатки'};
  document.getElementById('pageTitle').textContent=titles[view];
  window.scrollTo({top:0,behavior:'smooth'});
}

function renderSearch(){
  const q=document.getElementById('globalSearch').value.toLowerCase().trim();
  const box=document.getElementById('searchResults');
  if(!q){box.innerHTML='';return}
  const hits=[];
  state.tasks.forEach(x=>{ if(`${x.title} ${x.category} ${x.project} ${x.notes}`.toLowerCase().includes(q)) hits.push(['СПРАВА',x.title]); });
  state.classes.forEach(x=>{ if(`${x.group} ${x.subject} ${x.topic} ${x.room}`.toLowerCase().includes(q)) hits.push(['ЗАНЯТТЯ',`${x.group} · ${x.subject}`]); });
  state.projects.forEach(x=>{ if(`${x.title} ${x.category} ${x.next} ${x.notes}`.toLowerCase().includes(q)) hits.push(['ПРОЄКТ',x.title]); });
  state.notes.forEach(x=>{ if(`${x.title} ${x.text} ${x.tag}`.toLowerCase().includes(q)) hits.push(['НОТАТКА',x.title]); });
  box.innerHTML=hits.length?hits.slice(0,20).map(h=>`<div class="search-hit"><small>${h[0]}</small>${esc(h[1])}</div>`).join(''):`<div class="search-hit">Нічого не знайдено</div>`;
}

function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  clearTimeout(window.__toast);
  window.__toast=setTimeout(()=>t.classList.remove('show'),1800);
}

function exportData(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`control-backup-${isoToday()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function importData(file){
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result);
      Object.assign(state,emptyState(),data);
      saveState();
      toast('Дані імпортовано');
    }catch(e){ alert('Не вдалося прочитати файл резервної копії.');}
  };
  reader.readAsText(file);
}

document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
document.getElementById('addBtn').addEventListener('click',openModal);
document.getElementById('mobileAddBtn').addEventListener('click',openModal);
document.getElementById('closeModal').addEventListener('click',closeModal);
document.getElementById('cancelForm').addEventListener('click',closeModal);
document.getElementById('modalBackdrop').addEventListener('click',e=>{if(e.target.id==='modalBackdrop')closeModal()});
document.querySelectorAll('#typePicker button').forEach(b=>b.addEventListener('click',()=>showForm(b.dataset.type)));
document.getElementById('entryForm').addEventListener('submit',submitEntry);
document.getElementById('searchToggle').addEventListener('click',()=>{
  document.getElementById('searchPanel').classList.toggle('hidden');
  setTimeout(()=>document.getElementById('globalSearch').focus(),0);
});
document.getElementById('globalSearch').addEventListener('input',renderSearch);
document.getElementById('backupBtn').addEventListener('click',exportData);
document.getElementById('importInput').addEventListener('change',e=>e.target.files[0]&&importData(e.target.files[0]));

renderAll();

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
