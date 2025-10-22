// EXECOGIM v5 script: full planner, weekly checks, radar chart, PDF+CSV, modal, localStorage persistence
document.addEventListener('DOMContentLoaded', ()=>{
  const closeOnboard = document.getElementById('closeOnboard');
  closeOnboard.onclick = ()=> document.getElementById('onboard').style.display='none';

  // tooltips simple
  document.querySelectorAll('.info').forEach(el=>{
    el.addEventListener('mouseenter', ()=> showTip(el));
    el.addEventListener('mouseleave', ()=> hideTip());
    el.addEventListener('click', ()=> { showTip(el); setTimeout(hideTip,3000); });
  });
  function showTip(el){ const tip=el.getAttribute('data-tip'); if(!tip) return; const box=document.createElement('div'); box.className='tooltip'; box.id='tooltipBox'; box.innerText=tip; document.body.appendChild(box); const r=el.getBoundingClientRect(); box.style.left=r.left+'px'; box.style.top=(r.bottom+6)+'px'; }
  function hideTip(){ const b=document.getElementById('tooltipBox'); if(b) b.remove(); }

  // modal
  const modal = document.getElementById('exerciseModal');
  document.getElementById('modalClose').onclick = ()=> modal.style.display='none';
  document.getElementById('modalAlt').onclick = ()=> alert('Alternative exercise (demo)');

  // radar chart setup (Chart.js)
  let radarChart = null;
  function createRadar(pre, post, title){
    const canvas = document.getElementById('radarChart');
    const ctx = canvas.getContext('2d');
    const labels = ['MoCA','DigitF','DigitB','TMT-A(s)','TMT-B(s)','6MWT(m)','TUG(s)','Grip(kg)','BBS'];
    // normalize to 0-100 using simple ranges
    const meta = { moca:[0,30], digitf:[0,10], digitb:[0,10], tmt_a:[10,150], tmt_b:[20,300], sixmwt:[50,800], tug:[3,30], grip:[5,60], bbs:[0,56] };
    function norm(key,val){
      if(val===''||val==null) return 0;
      const [min,max]=meta[key]; const num=parseFloat(val);
      if(key.startsWith('tmt')||key==='tug'){ const clipped=Math.max(min,Math.min(max,num)); return Math.round((1 - (clipped-min)/(max-min))*100); } else { const clipped=Math.max(min,Math.min(max,num)); return Math.round(((clipped-min)/(max-min))*100); }
    }
    const order = ['moca','digitf','digitb','tmt_a','tmt_b','sixmwt','tug','grip','bbs'];
    const preData = order.map(k=>norm(k, pre[k]));
    const postData = order.map(k=>norm(k, post[k]));
    document.getElementById('chartCard').style.display='block';
    if(radarChart) radarChart.destroy();
    radarChart = new Chart(ctx, {
      type:'radar',
      data:{ labels, datasets:[ { label:'Pre (USM orange)', data:preData, backgroundColor:'rgba(242,107,0,0.25)', borderColor:'#f26b00' }, { label:'Post (IPPT purple)', data:postData, backgroundColor:'rgba(107,63,160,0.25)', borderColor:'#6b3fa0' } ] },
      options:{ responsive:true, maintainAspectRatio:false, scales:{ r:{ min:0, max:100, ticks:{ stepSize:25 } } }, plugins:{ legend:{ position:'top' }, title:{ display:false } } }
    });
  }

  // form submit: generate plan
  document.getElementById('inputForm').addEventListener('submit', (e)=>{
    e.preventDefault();
    const participant = document.getElementById('participant_name').value || 'Participant';
    const genotype = document.getElementById('genotype').value;
    const fitness = parseInt(document.getElementById('fitness_slider').value) || 3;
    const constraints = Array.from(document.querySelectorAll('input[name="constraint"]:checked')).map(c=>c.value);
    const pre = { moca: document.getElementById('moca_pre').value, digitf: document.getElementById('digitf_pre').value, digitb: document.getElementById('digitb_pre').value, tmt_a: document.getElementById('tmt_a_pre').value, tmt_b: document.getElementById('tmt_b_pre').value, sixmwt: document.getElementById('sixmwt_pre').value, tug: document.getElementById('tug_pre').value, grip: document.getElementById('grip_pre').value, bbs: document.getElementById('bbs_pre').value };
    const template = genotype.toLowerCase().startsWith('val')? {label:'Val/Val', sessions_per_week:4, session_length:30, intensity:'moderate-to-vigorous'} : {label:'Met carrier', sessions_per_week:5, session_length:40, intensity:'light-to-moderate'};
    if(fitness<3){ template.sessions_per_week = Math.max(3, template.sessions_per_week-1); template.session_length = Math.round(template.session_length*0.9); }
    if(fitness>3){ template.sessions_per_week += 1; template.session_length = Math.round(template.session_length*1.1); }
    // build 12 weeks
    const weeks=[];
    for(let wk=1; wk<=12; wk++){
      const sessions=[];
      ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d=>{
        let type='Rest', dur=0, cog='';
        if(template.label==='Val/Val'){
          if(d==='Mon'){ type='HIIT'; dur=template.session_length; cog='reaction'; }
          else if(d==='Tue'){ type='Resistance'; dur=Math.round(template.session_length*0.9); cog='random-cue'; }
          else if(d==='Wed'){ type='Skill/Dual-task'; dur=Math.round(template.session_length*0.8); }
          else if(d==='Thu'){ type='Active Recovery'; dur=20; }
          else if(d==='Fri'){ type='Mixed Cardio-Strength'; dur=template.session_length; }
          else if(d==='Sat'){ type='Optional Sport'; dur=30; }
        } else {
          if(d==='Mon'){ type='Endurance (steady)'; dur=template.session_length; }
          else if(d==='Tue'){ type='Strength+Balance'; dur=Math.round(template.session_length*0.8); }
          else if(d==='Wed'){ type='Adventure Mode'; dur=20; }
          else if(d==='Thu'){ type='Yoga/Tai Chi'; dur=30; }
          else if(d==='Fri'){ type='Endurance intervals'; dur=template.session_length; }
          else if(d==='Sat'){ type='Light aerobic + memory'; dur=30; }
        }
        const prog = Math.floor((wk-1)/4)*2;
        sessions.push({ day:d, type, duration_min: dur+prog, cognitive: cog, done:false });
      });
      weeks.push({ week:wk, sessions });
    }
    window.currentReport = { participant, genotype, fitness, constraints, template, pre, weeks };
    renderPlan(window.currentReport);
    setupWeeklyChecks(window.currentReport);
    // if some post values exist, draw radar chart
    const post = { moca: document.getElementById('moca_post')?.value || '', digitf: document.getElementById('digitf_post')?.value || '', digitb: document.getElementById('digitb_post')?.value || '', tmt_a: document.getElementById('tmt_a_post')?.value || '', tmt_b: document.getElementById('tmt_b_post')?.value || '', sixmwt: document.getElementById('sixmwt_post')?.value || '', tug: document.getElementById('tug_post')?.value || '', grip: document.getElementById('grip_post')?.value || '', bbs: document.getElementById('bbs_post')?.value || '' };
    createRadar(window.currentReport.pre, post, `Cognitive & Physical Summary — ${participant} — ${genotype}`);
    document.getElementById('result').style.display='block';
    try{ localStorage.setItem('lastReport', JSON.stringify(window.currentReport)); }catch(e){}
  });

  function renderPlan(report){
    document.getElementById('result-title').textContent = `${report.participant} — ${report.genotype}`;
    document.getElementById('summary').innerHTML = `<p><strong>Sessions/week:</strong> ${report.template.sessions_per_week} • <strong>Session length:</strong> ${report.template.session_length} min • <strong>Intensity:</strong> ${report.template.intensity}</p>`;
    const weeksDiv = document.getElementById('weeks'); weeksDiv.innerHTML='';
    report.weeks.forEach(w=>{
      const div=document.createElement('div'); div.className='week';
      div.innerHTML = `<strong>Week ${w.week}</strong>`;
      const ul=document.createElement('ul');
      w.sessions.forEach(s=>{ const li=document.createElement('li'); li.textContent = `${s.day}: ${s.type} — ${s.duration_min} min`; li.style.cursor='pointer'; li.onclick = ()=> showExerciseDetail(s); ul.appendChild(li); });
      div.appendChild(ul);
      weeksDiv.appendChild(div);
    });
  }

  function showExerciseDetail(ses){
    const modal=document.getElementById('exerciseModal');
    document.getElementById('modalTitle').textContent = ses.type;
    document.getElementById('modalDesc').textContent = `Description: ${ses.type}. Cognitive focus: ${ses.cognitive || 'N/A'}. Recommended duration: ${ses.duration_min} min.`;
    document.getElementById('modalSets').textContent = '3 sets x 8-12 reps (example)';
    document.getElementById('modalImg').src = 'assets/exercise_prescription.png';
    modal.style.display='flex';
  }

  function setupWeeklyChecks(report){
    const container=document.getElementById('weeklyChecks'); container.innerHTML='';
    report.weeks.forEach(w=>{
      const card=document.createElement('div'); card.className='check-card';
      const title=document.createElement('div'); title.innerHTML = `<strong>Week ${w.week}</strong>`;
      const list=document.createElement('div'); list.style.marginTop='8px';
      w.sessions.forEach((s, idx)=>{
        const btn=document.createElement('button'); btn.className='btn ghost'; btn.style.margin='4px';
        btn.textContent = s.day;
        btn.onclick = ()=>{ s.done = !s.done; btn.style.background = s.done? 'linear-gradient(90deg,#f26b00,#6b3fa0)' : 'transparent'; updateAdherence(); };
        list.appendChild(btn);
      });
      card.appendChild(title); card.appendChild(list); container.appendChild(card);
    });
    updateAdherence();
  }

  function updateAdherence(){
    const r = window.currentReport; if(!r) return;
    let total=0, done=0;
    r.weeks.forEach(w=> w.sessions.forEach(s=>{ total++; if(s.done) done++; }));
    const pct = total? Math.round(done/total*100):0;
    document.getElementById('adherenceBar').style.width = pct + '%';
    document.getElementById('adherencePct').textContent = pct + '%';
    const badges=document.getElementById('badges'); badges.innerHTML='';
    if(pct>=75){ const g=document.createElement('div'); g.className='badge gold'; g.textContent='G'; badges.appendChild(g); }
    else if(pct>=50){ const s=document.createElement('div'); s.className='badge silver'; s.textContent='S'; badges.appendChild(s); }
    else if(pct>=25){ const b=document.createElement('div'); b.className='badge bronze'; b.textContent='B'; badges.appendChild(b); }
    try{ localStorage.setItem('lastReport', JSON.stringify(r)); }catch(e){}
  }

  // CSV export
  document.getElementById('downloadCsv').addEventListener('click', ()=>{
    const r = window.currentReport; if(!r){ alert('Generate a plan first'); return; }
    const header=['Participant','Genotype','Measure','Pre','Post','Change','Status'];
    const rows=[];
    const fields=[['MoCA','moca',false],['DigitF','digitf',false],['DigitB','digitb',false],['TMT_A(s)','tmt_a',true],['TMT_B(s)','tmt_b',true],['6MWT(m)','sixmwt',false],['TUG(s)','tug',true],['Handgrip(kg)','grip',false],['BBS','bbs',false]];
    for(const f of fields){
      const pre = r.pre[f[1]] || ''; const post = document.getElementById(f[1]+'_post')?.value || '';
      const change = (pre!=='' && post!=='')? (parseFloat(post)-parseFloat(pre)).toFixed(2):'';
      rows.push([r.participant, r.genotype, f[0], pre, post, change, '']);
    }
    let total=0, done=0; r.weeks.forEach(w=> w.sessions.forEach(s=>{ total++; if(s.done) done++; }));
    rows.push([r.participant, r.genotype, 'Adherence_total_sessions', total, done, '', '']);
    let csv = header.join(',') + '\n'; for(const row of rows){ csv += row.map(v=>`"${v}"`).join(',') + '\n'; }
    const blob = new Blob([csv], {type:'text/csv'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${(r.participant||'participant').replace(/\s+/g,'_')}_log.csv`; a.click();
  });

  // PDF export with radar embedded as PNG
  // PDF export with radar chart fix
document.getElementById('exportPdf').addEventListener('click', async () => {
  const r = window.currentReport; 
  if (!r) { alert('Generate a plan first'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 36;
  let y = 36;

  // ✅ Wait for radar chart to fully render
  await new Promise(resolve => setTimeout(resolve, 1200));

  // header logo
  try {
    const res = await fetch('usm_ippt_logos.png');
    const blob = await res.blob();
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      doc.addImage(dataUrl, 'PNG', margin, y, 120, 40);
      proceed();
    };
    reader.readAsDataURL(blob);
  } catch (e) {
    proceed();
  }

  async function proceed() {
    doc.setFontSize(14);
    doc.setTextColor(60, 22, 102);
    doc.text('Clinical Exercise Prescription Report', margin + 140, y + 16);
    y += 60;

    doc.setFontSize(11);
    doc.text(`Participant: ${r.participant}`, margin, y);
    doc.text(`Genotype: ${r.genotype}`, margin + 300, y);
    y += 16;
    doc.text(`DOB: ${document.getElementById('dob').value || ''}`, margin, y);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin + 300, y);
    y += 20;

    // pre/post table (same as your original)
    const pre = r.pre;
    const post = {
      moca: document.getElementById('moca_post')?.value || '',
      digitf: document.getElementById('digitf_post')?.value || '',
      digitb: document.getElementById('digitb_post')?.value || '',
      tmt_a: document.getElementById('tmt_a_post')?.value || '',
      tmt_b: document.getElementById('tmt_b_post')?.value || '',
      sixmwt: document.getElementById('sixmwt_post')?.value || '',
      tug: document.getElementById('tug_post')?.value || '',
      grip: document.getElementById('grip_post')?.value || '',
      bbs: document.getElementById('bbs_post')?.value || ''
    };

    const headers = [['Measure', 'Pre', 'Post', 'Change', 'Status']];
    const rows = [];
    function statusText(preV, postV, lower = false) {
      if (preV === '' || postV === '') return 'Incomplete';
      const p = parseFloat(preV), q = parseFloat(postV);
      if (p === q) return 'No change';
      if (lower) return (q < p) ? 'Improved' : 'Worsened';
      return (q > p) ? 'Improved' : 'Worsened';
    }
    const measures = [
      ['MoCA', 'moca', false],
      ['DigitF', 'digitf', false],
      ['DigitB', 'digitb', false],
      ['TMT_A(s)', 'tmt_a', true],
      ['TMT_B(s)', 'tmt_b', true],
      ['6MWT(m)', 'sixmwt', false],
      ['TUG(s)', 'tug', true],
      ['Handgrip(kg)', 'grip', false],
      ['BBS', 'bbs', false]
    ];
    for (const m of measures) {
      const preV = pre[m[1]] || '';
      const postV = post[m[1]] || '';
      const change = (preV !== '' && postV !== '') ? (parseFloat(postV) - parseFloat(preV)).toFixed(2) : '';
      rows.push([m[0], preV, postV, change, statusText(preV, postV, m[2])]);
    }
    doc.autoTable({ startY: y, head: headers, body: rows, styles: { fontSize: 10 }, headStyles: { fillColor: [107, 63, 160] } });
    y = doc.lastAutoTable.finalY + 12;

    // ✅ Ensure radar chart is always included (even if includeChart checkbox missing)
    const canvas = document.getElementById('radarChart');
    if (canvas) {
      try {
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        const imgW = 420;
        const imgH = imgW * (canvas.height / canvas.width);
        if (y + imgH > 780) { doc.addPage(); y = 40; }
  
  // On page load, restore lastReport if present
  try{
    const last = JSON.parse(localStorage.getItem('lastReport') || 'null');
    if(last){ window.currentReport = last; renderPlan(last); setupWeeklyChecks(last); }
  }catch(e){}
});
