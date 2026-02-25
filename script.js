const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_SHORT=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const WORK_HOURS=9;
const PAID_LEAVE_MINS=685; // 11h 25m

let currentMonth, currentYear;
let attendance={};
let holidays={};
let monthlySalary=0;

// ── INIT ─────────────────────────────────────────────────────────────────────
(function(){
  const now=new Date();
  currentMonth=now.getMonth(); currentYear=now.getFullYear();

  document.getElementById('hdrDate').textContent=now.toDateString();

  const ms=document.getElementById('monthSelect');
  MONTHS.forEach((m,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=m; if(i===currentMonth)o.selected=true; ms.appendChild(o); });

  const ys=document.getElementById('yearSelect');
  for(let y=currentYear-10;y<=currentYear+5;y++){ const o=document.createElement('option'); o.value=y; o.textContent=y; if(y===currentYear)o.selected=true; ys.appendChild(o); }

  document.getElementById('entryDate').value=fmt(now);
  document.getElementById('checkIn').value='09:30';
  document.getElementById('checkOut').value='18:30';

  try{
    const a=localStorage.getItem('att_v2'), h=localStorage.getItem('att_hol'), s=localStorage.getItem('att_salary');
    if(a) attendance=JSON.parse(a);
    if(h) holidays=JSON.parse(h);
    if(s){ monthlySalary=parseFloat(s)||0; document.getElementById('salaryInput').value=monthlySalary||''; }
  }catch(e){}

  renderHolidayTags(); loadMonth();
})();

function persist(){
  localStorage.setItem('att_v2',JSON.stringify(attendance));
  localStorage.setItem('att_hol',JSON.stringify(holidays));
  if(monthlySalary) localStorage.setItem('att_salary',monthlySalary);
}

// ── MONTH ────────────────────────────────────────────────────────────────────
function loadMonth(){
  currentMonth=+document.getElementById('monthSelect').value;
  currentYear=+document.getElementById('yearSelect').value;
  document.getElementById('tableTitle').textContent=`${MONTHS[currentMonth]} ${currentYear} — Log`;
  renderTable(); updateStats(); updateSalary();
}

// ── HOLIDAYS ─────────────────────────────────────────────────────────────────
function addHoliday(){
  const d=document.getElementById('holidayDate').value;
  const n=document.getElementById('holidayName').value.trim()||'Holiday';
  if(!d){toast('Pick a date',true);return;}
  holidays[d]=n; persist(); renderHolidayTags(); renderTable(); updateStats(); updateSalary();
  toast(`🎉 "${n}" added`);
  document.getElementById('holidayDate').value=''; document.getElementById('holidayName').value='';
}
function removeHoliday(d){ delete holidays[d]; persist(); renderHolidayTags(); renderTable(); updateStats(); updateSalary(); toast('Holiday removed'); }
function renderHolidayTags(){
  const c=document.getElementById('holidayTags'); c.innerHTML='';
  const keys=Object.keys(holidays).sort();
  if(!keys.length){ c.innerHTML='<span class="h-tag-none">No holidays added</span>'; return; }
  keys.forEach(d=>{ const t=document.createElement('div'); t.className='h-tag'; t.title='Tap to remove'; t.innerHTML=`${d} — ${holidays[d]} ✕`; t.onclick=()=>removeHoliday(d); c.appendChild(t); });
}

// ── QUICK ADD ────────────────────────────────────────────────────────────────
function saveEntry(){
  const d=document.getElementById('entryDate').value;
  const ci=document.getElementById('checkIn').value;
  const co=document.getElementById('checkOut').value;
  const note=document.getElementById('entryNote').value.trim();
  if(!d){toast('Select a date',true);return;}
  attendance[d]={checkIn:ci,checkOut:co,note};
  persist(); renderTable(); updateStats(); updateSalary(); toast('✓ Entry saved!'); clearForm();
}
function clearForm(){
  document.getElementById('checkIn').value='09:30';
  document.getElementById('checkOut').value='18:30';
  document.getElementById('entryNote').value='';
}

// ── INLINE EDIT ──────────────────────────────────────────────────────────────
function ic(date,field,value){
  if(!attendance[date]) attendance[date]={checkIn:'',checkOut:'',note:''};
  attendance[date][field]=value;
  const e=attendance[date];
  if(!e.checkIn&&!e.checkOut&&!e.note&&!e.paidLeave) delete attendance[date];
  persist(); refreshRow(date); updateStats(); updateSalary();
}

function refreshRow(date){
  // Refresh desktop row
  const row=document.querySelector(`tr[data-d="${date}"]`);
  if(row){
    const e=attendance[date]; const dow=new Date(date).getDay();
    const sc=row.querySelector('.sc');
    if(sc){
      if(dow===0) sc.innerHTML=`<span class="badge b-sunday">☀ Sun</span>`;
      else if(holidays[date]) sc.innerHTML=`<span class="badge b-holiday">🎉 ${holidays[date]}</span>`;
      else if(e?.paidLeave) sc.innerHTML=`<span class="badge b-pl">🌴 PL</span>`;
      else if(e&&(e.checkIn||e.checkOut)) sc.innerHTML=`<span class="badge b-present">✓ Present</span>`;
      else sc.innerHTML=`<span class="badge b-absent">✗ Absent</span>`;
    }
    const hc=row.querySelector('.hc'), oc=row.querySelector('.oc'), bc=row.querySelector('.bc');
    let hoursHTML=`<span style="color:var(--text3)">—</span>`, otHTML=`<span style="color:var(--text3)">—</span>`;
    if(e&&e.checkIn&&e.checkOut){
      const mins=tdm(e.checkIn,e.checkOut);
      if(mins>0){
        hoursHTML=`<span class="dur">${hl(mins)}</span>`;
        const diff=(mins/60)-WORK_HOURS;
        if(diff>0.01) otHTML=`<span class="ot">+${diff.toFixed(1)}h</span>`;
        else if(diff<-0.01) otHTML=`<span class="short">${diff.toFixed(1)}h</span>`;
        else otHTML=`<span style="color:var(--text3)">✓</span>`;
      } else hoursHTML=`<span style="color:var(--red)">⚠</span>`;
    }
    if(hc) hc.innerHTML=hoursHTML;
    if(oc) oc.innerHTML=otHTML;
    if(bc){
      const hasData=e&&(e.checkIn||e.checkOut||e.note||e.paidLeave);
      bc.innerHTML=hasData?`<button class="row-btn" onclick="delEntry('${date}')" title="Clear">✕</button>`
        :`<button class="row-btn add" onclick="qfill('${date}')" title="Quick fill">＋</button>`;
    }
  }
  // Also re-render mobile card for this date
  const mcard=document.querySelector(`.day-card[data-d="${date}"]`);
  if(mcard) updateMobileCard(date,mcard);
}

function delEntry(d){ delete attendance[d]; persist(); renderTable(); updateStats(); updateSalary(); toast('Entry cleared'); }

function togglePL(date){
  const days=new Date(currentYear,currentMonth+1,0).getDate();
  let plUsed=0;
  for(let day=1;day<=days;day++){ const d=`${currentYear}-${pad(currentMonth+1)}-${pad(day)}`; if(attendance[d]?.paidLeave) plUsed++; }
  const alreadyPL=!!attendance[date]?.paidLeave;
  if(!alreadyPL&&plUsed>=1){ toast('⚠ PL limit reached (1 day/month)',true); return; }
  if(!attendance[date]) attendance[date]={checkIn:'',checkOut:'',note:'',paidLeave:false};
  attendance[date].paidLeave=!attendance[date].paidLeave;
  const e=attendance[date];
  if(!e.checkIn&&!e.checkOut&&!e.note&&!e.paidLeave) delete attendance[date];
  persist(); renderTable(); updateStats(); updateSalary();
  toast(attendance[date]?.paidLeave?'🌴 Paid leave ON':'Paid leave removed');
}

function qfill(date){ attendance[date]={checkIn:'09:30',checkOut:'18:30',note:''}; persist(); renderTable(); updateStats(); updateSalary(); toast('Filled 9:30–18:30'); }

// ── RENDER TABLE (Desktop) ───────────────────────────────────────────────────
function renderTable(){
  const tbody=document.getElementById('tableBody');
  const mobileWrap=document.getElementById('dayCards');
  tbody.innerHTML=''; mobileWrap.innerHTML='';

  const days=new Date(currentYear,currentMonth+1,0).getDate();
  let plUsed=0;
  for(let day=1;day<=days;day++){ const d=`${currentYear}-${pad(currentMonth+1)}-${pad(day)}`; if(attendance[d]?.paidLeave) plUsed++; }
  const PL_LIMIT=1;

  for(let day=1;day<=days;day++){
    const date=`${currentYear}-${pad(currentMonth+1)}-${pad(day)}`;
    const dow=new Date(date).getDay();
    const isSun=dow===0, isSat=dow===6, isHol=!!holidays[date];
    const e=attendance[date];

    let badge;
    if(isSun)                              badge=`<span class="badge b-sunday">☀ Sun</span>`;
    else if(isHol)                         badge=`<span class="badge b-holiday">🎉 ${holidays[date]}</span>`;
    else if(e?.paidLeave)                  badge=`<span class="badge b-pl">🌴 PL</span>`;
    else if(e&&(e.checkIn||e.checkOut))    badge=`<span class="badge b-present">✓ Present</span>`;
    else                                   badge=`<span class="badge b-absent">✗ Absent</span>`;

    let hoursHTML=`<span style="color:var(--text3)">—</span>`, otHTML=`<span style="color:var(--text3)">—</span>`;
    if(e&&e.checkIn&&e.checkOut){
      const mins=tdm(e.checkIn,e.checkOut);
      if(mins>0){
        hoursHTML=`<span class="dur">${hl(mins)}</span>`;
        const diff=(mins/60)-WORK_HOURS;
        if(diff>0.01) otHTML=`<span class="ot">+${diff.toFixed(1)}h</span>`;
        else if(diff<-0.01) otHTML=`<span class="short">${diff.toFixed(1)}h</span>`;
        else otHTML=`<span style="color:var(--text3)">✓</span>`;
      } else hoursHTML=`<span style="color:var(--red)">⚠</span>`;
    }

    const isPL=!!(e?.paidLeave);
    const plLimitReached=plUsed>=PL_LIMIT&&!isPL;
    let plBtn;
    if(isSun||isHol) plBtn=`<span style="color:var(--text3);font-size:0.65rem;">—</span>`;
    else if(isPL) plBtn=`<button class="pl-btn on" onclick="togglePL('${date}')">🌴 ON</button>`;
    else if(plLimitReached) plBtn=`<button class="pl-btn off" disabled>✗ Used</button>`;
    else plBtn=`<button class="pl-btn" onclick="togglePL('${date}')">+ PL</button>`;

    const hasData=e&&(e.checkIn||e.checkOut||e.note||e.paidLeave);
    const ciVal=e?.checkIn??'', coVal=e?.checkOut??'', noteVal=(e?.note??'').replace(/"/g,'&quot;');

    // Desktop row
    const tr=document.createElement('tr');
    tr.dataset.d=date;
    if(isSun) tr.style.opacity='0.5';
    if(isHol) tr.style.background='rgba(245,200,66,0.02)';
    if(isPL&&!isSun&&!isHol) tr.style.background='rgba(232,121,160,0.03)';

    const dayColor=isSun?'var(--purple)':isSat?'var(--yellow)':'var(--text3)';
    tr.innerHTML=`
      <td style="color:var(--text2);white-space:nowrap">${date}</td>
      <td><span style="color:${dayColor}">${DAYS_SHORT[dow]}</span></td>
      <td class="sc">${badge}</td>
      <td><input class="e-time" type="time" value="${ciVal}" onchange="ic('${date}','checkIn',this.value)"></td>
      <td><input class="e-time" type="time" value="${coVal}" onchange="ic('${date}','checkOut',this.value)"></td>
      <td class="hc">${hoursHTML}</td>
      <td class="oc">${otHTML}</td>
      <td>${plBtn}</td>
      <td><input class="e-note" type="text" value="${noteVal}" placeholder="note…" onchange="ic('${date}','note',this.value)"></td>
      <td class="bc">${hasData?`<button class="row-btn" onclick="delEntry('${date}')">✕</button>`:`<button class="row-btn add" onclick="qfill('${date}')">＋</button>`}</td>
    `;
    tbody.appendChild(tr);

    // Mobile card
    const mc=document.createElement('div');
    mc.className='day-card'; mc.dataset.d=date;
    if(isSun) mc.style.opacity='0.5';
    mobileWrap.appendChild(mc);
    updateMobileCard(date,mc,{badge,hoursHTML,otHTML,plBtn,hasData,isPL,plLimitReached,isSun,isHol,isSat,dayColor});
  }
}

function updateMobileCard(date,mc,info){
  if(!info){
    // Re-compute minimal info
    const dow=new Date(date).getDay();
    const isSun=dow===0,isSat=dow===6,isHol=!!holidays[date],e=attendance[date];
    const isPL=!!(e?.paidLeave);
    let badge;
    if(isSun) badge=`<span class="badge b-sunday">☀ Sun</span>`;
    else if(isHol) badge=`<span class="badge b-holiday">🎉 ${holidays[date]}</span>`;
    else if(isPL) badge=`<span class="badge b-pl">🌴 PL</span>`;
    else if(e&&(e.checkIn||e.checkOut)) badge=`<span class="badge b-present">✓ Present</span>`;
    else badge=`<span class="badge b-absent">✗ Absent</span>`;
    let hoursHTML=`<span style="color:var(--text3)">—</span>`,otHTML=`<span style="color:var(--text3)">—</span>`;
    if(e&&e.checkIn&&e.checkOut){const mins=tdm(e.checkIn,e.checkOut);if(mins>0){hoursHTML=`<span class="dur">${hl(mins)}</span>`;const diff=(mins/60)-WORK_HOURS;if(diff>0.01)otHTML=`<span class="ot">+${diff.toFixed(1)}h</span>`;else if(diff<-0.01)otHTML=`<span class="short">${diff.toFixed(1)}h</span>`;else otHTML=`<span style="color:var(--text3)">✓</span>`;}else hoursHTML=`<span style="color:var(--red)">⚠</span>`;}
    const days=new Date(currentYear,currentMonth+1,0).getDate();
    let plUsed=0;for(let d2=1;d2<=days;d2++){const dd=`${currentYear}-${pad(currentMonth+1)}-${pad(d2)}`;if(attendance[dd]?.paidLeave)plUsed++;}
    const plLimitReached=plUsed>=1&&!isPL;
    let plBtn;
    if(isSun||isHol) plBtn=`<span style="color:var(--text3);font-size:0.65rem;">—</span>`;
    else if(isPL) plBtn=`<button class="pl-btn on" onclick="togglePL('${date}')">🌴 ON</button>`;
    else if(plLimitReached) plBtn=`<button class="pl-btn off" disabled>✗ Used</button>`;
    else plBtn=`<button class="pl-btn" onclick="togglePL('${date}')">+ PL</button>`;
    const hasData=e&&(e.checkIn||e.checkOut||e.note||e.paidLeave);
    const dayColor=isSun?'var(--purple)':isSat?'var(--yellow)':'var(--text3)';
    info={badge,hoursHTML,otHTML,plBtn,hasData,isPL,plLimitReached,isSun,isHol,isSat,dayColor};
  }
  const e=attendance[date];
  const ciVal=e?.checkIn??'', coVal=e?.checkOut??'', noteVal=(e?.note??'').replace(/"/g,'&quot;');
  const dow=new Date(date).getDay();
  mc.innerHTML=`
    <div class="day-card-top">
      <div>
        <div class="day-card-date">${date} <span style="color:${info.dayColor};margin-left:4px;">${DAYS_SHORT[dow]}</span></div>
      </div>
      <div style="display:flex;align-items:center;gap:0.4rem;">${info.badge}</div>
    </div>
    <div class="day-card-body">
      <div class="day-card-field">
        <label>Check In</label>
        <input class="e-time" style="width:100%" type="time" value="${ciVal}" onchange="ic('${date}','checkIn',this.value)">
      </div>
      <div class="day-card-field">
        <label>Check Out</label>
        <input class="e-time" style="width:100%" type="time" value="${coVal}" onchange="ic('${date}','checkOut',this.value)">
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem;flex-wrap:wrap;">
      <span>${info.hoursHTML}</span>
      <span>${info.otHTML}</span>
    </div>
    <div class="day-card-actions">
      ${info.plBtn}
      <input class="e-note" style="flex:1;min-width:100px;" type="text" value="${noteVal}" placeholder="add note…" onchange="ic('${date}','note',this.value)">
      ${info.hasData?`<button class="row-btn" onclick="delEntry('${date}')">✕</button>`:`<button class="row-btn add" onclick="qfill('${date}')">＋</button>`}
    </div>
  `;
}

// ── STATS ────────────────────────────────────────────────────────────────────
function updateStats(){
  const days=new Date(currentYear,currentMonth+1,0).getDate();
  let present=0,absent=0,hols=0,suns=0,plCount=0,totalMins=0;
  for(let day=1;day<=days;day++){
    const date=`${currentYear}-${pad(currentMonth+1)}-${pad(day)}`;
    const dow=new Date(date).getDay();
    if(dow===0){suns++;continue;}
    if(holidays[date]){hols++;continue;}
    const e=attendance[date];
    if(e?.paidLeave){plCount++;totalMins+=PAID_LEAVE_MINS;}
    if(e&&(e.checkIn||e.checkOut)){present++;if(e.checkIn&&e.checkOut){const m=tdm(e.checkIn,e.checkOut);if(m>0)totalMins+=m;}}
    else if(!e?.paidLeave) absent++;
  }
  document.getElementById('statPresent').textContent=present;
  document.getElementById('statAbsent').textContent=absent;
  document.getElementById('statHoliday').textContent=hols;
  document.getElementById('statSunday').textContent=suns;
  document.getElementById('statPL').textContent=plCount;
  const h=Math.floor(totalMins/60),m=totalMins%60;
  document.getElementById('statTotalHrs').textContent=m?`${h}h${m}m`:`${h}h`;
  updateSalary();
}

// ── SALARY ───────────────────────────────────────────────────────────────────
function saveSalary(){ monthlySalary=parseFloat(document.getElementById('salaryInput').value)||0; localStorage.setItem('att_salary',monthlySalary); updateSalary(); }

function updateSalary(){
  const salary=monthlySalary||parseFloat(document.getElementById('salaryInput')?.value)||0;
  const perDayEl=document.getElementById('perDaySalary'),earnedEl=document.getElementById('earnedSalary'),
        deductionEl=document.getElementById('deductionSalary'),netEl=document.getElementById('netSalary'),
        formulaEl=document.getElementById('salaryFormula');
  const totalDaysInMonth=new Date(currentYear,currentMonth+1,0).getDate();
  const MINS_PER_DAY=WORK_HOURS*60;
  const totalMonthMins=totalDaysInMonth*MINS_PER_DAY;
  if(!salary||salary<=0){
    [perDayEl,earnedEl,deductionEl,netEl].forEach(el=>{if(el)el.textContent='₹ —';});
    if(formulaEl)formulaEl.textContent='Enter salary above to see calculation';
    return;
  }
  const perMin=salary/totalMonthMins, perDay=perMin*MINS_PER_DAY;
  const today=new Date(); today.setHours(0,0,0,0);
  let workedMins=0,sundayMins=0,holMins=0,plMins=0,absentMins=0,absentDays=0,sundayCount=0,holCount=0;
  for(let day=1;day<=totalDaysInMonth;day++){
    const date=`${currentYear}-${pad(currentMonth+1)}-${pad(day)}`;
    const dateObj=new Date(date), dow=dateObj.getDay();
    if(dow===0){sundayCount++;sundayMins+=MINS_PER_DAY;continue;}
    if(holidays[date]){holCount++;holMins+=MINS_PER_DAY;continue;}
    if(dateObj>today) continue;
    const e=attendance[date];
    if(e?.paidLeave){plMins+=PAID_LEAVE_MINS;if(e.checkIn&&e.checkOut){const m=tdm(e.checkIn,e.checkOut);if(m>0)workedMins+=m;}}
    else if(e&&(e.checkIn||e.checkOut)){if(e.checkIn&&e.checkOut){const m=tdm(e.checkIn,e.checkOut);if(m>0)workedMins+=m;}}
    else{absentDays++;absentMins+=MINS_PER_DAY;}
  }
  const totalCreditedMins=workedMins+sundayMins+holMins+plMins;
  const earned=totalCreditedMins*perMin, deduction=absentMins*perMin, net=earned;
  const fmtINR=n=>'₹ '+Math.round(n).toLocaleString('en-IN');
  const fmtMin=m=>{const h=Math.floor(m/60),mn=m%60;return mn?`${h}h ${mn}m`:`${h}h`;};
  if(perDayEl)    perDayEl.textContent='₹ '+Math.round(perDay).toLocaleString('en-IN');
  if(earnedEl)    earnedEl.textContent=fmtINR(earned);
  if(deductionEl) deductionEl.textContent=absentDays>0?'- ₹ '+Math.round(deduction).toLocaleString('en-IN'):'₹ 0';
  if(netEl)       netEl.textContent=fmtINR(net);
  if(formulaEl) formulaEl.innerHTML=
    `₹${salary.toLocaleString('en-IN')} ÷ ${totalMonthMins} mins = ₹${perMin.toFixed(4)}/min<br>`+
    `Worked ${fmtMin(workedMins)} + ${sundayCount} Sun + ${holCount} Hol`+(plMins?` + PL`:'')+` = ${fmtMin(totalCreditedMins)}<br>`+
    (absentDays>0?`Absent ${absentDays} day(s) → −₹${Math.round(deduction).toLocaleString('en-IN')}`:`No absences ✓`);
}

// ── EXPORT CSV ───────────────────────────────────────────────────────────────
function exportCSV(){
  const days=new Date(currentYear,currentMonth+1,0).getDate();
  let csv='Date,Day,Status,Check In,Check Out,Hours,OT/Short,Paid Leave,Note\n';
  for(let day=1;day<=days;day++){
    const date=`${currentYear}-${pad(currentMonth+1)}-${pad(day)}`;
    const dow=new Date(date).getDay();
    if(dow===0){csv+=`${date},${DAYS[dow]},Sunday,-,-,-,-,No,-\n`;continue;}
    if(holidays[date]){csv+=`${date},${DAYS[dow]},Holiday(${holidays[date]}),-,-,-,-,No,-\n`;continue;}
    const e=attendance[date];
    const pl=e?.paidLeave?'Yes':'No';
    if(e&&(e.checkIn||e.checkOut||e.paidLeave)){
      const mins=(e.checkIn&&e.checkOut)?tdm(e.checkIn,e.checkOut):0;
      const hrs=mins>0?(mins/60).toFixed(2)+'h':(e.paidLeave?'0h':'-');
      const diff=mins>0?(mins/60-WORK_HOURS).toFixed(2):null;
      const ot=diff!==null?(diff>0?`+${diff}h OT`:diff<0?`${diff}h short`:'-'):'-';
      csv+=`${date},${DAYS[dow]},${e.paidLeave?'Paid Leave':'Present'},${e.checkIn||'-'},${e.checkOut||'-'},${hrs},${ot},${pl},"${e.note||''}"\n`;
    } else { csv+=`${date},${DAYS[dow]},Absent,-,-,-,-,No,-\n`; }
  }
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download=`Attendance_${MONTHS[currentMonth]}_${currentYear}.csv`;
  a.click(); toast('CSV exported!');
}

// ── IMPORT CSV ───────────────────────────────────────────────────────────────
function importCSV(event){
  const file=event.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=function(e){
    const lines=e.target.result.split('\n').map(l=>l.trim()).filter(l=>l);
    if(!lines.length){toast('Empty file',true);return;}
    const cols=lines[0].toLowerCase().split(',').map(c=>c.trim().replace(/"/g,''));
    const iDate=cols.indexOf('date'),iCI=cols.findIndex(c=>c.includes('check in')),iCO=cols.findIndex(c=>c.includes('check out'));
    const iPL=cols.findIndex(c=>c.includes('paid leave')),iNote=cols.findIndex(c=>c==='note'),iStatus=cols.indexOf('status');
    if(iDate===-1){toast('Invalid CSV — no Date column',true);return;}
    let imported=0,skipped=0;
    for(let i=1;i<lines.length;i++){
      const row=parseCSVRow(lines[i]);
      const date=row[iDate]?.trim();
      if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date)){skipped++;continue;}
      const status=iStatus>=0?row[iStatus]?.trim().toLowerCase():'';
      const ci=iCI>=0?row[iCI]?.trim():'', co=iCO>=0?row[iCO]?.trim():'';
      const pl=iPL>=0?row[iPL]?.trim().toLowerCase()==='yes':false;
      const note=iNote>=0?row[iNote]?.trim().replace(/^"|"$/g,''):'';
      if(status==='sunday'){skipped++;continue;}
      if(status.startsWith('holiday')){const m=status.match(/holiday\((.+)\)/);if(m)holidays[date]=m[1];skipped++;continue;}
      if((ci&&ci!=='-')||(co&&co!=='-')||pl){attendance[date]={checkIn:(ci&&ci!=='-')?ci:'',checkOut:(co&&co!=='-')?co:'',note:note||'',paidLeave:pl};imported++;}
    }
    persist(); renderHolidayTags(); renderTable(); updateStats(); updateSalary();
    toast(`✓ Imported ${imported} entries${skipped?`, ${skipped} skipped`:''}`);
    event.target.value='';
  };
  reader.readAsText(file);
}
function parseCSVRow(line){
  const result=[];let cur='',inQ=false;
  for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"')inQ=!inQ;else if(ch===','&&!inQ){result.push(cur);cur='';}else cur+=ch;}
  result.push(cur); return result;
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function pad(n){return String(n).padStart(2,'0');}
function fmt(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function tdm(t1,t2){const [h1,m1]=t1.split(':').map(Number),[h2,m2]=t2.split(':').map(Number);return (h2*60+m2)-(h1*60+m1);}
function hl(m){const h=Math.floor(m/60),mn=m%60;return mn?`${h}h ${mn}m`:`${h}h`;}
function toast(msg,err=false){
  const el=document.getElementById('toast');
  el.textContent=msg; el.className='toast show'+(err?' err':'');
  clearTimeout(el._t); el._t=setTimeout(()=>el.className='toast',2500);
}