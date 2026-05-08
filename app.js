
(function(){
'use strict';
const {createModel, fmtDate, toNumber, parseDate} = window.HCDebtModel;
const model = createModel(MODEL_DATA);
customizeMetadata();
let currentSection = 'dashboard';
const APP_STATE_VERSION = 'analysis-sensitivity-fix-v13';

function ensureCurrentAppStateVersion(){
  const versionKey='hcDebtModelAppVersion';
  if(localStorage.getItem(versionKey)!==APP_STATE_VERSION){
    localStorage.removeItem('hcDebtModelState');
    localStorage.setItem(versionKey, APP_STATE_VERSION);
  }
}

function customizeMetadata(){
  const renames={
    'Tranche 1 - Unitranche':'Tranche 1',
    'Tranche 2 - Preferred Equity':'Tranche 2',
    'Upside / warrants':'Upside'
  };
  (MODEL_DATA.metadata.inputs || []).forEach(section=>{
    if(renames[section.title]) section.title=renames[section.title];
    section.items = section.items.filter(item => item.key !== 'Debt_Model!C44');
    section.items.forEach(item=>{
      if(item.key === 'Capital_Inputs!D85') item.label = '3rd Party';
    });
  });
}
function cellRange(row){
  return ['D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X'].map(col=>'Debt_Model!'+col+row);
}
function hasMaterialValue(key){
  return Math.abs(toNumber(model.get(key))) > 1e-9;
}
function buildScheduleRows(section, rows){
  return rows.map(row=>({section, label:String(model.get('Debt_Model!B'+row) || '').trim() || ('Row '+row), cells:cellRange(row)}));
}
function getDebtScheduleRows(){
  const rows=[];
  if(hasMaterialValue('Capital_Inputs!F44')) rows.push(...buildScheduleRows('Tranche 1', [38,39,40,41,42,43,44,45,46,47]));
  if(hasMaterialValue('Capital_Inputs!F55')) rows.push(...buildScheduleRows('Tranche 2', [53,54,55,56,57,58,59,60,61,62]));
  if(hasMaterialValue('Capital_Inputs!F69')) rows.push(...buildScheduleRows('Tranche 3', [68,69,70,71,72,73,74,75,76,77]));
  if(model.get('Capital_Inputs!F85') && hasMaterialValue('Capital_Inputs!F86')) rows.push(...buildScheduleRows('RMB debt schedule', [97,98,99,100,101,102,103,104,105]));
  rows.push(...buildScheduleRows('Westbrooke debt schedule', [111,112,113,114,115,116,117,118,119]));
  return rows;
}
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
function format(value, fmt){
  if(fmt === 'date') { const d=parseDate(value); return d instanceof Date ? d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : '–'; }
  if(value instanceof Date) return value.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
  if(value == null || value === '') return '–';
  const n=toNumber(value);
  if(fmt === 'percent1') return (n*100).toFixed(1)+'%';
  if(fmt === 'percent0') return (n*100).toFixed(0)+'%';
  if(fmt === 'x1') return n.toFixed(1)+'x';
  if(fmt === 'x2') return n.toFixed(2)+'x';
  if(fmt === 'money0') return fmtNum(n,0);
  if(fmt === 'money1') return fmtNum(n,1);
  if(fmt === 'number1') return n.toFixed(1);
  return typeof value === 'number' ? fmtNum(n,2) : String(value);
}
function fmtNum(n,dp){
  if(!isFinite(n)) return '–';
  const abs=Math.abs(n);
  const s=abs.toLocaleString(undefined,{maximumFractionDigits:dp,minimumFractionDigits:dp});
  if(Math.abs(n)<1e-9) return '–';
  return n<0 ? '('+s+')' : s;
}
function inputValueForDisplay(key,type){
  const v=model.get(key);
  if(type === 'date') return fmtDate(v);
  if(type === 'percent') return (toNumber(v)*100).toString().replace(/\.0+$/,'');
  if(type === 'checkbox') return !!v;
  return v == null ? '' : v;
}
function parseInputValue(raw,type){
  if(type === 'date') return parseDate(raw);
  if(type === 'percent') return Number(raw)/100;
  if(type === 'number') return Number(raw);
  if(type === 'checkbox') return !!raw;
  return raw;
}
function saveState(){
  const changed={};
  for(const section of MODEL_DATA.metadata.inputs){
    for(const item of section.items){
      const base=model.base[item.key];
      const cur=model.values[item.key];
      const baseVal = base instanceof Date ? fmtDate(base) : base;
      const curVal = cur instanceof Date ? fmtDate(cur) : cur;
      if(JSON.stringify(baseVal)!==JSON.stringify(curVal)) changed[item.key]=curVal;
    }
  }
  localStorage.setItem('hcDebtModelState', JSON.stringify(changed));
  history.replaceState(null,'', location.pathname + location.search + (Object.keys(changed).length ? '#s='+encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(changed))))) : ''));
}
function loadState(){
  let state={};
  try{
    if(location.hash.startsWith('#s=')) state=JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(location.hash.slice(3))))));
    else state=JSON.parse(localStorage.getItem('hcDebtModelState')||'{}');
  }catch(e){ state={}; }
  for(const [k,v] of Object.entries(state)){
    const item = findInput(k);
    if(item) model.set(k, parseInputValue(v, item.type));
    else model.set(k,v);
  }
}
function findInput(key){
  for(const section of MODEL_DATA.metadata.inputs) for(const item of section.items) if(item.key===key) return item;
  return null;
}

function setModelValueRaw(key, value){
  if(value && typeof value === 'object' && value.__date) model.set(key, parseDate(value.__date));
  else if(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) model.set(key, parseDate(value));
  else model.set(key, value);
}


function defaultInputState(){
  const today = new Date();
  return {
    'Capital_Inputs!D7':'Project X',
    'Capital_Inputs!F14':fmtDate(today),
    'Capital_Inputs!F17':60,
    'Debt_Model!E8':0.0375,

    'Capital_Inputs!F28':5000,
    'Capital_Inputs!F29':3000,
    'Capital_Inputs!F32':6,
    'Capital_Inputs!F33':6,
    'Capital_Inputs!F38':0.05,
    'Capital_Inputs!F39':0.70,

    'Capital_Inputs!F23':'Unitranche',
    'Capital_Inputs!F44':17.5,
    'Capital_Inputs!F46':0.03,
    'Capital_Inputs!F47':0.06,
    'Capital_Inputs!F48':0,
    'Capital_Inputs!F49':0.30,
    'Capital_Inputs!F51':0,
    'Debt_Model!C44':false,

    'Capital_Inputs!F24':'',
    'Capital_Inputs!F54':0,
    'Capital_Inputs!F55':0,
    'Capital_Inputs!F57':0,
    'Capital_Inputs!F59':0,
    'Capital_Inputs!F61':0,
    'Capital_Inputs!F62':0,
    'Capital_Inputs!F63':0,
    'Capital_Inputs!F64':0,
    'Capital_Inputs!F66':0,
    'Debt_Model!C59':false,

    'Capital_Inputs!F25':'',
    'Capital_Inputs!F69':0,
    'Capital_Inputs!F71':0,
    'Capital_Inputs!F72':0,
    'Capital_Inputs!F73':0,
    'Capital_Inputs!F74':0,
    'Capital_Inputs!F76':0,
    'Debt_Model!C74':false,

    'Capital_Inputs!F79':0,
    'Capital_Inputs!F80':0,
    'Capital_Inputs!F81':0,
    'Capital_Inputs!F82':0,
    'Capital_Inputs!F83':0,

    'Capital_Inputs!D85':'RMB',
    'Capital_Inputs!F85':true,
    'Capital_Inputs!F86':11.0,
    'Capital_Inputs!F89':0.02,
    'Capital_Inputs!F90':0.045,
    'Capital_Inputs!F91':0,
    'Capital_Inputs!F94':0,

    'Capital_Inputs!F111':25,
    'Capital_Inputs!F112':0.02,
    'Capital_Inputs!F113':0.50,
    'Capital_Inputs!F114':0.15,
    'Capital_Inputs!F116':0.08,
    'Capital_Inputs!F117':0.15
  };
}
function applyDefaultInputs(){
  const defaults=defaultInputState();
  Object.entries(defaults).forEach(([key,value])=>setModelValueRaw(key, value));
}

function render(){
  $('#projectTitle').textContent = model.get('Capital_Inputs!D7') || 'Debt Model';
  $('#updatedDate').textContent = 'Entry date: '+format(model.get('Capital_Inputs!F14'));
  renderCards(); renderWarningBanner(); renderReturns(); renderDashboardTable(); renderInputs(); renderDebtSchedule(); renderCharts(); renderSensitivityMatrix(); updateScenarioControls();
}

const HISTORY_LIMIT = 80;
let undoStack = [];
let redoStack = [];
let isApplyingHistory = false;

function getInputKeys(){
  return MODEL_DATA.metadata.inputs.flatMap(section => section.items.map(item => item.key));
}
function snapshotInputs(){
  const snapshot={};
  getInputKeys().forEach(key=>{
    const value=model.get(key);
    snapshot[key]=value instanceof Date ? fmtDate(value) : value;
  });
  return snapshot;
}
function applyInputSnapshot(snapshot){
  isApplyingHistory=true;
  Object.entries(snapshot).forEach(([key,value])=>setModelValueRaw(key, value));
  isApplyingHistory=false;
  saveState();
  render();
}
function pushUndoSnapshot(){
  if(isApplyingHistory) return;
  undoStack.push(snapshotInputs());
  if(undoStack.length>HISTORY_LIMIT) undoStack.shift();
  redoStack=[];
  updateScenarioControls();
}
function scenarioStorageKey(){
  return 'hcDebtModelScenarios';
}
function readScenarios(){
  try{return JSON.parse(localStorage.getItem(scenarioStorageKey())||'{}') || {};}catch(e){return {};}
}
function writeScenarios(scenarios){
  localStorage.setItem(scenarioStorageKey(), JSON.stringify(scenarios));
}
function currentProjectName(){
  return String(model.get('Capital_Inputs!D7') || 'Debt Model').trim() || 'Debt Model';
}
function saveNamedScenario(){
  const scenarios=readScenarios();
  const defaultName=currentProjectName()+' - '+new Date().toISOString().slice(0,10);
  const name=prompt('Scenario name', defaultName);
  if(!name) return;
  scenarios[name]=snapshotInputs();
  writeScenarios(scenarios);
  updateScenarioControls(name);
  toast('Scenario saved');
}
function loadNamedScenario(){
  const select=$('#scenarioSelect');
  const name=select && select.value;
  if(!name) return toast('Choose a saved scenario first');
  const scenarios=readScenarios();
  if(!scenarios[name]) return toast('Scenario not found');
  pushUndoSnapshot();
  applyInputSnapshot(scenarios[name]);
  toast('Scenario loaded');
}
function deleteNamedScenario(){
  const select=$('#scenarioSelect');
  const name=select && select.value;
  if(!name) return toast('Choose a saved scenario first');
  const scenarios=readScenarios();
  delete scenarios[name];
  writeScenarios(scenarios);
  updateScenarioControls();
  toast('Scenario deleted');
}
function updateScenarioControls(selectedName){
  const select=$('#scenarioSelect');
  if(!select) return;
  const scenarios=readScenarios();
  const names=Object.keys(scenarios).sort();
  select.innerHTML='<option value="">Saved scenarios...</option>'+names.map(name=>`<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`).join('');
  if(selectedName) select.value=selectedName;
  const undo=$('#undoBtn'), redo=$('#redoBtn');
  if(undo) undo.disabled = undoStack.length===0;
  if(redo) redo.disabled = redoStack.length===0;
}
function undoInputChange(){
  if(!undoStack.length) return;
  redoStack.push(snapshotInputs());
  const previous=undoStack.pop();
  applyInputSnapshot(previous);
  updateScenarioControls();
  toast('Undo applied');
}
function redoInputChange(){
  if(!redoStack.length) return;
  undoStack.push(snapshotInputs());
  const next=redoStack.pop();
  applyInputSnapshot(next);
  updateScenarioControls();
  toast('Redo applied');
}
function kpiSparkline(key){
  const row=(MODEL_DATA.metadata.dashboardRows||[]).find(r=>r.cells && r.cells.includes(key));
  const values=row ? row.cells.map(k=>toNumber(model.get(k))) : [];
  if(values.length<2 || values.every(v=>!isFinite(v))) return '';
  const nums=values.filter(Number.isFinite);
  const min=Math.min(...nums), max=Math.max(...nums);
  const w=120,h=28,p=3;
  const x=i=>p+(w-p*2)*(i/(values.length-1||1));
  const y=v=>h-p-(h-p*2)*((v-min)/(max-min||1));
  const pts=values.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
  return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}"/></svg>`;
}
function renderWarningBanner(){
  const host=$('#warningBanner');
  if(!host) return;
  const warnings=[];
  const dscrYr1=toNumber(model.get('Output!E37'));
  const globalLev=toNumber(model.get('Output!D34'));
  const netCashYr1=toNumber(model.get('Output!E29'));
  if(isFinite(dscrYr1) && dscrYr1 < 1.2) warnings.push(`DSCR Year 1 is ${format(dscrYr1,'x1')}, below 1.2x.`);
  if(isFinite(globalLev) && globalLev > 5.0) warnings.push(`Global leverage is ${format(globalLev,'x1')}, above 5.0x.`);
  if(isFinite(netCashYr1) && netCashYr1 < 0) warnings.push('Year 1 net cash is negative.');
  host.innerHTML = warnings.length ? warnings.map(w=>`<span>${escapeHtml(w)}</span>`).join('') : '<span class="ok">No headline covenant warnings based on current dashboard thresholds.</span>';
}
function withTemporaryInput(key, value, fn){
  const old=model.get(key);
  model.set(key, value);
  const out=fn();
  model.set(key, old);
  return out;
}

function evaluateWithCurrentInputs(overrides, outputKey){
  const tempModel = createModel(MODEL_DATA);
  snapshotInputsForEvaluation().forEach(([key,value])=>{
    if(value && typeof value === 'object' && value.__date) tempModel.set(key, parseDate(value.__date));
    else if(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) tempModel.set(key, parseDate(value));
    else tempModel.set(key, value);
  });
  Object.entries(overrides).forEach(([key,value])=>tempModel.set(key, value));
  return tempModel.get(outputKey);
}
function snapshotInputsForEvaluation(){
  return getInputKeys().map(key=>[key, model.get(key)]);
}

function renderSensitivityMatrix(){
  const host=$('#sensitivityMatrix');
  if(!host) return;
  const baseExit=toNumber(model.get('Capital_Inputs!F33'));
  const cases=[
    {label:'-1.0x', value:baseExit-1.0},
    {label:'-0.5x', value:baseExit-0.5},
    {label:'Base', value:baseExit},
    {label:'+0.5x', value:baseExit+0.5},
    {label:'+1.0x', value:baseExit+1.0}
  ];
  let html='<table><thead><tr><th>Exit multiple case</th><th>Exit multiple</th><th>WDO Gross IRR</th></tr></thead><tbody>';
  cases.forEach(c=>{
    const irr=evaluateWithCurrentInputs({'Capital_Inputs!F33':c.value}, 'Output!G9');
    html+=`<tr><th>${c.label}</th><td>${format(c.value,'x1')}</td><td>${format(irr,'percent1')}</td></tr>`;
  });
  html+='</tbody></table>';
  host.innerHTML=html;
}
function csvEscape(value){
  const s=String(value == null ? '' : value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
}
function downloadTextFile(filename, content, type='text/csv'){
  const blob=new Blob([content], {type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function datedFilename(prefix, ext){
  const safe=currentProjectName().replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'') || 'Debt_Model';
  const stamp=new Date().toISOString().slice(0,10);
  return `${safe}_${prefix}_${stamp}.${ext}`;
}
function exportScenarioSummary(){
  const rows=[
    ['Section','Metric','Value'],
    ['Project','Project name',currentProjectName()],
    ['KPIs','WDO Gross IRR',format(model.get('Output!G9'),'percent1')],
    ['KPIs','Net WDO IRR',format(model.get('Output!G10'),'percent1')],
    ['KPIs','WDO net MoM',format(model.get('Output!I10'),'x2')],
    ['KPIs','Global x EBITDA',format(model.get('Output!D34'),'x1')],
    ['KPIs','DSCR Year 1',format(model.get('Output!E37'),'x1')],
    ['KPIs','Contractual IRR',format(model.get('Output!G11'),'percent1')]
  ];
  MODEL_DATA.metadata.inputs.forEach(section=>{
    section.items.forEach(item=>{
      rows.push([section.title, item.label, format(model.get(item.key), item.type==='percent'?'percent1':item.type)]);
    });
  });
  downloadTextFile(datedFilename('Scenario_Summary','csv'), rows.map(r=>r.map(csvEscape).join(',')).join('\n'));
}

function renderCards(){
  const host=$('#kpiCards'); host.innerHTML='';
  const cards=[
    {label:'WDO Gross IRR', key:'Output!G9', format:'percent1'},
    {label:'Net WDO IRR', key:'Output!G10', format:'percent1'},
    {label:'WDO net MoM', key:'Output!I10', format:'x2'},
    {label:'Global x EBITDA', key:'Output!D34', format:'x1'},
    {label:'DSCR Year 1', key:'Output!E37', format:'x1'},
    {label:'Contractual IRR', key:'Output!G11', format:'percent1'}
  ];
  cards.forEach(card=>{
    const div=document.createElement('article'); div.className='card kpi';
    div.innerHTML=`<div class="kpi-label">${card.label}</div><div class="kpi-value">${format(model.get(card.key), card.format)}</div>${kpiSparkline(card.key)}`;
    host.appendChild(div);
  });
}
function renderReturns(){
  const tbody=$('#returnsBody'); tbody.innerHTML='';
  MODEL_DATA.metadata.outputs.forEach(row=>{
    const displayRow = {...row};
    if(displayRow.label === 'WDO Gross') displayRow.label = 'WDO Net';
    else if(displayRow.label === 'WDO Net') displayRow.label = 'WDO Gross';
    const tr=document.createElement('tr');
    tr.innerHTML=`<th>${displayRow.label}</th><td>${displayRow.irr?format(model.get(displayRow.irr),'percent1'):'–'}</td><td>${displayRow.mom?format(model.get(displayRow.mom),'x2'):'–'}</td>`;
    tbody.appendChild(tr);
  });
}
function renderDashboardTable(){
  const head=$('#dashboardHead'); head.innerHTML='';
  const hr=document.createElement('tr'); hr.innerHTML='<th>Metric</th>'+MODEL_DATA.metadata.dashboardHeaderCells.map(k=>`<th>${format(model.get(k),'date')}</th>`).join(''); head.appendChild(hr);
  const body=$('#dashboardBody'); body.innerHTML='';
  MODEL_DATA.metadata.dashboardRows.forEach(row=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<th>${row.label}</th>`+row.cells.map(k=>`<td>${format(model.get(k), row.format)}</td>`).join('');
    body.appendChild(tr);
  });
}
function renderInputs(){
  const host=$('#inputSections');
  const openSections = new Set($$('#inputSections details.input-section[open]').map(el=>el.dataset.sectionTitle));
  host.innerHTML='';
  MODEL_DATA.metadata.inputs.forEach((section,idx)=>{
    const wrap=document.createElement('details'); wrap.className='input-section'; wrap.dataset.sectionTitle = section.title; wrap.open = openSections.size ? openSections.has(section.title) : idx<2;
    const summary=document.createElement('summary'); summary.textContent=section.title; wrap.appendChild(summary);
    const grid=document.createElement('div'); grid.className='input-grid';
    section.items.forEach(item=>{
      const field=document.createElement('label'); field.className='field';
      const id='in_'+item.key.replace(/[^a-z0-9]/gi,'_');
      let control='';
      if(item.type==='checkbox'){
        control=`<input id="${id}" type="checkbox" data-key="${item.key}" data-type="${item.type}" ${inputValueForDisplay(item.key,item.type)?'checked':''}>`;
      } else {
        const inputType=item.type==='date'?'date':(item.type==='number'||item.type==='percent'?'number':'text');
        const step=item.type==='percent'?'0.01':(item.type==='number'?'0.01':'');
        control=`<input id="${id}" type="${inputType}" ${step?`step="${step}"`:''} data-key="${item.key}" data-type="${item.type}" value="${escapeAttr(inputValueForDisplay(item.key,item.type))}">`;
      }
      const unit = item.unit && item.type!=='percent' && item.type!=='checkbox' ? `<span>${item.unit}</span>` : '';
      const hint = item.type==='percent' ? '<span>%</span>' : unit;
      field.innerHTML=`<span class="field-name">${item.label}</span><span class="input-wrap">${control}${hint}</span>`;
      grid.appendChild(field);
    });
    wrap.appendChild(grid); host.appendChild(wrap);
  });
  $$('#inputSections input').forEach(inp=>{
    inp.addEventListener('focus', pushUndoSnapshot, {once:true});
    inp.addEventListener('input', e=>{
      const type=e.target.dataset.type; const key=e.target.dataset.key;
      const raw=type==='checkbox' ? e.target.checked : e.target.value;
      model.set(key, parseInputValue(raw,type)); saveState(); renderComputedOnly();
    });
    inp.addEventListener('change', e=>{
      const type=e.target.dataset.type; const key=e.target.dataset.key;
      const raw=type==='checkbox' ? e.target.checked : e.target.value;
      model.set(key, parseInputValue(raw,type)); saveState(); render();
    });
  });
}
function renderComputedOnly(){
  $('#projectTitle').textContent = model.get('Capital_Inputs!D7') || 'Debt Model';
  $('#updatedDate').textContent = 'Entry date: '+format(model.get('Capital_Inputs!F14'));
  renderCards(); renderWarningBanner(); renderReturns(); renderDashboardTable(); renderDebtSchedule(); renderCharts(); renderSensitivityMatrix(); updateScenarioControls();
}
function renderDebtSchedule(){
  const host=$('#debtTables'); host.innerHTML='';
  const rowsBySection = new Map();
  getDebtScheduleRows().forEach(row=>{
    if(!rowsBySection.has(row.section)) rowsBySection.set(row.section, []);
    rowsBySection.get(row.section).push(row);
  });
  rowsBySection.forEach((rows, section)=>{
    const wrap=document.createElement('section');
    wrap.className='debt-table-section';
    const title=document.createElement('h3');
    title.textContent=section;
    const tableWrap=document.createElement('div');
    tableWrap.className='table-wrap wide';
    const table=document.createElement('table');
    const thead=document.createElement('thead');
    const hr=document.createElement('tr');
    hr.innerHTML='<th>Line item</th>'+MODEL_DATA.metadata.periodHeaderCells.map(k=>`<th>${format(model.get(k),'date')}</th>`).join('');
    thead.appendChild(hr);
    const tbody=document.createElement('tbody');
    rows.forEach(row=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<th>${row.label}</th>`+row.cells.map(k=>`<td>${format(model.get(k),'money0')}</td>`).join('');
      tbody.appendChild(tr);
    });
    table.appendChild(thead);
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrap.appendChild(title);
    wrap.appendChild(tableWrap);
    host.appendChild(wrap);
  });
}
function annualCellsForDebtRow(row){
  return ['D','H','L','P','T','X'].map(col=>'Debt_Model!'+col+row);
}
function renderCharts(){
  const years=MODEL_DATA.metadata.dashboardHeaderCells.map(k=>format(model.get(k),'date'));
  drawLineChart('#ebitdaChart', years, MODEL_DATA.metadata.dashboardRows[0].cells.map(k=>toNumber(model.get(k))), 'EBITDA');
  drawLineChart('#cashChart', years, MODEL_DATA.metadata.dashboardRows[5].cells.map(k=>toNumber(model.get(k))), 'Net cash');
  drawMultiLineChart('#westbrookeBalanceChart', years, [
    {label:'WDO closing balance', values:annualCellsForDebtRow(119).map(k=>toNumber(model.get(k)))},
    {label:'RMB closing balance', values:annualCellsForDebtRow(105).map(k=>toNumber(model.get(k)))},
    {label:'Global facility closing balance', values:annualCellsForDebtRow(29).map(k=>toNumber(model.get(k)))}
  ], 'Facilities Closing Balances');
}
function drawLineChart(selector, labels, values, title){
  const el=$(selector); const w=640, h=220, pad=38;
  const nums=values.filter(Number.isFinite); const min=Math.min(0,...nums), max=Math.max(...nums,1);
  const x=i=>pad + (w-pad*2)*(i/(values.length-1||1));
  const y=v=>h-pad - (h-pad*2)*((v-min)/(max-min||1));
  const pts=values.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
  const area=values.map((v,i)=>`${x(i)},${y(v)}`).join(' ') + ` ${x(values.length-1)},${h-pad} ${x(0)},${h-pad}`;
  el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${title} chart">
    <text x="${pad}" y="20" class="chart-title">${title}</text>
    <line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" class="axis"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h-pad}" class="axis"/>
    <polygon points="${area}" class="chart-area"/>
    <polyline points="${pts}" class="chart-line"/>
    ${values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3" class="dot"><title>${labels[i]}: ${fmtNum(v,0)}</title></circle>`).join('')}
    ${labels.map((l,i)=>`<text x="${x(i)}" y="${h-12}" text-anchor="middle" class="tick">${escapeHtml(l).replace(/ /g,'\u00a0')}</text>`).join('')}
  </svg>`;
}
function drawMultiLineChart(selector, labels, series, title){
  const el=$(selector); const w=640, h=250, pad=42;
  const allValues=series.flatMap(s=>s.values).filter(Number.isFinite);
  const min=Math.min(0,...allValues), max=Math.max(...allValues,1);
  const x=i=>pad + (w-pad*2)*(i/(labels.length-1||1));
  const y=v=>h-pad - (h-pad*2-26)*((v-min)/(max-min||1));
  const legendY=42;
  const classes=['series-a','series-b','series-c'];
  el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${title} chart">
    <text x="${pad}" y="20" class="chart-title">${title}</text>
    <line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" class="axis"/>
    <line x1="${pad}" y1="${pad+20}" x2="${pad}" y2="${h-pad}" class="axis"/>
    ${series.map((s,si)=>{
      const pts=s.values.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
      return `<polyline points="${pts}" class="chart-line ${classes[si]||''}"/>`+
        s.values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3" class="dot ${classes[si]||''}"><title>${s.label} - ${labels[i]}: ${fmtNum(v,0)}</title></circle>`).join('');
    }).join('')}
    ${series.map((s,si)=>`<g class="legend"><line x1="${pad+si*170}" y1="${legendY}" x2="${pad+22+si*170}" y2="${legendY}" class="chart-line ${classes[si]||''}"/><text x="${pad+28+si*170}" y="${legendY+4}" class="tick">${escapeHtml(s.label)}</text></g>`).join('')}
    ${labels.map((l,i)=>`<text x="${x(i)}" y="${h-12}" text-anchor="middle" class="tick">${escapeHtml(l).replace(/ /g,'\u00a0')}</text>`).join('')}
  </svg>`;
}
function escapeHtml(s){ return String(s).replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function escapeAttr(s){ return String(s ?? '').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function toCsv(rows){ return rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n'); }
function download(name, text, mime){
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:mime||'text/plain'})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function exportCsv(){
  const rows=[['Returns attribution','IRR','MoM']];
  MODEL_DATA.metadata.outputs.forEach(row=>rows.push([row.label,row.irr?format(model.get(row.irr),'percent1'):'',row.mom?format(model.get(row.mom),'x2'):'']));
  rows.push([]); rows.push(['Dashboard'].concat(MODEL_DATA.metadata.dashboardHeaderCells.map(k=>format(model.get(k)))));
  MODEL_DATA.metadata.dashboardRows.forEach(row=>rows.push([row.label].concat(row.cells.map(k=>format(model.get(k), row.format)))));
  download('hc-debt-model-output.csv', toCsv(rows), 'text/csv');
}

function downloadBlob(name, blob){
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
function safeFileName(s){
  return String(s||'HC Debt Model').replace(/[<>:"/\\|?*]+/g,' ').replace(/\s+/g,' ').trim().slice(0,90) || 'HC Debt Model';
}
function isDate(value){ return Object.prototype.toString.call(value)==='[object Date]' && !isNaN(value.getTime()); }
function dateToSerial(d){
  const dt=parseDate(d);
  if(!isDate(dt)) return '';
  const epoch=Date.UTC(1899,11,30);
  return (Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())-epoch)/86400000;
}
function normalizeExcelValue(value, type){
  if(Array.isArray(value)) value = value.length ? value[0] : '';
  if(type==='date' || isDate(value)) return dateToSerial(value);
  if(type==='checkbox') return !!value;
  if(type==='number' || type==='percent') return toNumber(value);
  if(value == null) return '';
  return value;
}
function parseCellKey(key){
  const i=key.lastIndexOf('!');
  return {sheet:key.slice(0,i), cell:key.slice(i+1)};
}
function colNumber(cellRef){
  const letters=String(cellRef).match(/^[A-Z]+/i)?.[0].toUpperCase() || 'A';
  let n=0; for(const ch of letters) n=n*26 + ch.charCodeAt(0)-64; return n;
}
function rowNumber(cellRef){ return Number(String(cellRef).match(/\d+/)?.[0] || 1); }
function elementChildrenByLocal(node, local){
  return Array.from(node.childNodes || []).filter(n => n.nodeType===1 && n.localName===local);
}
function firstDescendantByLocal(node, local){
  return Array.from(node.getElementsByTagNameNS('*', local))[0] || null;
}
function normalizeZipPath(path){
  const parts=[];
  for(const part of String(path).split('/')){
    if(!part || part==='.') continue;
    if(part==='..') parts.pop(); else parts.push(part);
  }
  return parts.join('/');
}
function resolveZipTarget(basePath, target){
  if(String(target).startsWith('/')) return String(target).slice(1);
  const baseDir=String(basePath).split('/').slice(0,-1).join('/');
  return normalizeZipPath(baseDir + '/' + target);
}
function parseXml(text, label){
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const err = doc.getElementsByTagName('parsererror')[0];
  if(err) throw new Error('Could not parse '+label);
  return doc;
}
function serializeXml(doc){ return new XMLSerializer().serializeToString(doc); }
async function getXmlDoc(zip, path, cache){
  if(cache[path]) return cache[path];
  const file=zip.file(path);
  if(!file) throw new Error('Missing workbook part: '+path);
  cache[path]=parseXml(await file.async('text'), path);
  return cache[path];
}
async function buildSheetPathMap(zip){
  const cache={};
  const workbookPath='xl/workbook.xml';
  const wbDoc=await getXmlDoc(zip, workbookPath, cache);
  const relDoc=await getXmlDoc(zip, 'xl/_rels/workbook.xml.rels', cache);
  const rels={};
  Array.from(relDoc.getElementsByTagNameNS('*','Relationship')).forEach(rel=>{ rels[rel.getAttribute('Id')] = rel.getAttribute('Target'); });
  const map={};
  Array.from(wbDoc.getElementsByTagNameNS('*','sheet')).forEach(sheet=>{
    const name=sheet.getAttribute('name');
    const rid=sheet.getAttribute('r:id') || sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
    if(name && rid && rels[rid]) map[name]=resolveZipTarget(workbookPath, rels[rid]);
  });
  return map;
}
function getOrCreateCell(doc, address, create){
  const root=doc.documentElement;
  const ns=root.namespaceURI || 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  let sheetData=firstDescendantByLocal(root, 'sheetData');
  if(!sheetData && create){ sheetData=doc.createElementNS(ns,'sheetData'); root.appendChild(sheetData); }
  if(!sheetData) return null;
  const rn=rowNumber(address), cn=colNumber(address);
  let row=elementChildrenByLocal(sheetData,'row').find(r => Number(r.getAttribute('r'))===rn);
  if(!row && create){
    row=doc.createElementNS(ns,'row'); row.setAttribute('r', String(rn));
    const rows=elementChildrenByLocal(sheetData,'row');
    const before=rows.find(r => Number(r.getAttribute('r'))>rn);
    before ? sheetData.insertBefore(row, before) : sheetData.appendChild(row);
  }
  if(!row) return null;
  let cell=elementChildrenByLocal(row,'c').find(c => c.getAttribute('r')===address);
  if(!cell && create){
    cell=doc.createElementNS(ns,'c'); cell.setAttribute('r', address);
    const cells=elementChildrenByLocal(row,'c');
    const before=cells.find(c => colNumber(c.getAttribute('r'))>cn);
    before ? row.insertBefore(cell, before) : row.appendChild(cell);
  }
  return cell || null;
}
function removeChildrenByLocal(cell, locals){
  Array.from(cell.childNodes || []).forEach(child=>{
    if(child.nodeType===1 && locals.includes(child.localName)) cell.removeChild(child);
  });
}
function appendValueNode(doc, cell, valueText){
  const ns=doc.documentElement.namespaceURI || 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const v=doc.createElementNS(ns,'v'); v.textContent=String(valueText);
  const ext=elementChildrenByLocal(cell,'extLst')[0];
  ext ? cell.insertBefore(v, ext) : cell.appendChild(v);
}
function setCellXmlValue(doc, cell, value, options){
  const ns=doc.documentElement.namespaceURI || 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const preserveFormula=!!(options && options.preserveFormula);
  removeChildrenByLocal(cell, preserveFormula ? ['v','is'] : ['f','v','is']);
  if(value == null || value === ''){
    if(!preserveFormula) cell.removeAttribute('t');
    return;
  }
  if(value === true || value === false){
    cell.setAttribute('t','b'); appendValueNode(doc, cell, value ? '1' : '0'); return;
  }
  if(typeof value === 'number' && Number.isFinite(value)){
    cell.removeAttribute('t'); appendValueNode(doc, cell, String(value)); return;
  }
  const text=String(value);
  if(/^#(REF!|DIV\/0!|VALUE!|NAME\?|N\/A|NUM!|NULL!)/.test(text)){
    cell.setAttribute('t','e'); appendValueNode(doc, cell, text); return;
  }
  if(preserveFormula){
    cell.setAttribute('t','str'); appendValueNode(doc, cell, text); return;
  }
  cell.setAttribute('t','inlineStr');
  const is=doc.createElementNS(ns,'is');
  const t=doc.createElementNS(ns,'t');
  if(/^\s|\s$/.test(text)) t.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');
  t.textContent=text;
  is.appendChild(t); cell.appendChild(is);
}
function patchInputCell(doc, address, value){
  const cell=getOrCreateCell(doc, address, true);
  setCellXmlValue(doc, cell, value, {preserveFormula:false});
}
function patchCachedFormulaCell(doc, address, value){
  const cell=getOrCreateCell(doc, address, false);
  if(!cell || !elementChildrenByLocal(cell,'f').length) return false;
  setCellXmlValue(doc, cell, normalizeExcelValue(value), {preserveFormula:true});
  return true;
}
function collectOutputCacheKeys(){
  const keys=new Set();
  const add=k=>{ if(k && typeof k==='string' && k.includes('!')) keys.add(k); };
  (MODEL_DATA.metadata.keyCards || []).forEach(card=>add(card.key));
  (MODEL_DATA.metadata.outputs || []).forEach(row=>{ add(row.irr); add(row.mom); });
  (MODEL_DATA.metadata.dashboardHeaderCells || []).forEach(add);
  (MODEL_DATA.metadata.dashboardRows || []).forEach(row=>(row.cells || []).forEach(add));
  (MODEL_DATA.metadata.periodHeaderCells || []).forEach(add);
  getDebtScheduleRows().forEach(row=>(row.cells || []).forEach(add));
  Object.keys(MODEL_DATA.formulas || {}).forEach(key=>{ if(parseCellKey(key).sheet === 'Output') add(key); });
  return Array.from(keys);
}
async function updateWorkbookCalculationSettings(zip){
  const cache={};
  const wbPath='xl/workbook.xml';
  const wbDoc=await getXmlDoc(zip, wbPath, cache);
  const root=wbDoc.documentElement;
  const ns=root.namespaceURI || 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  let calcPr=elementChildrenByLocal(root,'calcPr')[0];
  if(!calcPr){ calcPr=wbDoc.createElementNS(ns,'calcPr'); root.appendChild(calcPr); }
  calcPr.setAttribute('calcMode','auto');
  calcPr.setAttribute('fullCalcOnLoad','1');
  calcPr.setAttribute('forceFullCalc','1');
  zip.file(wbPath, serializeXml(wbDoc));
  if(zip.file('xl/calcChain.xml')) zip.remove('xl/calcChain.xml');
  const relsPath='xl/_rels/workbook.xml.rels';
  if(zip.file(relsPath)){
    const relDoc=await getXmlDoc(zip, relsPath, cache);
    Array.from(relDoc.getElementsByTagNameNS('*','Relationship')).forEach(rel=>{
      const typ=rel.getAttribute('Type') || '';
      if(/\/calcChain$/.test(typ)) rel.parentNode.removeChild(rel);
    });
    zip.file(relsPath, serializeXml(relDoc));
  }
  const ctPath='[Content_Types].xml';
  if(zip.file(ctPath)){
    const ctDoc=await getXmlDoc(zip, ctPath, cache);
    Array.from(ctDoc.getElementsByTagNameNS('*','Override')).forEach(node=>{
      if(node.getAttribute('PartName')==='/xl/calcChain.xml') node.parentNode.removeChild(node);
    });
    zip.file(ctPath, serializeXml(ctDoc));
  }
}
async function buildExcelWorkbookBlob(){
  if(!window.JSZip) throw new Error('JSZip did not load. Check your internet connection and refresh the page.');
  const response=await fetch('./assets/HC Debt Only Model.xlsx');
  if(!response.ok) throw new Error('Could not load Excel template from assets/HC Debt Only Model.xlsx');
  const zip=await JSZip.loadAsync(await response.arrayBuffer());
  const sheetMap=await buildSheetPathMap(zip);
  const docs={};
  const inputItems=(MODEL_DATA.metadata.inputs || []).flatMap(section => section.items || []);
  const inputKeys=new Set(inputItems.map(item=>item.key));
  for(const item of inputItems){
    const path=sheetMap[item.sheet];
    if(!path) continue;
    const doc=await getXmlDoc(zip, path, docs);
    patchInputCell(doc, item.cell, normalizeExcelValue(model.get(item.key), item.type));
  }
  for(const key of collectOutputCacheKeys()){
    if(inputKeys.has(key)) continue;
    const {sheet, cell}=parseCellKey(key);
    const path=sheetMap[sheet];
    if(!path) continue;
    const doc=await getXmlDoc(zip, path, docs);
    patchCachedFormulaCell(doc, cell, model.get(key));
  }
  for(const [path, doc] of Object.entries(docs)) zip.file(path, serializeXml(doc));
  await updateWorkbookCalculationSettings(zip);
  return zip.generateAsync({type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression:'DEFLATE'});
}
async function exportExcel(){
  const btn=$('#exportExcelBtn');
  if(btn){ btn.disabled=true; btn.textContent='Preparing Excel...'; }
  try{
    const blob=await buildExcelWorkbookBlob();
    const name=safeFileName(model.get('Capital_Inputs!D7')) + ' - HC Debt Model Output.xlsx';
    downloadBlob(name, blob);
    toast('Excel model exported');
  }catch(err){
    console.error(err);
    toast('Excel export failed');
    alert('Excel export failed. Refresh the page and try again. If this continues, make sure the file assets/HC Debt Only Model.xlsx is uploaded to the app.\n\nDetails: '+err.message);
  }finally{
    if(btn){ btn.disabled=false; btn.textContent='Export Excel'; }
  }
}

function copyShareLink(){
  saveState(); navigator.clipboard?.writeText(location.href).then(()=>toast('Scenario link copied')).catch(()=>toast('Copy failed; use the address bar link'));
}
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }
function resetSelectedInputsToZero(){
  applyDefaultInputs();
  saveState();
}


function docxEsc(s){
  return String(s == null ? '' : s).replace(/[<>&'"]/g, c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));
}
function termSheetMoneyMillions(key){
  const v=toNumber(model.get(key));
  return isFinite(v) ? '£'+v.toFixed(1)+'m' : '£0.0m';
}
function termSheetPercent(key){
  return format(model.get(key),'percent1');
}
function termSheetBps(key){
  const bps=Math.round(toNumber(model.get(key))*10000);
  return isFinite(bps) ? String(bps)+'bps' : '0bps';
}
function termSheetLeverage(quantumKey){
  const q=toNumber(model.get(quantumKey));
  const ebitda=toNumber(model.get('Capital_Inputs!F28'))/1000;
  return ebitda ? (q/ebitda).toFixed(1)+'x' : 'n/a';
}
function termSheetTenor(){
  const months=toNumber(model.get('Capital_Inputs!F17')) || 60;
  const years=months/12;
  return Number.isInteger(years) ? years+' years' : months+' months';
}
function termSheetMonitoringFeeText(){
  const fee=toNumber(model.get('Capital_Inputs!F111'));
  const amount=isFinite(fee) ? '£'+Math.round(fee*1000).toLocaleString() : '£25,000';
  return `An annual monitoring fee of ${amount} in respect of the Facility will be payable quarterly in advance`;
}
function docxReplaceTextNodes(xml, replacements){
  return xml.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g, (match, attrs, text)=>{
    const decoded=text.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
    if(Object.prototype.hasOwnProperty.call(replacements, decoded)){
      return `<w:t${attrs}>${docxEsc(replacements[decoded])}</w:t>`;
    }
    return match;
  });
}
function docxReplaceSplitTranche3(xml){
  return xml.replace(
    /(<w:t[^>]*>)\[Insert Tranche <\/w:t>([\s\S]*?)(<w:t[^>]*>)3<\/w:t>([\s\S]*?)(<w:t[^>]*>) name\]<\/w:t>/,
    `$1${docxEsc(String(model.get('Capital_Inputs!F25') || 'Tranche 3'))}</w:t>$2$3</w:t>$4$5</w:t>`
  );
}
function docxReplaceFirst(xml, findText, replacement){
  const escaped=findText.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp(`(<w:t([^>]*)>)${escaped}(<\\/w:t>)`);
  return xml.replace(re, (m,start,attrs,end)=>`${start}${docxEsc(replacement)}${end}`);
}
function docxHighlightUnupdatedText(xml){
  const toHighlight=[
    'TBC',
    'To provide Ethos shareholder cash-out, refinance existing senior facility and pay transaction fees.',
    '150bps',
    '(i) Gross Leverage (headroom to be set up to 30% above agreed base case) and',
    ' (ii)  Debt Service Cover &gt;1.1x',
    'All cash above an agreed minimum closing balance swept - mechanism as follows:',
    '1) Service PIK margin on ',
    'Peferred',
    ' Equity;',
    '2) Pay down Senior Facility;',
    '3) Pay down Preferred Equity.',
    'NC2, 101 years 3&amp;4, no penalty thereafter',
    'Typical for a structure of this nature'
  ];
  toHighlight.forEach(raw=>{
    const safe=raw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const re=new RegExp(`(<w:rPr[^>]*>)([\\s\\S]*?<\\/w:rPr><w:t[^>]*>${safe}<\\/w:t>)`,'g');
    xml=xml.replace(re, (m,rpr,rest)=>{
      if(rpr.includes('<w:highlight')) return m;
      return rpr+'<w:highlight w:val="yellow"/>'+rest;
    });
  });
  return xml;
}
async function exportTermSheet(){
  const btn=$('#exportTermSheetBtn');
  const originalText=btn ? btn.textContent : '';
  try{
    if(btn){ btn.disabled=true; btn.textContent='Exporting...'; }
    const response=await fetch('./assets/term-sheet-template.docx');
    if(!response.ok) throw new Error('Template not found');
    const zip=await JSZip.loadAsync(await response.arrayBuffer());
    let xml=await zip.file('word/document.xml').async('string');
    const project=currentProjectName();
    const today=new Date().toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
    const replacements={
      '[Insert Project Name]':project,
      '[Insert today’s date]':today,
      '£[21.0]m':termSheetMoneyMillions('Capital_Inputs!F44'),
      ' up to [3.0]x':'up to '+termSheetLeverage('Capital_Inputs!F44'),
      '[650]bps over the applicable base rate, compounding and payable quarterly in arrears.':`${termSheetBps('Capital_Inputs!F47')} over the applicable base rate, compounding and payable quarterly in arrears.`,
      'Straight line, [20]% of initial facility':`Straight line, ${termSheetPercent('Capital_Inputs!F49')} of initial facility`,
      '[Insert Tranche 1 name]':String(model.get('Capital_Inputs!F23') || 'Tranche 1'),
      '[Insert Tranche 2 name]':String(model.get('Capital_Inputs!F24') || 'Tranche 2')
    };
    xml=docxReplaceTextNodes(xml, replacements);
    xml=docxReplaceFirst(xml, '£[7.0]m', '£'+(toNumber(model.get('Capital_Inputs!F28'))/1000).toFixed(1)+'m');
    xml=docxReplaceFirst(xml, '[', '');
    xml=docxReplaceFirst(xml, '300', String(Math.round(toNumber(model.get('Capital_Inputs!F46'))*10000)));
    xml=docxReplaceFirst(xml, ']', '');
    xml=docxReplaceFirst(xml, '5 years', termSheetTenor());
    xml=docxReplaceFirst(xml, 'An annual monitoring fee of £25,000 in respect of the Facility will be payable quarterly in advance', termSheetMonitoringFeeText());

    xml=docxReplaceFirst(xml, '£[7.0]m', termSheetMoneyMillions('Capital_Inputs!F55'));
    xml=docxReplaceFirst(xml, 'up to [4.1]x', 'up to '+termSheetLeverage('Capital_Inputs!F55'));
    xml=docxReplaceFirst(xml, '5 years', termSheetTenor());
    xml=docxReplaceFirst(xml, '300bps', termSheetBps('Capital_Inputs!F57'));
    xml=docxReplaceFirst(xml, '[1000]bps compounding quarterly in arrears.', `${termSheetBps('Capital_Inputs!F63')} compounding quarterly in arrears.`);
    xml=docxReplaceFirst(xml, '[18]% (in line with facility size).', `${termSheetPercent('Capital_Inputs!F66')} (in line with facility size).`);
    xml=docxReplaceFirst(xml, 'An annual monitoring fee of £25,000 in respect of the Facility will be payable quarterly in advance', termSheetMonitoringFeeText());

    xml=docxReplaceSplitTranche3(xml);
    xml=docxReplaceFirst(xml, '£[7.0]m', termSheetMoneyMillions('Capital_Inputs!F69'));
    xml=docxReplaceFirst(xml, 'up to [4.1]x', 'up to '+termSheetLeverage('Capital_Inputs!F69'));
    xml=docxReplaceFirst(xml, '5 years', termSheetTenor());
    xml=docxReplaceFirst(xml, '300bps', termSheetBps('Capital_Inputs!F71'));
    xml=docxReplaceFirst(xml, '[1000]bps compounding quarterly in arrears.', `${termSheetBps('Capital_Inputs!F73')} compounding quarterly in arrears.`);
    xml=docxReplaceFirst(xml, '[18]% (in line with facility size).', `${termSheetPercent('Capital_Inputs!F76')} (in line with facility size).`);
    xml=docxReplaceFirst(xml, 'An annual monitoring fee of £25,000 in respect of the Facility will be payable quarterly in advance', termSheetMonitoringFeeText());

    xml=docxHighlightUnupdatedText(xml);
    zip.file('word/document.xml', xml);
    const out=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    const url=URL.createObjectURL(out);
    const a=document.createElement('a');
    a.href=url;
    a.download=datedFilename('Indicative_Term_Sheet','docx');
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast('Term sheet exported');
  }catch(err){
    console.error(err);
    toast('Term sheet export failed: '+(err && err.message ? err.message : 'check template file'));
  }finally{
    if(btn){ btn.disabled=false; btn.textContent=originalText || 'Export Term Sheet'; }
  }
}

function bindNav(){
  $$('.tab').forEach(btn=>btn.addEventListener('click',()=>{
    currentSection=btn.dataset.section;
    $$('.tab').forEach(b=>b.classList.toggle('active', b===btn));
    $$('.view').forEach(v=>v.classList.toggle('active', v.id===currentSection));
  }));
  $('#resetBtn').addEventListener('click',()=>{ resetSelectedInputsToZero(); render(); toast('Inputs reset to app defaults'); });
  $('#saveScenarioBtn')?.addEventListener('click',saveNamedScenario);
  $('#loadScenarioBtn')?.addEventListener('click',loadNamedScenario);
  $('#deleteScenarioBtn')?.addEventListener('click',deleteNamedScenario);
  $('#undoBtn')?.addEventListener('click',undoInputChange);
  $('#redoBtn')?.addEventListener('click',redoInputChange);
  $('#exportSummaryBtn')?.addEventListener('click',exportScenarioSummary);
  $('#exportBtn').addEventListener('click',exportCsv);
  $('#exportExcelBtn').addEventListener('click',exportExcel);
  $('#exportTermSheetBtn').addEventListener('click',exportTermSheet);
  $('#shareBtn').addEventListener('click',copyShareLink);
}
ensureCurrentAppStateVersion();
if(!location.hash.startsWith('#s=') && !localStorage.getItem('hcDebtModelState')) applyDefaultInputs();
loadState(); bindNav(); render();
setTimeout(()=>document.body.classList.add('app-loaded'), 350);
})();
