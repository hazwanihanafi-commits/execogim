// script_v8.js — EXECOGIM v8
// Features:
// - Generate plan only when clicking Generate
// - Clickable info modal (parameter norms for general adults)
// - Excel (.xlsx) export with two sheets (Assessments / Plan)
// - PDF export includes 2 offscreen radar charts appended at the end
// - PWA install banner logic included

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const inputForm = document.getElementById('inputForm');
  const generateBtn = document.getElementById('generateBtn');
  const resultDiv = document.getElementById('result');
  const titleEl = document.getElementById('result-title');
  const summaryEl = document.getElementById('summary');
  const weeksEl = document.getElementById('weeks');
  const weeklyChecks = document.getElementById('weeklyChecks');
  const adherenceBar = document.getElementById('adherenceBar');
  const adherencePct = document.getElementById('adherencePct');
  const exportPdfBtn = document.getElementById('exportPdf');
  const downloadXlsxBtn = document.getElementById('downloadXlsx');

  // Modal elements
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');

  // PWA install
  let deferredPrompt;
  const installContainer = document.getElementById('installContainer');
  const installBtn = document.getElementById('installBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installContainer.style.display = 'block';
  });
  if (installBtn) installBtn.addEventListener('click', async () => {
    installContainer.style.display = 'none';
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
  });

  // Normative values for general adults (clickable modal content)
  const norms = {
    moca: { title: 'MoCA — Montreal Cognitive Assessment', text: 'General adult norm: typically >=26. Use clinical context; lower scores suggest cognitive impairment.' },
    digitf: { title: 'Digit Span Forward', text: 'Typical adults: 6–9 digits forward is common; values vary with education and age.' },
    digitb: { title: 'Digit Span Backward', text: 'Typical adults: 4–7 digits backward; lower than forward span.' },
    tmt_a: { title: 'TMT A (Trail Making Test A)', text: 'Typical adults: ~20–40 seconds depending on age and education; lower is better.' },
    tmt_b: { title: 'TMT B (Trail Making Test B)', text: 'Typical adults: ~40–90 seconds; lower is better. Time depends on set-switching ability.' },
    sixmwt: { title: '6MWT (6-Minute Walk Test)', text: 'General adult normative distance: ~400–700 m depending on age and fitness.' },
    tug: { title: 'TUG (Timed Up & Go)', text: 'Typical healthy adults: <10–12 seconds is common; lower is better.' },
    grip: { title: 'Handgrip Strength', text: 'General adult values differ by sex/age; typical healthy males 35–50 kg, females 20–35 kg.' },
    bbs: { title: 'Berg Balance Scale (BBS)', text: 'Range 0–56. Higher is better; scores <45 may indicate fall risk in older adults.' }
  };

  // Info modal handling (clickable info button)
  document.querySelectorAll('.info-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key');
      if (!key || !norms[key]) return;
      modalTitle.textContent = norms[key].title;
      modalBody.textContent = norms[key].text;
      modalBackdrop.style.display = 'flex';
    });
  });
  modalClose.addEventListener('click', () => modalBackdrop.style.display = 'none');
  modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) modalBackdrop.style.display = 'none'; });

  // small helper
  const $ = id => document.getElementById(id);
  const safeVal = id => { const el = $(id); return el ? el.value : ''; };

  // Generate plan handler (only when clicking Generate)
  inputForm.addEventListener('submit', (e) => {
    e.preventDefault();
    generatePlan();
  });

  function generatePlan() {
    const participant = safeVal('participant_name') || 'Participant';
    const genotype = safeVal('genotype') || 'Val/Val';
    const fitness = parseInt(safeVal('fitness_slider')) || 3;

    const pre = {
      moca: safeVal('moca_pre'), digitf: safeVal('digitf_pre'), digitb: safeVal('digitb_pre'),
      tmt_a: safeVal('tmt_a_pre'), tmt_b: safeVal('tmt_b_pre'),
      sixmwt: safeVal('sixmwt_pre'), tug: safeVal('tug_pre'), grip: safeVal('grip_pre'), bbs: safeVal('bbs_pre')
    };

    const template = genotype.toLowerCase().startsWith('val')
      ? { label: 'Val/Val', sessions_per_week: 4, session_length: 30, intensity: 'moderate-to-vigorous' }
      : { label: 'Met carrier', sessions_per_week: 5, session_length: 40, intensity: 'light-to-moderate' };

    if (fitness < 3) { template.sessions_per_week = Math.max(3, template.sessions_per_week - 1); template.session_length = Math.round(template.session_length * 0.9); }
    if (fitness > 3) { template.sessions_per_week += 1; template.session_length = Math.round(template.session_length * 1.1); }

    const weeks = [];
    for (let wk = 1; wk <= 12; wk++) {
      const sessions = [];
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(d => {
        let type = 'Rest', dur = 0;
        if (template.label === 'Val/Val') {
          if (d === 'Mon') { type = 'HIIT'; dur = template.session_length; }
          else if (d === 'Tue') { type = 'Resistance'; dur = Math.round(template.session_length * 0.9); }
          else if (d === 'Wed') { type = 'Skill/Dual-task'; dur = Math.round(template.session_length * 0.8); }
          else if (d === 'Thu') { type = 'Active Recovery'; dur = 20; }
          else if (d === 'Fri') { type = 'Mixed Cardio-Strength'; dur = template.session_length; }
          else if (d === 'Sat') { type = 'Optional Sport'; dur = 30; }
        } else {
          if (d === 'Mon') { type = 'Endurance (steady)'; dur = template.session_length; }
          else if (d === 'Tue') { type = 'Strength+Balance'; dur = Math.round(template.session_length * 0.8); }
          else if (d === 'Wed') { type = 'Adventure Mode'; dur = 20; }
          else if (d === 'Thu') { type = 'Yoga/Tai Chi'; dur = 30; }
          else if (d === 'Fri') { type = 'Endurance intervals'; dur = template.session_length; }
          else if (d === 'Sat') { type = 'Light aerobic + memory'; dur = 30; }
        }
        sessions.push({ day: d, type, duration_min: dur, done: false });
      });
      weeks.push({ week: wk, sessions });
    }

    window.currentReport = { participant, genotype, fitness, template, pre, weeks };
    renderPlan(window.currentReport);
    setupWeeklyChecks(window.currentReport);
    resultDiv.style.display = 'block';
    try { localStorage.setItem('lastReport', JSON.stringify(window.currentReport)); } catch (e) {}
  }

  function renderPlan(r) {
    if (!r) return;
    titleEl.textContent = `${r.participant} — ${r.genotype}`;
    summaryEl.innerHTML = `<p><strong>Sessions/week:</strong> ${r.template.sessions_per_week} • <strong>Session length:</strong> ${r.template.session_length} min • <strong>Intensity:</strong> ${r.template.intensity}</p>`;
    weeksEl.innerHTML = '';
    r.weeks.forEach(w => {
      const div = document.createElement('div');
      div.className = 'week-block';
      const ul = document.createElement('ul');
      w.sessions.forEach(s => {
        const li = document.createElement('li');
        li.textContent = `${s.day}: ${s.type} — ${s.duration_min} min`;
        ul.appendChild(li);
      });
      div.innerHTML = `<h4>Week ${w.week}</h4>`;
      div.appendChild(ul);
      weeksEl.appendChild(div);
    });
  }

  function setupWeeklyChecks(r) {
    weeklyChecks.innerHTML = '';
    if (!r) return;
    r.weeks.forEach(w => {
      const card = document.createElement('div');
      card.className = 'week-card';
      card.innerHTML = `<h4 style="margin:0 0 8px">Week ${w.week}</h4>`;
      w.sessions.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'day-btn';
        btn.textContent = s.day;
        btn.onclick = () => {
          s.done = !s.done;
          if (s.done) btn.classList.add('done'); else btn.classList.remove('done');
          updateAdherence();
        };
        card.appendChild(btn);
      });
      weeklyChecks.appendChild(card);
    });
    updateAdherence();
  }

  function updateAdherence() {
    const r = window.currentReport; if (!r) return;
    let total = 0, done = 0;
    r.weeks.forEach(w => w.sessions.forEach(s => { total++; if (s.done) done++; }));
    const pct = total ? Math.round(done / total * 100) : 0;
    adherenceBar.style.width = pct + '%';
    adherencePct.textContent = pct + '%';
  }

  // XLSX Export (two sheets: Assessments & Plan)
  downloadXlsxBtn.addEventListener('click', () => {
    const r = window.currentReport;
    if (!r) { alert('Generate the plan first'); return; }

    // Sheet 1: Assessments
    const assHeader = ['Measure', 'Pre', 'Post', 'Norm (general adult)'];
    const normsText = {
      moca: '>=26', digitf: '6–9', digitb: '4–7', tmt_a: '20–40 s', tmt_b: '40–90 s',
      sixmwt: '400–700 m', tug: '<10–12 s', grip: 'M:35–50kg F:20–35kg', bbs: '0–56 (higher better)'
    };
    const fields = [
      ['MoCA', r.pre.moca || '', safeVal('moca_post') || '', normsText.moca],
      ['DigitF', r.pre.digitf || '', safeVal('digitf_post') || '', normsText.digitf],
      ['DigitB', r.pre.digitb || '', safeVal('digitb_post') || '', normsText.digitb],
      ['TMT-A(s)', r.pre.tmt_a || '', safeVal('tmt_a_post') || '', normsText.tmt_a],
      ['TMT-B(s)', r.pre.tmt_b || '', safeVal('tmt_b_post') || '', normsText.tmt_b],
      ['6MWT(m)', r.pre.sixmwt || '', safeVal('sixmwt_post') || '', normsText.sixmwt],
      ['TUG(s)', r.pre.tug || '', safeVal('tug_post') || '', normsText.tug],
      ['Handgrip(kg)', r.pre.grip || '', safeVal('grip_post') || '', normsText.grip],
      ['BBS', r.pre.bbs || '', safeVal('bbs_post') || '', normsText.bbs]
    ];

    const ws1 = XLSX.utils.aoa_to_sheet([assHeader, ...fields]);

    // Sheet 2: Plan summary
    const planHeader = ['Week', 'Sessions (day:type(duration) )'];
    const planRows = window.currentReport.weeks.map(w => {
      const txt = w.sessions.map(s => `${s.day}:${s.type}(${s.duration_min}m)`).join(' | ');
      return [w.week, txt];
    });
    const ws2 = XLSX.utils.aoa_to_sheet([planHeader, ...planRows]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Assessments');
    XLSX.utils.book_append_sheet(wb, ws2, 'Plan');

    XLSX.writeFile(wb, `${(r.participant || 'participant').replace(/\s+/g, '_')}_execogim.xlsx`);
  });

  // PDF export (append charts at end — charts offscreen only)
  exportPdfBtn.addEventListener('click', async () => {
    const r = window.currentReport;
    if (!r) { alert('Generate the plan first'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 36;
    let y = 36;

    // Header
    doc.setFontSize(14); doc.setTextColor(60, 22, 102);
    doc.text('Clinical Exercise Prescription Report', margin, y); y += 18;
    doc.setFontSize(11);
    doc.text(`Participant: ${r.participant}`, margin, y);
    doc.text(`Genotype: ${r.genotype}`, margin + 320, y);
    y += 14;
    doc.text(`DOB: ${safeVal('dob') || ''}`, margin, y);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin + 320, y);
    y += 18;

    // Pre/Post table
    const fieldsForTable = [
      ['Measure', 'Pre', 'Post', 'Change'],
    ];
    const measures = [
      ['MoCA', r.pre.moca || '', safeVal('moca_post') || ''],
      ['DigitF', r.pre.digitf || '', safeVal('digitf_post') || ''],
      ['DigitB', r.pre.digitb || '', safeVal('digitb_post') || ''],
      ['TMT-A(s)', r.pre.tmt_a || '', safeVal('tmt_a_post') || ''],
      ['TMT-B(s)', r.pre.tmt_b || '', safeVal('tmt_b_post') || ''],
      ['6MWT(m)', r.pre.sixmwt || '', safeVal('sixmwt_post') || ''],
      ['TUG(s)', r.pre.tug || '', safeVal('tug_post') || ''],
      ['Handgrip(kg)', r.pre.grip || '', safeVal('grip_post') || ''],
      ['BBS', r.pre.bbs || '', safeVal('bbs_post') || '']
    ];
    const tableBody = measures.map(m => {
      const preV = m[1] || '';
      const postV = m[2] || '';
      let change = '';
      if (preV !== '' && postV !== '' && !isNaN(parseFloat(preV)) && !isNaN(parseFloat(postV))) {
        change = (parseFloat(postV) - parseFloat(preV)).toFixed(2);
      }
      return [m[0], preV, postV, change];
    });
    doc.autoTable({ startY: y, head: [['Measure','Pre','Post','Change']], body: tableBody, styles:{fontSize:10}, headStyles:{fillColor:[107,63,160]} });
    y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : y + 120;

    // 12-week plan snapshot (two-column)
    const planRows = r.weeks.map(w => [ `Week ${w.week}`, w.sessions.map(s => `${s.day}:${s.type}(${s.duration_min}m)`).join(' | ') ]);
    doc.autoTable({ startY: y, head:[['Week','Sessions']], body: planRows.slice(0,6), styles:{fontSize:9} });
    if (planRows.length > 6) {
      if (doc.lastAutoTable.finalY + 20 > 760) { doc.addPage(); y = 40; } else y = doc.lastAutoTable.finalY + 20;
      doc.autoTable({ startY: y, head:[['Week','Sessions']], body: planRows.slice(6), styles:{fontSize:9} });
      y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : y + 120;
    } else {
      y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : y + 120;
    }

    // Weekly adherence summary
    let total = 0, done = 0;
    r.weeks.forEach(w => w.sessions.forEach(s => { total++; if (s.done) done++; }));
    const pct = total ? Math.round(done / total * 100) : 0;
    doc.addPage();
    y = 40;
    doc.setFontSize(12); doc.text('Weekly Adherence Summary', margin, y); y += 16;
    doc.setFontSize(10); doc.text(`Total sessions: ${total} — Completed: ${done} — Adherence: ${pct}%`, margin, y);
    y += 20;

    // Consent page
    doc.addPage();
    y = 60;
    doc.setFontSize(12); doc.text('Consent Form', margin, y); y += 16;
    doc.setFontSize(10);
    const consentText = 'I confirm that I have received information about the exercise program. I understand the risks and benefits and consent to participate. I confirm that I have disclosed any medical conditions to the clinician.';
    doc.text(doc.splitTextToSize(consentText, 520), margin, y);
    y += 40;
    doc.text('Assoc. Prof. Dr. Hazwani Ahmad Yusof @ Hanafi', margin, 760);

    // Append 2 charts at very end (new page)
    doc.addPage();
    y = 40;
    doc.setFontSize(13); doc.text('Cognitive & Physical Summary (Pre vs Post)', margin, y); y += 10;

    const radarCanvas = document.getElementById('radarChart');
    const bsgCanvas = document.getElementById('bsgChart');

    // Norm helper & normalization to 0-100
    const meta = {
      moca:[0,30], digitf:[0,10], digitb:[0,10],
      tmt_a:[10,150], tmt_b:[20,300],
      sixmwt:[50,800], tug:[3,30], grip:[5,60], bbs:[0,56]
    };
    function norm(key,val){
      if(val===''||val==null) return 0;
      const [min,max] = meta[key];
      const n = parseFloat(val);
      if (isNaN(n)) return 0;
      const clipped = Math.max(min, Math.min(max, n));
      if (key.startsWith('tmt')||key==='tug') return Math.round((1 - (clipped - min)/(max - min)) * 100);
      return Math.round(((clipped - min)/(max - min)) * 100);
    }
    const order = ['moca','digitf','digitb','tmt_a','tmt_b','sixmwt','tug','grip','bbs'];
    const preData = order.map(k => norm(k, r.pre[k] || ''));
    const postData = order.map(k => norm(k, safeVal(k + '_post') || ''));

    // Create radar (offscreen)
    let radarChart = null, bsgChart = null;
    try {
      const ctx = radarCanvas.getContext('2d');
      radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: ['MoCA','DigitF','DigitB','TMT-A(s)','TMT-B(s)','6MWT(m)','TUG(s)','Grip(kg)','BBS'],
          datasets: [
            { label:'Pre', data: preData, backgroundColor:'rgba(242,107,0,0.25)', borderColor:'#f26b00' },
            { label:'Post', data: postData, backgroundColor:'rgba(107,63,160,0.2)', borderColor:'#6b3fa0' }
          ]
        },
        options: { responsive:false, animation:false, scales:{ r:{ min:0, max:100 }} }
      });
    } catch (err) { console.warn('radar create failed', err); }

    // BSG mini-radar
    try {
      const B = pct;
      const S = Math.max(0, Math.min(100, pct + 8));
      const G = Math.max(0, Math.min(100, pct - 8));
      const ctx2 = bsgCanvas.getContext('2d');
      bsgChart = new Chart(ctx2, {
        type: 'radar',
        data: {
          labels: ['Behavioral','Session','Genetic'],
          datasets: [{ label:'BSG adherence', data:[B,S,G], backgroundColor:'rgba(107,63,160,0.25)', borderColor:'#6b3fa0' }]
        },
        options: { responsive:false, animation:false, scales:{ r:{ min:0, max:100 }} }
      });
    } catch (err) { console.warn('bsg create failed', err); }

    // wait briefly
    await new Promise(res => setTimeout(res, 300));

    // add radar image to PDF
    try {
      const radarImg = radarCanvas.toDataURL('image/png');
      const imgW = 460;
      const imgH = imgW * (radarCanvas.height / radarCanvas.width);
      if (y + imgH > 780) { doc.addPage(); y = 40; }
      doc.addImage(radarImg, 'PNG', margin, y, imgW, imgH);
      y += imgH + 12;
    } catch (err) { console.warn('add radar image failed', err); }

    // add BSG
    try {
      doc.setFontSize(12); doc.text('BSG Adherence Summary (B=Behavioral,S=Session,G=Genetic)', margin, y); y += 10;
      const bsgImg = bsgCanvas.toDataURL('image/png');
      const bsgW = 320; const bsgH = bsgW * (bsgCanvas.height / bsgCanvas.width);
      if (y + bsgH > 780) { doc.addPage(); y = 40; }
      doc.addImage(bsgImg, 'PNG', margin, y, bsgW, bsgH);
      y += bsgH + 8;
    } catch (err) { console.warn('add bsg failed', err); }

    // cleanup charts
    try { if (radarChart) radarChart.destroy(); } catch (e) {}
    try { if (bsgChart) bsgChart.destroy(); } catch (e) {}

    // Save PDF
    const filename = (r.participant ? r.participant.replace(/\s+/g, '_') : 'participant') + '_execogim_report.pdf';
    doc.save(filename);
  });

  // Restore lastReport on load (optional)
  try {
    const last = JSON.parse(localStorage.getItem('lastReport') || 'null');
    if (last) { window.currentReport = last; renderPlan(last); setupWeeklyChecks(last); resultDiv.style.display = 'block'; }
  } catch (e) {}

  // Onboard close button (if exists)
  const closeOnboard = document.getElementById('closeOnboard');
  if (closeOnboard) closeOnboard.onclick = () => closeOnboard.closest('.card').style.display = 'none';
});
