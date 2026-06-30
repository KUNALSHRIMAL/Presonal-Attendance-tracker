
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_SHORT=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const WORK_HOURS=9;
const PAID_LEAVE_MINS=685; // 11h 25m = 1 day + half day PL credit

let currentMonth, currentYear;
let attendance={};
let holidays={};
let monthlySalary=0;

// ── THEME ────────────────────────────────────────────────────────────────────
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme',theme);
  const btn=document.getElementById('themeToggle');
  if(btn) btn.innerHTML=theme==='dark'?'☀ Light':'🌙 Dark';
}
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme')||'dark';
  const next=cur==='dark'?'light':'dark';
  applyTheme(next);
  localStorage.setItem('att_theme',next);
}

// ── INIT ─────────────────────────────────────────────────────────────────────
(function(){
  applyTheme(localStorage.getItem('att_theme')||'dark');

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
  attendance[d]={...(attendance[d]||{}),checkIn:ci,checkOut:co,note};
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
    const e=attendance[date]; const dow=dateFromKey(date).getDay();
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
        const diffMins=mins-WORK_HOURS*60;
        if(diffMins>0) otHTML=`<span class="ot">+${fmtOT(diffMins)}</span>`;
        else if(diffMins<0) otHTML=`<span class="short">-${fmtOT(diffMins)}</span>`;
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

function qfill(date){ attendance[date]={...(attendance[date]||{}),checkIn:'09:30',checkOut:'18:30',note:attendance[date]?.note||''}; persist(); renderTable(); updateStats(); updateSalary(); toast('Filled 9:30–18:30'); }

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
    const dow=dateFromKey(date).getDay();
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
        const diffMins=mins-WORK_HOURS*60;
        if(diffMins>0) otHTML=`<span class="ot">+${fmtOT(diffMins)}</span>`;
        else if(diffMins<0) otHTML=`<span class="short">-${fmtOT(diffMins)}</span>`;
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
      <td><input class="e-time" type="time" value="${ciVal}" oninput="ic('${date}','checkIn',this.value)" onchange="ic('${date}','checkIn',this.value)"></td>
      <td><input class="e-time" type="time" value="${coVal}" oninput="ic('${date}','checkOut',this.value)" onchange="ic('${date}','checkOut',this.value)"></td>
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
    const dow=dateFromKey(date).getDay();
    const isSun=dow===0,isSat=dow===6,isHol=!!holidays[date],e=attendance[date];
    const isPL=!!(e?.paidLeave);
    let badge;
    if(isSun) badge=`<span class="badge b-sunday">☀ Sun</span>`;
    else if(isHol) badge=`<span class="badge b-holiday">🎉 ${holidays[date]}</span>`;
    else if(isPL) badge=`<span class="badge b-pl">🌴 PL</span>`;
    else if(e&&(e.checkIn||e.checkOut)) badge=`<span class="badge b-present">✓ Present</span>`;
    else badge=`<span class="badge b-absent">✗ Absent</span>`;
    let hoursHTML=`<span style="color:var(--text3)">—</span>`,otHTML=`<span style="color:var(--text3)">—</span>`;
    if(e&&e.checkIn&&e.checkOut){const mins=tdm(e.checkIn,e.checkOut);if(mins>0){hoursHTML=`<span class="dur">${hl(mins)}</span>`;const diffMins=mins-WORK_HOURS*60;if(diffMins>0)otHTML=`<span class="ot">+${fmtOT(diffMins)}</span>`;else if(diffMins<0)otHTML=`<span class="short">-${fmtOT(diffMins)}</span>`;else otHTML=`<span style="color:var(--text3)">✓</span>`;}else hoursHTML=`<span style="color:var(--red)">⚠</span>`;}
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
  const dow=dateFromKey(date).getDay();
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
        <input class="e-time" style="width:100%" type="time" value="${ciVal}" oninput="ic('${date}','checkIn',this.value)" onchange="ic('${date}','checkIn',this.value)">
      </div>
      <div class="day-card-field">
        <label>Check Out</label>
        <input class="e-time" style="width:100%" type="time" value="${coVal}" oninput="ic('${date}','checkOut',this.value)" onchange="ic('${date}','checkOut',this.value)">
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
  let present=0,absent=0,hols=0,suns=0,plCount=0,totalMins=0,otMins=0,shortMins=0,elapsedWorkDays=0;
  const today=new Date(); today.setHours(0,0,0,0);
  for(let day=1;day<=days;day++){
    const date=`${currentYear}-${pad(currentMonth+1)}-${pad(day)}`;
    const dateObj=dateFromKey(date), dow=dateObj.getDay();
    if(dow===0){suns++;continue;}
    if(holidays[date]){hols++;continue;}
    const e=attendance[date];
    if(e?.paidLeave){
      plCount++; totalMins+=PAID_LEAVE_MINS;
      if(e.checkIn&&e.checkOut){const m=tdm(e.checkIn,e.checkOut);if(m>0)totalMins+=m;}
    } else if(e&&(e.checkIn||e.checkOut)){
      present++;
      if(e.checkIn&&e.checkOut){const m=tdm(e.checkIn,e.checkOut);if(m>0){totalMins+=m;const d=m-WORK_HOURS*60;if(d>0)otMins+=d;else if(d<0)shortMins+=(-d);}}
    } else if(dateObj<=today) absent++;
    if(dateObj<=today) elapsedWorkDays++;
  }
  // If PL was not used at all this month, credit PAID_LEAVE_MINS as unused-PL bonus OT
  if(plCount===0){ totalMins+=PAID_LEAVE_MINS; otMins+=PAID_LEAVE_MINS; }
  document.getElementById('statPresent').textContent=present;
  document.getElementById('statAbsent').textContent=absent;
  document.getElementById('statHoliday').textContent=hols;
  document.getElementById('statSunday').textContent=suns;
  document.getElementById('statPL').textContent=plCount;
  const h=Math.floor(totalMins/60),m=totalMins%60;
  document.getElementById('statTotalHrs').textContent=m?`${h}h${m}m`:`${h}h`;
  const netOtMins=otMins-shortMins;
  const otEl=document.getElementById('statOT'),otCard=document.getElementById('statOTCard');
  if(netOtMins>=0){
    otEl.textContent=netOtMins>0?`+${fmtOT(netOtMins)}`:'0h';
    otEl.style.color='';
    if(otCard)otCard.className='stat s-orange';
  }else{
    otEl.textContent=`-${fmtOT(netOtMins)}`;
    otEl.style.color='var(--red)';
    if(otCard)otCard.className='stat s-red';
  }
  const pct=elapsedWorkDays>0?Math.round((present+plCount)/elapsedWorkDays*100):0;
  document.getElementById('statAttPct').textContent=elapsedWorkDays>0?pct+'%':'—%';
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
  const MINS_PER_DAY=WORK_HOURS*60; // 540

  if(!salary||salary<=0){
    [perDayEl,earnedEl,deductionEl,netEl].forEach(el=>{if(el)el.textContent='₹ —';});
    if(formulaEl)formulaEl.textContent='Enter salary above to see calculation';
    return;
  }

  // Per day = salary ÷ total calendar days (incl. Sundays & holidays)
  const perDay = salary / totalDaysInMonth;
  const perMin = perDay / MINS_PER_DAY; // for minute-accurate worked time

  const today=new Date(); today.setHours(0,0,0,0);

  let workedMins=0, sundayCount=0, holCount=0, plMins=0;
  let absentDays=0, presentDays=0, plCount=0;

  for(let day=1;day<=totalDaysInMonth;day++){
    const date=`${currentYear}-${pad(currentMonth+1)}-${pad(day)}`;
    const dateObj=dateFromKey(date), dow=dateObj.getDay();

    // Sundays — always fully paid (full month entitlement, count all of them)
    if(dow===0){ sundayCount++; continue; }

    // Holidays — always fully paid
    if(holidays[date]){ holCount++; continue; }

    // Future working days — skip (not earned yet)
    if(dateObj>today) continue;

    const e=attendance[date];
    if(e?.paidLeave){
      plCount++; plMins+=PAID_LEAVE_MINS;
      // If they also logged time on PL day, add that too
      if(e.checkIn&&e.checkOut){const m=tdm(e.checkIn,e.checkOut);if(m>0)workedMins+=m;}
    } else if(e&&(e.checkIn||e.checkOut)){
      presentDays++;
      if(e.checkIn&&e.checkOut){const m=tdm(e.checkIn,e.checkOut);if(m>0)workedMins+=m;}
    } else {
      absentDays++;
    }
  }

  // If PL was not used at all, credit unused PL as bonus earned mins
  const unusedPlMins = plCount===0 ? PAID_LEAVE_MINS : 0;

  // Earned:
  //   - Sundays & holidays: credited as 1 full day each = perDay each
  //   - Worked days: credited by exact minutes worked × perMin
  //   - PL: credited as PL_MINS × perMin (11h 25m per PL day)
  //   - Unused PL: credited as PAID_LEAVE_MINS × perMin if no PL taken
  //   - Absent: 0 earned for that day (deducted)
  const sundayEarned  = sundayCount   * perDay;
  const holEarned     = holCount      * perDay;
  const workedEarned  = workedMins    * perMin;
  const plEarned      = plMins        * perMin;
  const unusedPlEarned= unusedPlMins  * perMin;
  const earned        = sundayEarned + holEarned + workedEarned + plEarned + unusedPlEarned;
  const deduction     = Math.max(0, salary - earned);
  const net           = earned;

  const fmtINR=n=>'₹ '+Math.round(n).toLocaleString('en-IN');
  const fmtMin=m=>{const h=Math.floor(m/60),mn=m%60;return mn?`${h}h ${mn}m`:`${h}h`;};

  // Convert worked mins to equivalent days for display
  const workedDays=(workedMins/MINS_PER_DAY).toFixed(2);
  const plDays=(plMins/MINS_PER_DAY).toFixed(2);
  const unusedPlDays=(unusedPlMins/MINS_PER_DAY).toFixed(2);
  const totalCreditedDays=(workedMins/MINS_PER_DAY)+sundayCount+holCount+(plMins/MINS_PER_DAY)+(unusedPlMins/MINS_PER_DAY);

  if(perDayEl)    perDayEl.textContent   ='₹ '+Math.round(perDay).toLocaleString('en-IN');
  if(earnedEl)    earnedEl.textContent   =fmtINR(earned);
  if(deductionEl) deductionEl.textContent=deduction>0?'- ₹ '+Math.round(deduction).toLocaleString('en-IN'):'₹ 0';
  if(netEl)       netEl.textContent      =fmtINR(net);

  if(formulaEl) formulaEl.innerHTML=
    `₹${salary.toLocaleString('en-IN')} ÷ ${totalDaysInMonth} days = ₹${perDay.toFixed(2)}/day<br>`+
    `Worked ${fmtMin(workedMins)} (${workedDays}d) + ${sundayCount} Sun + ${holCount} Hol`+
    (plMins?` + PL ${fmtMin(plMins)} (${plDays}d)`:'')+
    (unusedPlMins?` + Unused PL ${fmtMin(unusedPlMins)} (${unusedPlDays}d)`:'')+
    ` = ${totalCreditedDays.toFixed(3)} days<br>`+
    (deduction>0
      ? `Deduction = ₹${salary.toLocaleString('en-IN')} − earned = −₹${Math.round(deduction).toLocaleString('en-IN')}`+
        (absentDays>0?` (${absentDays} absent day${absentDays>1?'s':''} included)`:'')
      : `No deduction ✓`);
}

// ── EXPORT CSV ───────────────────────────────────────────────────────────────
function exportCSV(){
  const days=new Date(currentYear,currentMonth+1,0).getDate();
  let csv='Date,Day,Status,Check In,Check Out,Hours,OT/Short,Paid Leave,Note\n';
  for(let day=1;day<=days;day++){
    const date=`${currentYear}-${pad(currentMonth+1)}-${pad(day)}`;
    const dow=dateFromKey(date).getDay();
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
// Payslip
const PAYSLIP_FIELDS=['psEmpCode','psEmpName','psDoj','psFather','psDob','psPan','psDesignation','psDepartment','psBank','psSalary'];

function openPayslipModal(){
  const days=getMonthDays(currentYear,currentMonth);
  document.getElementById('psPayableDays').textContent=`${days} Days`;
  document.getElementById('psMonthLabel').textContent=`${MONTHS[currentMonth]} ${currentYear}`;
  const saved=JSON.parse(localStorage.getItem('att_payslip_info')||'{}');
  PAYSLIP_FIELDS.forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    if(saved[id]) el.value=saved[id];
  });
  if(!document.getElementById('psSalary').value && monthlySalary) document.getElementById('psSalary').value=monthlySalary;
  document.getElementById('payslipModal').classList.add('show');
  setTimeout(()=>document.getElementById('psEmpCode')?.focus(),50);
}

function closePayslipModal(){
  document.getElementById('payslipModal').classList.remove('show');
}

function downloadPaySlip(event){
  event.preventDefault();
  const data={};
  PAYSLIP_FIELDS.forEach(id=>data[id]=document.getElementById(id).value.trim());
  const salary=parseFloat(data.psSalary)||0;
  if(salary<=0){toast('Enter salary amount',true);return;}
  localStorage.setItem('att_payslip_info',JSON.stringify(data));

  const slip=buildPayslipData(data,salary);
  const html=buildPayslipHTML(slip);
  const win=window.open('','_blank');
  if(!win){toast('Popup blocked. Allow popups to generate PDF.',true);return;}
  win.document.open();
  win.document.write(html);
  win.document.close();
  closePayslipModal();
  toast('Pay slip ready. Choose Save as PDF.');
}

function buildPayslipData(data,salary){
  const payableDays=getMonthDays(currentYear,currentMonth);
  const pay=calculatePayslipPay(salary);
  const gross=Math.round(salary);
  const basic=roundMoney(salary*0.50);
  const special=roundMoney(salary*0.25);
  const hra=roundMoney(salary-basic-special);
  const net=Math.max(0,pay.net);
  const deduction=Math.max(0,gross-net);
  return {
    companyName:'PURE COSMECEUTICALS PVT LTD',
    companyAddress:'F-18, First Floor, Road No-2, VKI Area, Sikar Road, Jaipur 302013',
    logoUrl:new URL('logo.png',location.href).href,
    empCode:data.psEmpCode,
    empName:data.psEmpName,
    doj:formatInputDate(data.psDoj),
    father:data.psFather,
    dob:formatInputDate(data.psDob),
    pan:data.psPan.toUpperCase(),
    designation:data.psDesignation,
    department:data.psDepartment,
    bank:data.psBank,
    month:`${MONTHS[currentMonth]} ${currentYear}`,
    monthTitle:`${MONTHS[currentMonth]}.-${currentYear}`,
    payableDays,
    absentDays:pay.absentDays,
    creditedDays:pay.creditedDays,
    workedMins:pay.workedMins,
    gross,
    basic,
    special,
    hra,
    deduction,
    net,
    words:`INR ${numberToIndianWords(net)} Only`
  };
}

function calculatePayslipPay(salary){
  const days=getMonthDays(currentYear,currentMonth);
  const minsPerDay=WORK_HOURS*60;
  const perDay=salary/days;
  const perMin=perDay/minsPerDay;
  let workedMins=0,sundayCount=0,holCount=0,plMins=0,plCount=0,absentDays=0;
  for(let day=1;day<=days;day++){
    const date=`${currentYear}-${pad(currentMonth+1)}-${pad(day)}`;
    const dow=dateFromKey(date).getDay();
    if(dow===0){sundayCount++;continue;}
    if(holidays[date]){holCount++;continue;}
    const e=attendance[date];
    if(e?.paidLeave){
      plCount++;
      plMins+=PAID_LEAVE_MINS;
      if(e.checkIn&&e.checkOut){
        const m=tdm(e.checkIn,e.checkOut);
        if(m>0) workedMins+=m;
      }
    } else if(e&&(e.checkIn||e.checkOut)){
      if(e.checkIn&&e.checkOut){
        const m=tdm(e.checkIn,e.checkOut);
        if(m>0) workedMins+=m;
      }
    } else {
      absentDays++;
    }
  }
  const unusedPlMins=plCount===0?PAID_LEAVE_MINS:0;
  const earned=(sundayCount*perDay)+(holCount*perDay)+(workedMins*perMin)+(plMins*perMin)+(unusedPlMins*perMin);
  const creditedDays=(workedMins/minsPerDay)+sundayCount+holCount+(plMins/minsPerDay)+(unusedPlMins/minsPerDay);
  return {
    net:Math.round(earned),
    absentDays,
    creditedDays,
    workedMins
  };
}

function buildPayslipHTML(s){
  const fileName=`PaySlip_${s.empCode}_${MONTHS[currentMonth]}_${currentYear}`;
  const money=n=>Number(n).toFixed(2);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${esc(fileName)}</title>
<style>
  @page { size:A4; margin:0; }
  * { box-sizing:border-box; }
  body { font-family:Calibri, Arial, sans-serif; color:#000; margin:0; background:#fff; }
  .sheet { width:86%; max-width:735px; margin:0 auto; padding-top:22mm; }
  .head-table { margin:0 auto 16px; }
  .logo-cell { width:112px; text-align:center; vertical-align:middle; }
  .logo-cell img { width:72px; max-height:62px; object-fit:contain; display:inline-block; opacity:0.72; }
  .company { text-align:center; font-size:16px; font-weight:700; color:#6f6f6f; padding:2px 8px; }
  .address { text-align:center; font-size:12px; color:#6f6f6f; padding:4px 8px; }
  .slip-title { text-align:center; font-size:13px; font-weight:700; color:#6f6f6f; padding:5px 8px; }
  table { width:100%; border-collapse:collapse; table-layout:fixed; }
  td, th { border:1px solid #000; padding:4px 6px; font-size:11px; vertical-align:middle; }
  th { text-align:center; font-weight:700; }
  .label { font-weight:700; color:#000; }
  .colon { width:4%; text-align:center; font-weight:700; }
  .amount { text-align:right; white-space:nowrap; }
  .emp-table { margin-bottom:16px; }
  .emp-table .label { width:17%; }
  .emp-table td { height:28px; }
  .section { margin-top:0; }
  .center { text-align:center; }
  .earn-title th { padding:2px 6px; }
  .earn-head th { font-size:10px; padding:3px 5px; }
  .gross td { font-weight:700; }
  .net { margin-top:-1px; }
  .net td { height:26px; }
  .net-label { width:128px; font-weight:700; }
  .net-colon { width:26px; text-align:center; font-weight:700; }
  .note { margin-top:30px; text-align:center; font-size:10px; font-weight:700; color:#000; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
<div class="sheet">
  <table class="head-table">
    <tr>
      <td class="logo-cell" rowspan="3"><img src="${esc(s.logoUrl)}" alt="Company logo"></td>
      <td class="company">${esc(s.companyName)}</td>
    </tr>
    <tr><td class="address">${esc(s.companyAddress)}</td></tr>
    <tr><td class="slip-title">PAY SLIP FOR THE MONTH OF ${esc(s.monthTitle)}</td></tr>
  </table>
  <table class="emp-table">
    <tr>
      <td class="label">Employee Code</td><td class="colon">:</td><td>${esc(s.empCode)}</td>
      <td class="label">Employee Name</td><td class="colon">:</td><td>${esc(s.empName)}</td>
    </tr>
    <tr>
      <td class="label">Date of Joining</td><td class="colon">:</td><td>${esc(s.doj)}</td>
      <td class="label">Father’s Name</td><td class="colon">:</td><td>${esc(s.father)}</td>
    </tr>
    <tr>
      <td class="label">Date of Birth</td><td class="colon">:</td><td>${esc(s.dob)}</td>
      <td class="label">PAN No.</td><td class="colon">:</td><td>${esc(s.pan)}</td>
    </tr>
    <tr>
      <td class="label">Designation</td><td class="colon">:</td><td>${esc(s.designation)}</td>
      <td class="label">Department</td><td class="colon">:</td><td>${esc(s.department)}</td>
    </tr>
    <tr>
      <td class="label">Payble Days</td><td class="colon">:</td><td>${s.payableDays} Days</td>
      <td class="label">Bank A/C No</td><td class="colon">:</td><td>${esc(s.bank)}</td>
    </tr>
  </table>
  <table class="section">
    <tr class="earn-title"><th colspan="5" class="center">Earnings</th><th colspan="2" class="center">Deductions</th></tr>
    <tr class="earn-head">
      <th>Description</th><th class="amount">Rate</th><th class="amount">Monthly</th><th class="amount">Arrear</th><th class="amount">Total</th>
      <th>Description</th><th class="amount">Amount</th>
    </tr>
    <tr>
      <td>Basic</td><td class="amount">${money(s.basic)}</td><td class="amount">${money(s.basic)}</td><td class="amount">0.00</td><td class="amount">${money(s.basic)}</td>
      <td>LWP / Short Time${s.absentDays?` (${s.absentDays} day${s.absentDays>1?'s':''})`:''}</td><td class="amount">${money(s.deduction)}</td>
    </tr>
    <tr>
      <td>Special Allowance</td><td class="amount">${money(s.special)}</td><td class="amount">${money(s.special)}</td><td class="amount">0.00</td><td class="amount">${money(s.special)}</td>
      <td></td><td class="amount"></td>
    </tr>
    <tr>
      <td>HRA</td><td class="amount">${money(s.hra)}</td><td class="amount">${money(s.hra)}</td><td class="amount">0.00</td><td class="amount">${money(s.hra)}</td>
      <td></td><td class="amount"></td>
    </tr>
    <tr class="gross">
      <td>Gross Earnings</td><td class="amount">${money(s.gross)}</td><td class="amount">${money(s.gross)}</td><td class="amount">0.00</td><td class="amount">${money(s.gross)}</td>
      <td>Gross Deductions</td><td class="amount">${money(s.deduction)}</td>
    </tr>
  </table>
  <table class="net">
    <tr><td class="net-label">Net Pay</td><td class="net-colon">:</td><td>${money(s.net)}</td></tr>
    <tr><td class="net-label">Net Pay in Words</td><td class="net-colon">:</td><td>${esc(s.words)}</td></tr>
  </table>
  <div class="note">Personal Note: This is a system generated pay slip, does not require any signature.</div>
</div>
<script>
window.onload=function(){ setTimeout(function(){ window.print(); },250); };
<\/script>
</body>
</html>`;
}

function pad(n){return String(n).padStart(2,'0');}
function fmt(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function dateFromKey(date){const [y,m,d]=date.split('-').map(Number);return new Date(y,m-1,d);}
function tdm(t1,t2){const [h1,m1]=t1.split(':').map(Number),[h2,m2]=t2.split(':').map(Number);return (h2*60+m2)-(h1*60+m1);}
function hl(m){const h=Math.floor(m/60),mn=m%60;return mn?`${h}h ${mn}m`:`${h}h`;}
function fmtOT(m){const abs=Math.abs(m),h=Math.floor(abs/60),mn=abs%60;return mn?(h?`${h}h ${mn}m`:`${mn}m`):`${h}h`;}
function getMonthDays(year,month){return new Date(year,month+1,0).getDate();}
function roundMoney(n){return Math.round((Number(n)||0)*100)/100;}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function formatInputDate(value){
  if(!value) return '';
  const [y,m,d]=value.split('-');
  return `${d}/${m}/${y}`;
}
function numberToIndianWords(num){
  num=Math.round(Number(num)||0);
  if(num===0) return 'Zero';
  const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const two=n=>n<20?ones[n]:tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');
  const three=n=>{
    const h=Math.floor(n/100),r=n%100;
    return (h?ones[h]+' Hundred':'')+(h&&r?' ':'')+(r?two(r):'');
  };
  const parts=[];
  const crore=Math.floor(num/10000000); num%=10000000;
  const lakh=Math.floor(num/100000); num%=100000;
  const thousand=Math.floor(num/1000); num%=1000;
  if(crore) parts.push(two(crore)+' Crore');
  if(lakh) parts.push(two(lakh)+' Lakh');
  if(thousand) parts.push(two(thousand)+' Thousand');
  if(num) parts.push(three(num));
  return parts.join(' ');
}
function toast(msg,err=false){
  const el=document.getElementById('toast');
  el.textContent=msg; el.className='toast show'+(err?' err':'');
  clearTimeout(el._t); el._t=setTimeout(()=>el.className='toast',2500);
}
