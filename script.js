
const KEY='fisher-control-v4';
const BACKUP_KEY='fisher-control-backups-v1';

const seed={classes:[],tasks:[],projects:[],notes:[],templates:[]};
const state=load();
let currentYear=(new Date()).getFullYear();
let selectedMonthOffset=0;
let selectedDate=isoToday();

let recurrenceDraftDates=new Set();
let recurrenceExcludedDates=new Set();
let recurrenceOverrides={};
let recurrencePickerMonth=new Date();
let selectedDisciplineKey=null;
let selectedSemester=semesterKeyForDate(isoToday());

function load(){
  try{return {...seed,...JSON.parse(localStorage.getItem(KEY)||'{}')}}
  catch(e){return structuredClone(seed)}
}

function backupStamp(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function getBackups(){
  try{
    const arr=JSON.parse(localStorage.getItem(BACKUP_KEY)||'[]');
    return Array.isArray(arr)?arr:[];
  }catch(e){return []}
}

function setBackups(arr){
  localStorage.setItem(BACKUP_KEY,JSON.stringify(arr.slice(0,10)));
}

function snapshotCounts(snapshot){
  return {
    classes:(snapshot.classes||[]).length,
    tasks:(snapshot.tasks||[]).length,
    projects:(snapshot.projects||[]).length,
    notes:(snapshot.notes||[]).length
  };
}

function addBackupSnapshot(snapshot,reason='auto'){
  if(!snapshot || typeof snapshot!=='object')return;
  const clean={...seed,...snapshot};
  const serialized=JSON.stringify(clean);
  const backups=getBackups();

  if(backups[0] && JSON.stringify(backups[0].state)===serialized)return;

  backups.unshift({
    id:uid('backup'),
    ts:new Date().toISOString(),
    label:backupStamp(),
    reason,
    state:clean
  });
  setBackups(backups);
}

function archivePersistedState(){
  const raw=localStorage.getItem(KEY);
  if(!raw)return;
  try{addBackupSnapshot(JSON.parse(raw),'auto')}catch(e){}
}

function persistState(skipBackup=false){
  if(!skipBackup)archivePersistedState();
  localStorage.setItem(KEY,JSON.stringify(state));
}

function save(options={}){
  persistState(Boolean(options.skipBackup));
  renderAll();
  const overlay=document.getElementById('dayOverlay');
  if(overlay && !overlay.classList.contains('hidden')) renderDayOverlay();
  const backupOverlay=document.getElementById('backupOverlay');
  if(backupOverlay && !backupOverlay.classList.contains('hidden')) renderBackupManager();
}

function replaceState(snapshot){
  Object.keys(state).forEach(k=>delete state[k]);
  Object.assign(state,structuredClone(seed),structuredClone(snapshot||{}));
}

function downloadSnapshot(snapshot,filename){
  const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function manualBackup(){
  addBackupSnapshot(structuredClone(state),'manual');
  const d=new Date();
  const stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}-${String(d.getMinutes()).padStart(2,'0')}`;
  downloadSnapshot(state,`FISHER_${stamp}.json`);
  toast('Резервну копію створено');
  renderBackupManager();
}

function restoreBackup(id){
  const backup=getBackups().find(x=>x.id===id);
  if(!backup)return;
  if(!confirm(`Відновити стан за ${backup.label}? Поточний стан буде автоматично збережено в історії.`))return;

  addBackupSnapshot(structuredClone(state),'before-restore');
  replaceState(backup.state);
  persistState(true);
  renderAll();
  renderBackupManager();
  toast('Дані відновлено');
}

function deleteBackup(id){
  if(!confirm('Видалити цю резервну копію з історії?'))return;
  setBackups(getBackups().filter(x=>x.id!==id));
  renderBackupManager();
}

function openBackupManager(){
  document.getElementById('backupOverlay').classList.remove('hidden');
  renderBackupManager();
}
function closeBackupManager(){document.getElementById('backupOverlay').classList.add('hidden')}

function formatBackupDate(iso){
  const d=new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function renderBackupManager(){
  const host=document.getElementById('backupOverlayContent');
  if(!host)return;
  const backups=getBackups();

  host.innerHTML=`
    <div class="backup-actions-top">
      <button class="gold-btn" onclick="manualBackup()">＋ Зробити копію зараз</button>
      <span>Зберігаються останні 10 станів. Новіші — зверху.</span>
    </div>
    <div class="backup-list">
      ${backups.length?backups.map((b,i)=>{
        const c=snapshotCounts(b.state);
        const reason=b.reason==='manual'?'Ручна копія':b.reason==='before-restore'?'Перед відновленням':'Автоматична';
        return `<div class="backup-row">
          <div class="backup-index">${i+1}</div>
          <div class="backup-main">
            <b>${formatBackupDate(b.ts)}</b>
            <small>${reason} · ${c.classes} занять · ${c.tasks} справ · ${c.projects} проєктів · ${c.notes} нотаток</small>
          </div>
          <div class="backup-row-actions">
            <button onclick="restoreBackup('${b.id}')">Відновити</button>
            <button class="danger-lite" onclick="deleteBackup('${b.id}')">×</button>
          </div>
        </div>`;
      }).join(''):`<div class="backup-empty">Історії ще немає. Вона з'явиться після першої зміни даних або після ручної резервної копії.</div>`}
    </div>`;
}
function uid(p='x'){return p+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6)}
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function isoToday(){const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
function dateObj(s){if(!s)return null;const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
const months=['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];
const monthsNom=['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'];
const weekdays=['Неділя','Понеділок','Вівторок','Середа','Четвер','Пʼятниця','Субота'];
const weekShort=['ПН','ВТ','СР','ЧТ','ПТ','СБ','НД'];

function semesterKeyForDate(iso){
  const d=dateObj(iso)||new Date();
  const y=d.getFullYear(),m=d.getMonth()+1;
  if(m===1)return `autumn-${y-1}`;
  if(m>=8)return `autumn-${y}`;
  return `spring-${y}`;
}

function semesterInfo(key){
  const [kind,yearRaw]=String(key).split('-');
  const y=Number(yearRaw);
  if(kind==='autumn'){
    return {
      key,
      start:`${y}-08-01`,
      end:`${y+1}-01-31`,
      label:`Осінній семестр ${y}/${String(y+1).slice(-2)}`
    };
  }
  return {
    key,
    start:`${y}-02-01`,
    end:`${y}-07-31`,
    label:`Весняний семестр ${y-1}/${String(y).slice(-2)}`
  };
}

function semesterOptions(){
  const keys=new Set([semesterKeyForDate(isoToday())]);
  state.classes.forEach(x=>x.date&&keys.add(semesterKeyForDate(x.date)));
  return [...keys]
    .map(semesterInfo)
    .sort((a,b)=>a.start.localeCompare(b.start));
}

function classesForSemester(key=selectedSemester){
  const s=semesterInfo(key);
  return state.classes
    .filter(x=>x.date && x.date>=s.start && x.date<=s.end && x.status!=='Скасовано')
    .sort((a,b)=>(a.date+(a.time||'')).localeCompare(b.date+(b.time||'')));
}

function disciplineKey(x){
  return `${(x.subject||'Без назви').trim()}|||${(x.group||'Без групи').trim()}`;
}

function disciplineGroups(key=selectedSemester){
  const map=new Map();
  classesForSemester(key).forEach(x=>{
    const k=disciplineKey(x);
    if(!map.has(k))map.set(k,{
      key:k,
      subject:(x.subject||'Без назви').trim(),
      group:(x.group||'Без групи').trim(),
      items:[]
    });
    map.get(k).items.push(x);
  });

  return [...map.values()].map(g=>{
    const completed=g.items.filter(x=>x.date<isoToday()).length;
    const today=g.items.filter(x=>x.date===isoToday()).length;
    const remaining=g.items.filter(x=>x.date>isoToday()).length;
    const withTopics=g.items.filter(x=>(x.topic||'').trim()).length;
    const withPrep=g.items.filter(x=>(x.prep||'').trim()).length;
    const next=g.items.find(x=>x.date>=isoToday())||null;
    return {...g,total:g.items.length,completed,today,remaining,withTopics,withPrep,next};
  }).sort((a,b)=>(a.subject+a.group).localeCompare(b.subject+b.group,'uk'));
}

function setSemester(key){
  selectedSemester=key;
  selectedDisciplineKey=null;
  renderDisciplines();
}

function openDiscipline(key){
  selectedDisciplineKey=decodeURIComponent(key);
  renderDisciplines();
  window.scrollTo({top:0,behavior:'smooth'});
}

function closeDiscipline(){
  selectedDisciplineKey=null;
  renderDisciplines();
}

function disciplineProgress(completed,total){
  return total?Math.round(completed/total*100):0;
}

const groupColorPalette=[
  {bg:'#eef5ff',border:'#4c8df7',soft:'#dbe9ff',text:'#2f66b1'},
  {bg:'#eef8f2',border:'#49af78',soft:'#dcefe4',text:'#347f58'},
  {bg:'#f4f0ff',border:'#8a72d8',soft:'#e6defb',text:'#6651b0'},
  {bg:'#fff4e8',border:'#d99043',soft:'#f8e3cb',text:'#9b632d'},
  {bg:'#fff0f0',border:'#d96969',soft:'#f7dcdc',text:'#9e4949'},
  {bg:'#edf8f8',border:'#4aa6a6',soft:'#d7ecec',text:'#357a7a'},
  {bg:'#fff2f7',border:'#c76c99',soft:'#f2dce7',text:'#925070'},
  {bg:'#f5f5e9',border:'#9d9c50',soft:'#e8e7cf',text:'#747337'}
];

function stringHash(value=''){
  let h=0;
  for(let i=0;i<value.length;i++)h=((h<<5)-h)+value.charCodeAt(i),h|=0;
  return Math.abs(h);
}

function groupColor(group=''){
  const key=(group||'Без групи').trim().toUpperCase();
  return groupColorPalette[stringHash(key)%groupColorPalette.length];
}

function groupStyle(group=''){
  const c=groupColor(group);
  return `--group-bg:${c.bg};--group-border:${c.border};--group-soft:${c.soft};--group-text:${c.text}`;
}

function currentSemesterGroups(){
  const base=monthCursor(selectedMonthOffset);
  const monthStart=`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-01`;
  const endDate=new Date(base.getFullYear(),base.getMonth()+1,0);
  const monthEnd=isoLocal(endDate);
  return [...new Set(
    state.classes
      .filter(x=>x.date>=monthStart && x.date<=monthEnd && x.status!=='Скасовано')
      .map(x=>(x.group||'Без групи').trim())
      .filter(Boolean)
  )].sort((a,b)=>a.localeCompare(b,'uk'));
}

function renderGroupLegend(){
  const groups=currentSemesterGroups();
  if(!groups.length)return '';
  return `<div class="group-legend">
    <span class="group-legend-title">ГРУПИ:</span>
    ${groups.map(g=>{
      const c=groupColor(g);
      return `<span class="group-legend-item"><i style="background:${c.border}"></i>${esc(g)}</span>`;
    }).join('')}
  </div>`;
}

function lessonTemporalLabel(x){
  if(x.date<isoToday())return ['Минуло','past'];
  if(x.date===isoToday())return ['Сьогодні','today'];
  return ['Попереду','future'];
}

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

function classTemplateSelect(x={}){
  if(!state.templates.length){
    return `<div class="field full template-field">
      <label>Шаблон заняття</label>
      <div class="template-empty">Шаблонів ще немає. Нижче можна зберегти перший.</div>
    </div>`;
  }
  return `<div class="field full template-field">
    <label>Шаблон заняття</label>
    <select name="templateChoice" onchange="applyClassTemplate(this.value)">
      <option value="">Не використовувати шаблон</option>
      ${state.templates.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}
    </select>
  </div>`;
}

function saveTemplateControls(){
  return `<div class="field full template-save">
    <label class="checkline">
      <input type="checkbox" name="saveTemplate" onchange="toggleTemplateName(this.checked)">
      <span>Зберегти це налаштування як шаблон заняття</span>
    </label>
    <input class="hidden" id="templateNameInput" name="templateName" type="text" placeholder="Назва шаблону, наприклад: РЕМС-44 · Режисура">
  </div>`;
}

function toggleTemplateName(checked){
  const el=document.getElementById('templateNameInput');
  if(el) el.classList.toggle('hidden',!checked);
}

function applyClassTemplate(id){
  if(!id)return;
  const t=state.templates.find(x=>x.id===id);
  if(!t)return;

  const set=(name,value)=>{
    const el=document.querySelector(`[name="${name}"]`);
    if(el) el.value=value??'';
  };

  set('group',t.group);
  set('subject',t.subject);
  set('time',t.time);
  set('end',t.end);
  set('location',t.location);
  set('reminderDays',String(t.reminderDays ?? 1));

  const slot=document.querySelector('[name="lessonSlot"]');
  if(slot){
    const exact=lessonSlots.some(([s,e])=>s===t.time && e===t.end);
    slot.value=exact?`${t.time}|${t.end}`:(t.time?'custom':'');
  }

  const lt=document.querySelector('[name="lessonType"]');
  if(lt){
    lt.value=t.lessonType||'Лекція';
    toggleCustomLessonType(lt.value);
  }
  set('lessonTypeCustom',t.lessonTypeCustom||'');

  const roomChoice=document.querySelector('[name="roomChoice"]');
  if(roomChoice){
    if(roomOptions.includes(t.room||'')){
      roomChoice.value=t.room;
      toggleCustomRoom(t.room);
    }else if(t.room){
      roomChoice.value='Інше';
      toggleCustomRoom('Інше');
      set('roomCustom',t.room);
    }else{
      roomChoice.value='';
      toggleCustomRoom('');
    }
  }
  refreshRecurrenceUI();
}

function storeClassTemplate(data,name){
  const finalName=(name||`${data.group||'Група'} · ${data.subject||'Заняття'}`).trim();
  const template={
    id:uid('tpl'),
    name:finalName,
    group:data.group||'',
    subject:data.subject||'',
    time:data.time||'',
    end:data.end||'',
    lessonType:data.lessonType||'',
    lessonTypeCustom:data.lessonTypeCustom||'',
    room:data.room||'',
    location:data.location||'',
    reminderDays:Number(data.reminderDays ?? 1)
  };
  const same=state.templates.findIndex(t=>t.name.toLowerCase()===finalName.toLowerCase());
  if(same>=0) state.templates[same]={...state.templates[same],...template,id:state.templates[same].id};
  else state.templates.push(template);
}

function deleteClassTemplate(id){
  const t=state.templates.find(x=>x.id===id);
  if(!t)return;
  if(!confirm(`Видалити шаблон «${t.name}»?`))return;
  state.templates=state.templates.filter(x=>x.id!==id);
  save();
  toast('Шаблон видалено');
}

function classTemplatesBar(){
  if(!state.templates.length)return '';
  return `<div class="templates-bar">
    <span class="templates-label">ШАБЛОНИ:</span>
    ${state.templates.map(t=>`<span class="template-chip">${esc(t.name)}<button onclick="deleteClassTemplate('${t.id}')" title="Видалити шаблон">×</button></span>`).join('')}
  </div>`;
}

function seriesScopeFields(x={}){
  if(!x.id || !x.seriesId)return '';
  return `<div class="field full series-scope-box">
    <label>Редагування серії</label>
    <select name="seriesScope">
      <option value="this">Тільки це заняття</option>
      <option value="future">Це заняття і всі наступні</option>
      <option value="all">Усю серію</option>
    </select>
    <small>Дата змінюється лише для поточного заняття. Для «наступних» і «всієї серії» оновлюються параметри заняття: час, аудиторія, вид, тема, підготовка тощо.</small>
  </div>`;
}

function recurrenceFields(x={}){
  if(x.id)return seriesScopeFields(x);

  return `<div class="field">
    <label>Повторення</label>
    <select name="repeatMode" onchange="toggleRecurrenceMode(this.value)">
      <option value="none">Один раз</option>
      <option value="weekly">Щотижня</option>
      <option value="biweekly">Раз на два тижні</option>
      <option value="selected">Обрати конкретні дати</option>
    </select>
  </div>

  <div class="field hidden" id="repeatUntilField">
    <label>Повторювати до</label>
    <input name="repeatUntil" type="date" onchange="refreshRecurrenceUI()">
  </div>

  <div class="field full hidden" id="manualDatesField">
    <div class="series-step-title"><span>1</span><div><b>Оберіть потрібні дати</b><small>Натискайте на числа в календарі. Обрані дні стають темними. Можна перейти на інший місяць і продовжити вибір.</small></div></div>
    <div class="selected-mode-note">У режимі «Обрати конкретні дати» серія створюється саме з дат, які ви натиснули нижче.</div>
    <div class="manual-date-picker" id="manualDatePicker"></div>
  </div>

  <div class="field full hidden" id="occurrencePreviewField">
    <div class="series-step-title"><span>2</span><div><b>Перевірте дати та налаштуйте винятки</b><small>Усі обрані дати з'являються тут автоматично. Для окремого дня можна змінити пару, вид заняття чи аудиторію або пропустити його.</small></div></div>
    <div class="occurrence-preview" id="occurrencePreview"></div>
  </div>`;
}

function resetRecurrenceDraft(baseDate){
  recurrenceDraftDates=new Set();
  recurrenceExcludedDates=new Set();
  recurrenceOverrides={};
  const d=dateObj(baseDate||isoToday())||new Date();
  recurrencePickerMonth=new Date(d.getFullYear(),d.getMonth(),1);
}

function toggleRecurrenceMode(value){
  const until=document.getElementById('repeatUntilField');
  const manual=document.getElementById('manualDatesField');
  const preview=document.getElementById('occurrencePreviewField');

  if(until)until.classList.toggle('hidden',!['weekly','biweekly'].includes(value));
  if(manual)manual.classList.toggle('hidden',value!=='selected');
  if(preview)preview.classList.toggle('hidden',value==='none');

  refreshRecurrenceUI();
}

function getBaseClassDraft(){
  const value=name=>document.querySelector(`[name="${name}"]`)?.value||'';
  const lessonType=value('lessonType')||'Лекція';
  let room=value('roomChoice');
  if(room==='Інше')room=value('roomCustom');

  return {
    date:value('date'),
    time:value('time'),
    end:value('end'),
    lessonType,
    lessonTypeCustom:lessonType==='Інше'?value('lessonTypeCustom'):'',
    room
  };
}

function generatedRecurrenceDates(mode){
  if(mode==='selected'){
    return [...recurrenceDraftDates].sort();
  }

  const base=getBaseClassDraft().date;
  if(!base)return [];

  if(!['weekly','biweekly'].includes(mode))return [base];

  const until=document.querySelector('[name="repeatUntil"]')?.value;
  if(!until)return [];

  const startD=dateObj(base),untilD=dateObj(until);
  if(!startD||!untilD||untilD<startD)return [];

  const step=mode==='biweekly'?14:7;
  const out=[];
  const d=new Date(startD);
  let guard=0;
  while(d<=untilD && guard<80){
    out.push(isoLocal(d));
    d.setDate(d.getDate()+step);
    guard++;
  }
  return out;
}

function renderManualDatePicker(){
  const host=document.getElementById('manualDatePicker');
  if(!host)return;

  const y=recurrencePickerMonth.getFullYear();
  const m=recurrencePickerMonth.getMonth();
  const first=new Date(y,m,1);
  const start=new Date(first);
  start.setDate(first.getDate()-((first.getDay()+6)%7));

  let cells='';
  for(let i=0;i<42;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);
    const iso=isoLocal(d);
    const inMonth=d.getMonth()===m;
    const selected=recurrenceDraftDates.has(iso);
    cells+=`<button type="button"
      aria-label="${selected?'Прибрати':'Обрати'} ${fmtDate(iso)}"
      class="manual-date ${inMonth?'':'outside'} ${selected?'selected':''}"
      onclick="toggleManualDate('${iso}')">
        <span>${d.getDate()}</span>
        ${selected?'<i>✓</i>':''}
      </button>`;
  }

  const selectedDates=[...recurrenceDraftDates].sort();
  const selectedHtml=selectedDates.length
    ? `<div class="selected-dates-box">
        <div class="selected-dates-head">
          <b>Обрані дати: ${selectedDates.length}</b>
          <button type="button" onclick="clearManualDates()">Очистити всі</button>
        </div>
        <div class="selected-date-chips">
          ${selectedDates.map(iso=>{
            const d=dateObj(iso);
            return `<span class="selected-date-chip">
              ${d.getDate()} ${months[d.getMonth()].slice(0,3)}
              <button type="button" onclick="toggleManualDate('${iso}')" title="Прибрати дату">×</button>
            </span>`;
          }).join('')}
        </div>
      </div>`
    : `<div class="selected-dates-empty">
        <b>Поки не обрано жодної дати</b>
        <small>Натисніть на потрібні числа у календарі вище.</small>
      </div>`;

  host.innerHTML=`
    <div class="manual-picker-head">
      <button type="button" onclick="stepManualPicker(-1)" title="Попередній місяць">←</button>
      <b>${monthsNom[m]} ${y}</b>
      <button type="button" onclick="stepManualPicker(1)" title="Наступний місяць">→</button>
    </div>
    <div class="manual-weekdays">${weekShort.map(x=>`<span>${x}</span>`).join('')}</div>
    <div class="manual-days">${cells}</div>
    ${selectedHtml}`;

  // IMPORTANT: step 2 is rendered from the exact same local array
  // that created the visible "Обрані дати" chips above.
  const mode=document.querySelector('[name="repeatMode"]')?.value||'none';
  if(mode==='selected'){
    const previewField=document.getElementById('occurrencePreviewField');
    if(previewField)previewField.classList.remove('hidden');
    renderOccurrencePreviewFromDates(selectedDates,'selected');
  }
}

function clearManualDates(){
  recurrenceDraftDates.clear();
  recurrenceExcludedDates.clear();
  recurrenceOverrides={};
  renderManualDatePicker();
}

function stepManualPicker(delta){
  recurrencePickerMonth=new Date(
    recurrencePickerMonth.getFullYear(),
    recurrencePickerMonth.getMonth()+Number(delta),
    1
  );
  renderManualDatePicker();
}

function toggleManualDate(iso){
  if(recurrenceDraftDates.has(iso)){
    recurrenceDraftDates.delete(iso);
    recurrenceExcludedDates.delete(iso);
    delete recurrenceOverrides[iso];
  }else{
    recurrenceDraftDates.add(iso);
  }

  renderManualDatePicker();
}

function occurrenceOverride(date){
  if(!recurrenceOverrides[date])recurrenceOverrides[date]={};
  return recurrenceOverrides[date];
}

function setOccurrenceIncluded(date,checked){
  if(checked)recurrenceExcludedDates.delete(date);
  else recurrenceExcludedDates.add(date);
}

function setOccurrenceOverride(date,key,value){
  const o=occurrenceOverride(date);
  o[key]=value;
  if(key==='roomChoice'){
    const custom=document.getElementById(`occ-room-custom-${date}`);
    if(custom)custom.classList.toggle('hidden',value!=='Інше');
  }
  if(key==='lessonType'){
    const custom=document.getElementById(`occ-type-custom-${date}`);
    if(custom)custom.classList.toggle('hidden',value!=='Інше');
  }
}

function slotOptionsForOccurrence(selected){
  return `
    <option value="">Як у базовому занятті</option>
    ${lessonSlots.map(([s,e],i)=>`<option value="${s}|${e}" ${selected===`${s}|${e}`?'selected':''}>${i+1} пара · ${s}–${e}</option>`).join('')}
  `;
}

function renderOccurrencePreviewFromDates(dates,mode='selected'){
  const host=document.getElementById('occurrencePreview');
  if(!host)return;

  const cleanDates=[...new Set((dates||[]).filter(Boolean))].sort();

  if(!cleanDates.length){
    host.innerHTML=`<div class="occurrence-empty">
      <b>${mode==='selected'?'Ще немає обраних дат':'Серія ще не сформована'}</b>
      <small>${mode==='selected'
        ?'Натисніть на потрібні числа в календарі у кроці 1. Щойно дата буде вибрана, вона одразу з’явиться тут.'
        :'Вкажіть дату «Повторювати до», і список занять з’явиться тут автоматично.'}</small>
    </div>`;
    return;
  }

  const includedCount=cleanDates.filter(d=>!recurrenceExcludedDates.has(d)).length;

  const summary=`<div class="occurrence-summary">
    <b>Вибрано дат: ${cleanDates.length} · До серії увійде: ${includedCount}</b>
    <small>Це ті самі дати, що показані у кроці 1. Зніміть галочку, якщо конкретного дня заняття не буде.</small>
  </div>`;

  host.innerHTML=summary+cleanDates.map(date=>{
    const d=dateObj(date);
    const o=recurrenceOverrides[date]||{};
    const roomChoice=o.roomChoice||'';
    const lessonType=o.lessonType||'';
    const included=!recurrenceExcludedDates.has(date);

    return `<div class="occurrence-row ${included?'':'excluded'}">
      <label class="occ-include" title="Включити або пропустити цю дату">
        <input type="checkbox" ${included?'checked':''}
          onchange="setOccurrenceIncluded('${date}',this.checked); this.closest('.occurrence-row').classList.toggle('excluded',!this.checked); renderOccurrencePreviewFromDates(currentPreviewDates(),'${mode}')">
      </label>

      <div class="occ-date">
        <b>${fmtDate(date)}</b>
        <small>${weekdays[d.getDay()]}</small>
      </div>

      <div class="occ-control">
        <label>Пара</label>
        <select onchange="setOccurrenceOverride('${date}','slot',this.value)">
          ${slotOptionsForOccurrence(o.slot||'')}
        </select>
      </div>

      <div class="occ-control">
        <label>Вид заняття</label>
        <select onchange="setOccurrenceOverride('${date}','lessonType',this.value)">
          <option value="">Як у базовому занятті</option>
          ${lessonTypes.map(t=>`<option ${t===lessonType?'selected':''}>${t}</option>`).join('')}
        </select>
        <input id="occ-type-custom-${date}"
          class="${lessonType==='Інше'?'':'hidden'} occ-custom"
          type="text"
          value="${esc(o.lessonTypeCustom||'')}"
          placeholder="Свій вид"
          oninput="setOccurrenceOverride('${date}','lessonTypeCustom',this.value)">
      </div>

      <div class="occ-control">
        <label>Аудиторія</label>
        <select onchange="setOccurrenceOverride('${date}','roomChoice',this.value)">
          <option value="">Як у базовому занятті</option>
          ${roomOptions.map(r=>`<option ${r===roomChoice?'selected':''}>${r}</option>`).join('')}
          <option value="Інше" ${roomChoice==='Інше'?'selected':''}>Інше</option>
        </select>
        <input id="occ-room-custom-${date}"
          class="${roomChoice==='Інше'?'':'hidden'} occ-custom"
          type="text"
          value="${esc(o.roomCustom||'')}"
          placeholder="Своя аудиторія"
          oninput="setOccurrenceOverride('${date}','roomCustom',this.value)">
      </div>
    </div>`;
  }).join('');
}

function currentPreviewDates(){
  const mode=document.querySelector('[name="repeatMode"]')?.value||'none';
  if(mode==='selected'){
    return [...recurrenceDraftDates].sort();
  }
  return generatedRecurrenceDates(mode);
}

function renderOccurrencePreview(){
  const mode=document.querySelector('[name="repeatMode"]')?.value||'none';
  renderOccurrencePreviewFromDates(currentPreviewDates(),mode);
}

function refreshRecurrenceUI(){
  const mode=document.querySelector('[name="repeatMode"]')?.value||'none';

  if(mode==='selected'){
    renderManualDatePicker();
    return;
  }

  if(mode!=='none')renderOccurrencePreview();
}

function buildFlexibleOccurrences(data,mode,repeatUntil){
  const sourceDates=mode==='selected'
    ? [...recurrenceDraftDates].sort()
    : generatedRecurrenceDates(mode);

  const dates=sourceDates.filter(d=>!recurrenceExcludedDates.has(d));
  if(!dates.length)return [];

  const seriesId=uid('series');

  return dates.map(date=>{
    const o=recurrenceOverrides[date]||{};
    const item={
      ...data,
      id:uid('class'),
      date,
      seriesId,
      recurrence:mode,
      recurrenceUntil:repeatUntil||'',
      seriesBaseDate:data.date
    };

    if(o.slot){
      const [s,e]=o.slot.split('|');
      item.time=s;
      item.end=e;
    }

    if(o.lessonType){
      item.lessonType=o.lessonType;
      item.lessonTypeCustom=o.lessonType==='Інше'?(o.lessonTypeCustom||''):'';
    }

    if(o.roomChoice){
      item.room=o.roomChoice==='Інше'?(o.roomCustom||''):o.roomChoice;
    }

    return item;
  });
}

function reminderSelect(x={}){
  const value=String(x.reminderDays ?? 1);
  const opts=[
    ['-1','Не нагадувати'],
    ['0','У день заняття'],
    ['1','За 1 день'],
    ['2','За 2 дні'],
    ['3','За 3 дні'],
    ['7','За тиждень']
  ];
  return `<div class="field">
    <label>Нагадати про підготовку</label>
    <select name="reminderDays">
      ${opts.map(([v,l])=>`<option value="${v}" ${v===value?'selected':''}>${l}</option>`).join('')}
    </select>
  </div>`;
}

function daysBetween(fromIso,toIso){
  const a=dateObj(fromIso),b=dateObj(toIso);
  if(!a||!b)return 9999;
  return Math.round((b-a)/86400000);
}

function upcomingPrepClasses(){
  const today=isoToday();
  return state.classes
    .filter(x=>{
      if(!x.prep || !x.date || x.status==='Скасовано')return false;
      const reminder=Number(x.reminderDays ?? 1);
      if(reminder<0)return false;
      const diff=daysBetween(today,x.date);
      return diff>=0 && diff<=reminder;
    })
    .sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
}

function renderPrepReminder(){
  const items=upcomingPrepClasses();
  if(!items.length)return '';
  return `<div class="card prep-reminder-card">
    <div class="card-head">
      <div class="card-title"><span class="icon">◎</span>ПІДГОТУВАТИ ДО ЗАНЯТЬ</div>
      <div class="card-link">${items.length} ${items.length===1?'заняття':'заняття'}</div>
    </div>
    <div class="prep-reminder-list">
      ${items.map(x=>{
        const diff=daysBetween(isoToday(),x.date);
        const when=diff===0?'сьогодні':diff===1?'завтра':`через ${diff} дн.`;
        return `<button class="prep-reminder-row" onclick="openDay('${x.date}')">
          <div class="prep-reminder-date"><b>${fmtShort(x.date)}</b><small>${when}</small></div>
          <div class="prep-reminder-main">
            <b>${esc(x.subject||'Заняття')}</b>
            <small>${esc([x.group,pairNumber(x.time,x.end),x.room&&`ауд. ${x.room}`].filter(Boolean).join(' · '))}</small>
            <div class="prep-reminder-text"><strong>Підготувати:</strong> ${esc(x.prep)}</div>
          </div>
        </button>`;
      }).join('')}
    </div>
  </div>`;
}

function timeToMinutes(v){
  if(!v || !v.includes(':'))return null;
  const [h,m]=v.split(':').map(Number);
  return h*60+m;
}
function overlaps(aStart,aEnd,bStart,bEnd){
  const as=timeToMinutes(aStart),ae=timeToMinutes(aEnd),bs=timeToMinutes(bStart),be=timeToMinutes(bEnd);
  if([as,ae,bs,be].some(v=>v===null))return false;
  return as<be && bs<ae;
}
function classConflict(candidate,excludeIds=[]){
  return state.classes.filter(x=>
    !excludeIds.includes(x.id) &&
    x.status!=='Скасовано' &&
    x.date===candidate.date &&
    overlaps(candidate.time,candidate.end,x.time,x.end)
  );
}
function checkClassConflicts(candidates,excludeIds=[]){
  const found=[];
  candidates.forEach(c=>{
    classConflict(c,excludeIds).forEach(x=>found.push({candidate:c,existing:x}));
  });
  if(!found.length)return true;

  const unique=found.slice(0,6).map(({candidate,existing})=>
    `${fmtDate(candidate.date)} ${candidate.time||''}–${candidate.end||''}: ${existing.group||''} · ${existing.subject||'заняття'}`
  );
  const more=found.length>6?`\n…і ще ${found.length-6}`:'';
  return confirm(`Є конфлікт у розкладі:\n\n${unique.join('\n')}${more}\n\nВсе одно зберегти?`);
}


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
  closeQuickAddMenu();
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
      <div class="cal-entry cal-class" style="${groupStyle(x.group)}">
        <div class="cal-entry-line">
          <span class="cal-pair">${esc(pairNumber(x.time,x.end))}</span>
          <span class="cal-time">${esc(x.time||'—')}${x.end?`–${esc(x.end)}`:''}</span>
        </div>
        <div class="cal-title">${esc(x.subject||'Заняття')}</div>
        <div class="cal-info"><b><i class="group-dot"></i>${esc(x.group||'—')}</b> · ${esc(lessonTypeLabel(x))} · ${x.room?`ауд. ${esc(x.room)}`:'ауд. —'}</div>
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
    ${renderGroupLegend()}
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
  renderDisciplines();
  renderTasks();
  renderProjects();
  renderNotes();
}

function tomorrowIso(){
  const d=new Date();
  d.setDate(d.getDate()+1);
  return isoLocal(d);
}

function prepItemCount(text=''){
  if(!String(text).trim())return 0;
  const parts=String(text)
    .split(/\n|;|•|·/)
    .map(x=>x.trim())
    .filter(Boolean);
  return Math.max(1,parts.length);
}

function renderTomorrowStrip(){
  const iso=tomorrowIso();
  const classes=state.classes.filter(x=>x.date===iso && x.status!=='Скасовано');
  const tasks=state.tasks.filter(x=>x.date===iso && !x.done);
  const prepCount=classes.reduce((sum,x)=>sum+prepItemCount(x.prep),0);

  return `<button class="tomorrow-strip" onclick="openDay('${iso}')">
    <div class="tomorrow-label">
      <small>ЗАВТРА</small>
      <b>${fmtDate(iso)}</b>
    </div>
    <div class="tomorrow-summary">
      <span><strong>${classes.length}</strong> ${classes.length===1?'заняття':'заняття'}</span>
      ${tasks.length?`<span><strong>${tasks.length}</strong> ${tasks.length===1?'справа':'справи'}</span>`:''}
      ${prepCount?`<span class="tomorrow-prep"><strong>${prepCount}</strong> ${prepCount===1?'пункт підготовки':'пункти підготовки'}</span>`:''}
      ${!classes.length&&!tasks.length?`<span class="tomorrow-clear">Нічого не заплановано</span>`:''}
    </div>
    <span class="tomorrow-open">Відкрити день →</span>
  </button>`;
}

function renderHome(){
  const tClasses=todayClasses();
  const todayTasks=openTasks().filter(x=>x.date===isoToday());
  const timeline=[
    ...tClasses.map((x,i)=>({time:x.time||'—',end:x.end||'',title:x.subject||'Заняття',sub:[x.group,lessonTypeLabel(x)!=='—'&&lessonTypeLabel(x),x.room&&`ауд. ${x.room}`].filter(Boolean).join(' · '),topic:x.topic||'',prep:x.prep||'',badge:'ЗАНЯТТЯ',color:typeColor(i),group:x.group||''})),
    ...todayTasks.map((x,i)=>({time:x.time||'—',title:x.title,sub:x.category||'',badge:'СПРАВА',color:typeColor(i+2)}))
  ].sort((a,b)=>(a.time||'').localeCompare(b.time||''));

  const upcoming=[
    ...openTasks().filter(x=>x.date && x.date>=isoToday()).map(x=>({date:x.date,title:x.title,sub:x.category||'',time:x.time||''})),
    ...state.classes.filter(x=>x.date>isoToday()).map(x=>({date:x.date,title:x.subject||'Заняття',sub:[x.group,lessonTypeLabel(x)!=='—'&&lessonTypeLabel(x)].filter(Boolean).join(' · '),time:x.time||''}))
  ].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,6);


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
              <div class="type-line" style="background:${x.group?groupColor(x.group).border:['#4c8df7','#49af78','#8a72d8','#d99043','#e36565'][i%5]}"></div>
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

    ${renderTomorrowStrip()}

    ${renderPrepReminder()}

    <div class="card year-card">
      <div class="card-head">
        <div class="card-title"><span class="icon">▤</span>КАЛЕНДАР ПО МІСЯЦЯХ</div>
        <div class="card-link">Повний місячний огляд</div>
      </div>
      ${renderMonthPlanner()}
    </div>


`;
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
    ${classTemplatesBar()}
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


function renderDisciplines(){
  const host=document.getElementById('disciplinesView');
  if(!host)return;

  const semesters=semesterOptions();
  if(!semesters.some(x=>x.key===selectedSemester)){
    selectedSemester=semesterKeyForDate(isoToday());
  }

  const semester=semesterInfo(selectedSemester);
  const groups=disciplineGroups(selectedSemester);

  if(selectedDisciplineKey){
    const group=groups.find(g=>g.key===selectedDisciplineKey);
    if(group){
      const progress=disciplineProgress(group.completed,group.total);
      host.innerHTML=`
        <div class="discipline-detail-head">
          <button class="back-btn" onclick="closeDiscipline()">← До дисциплін</button>
          <div class="discipline-detail-title">
            <span>${esc(semester.label)}</span>
            <h2>${esc(group.subject)}</h2>
            <p>${esc(group.group)}</p>
          </div>
          <div class="discipline-detail-stats">
            <div><small>УСЬОГО</small><b>${group.total}</b></div>
            <div><small>МИНУЛО</small><b>${group.completed}</b></div>
            <div><small>ЗАЛИШИЛОСЯ</small><b>${group.remaining+group.today}</b></div>
          </div>
        </div>

        <div class="discipline-progress-card">
          <div>
            <b>Прогрес семестру</b>
            <small>${group.completed} із ${group.total} занять уже минули</small>
          </div>
          <div class="discipline-progress-track"><span style="width:${progress}%"></span></div>
          <strong>${progress}%</strong>
        </div>

        <div class="discipline-plan">
          ${group.items.map((x,i)=>{
            const [status,statusClass]=lessonTemporalLabel(x);
            return `<div class="discipline-lesson ${statusClass}">
              <div class="discipline-lesson-num">${i+1}</div>
              <div class="discipline-lesson-date">
                <b>${fmtDate(x.date)}</b>
                <small>${pairNumber(x.time,x.end)} · ${esc(x.time||'—')}${x.end?`–${esc(x.end)}`:''}</small>
              </div>
              <div class="discipline-lesson-main">
                <div class="discipline-lesson-meta">
                  <span>${esc(lessonTypeLabel(x))}</span>
                  <span>${x.room?`ауд. ${esc(x.room)}`:'ауд. —'}</span>
                  <span class="lesson-state ${statusClass}">${status}</span>
                </div>
                <h4>${x.topic?esc(x.topic):'<span class="missing-value">Тема ще не внесена</span>'}</h4>
                ${x.prep
                  ?`<div class="discipline-prep"><b>Підготувати:</b> ${esc(x.prep)}</div>`
                  :`<div class="discipline-prep empty">Що підготувати — не вказано</div>`}
              </div>
              <div class="discipline-lesson-actions">
                <button onclick="editEntry('class','${x.id}')">Редагувати</button>
              </div>
            </div>`;
          }).join('')}
        </div>`;
      return;
    }
    selectedDisciplineKey=null;
  }

  const totalLessons=groups.reduce((s,g)=>s+g.total,0);
  const totalCompleted=groups.reduce((s,g)=>s+g.completed,0);
  const totalRemaining=groups.reduce((s,g)=>s+g.remaining+g.today,0);

  host.innerHTML=`
    <div class="disciplines-toolbar">
      <div>
        <div class="small-label">ПЛАН ВИКЛАДАННЯ</div>
        <h2>Дисципліни</h2>
        <p>Формуються автоматично з уже внесених занять — нічого дублювати не потрібно.</p>
      </div>
      <select onchange="setSemester(this.value)">
        ${semesters.map(s=>`<option value="${s.key}" ${s.key===selectedSemester?'selected':''}>${esc(s.label)}</option>`).join('')}
      </select>
    </div>

    <div class="semester-summary">
      <div><small>ДИСЦИПЛІН</small><b>${groups.length}</b></div>
      <div><small>ЗАНЯТЬ</small><b>${totalLessons}</b></div>
      <div><small>МИНУЛО</small><b>${totalCompleted}</b></div>
      <div><small>ЗАЛИШИЛОСЯ</small><b>${totalRemaining}</b></div>
    </div>

    ${groups.length?`
      <div class="discipline-grid">
        ${groups.map(g=>{
          const progress=disciplineProgress(g.completed,g.total);
          return `<button class="discipline-card" onclick="openDiscipline('${encodeURIComponent(g.key)}')">
            <div class="discipline-card-top">
              <span>${esc(g.group)}</span>
              <b>${g.total} ${g.total===1?'заняття':'занять'}</b>
            </div>
            <h3>${esc(g.subject)}</h3>
            <div class="discipline-card-progress">
              <span style="width:${progress}%"></span>
            </div>
            <div class="discipline-card-numbers">
              <span><b>${g.completed}</b><small>минуло</small></span>
              <span><b>${g.remaining+g.today}</b><small>залишилось</small></span>
              <span><b>${g.withTopics}/${g.total}</b><small>тем внесено</small></span>
            </div>
            ${g.next?`<div class="discipline-next">
              <small>НАСТУПНЕ</small>
              <b>${fmtDate(g.next.date)} · ${pairNumber(g.next.time,g.next.end)}</b>
              <span>${g.next.topic?esc(g.next.topic):'Тема ще не внесена'}</span>
            </div>`:`<div class="discipline-next done"><b>Семестр за цією дисципліною завершено</b></div>`}
          </button>`;
        }).join('')}
      </div>`
      :`<div class="discipline-empty">
        <b>У цьому семестрі ще немає занять.</b>
        <span>Щойно ти додаси заняття з групою та назвою дисципліни, CONTROL автоматично створить тут дисципліну.</span>
        <button class="gold-btn" onclick="openAdd('class')">＋ Додати перше заняття</button>
      </div>`}`;
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
function activeQuickDate(){
  return selectedDate || isoToday();
}

function updateQuickAddDateLabel(){
  const el=document.getElementById('quickAddDateLabel');
  if(el)el.textContent=fmtDate(activeQuickDate());
}

function toggleQuickAddMenu(force){
  const menu=document.getElementById('quickAddMenu');
  if(!menu)return;
  const shouldOpen=force===undefined?menu.classList.contains('hidden'):Boolean(force);
  menu.classList.toggle('hidden',!shouldOpen);
  document.getElementById('fab')?.classList.toggle('open',shouldOpen);
  if(shouldOpen)updateQuickAddDateLabel();
}

function closeQuickAddMenu(){toggleQuickAddMenu(false)}

function quickAdd(type){
  const iso=activeQuickDate();
  closeQuickAddMenu();

  if(type==='note'){
    openModal();
    showForm('note');
    return;
  }

  openAddForDate(type,iso);
}

function openAdd(type){openModal();showForm(type)}
function showForm(type,item={}){
  document.getElementById('typeGrid').classList.add('hidden');
  document.getElementById('entryForm').classList.remove('hidden');
  document.getElementById('entryType').value=type;
  document.getElementById('entryId').value=item.id||'';

  if(type==='class' && !item.id){
    resetRecurrenceDraft(item.date||isoToday());
  }

  const name={class:'Заняття',task:'Справа',project:'Проєкт',note:'Нотатка'}[type];
  document.getElementById('modalTitle').textContent=(item.id?'Редагувати · ':'Додати · ')+name;
  document.getElementById('formFields').innerHTML=formMarkup(type,item);

  if(type==='class' && !item.id){
    const form=document.getElementById('entryForm');
    const watched=new Set(['date','time','end','lessonType','lessonTypeCustom','roomChoice','roomCustom','lessonSlot']);
    form.querySelectorAll('input,select').forEach(el=>{
      if(watched.has(el.name)){
        el.addEventListener('change',()=>{
          if(el.name==='date'){
            const d=dateObj(el.value);
            if(d)recurrencePickerMonth=new Date(d.getFullYear(),d.getMonth(),1);
          }
          refreshRecurrenceUI();
        });
      }
    });
  }
}

function inputField(name,label,type='text',value='',placeholder='',full=false,required=false){
  return `<div class="field ${full?'full':''}"><label>${label}</label><input name="${name}" type="${type}" value="${esc(value??'')}" placeholder="${esc(placeholder)}" ${required?'required':''}></div>`;
}
function textareaField(name,label,value=''){return `<div class="field full"><label>${label}</label><textarea name="${name}">${esc(value??'')}</textarea></div>`}
function selectField(name,label,opts,value=''){return `<div class="field"><label>${label}</label><select name="${name}">${opts.map(o=>`<option ${o===value?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`}
function formMarkup(type,x){
  if(type==='class')return `<div class="form-grid">
    ${classTemplateSelect(x)}
    ${inputField('group','Група','text',x.group,'РЕМС-44',false,true)}
    ${inputField('subject','Дисципліна','text',x.subject,'Режисура естради і шоу',false,true)}
    ${inputField('date','Дата','date',x.date||isoToday(),'',false,true)}
    ${lessonSlotSelect(x)}
    ${inputField('time','Час початку','time',x.time)}
    ${inputField('end','Час завершення','time',x.end)}
    ${lessonTypeSelect(x)}
    ${roomSelect(x)}
    ${inputField('location','Уточнення місця','text',x.location,'КНУКіМ / онлайн')}
    ${reminderSelect(x)}
    ${recurrenceFields(x)}
    ${inputField('topic','Тема / що робимо','text',x.topic,'',true)}
    ${textareaField('prep','Що підготувати',x.prep)}
    ${saveTemplateControls()}
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

  if(type==='class' && item.seriesId){
    const answer=prompt(
      `Це заняття входить у серію. Що видалити?\n\n1 — тільки це заняття\n2 — це заняття і всі наступні\n3 — всю серію`,
      '1'
    );
    if(answer===null)return;

    if(answer==='2'){
      state.classes=state.classes.filter(x=>!(x.seriesId===item.seriesId && x.date>=item.date));
      save();toast('Видалено це і наступні заняття');return;
    }
    if(answer==='3'){
      state.classes=state.classes.filter(x=>x.seriesId!==item.seriesId);
      save();toast('Серію видалено');return;
    }
  }

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

  const saveAsTemplate=data.saveTemplate==='on';
  const templateName=data.templateName||'';
  const seriesScope=data.seriesScope||'this';

  delete data.saveTemplate;
  delete data.templateName;
  delete data.templateChoice;
  delete data.seriesScope;
  delete data.lessonSlot;

  const repeatMode=data.repeatMode||'none';
  const repeatUntil=data.repeatUntil||'';
  delete data.repeatMode;
  delete data.repeatUntil;

  if(type==='class'){
    if(data.lessonType!=='Інше')data.lessonTypeCustom='';
    data.room=data.roomChoice==='Інше'?(data.roomCustom||''):data.roomChoice;
    delete data.roomChoice;
    delete data.roomCustom;
    data.reminderDays=Number(data.reminderDays ?? 1);
  }

  const key=type==='class'?'classes':type==='task'?'tasks':type==='project'?'projects':'notes';

  if(type==='project')data.progress=Math.max(0,Math.min(100,Number(data.progress)||0));
  if(type==='task'&&!id)data.done=false;
  if(type==='note')data.updated=new Date().toISOString();

  if(type==='class'){
    if(!data.time || !data.end){
      alert('Оберіть пару або вкажіть час початку і завершення.');
      return;
    }

    // EDIT EXISTING LESSON
    if(id){
      const current=state.classes.find(x=>x.id===id);
      if(!current)return;

      // Ordinary one-off lesson or "only this"
      if(!current.seriesId || seriesScope==='this'){
        if(!checkClassConflicts([{...current,...data,id}], [id]))return;
        const i=state.classes.findIndex(x=>x.id===id);
        state.classes[i]={...state.classes[i],...data};
        if(saveAsTemplate)storeClassTemplate(data,templateName);
        closeModal();save();toast('Заняття оновлено');
        return;
      }

      // Update current+future or entire series, preserving each occurrence date/id.
      const targets=state.classes.filter(x=>
        x.seriesId===current.seriesId &&
        (seriesScope==='all' || x.date>=current.date)
      );
      const targetIds=targets.map(x=>x.id);

      const common={...data};
      delete common.date;

      const candidates=targets.map(x=>({...x,...common,date:x.date,id:x.id}));
      if(!checkClassConflicts(candidates,targetIds))return;

      targets.forEach(target=>{
        const i=state.classes.findIndex(x=>x.id===target.id);
        state.classes[i]={...state.classes[i],...common,date:target.date,id:target.id};
      });

      if(saveAsTemplate)storeClassTemplate(data,templateName);
      closeModal();save();
      toast(seriesScope==='all'?'Оновлено всю серію':'Оновлено це і наступні заняття');
      return;
    }

    // CREATE SERIES
    if(repeatMode!=='none'){
      if(['weekly','biweekly'].includes(repeatMode) && !repeatUntil){
        alert('Вкажіть дату завершення серії.');
        return;
      }

      const occurrences=buildFlexibleOccurrences(data,repeatMode,repeatUntil);

      if(!occurrences.length){
        alert(repeatMode==='selected'
          ? 'Оберіть хоча б одну дату для серії.'
          : 'Не залишилося жодної дати для створення.'
        );
        return;
      }

      if(!checkClassConflicts(occurrences))return;

      state.classes.push(...occurrences);
      if(saveAsTemplate)storeClassTemplate(data,templateName);
      closeModal();save();toast(`Створено ${occurrences.length} занять`);
      return;
    }

    // CREATE ONE-OFF LESSON
    const item={...data,id:uid('class')};
    if(!checkClassConflicts([item]))return;
    state.classes.push(item);
    if(saveAsTemplate)storeClassTemplate(data,templateName);
    closeModal();save();toast('Заняття додано');
    return;
  }

  if(id){
    const i=state[key].findIndex(x=>x.id===id);
    state[key][i]={...state[key][i],...data};
  }else{
    data.id=uid(type);
    state[key].push(data);
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
function exportData(){downloadSnapshot(state,`FISHER_DATA_${isoToday()}.json`);toast('Дані експортовано')}
function importData(file){
  const r=new FileReader();
  r.onload=()=>{
    try{
      const parsed=JSON.parse(r.result);
      if(!parsed || typeof parsed!=='object')throw new Error('bad');
      replaceState(parsed);
      selectedDisciplineKey=null;
      save();
      toast('Дані імпортовано');
    }catch(e){alert('Не вдалося прочитати файл.')}
  };
  r.readAsText(file);
}

document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
document.getElementById('fab').addEventListener('click',e=>{
  e.stopPropagation();
  toggleQuickAddMenu();
});
document.querySelectorAll('[data-quick-type]').forEach(b=>b.addEventListener('click',()=>quickAdd(b.dataset.quickType)));
document.addEventListener('click',e=>{
  if(!e.target.closest('.quick-add-wrap'))closeQuickAddMenu();
});
document.getElementById('closeModal').addEventListener('click',closeModal);
document.getElementById('cancelBtn').addEventListener('click',closeModal);
document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
document.getElementById('dayOverlay').addEventListener('click',e=>{if(e.target.id==='dayOverlay')closeDayOverlay()});
document.querySelectorAll('#typeGrid [data-type]').forEach(b=>b.addEventListener('click',()=>showForm(b.dataset.type)));
document.getElementById('entryForm').addEventListener('submit',submitEntry);
document.getElementById('searchBtn').addEventListener('click',()=>document.getElementById('searchBox').classList.toggle('hidden'));
document.getElementById('searchInput').addEventListener('input',doSearch);
document.getElementById('backupNowBtn').addEventListener('click',manualBackup);
document.getElementById('backupHistoryBtn').addEventListener('click',openBackupManager);
document.getElementById('closeBackupOverlay').addEventListener('click',closeBackupManager);
document.getElementById('backupOverlay').addEventListener('click',e=>{if(e.target.id==='backupOverlay')closeBackupManager()});
document.getElementById('exportBtn').addEventListener('click',exportData);
document.getElementById('importFile').addEventListener('change',e=>e.target.files[0]&&importData(e.target.files[0]));

renderAll();

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
