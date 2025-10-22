// EXECOGIM v5.3 - defensive, with BSG export
document.addEventListener('DOMContentLoaded', () => {
  console.log('EXECOGIM script loaded');

  // defensive helper to get element or log missing
  function $id(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`Missing element: #${id}`);
    return el;
  }

  const inputForm = $id('inputForm');
  const radarCanvas = $id('radarChart');
  const bsgCanvas = $id('bsgChart');
  const resultDiv = $id('result');
  const adherenceBar = $id('adherenceBar');
  const adherencePct = $id('adherencePct');

  if (!inputForm) return console.error('Input form not found — aborting script');

  // Chart instances
  let radarChart = null;
  let bsgChart = null;

  function createRadar(pre, post) {
    if (!radarCanvas) return;
    const ctx = radarCanvas.getContext('2d');
    const labels = ['MoCA','DigitF','DigitB','TMT-A(s)','TMT-B(s)','6MWT(m)','TUG(s)','Grip(kg)','BBS'];
    const meta = { moca:[0,30], digitf:[0,10], digitb:[0,10], tmt_a:[10,150], tmt_b:[20,300], sixmwt:[50,800], tug:[3,30], grip:[5,60], bbs:[0,56] };
    function norm(k,v){
      if(v===''||v==null) return 0;
      const [min,max]=meta[k];
      const num = parseFloat(v);
      const clipped = Math.max(min, Math.min(max, num));
      if (k.startsWith('tmt')||k==='tug') return Math.round((1 - (clipped-min)/(max-min)) * 100);
      return Math.round(((clipped-min)/(max-min)) * 100);
    }
    const order = ['moca','digitf','digitb','tmt_a','tmt_b','sixmwt','tug','grip','bbs'];
    const preData = order.map(k => norm(k, pre[k]));
    const postData = order.map(k => norm(k, post[k]));
    document.getElementById('chartCard').style.display = 'block';
    if (radarChart) radarChart.destroy();
    radarChart = new Chart(ctx, {
      type: 'radar',
      data: { labels, datasets: [
        { label: 'Pre', data: preData, backgroundColor: 'rgba(242,107,0,0.25)', borderColor: '#f26b00' },
        { label: 'Post', data: postData, backgroundColor: 'rgba(107,63,160,0.2)', borderColor: '#6b3fa0' }
      ]},
      options: { responsive: true, maintainAspectRatio: false, scales:{ r:{ min:0, max:100 }}}
    });
  }

  function createBSGRadar(b,s,g){
    if(!bsgCanvas) return;
    const ctx = bsgCanvas.getContext('2d');
    if(bsgChart) bsgChart.destroy();
    bsgChart = new Chart(ctx, {
      type: 'radar',
      data: { labels: ['Behavioral','Session','Genetic'], datasets: [{ label:'Adherence (%)', data:[b,s,g], backgroundColor:'rgba(107,63,160,0.25)', borderColor:'#6b3fa0' }]},
      options: { responsive:true, maintainAspectRatio:false, scales:{ r:{ min:0, max:100 }}}
    });
  }

  // Generate plan handler
  inputForm.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const participant = document.getElementById('participant_name').value || 'Participant';
      const genotype = document.getElementById('genotype').value || 'Val/Val';
      const fitness = parseInt(document.getElementById('fitness_slider').value) || 3;
      const pre = {
        moca: document.getElementById('moca_pre').value || '',
        digitf: document.getElementById('digitf_pre').value || '',
        digitb: document.getElementById('digitb_pre').value || '',
        tmt_a: document.getElementById('tmt_a_pre').value || '',
        tmt_b: document.getElementById('tmt_b_pre').value || '',
        sixmwt: document.getElementById('sixmwt_pre').value || '',
        tug: document.getElementById('tug_pre').value || '',
        grip: document.getElementById('grip_pre').value || '',
        bbs: document.getElementById('bbs_pre').value || ''
      };
      const template = genotype.toLowerCase().startsWith('val') ? { label:'Val/Val', sessions_per_week:4, session_length:30, intensity:'moderate' } : { label:'Met', sessions_per_week:5, session_length:40, intensity:'light' };
      if (fitness < 3) { template.sessions_per_week = Math.max(3, template.sessions_per_week - 1); template.session_length = Math.round(template.session_length * 0.9); }
      if (fitness > 3) { template.sessions_per_week += 1; template.session_length = Math.round(template.session_length * 1.1); }

      const weeks = [];
      for (let wk = 1; wk <= 12; wk++) {
        const sessions = [];
        ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d => {
          let type = 'Rest', dur = 0;
          if (template.label === 'Val/Val') {
            if (d==='Mon') { type='HIIT'; dur=template.session_length; }
            else if (d==='Tue') { type='Resistance'; dur = Math.round(template.session_length * 0.9); }
            else if (d==='Wed') { type='Skill/Dual-task'; dur = Math.round(template.session_length * 0.8); }
            else if (d==='Thu') { type='Active Recovery'; dur = 20; }
            else if (d==='Fri') { type='Mixed Cardio-Strength'; dur = template.session_length; }
            else if (d==='Sat') { type='Optional Sport'; dur = 30; }
          } else {
            if (d==='Mon') { type='Endurance'; dur = template.session_length; }
            else if (d==='Tue') { type='Strength+Balance'; dur = Math.round(template.session_length * 0.8); }
            else if (d==='Wed') { type='Adventure Mode'; dur = 20; }
            else if (d==='Thu') { type='Yoga/Tai Chi'; dur = 30; }
            else if (d==='Fri') { type='Endurance intervals'; dur = template.session_length; }
            else if (d==='Sat') { type='Light aerobic + memory'; dur = 30; }
          }
          const prog = Math.floor((wk-1)/4)*2;
          sessions.push({ day: d, type, duration_min: dur + prog, done: false });
        });
        weeks.push({ week: wk, sessions });
      }

      window.currentReport = { participant, genotype, fitness, template, pre, weeks };
      renderPlan(window.currentReport);
      setupWeeklyChecks(window.currentReport);

      const post = {
        moca: document.getElementById('moca_post').value || '',
        digitf: document.getElementById('digitf_post').value || '',
        digitb: document.getElementById('digitb_post').value || '',
        tmt_a: document.getElementById('tmt_a_post').value || '',
        tmt_b: document.getElementById('tmt_b_post').value || '',
        sixmwt: document.getElementById('sixmwt_post').value || '',
        tug: document.getElementById('tug_post').value || '',
        grip: document.getElementById('grip_post').value || '',
        bbs: document.getElementById('bbs_post').value || ''
      };

      createRadar(pre, post);
      createBSGRadar(60,70,80);

      resultDiv.style.display = 'block';
      console.log('Plan generated for', participant);
    } catch (err) {
      console.error('Error in generate handler:', err);
      alert('An error occurred while generating the plan. See console for details.');
    }
  });

  function renderPlan(r){
    if(!r) return;
    $id('result-title').textContent = `${r.participant} — ${r.genotype}`;
    $id('summary').innerHTML = `<p><strong>Sessions/week:</strong> ${r.template.sessions_per_week} • <strong>Length:</strong> ${r.template.session_length} min • <strong>Intensity:</strong> ${r.template.intensity}</p>`;
    const weeksDiv = document.getElementById('weeks'); weeksDiv.innerHTML = '';
    r.weeks.forEach(w => {
      const box = document.createElement('div');
      box.innerHTML = `<strong>Week ${w.week}</strong>`;
      const ul = document.createElement('ul');
      w.sessions.forEach(s => {
        const li = document.createElement('li');
        li.textContent = `${s.day}: ${s.type} — ${s.duration_min} min`;
        ul.appendChild(li);
      });
      box.appendChild(ul);
      weeksDiv.appendChild(box);
    });
  }

  function setupWeeklyChecks(r){
    const container = document.getElementById('weeklyChecks'); container.innerHTML = '';
    r.weeks.forEach(w => {
      const card = document.createElement('div');
      card.innerHTML = `<strong>Week ${w.week}</strong>`;
      w.sessions.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'btn ghost';
        btn.textContent = s.day;
        btn.onclick = () => { s.done = !s.done; btn.style.background = s.done ? 'linear-gradient(90deg,#f26b00,#6b3fa0)' : 'transparent'; updateAdherence(); };
        card.appendChild(btn);
      });
      container.appendChild(card);
    });
    updateAdherence();
  }

  function updateAdherence(){
    const r = window.currentReport; if(!r) return;
    let total = 0, done = 0;
    r.weeks.forEach(w => w.sessions.forEach(s => { total++; if (s.done) done++; }));
    const pct = total ? Math.round(done/total*100) : 0;
    if (adherenceBar) adherenceBar.style.width = pct+'%';
    if (adherencePct) adherencePct.textContent = pct+'%';
    const badges = document.getElementById('badges'); if (badges) {
      badges.innerHTML = '';
      if (pct >= 75) badges.innerHTML = '<div class="badge gold">G</div>';
      else if (pct >= 50) badges.innerHTML = '<div class="badge silver">S</div>';
      else if (pct >= 25) badges.innerHTML = '<div class="badge bronze">B</div>';
    }
    createBSGRadar(pct, Math.min(100, pct + 10), Math.max(0, pct - 10));
  }

  // Export PDF (both charts)
  const exportBtn = document.getElementById('exportPdf');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const r = window.currentReport;
      if (!r) { alert('Generate a plan first'); return; }
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const margin = 36; let y = 40;
        doc.setFontSize(16); doc.text('Clinical Exercise Prescription Report', margin, y); y += 20;
        doc.setFontSize(10); doc.text(`Participant: ${r.participant} | Genotype: ${r.genotype}`, margin, y); y += 12;

        // main radar
        if (radarCanvas) {
          try {
            const dataUrl = radarCanvas.toDataURL('image/png', 1.0);
            const imgW = 420; const imgH = imgW * (radarCanvas.height / radarCanvas.width);
            if (y + imgH > 780) { doc.addPage(); y = 40; }
            doc.addImage(dataUrl, 'PNG', margin, y, imgW, imgH); y += imgH + 12;
          } catch (e) { console.warn('Could not embed main radar:', e); }
        }

        // BSG radar + explanation
        doc.setFontSize(12); doc.text('BSG Adherence Summary (Behavioral–Session–Genetic)', margin, y); y += 12;
        if (bsgCanvas) {
          try {
            const bsgUrl = bsgCanvas.toDataURL('image/png', 1.0);
            const bsgW = 300; const bsgH = bsgW * (bsgCanvas.height / bsgCanvas.width);
            if (y + bsgH > 780) { doc.addPage(); y = 40; }
            doc.addImage(bsgUrl, 'PNG', margin, y, bsgW, bsgH); y += bsgH + 8;
            doc.setFontSize(9); doc.text('B = Behavioral adherence | S = Session adherence | G = Genetic-fit adherence', margin, y); y += 12;
          } catch (e) { console.warn('Could not embed BSG:', e); }
        }

        doc.save(`${r.participant.replace(/\s+/g,'_')}_execogim_report.pdf`);
      } catch (err) {
        console.error('PDF export failed:', err);
        alert('PDF export failed (see console).');
      }
    });
  }

  // CSV export
  const csvBtn = document.getElementById('downloadCsv');
  if (csvBtn) {
    csvBtn.addEventListener('click', () => {
      const r = window.currentReport;
      if (!r) { alert('Generate a plan first'); return; }
      const header = ['Participant','Genotype','Measure','Pre','Post','Change'];
      const fields = [['MoCA','moca'],['DigitF','digitf'],['DigitB','digitb'],['TMT_A','tmt_a'],['TMT_B','tmt_b'],['6MWT','sixmwt'],['TUG','tug'],['Grip','grip'],['BBS','bbs']];
      const rows = [];
      fields.forEach(f=>{
        const preV = (r.pre && r.pre[f[1]])? r.pre[f[1]] : '';
        const postV = document.getElementById(f[1] + '_post') ? document.getElementById(f[1] + '_post').value : '';
        const change = (preV !== '' && postV !== '') ? (parseFloat(postV) - parseFloat(preV)).toFixed(2) : '';
        rows.push([r.participant, r.genotype, f[0], preV, postV, change]);
      });
      let csv = header.join(',') + '\n' + rows.map(rw => rw.map(v=>`"${v}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${r.participant.replace(/\s+/g,'_')}_execogim_log.csv`; a.click();
    });
  }

  console.log('EXECOGIM script initialized successfully');
});
