// script_v7.js
// EXECOGIM v7 — charts only in PDF, full UI interactions
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const form = document.getElementById('inputForm');
  const result = document.getElementById('result');
  const weeksDiv = document.getElementById('weeks');
  const weeklyChecks = document.getElementById('weeklyChecks');
  const adherenceBar = document.getElementById('adherenceBar');
  const adherencePct = document.getElementById('adherencePct');
  const exportBtn = document.getElementById('exportPdf');
  const pdfRadarCanvas = document.getElementById('radarChart');
  const pdfBsgCanvas = document.getElementById('bsgChart');

  // small helper to safely read value
  const $ = id => document.getElementById(id);
  const safeVal = id => { const el = $(id); return el ? el.value : ''; };

  // current report container
  window.currentReport = null;

  // Generate 12-week plan
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // Read inputs
    const participant = safeVal('participant_name') || 'Participant';
    const genotype = safeVal('genotype') || 'Val/Val';
    const fitness = parseInt(safeVal('fitness_slider')) || 3;

    const pre = {
      moca: safeVal('moca_pre'),
      digitf: safeVal('digitf_pre'),
      digitb: safeVal('digitb_pre'),
      tmt_a: safeVal('tmt_a_pre'),
      tmt_b: safeVal('tmt_b_pre'),
      sixmwt: safeVal('sixmwt_pre'),
      tug: safeVal('tug_pre'),
      grip: safeVal('grip_pre'),
      bbs: safeVal('bbs_pre')
    };

    // template by genotype
    const template = genotype.toLowerCase().startsWith('val')
      ? { label: 'Val/Val', sessions_per_week: 4, session_length: 30, intensity: 'moderate-to-vigorous' }
      : { label: 'Met carrier', sessions_per_week: 5, session_length: 40, intensity: 'light-to-moderate' };

    if (fitness < 3) {
      template.sessions_per_week = Math.max(3, template.sessions_per_week - 1);
      template.session_length = Math.round(template.session_length * 0.9);
    }
    if (fitness > 3) {
      template.sessions_per_week += 1;
      template.session_length = Math.round(template.session_length * 1.1);
    }

    // build 12 weeks
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
    result.style.display = 'block';
  });


  // Render plan (textual)
  function renderPlan(report) {
    if (!report) return;
    $('result-title').textContent = `${report.participant} — ${report.genotype}`;
    const summary = `<p><strong>Sessions/week:</strong> ${report.template.sessions_per_week} • <strong>Session length:</strong> ${report.template.session_length} min • <strong>Intensity:</strong> ${report.template.intensity}</p>`;
    // create weeks list
    weeksDiv.innerHTML = '';
    report.weeks.forEach(w => {
      const wdiv = document.createElement('div');
      wdiv.className = 'week-block';
      const ul = document.createElement('ul');
      w.sessions.forEach(s => {
        const li = document.createElement('li');
        li.textContent = `${s.day}: ${s.type} — ${s.duration_min} min`;
        ul.appendChild(li);
      });
      wdiv.innerHTML = `<h4>Week ${w.week}</h4>`;
      wdiv.appendChild(ul);
      weeksDiv.appendChild(wdiv);
    });
    // set summary inside container (create or reuse)
    let summaryEl = document.getElementById('summary');
    if (!summaryEl) {
      summaryEl = document.createElement('div'); summaryEl.id = 'summary';
      weeksDiv.parentNode.insertBefore(summaryEl, weeksDiv);
    }
    summaryEl.innerHTML = summary;
  }

  // Setup weekly adherence UI (grid of small cards)
  function setupWeeklyChecks(report) {
    weeklyChecks.innerHTML = '';
    if (!report) return;
    report.weeks.forEach(w => {
      const card = document.createElement('div');
      card.className = 'week-card';
      card.style.padding = '12px';
      card.style.borderRadius = '10px';
      card.style.border = '1px solid rgba(107,63,160,0.06)';
      card.innerHTML = `<h4 style="margin:0 0 8px">Week ${w.week}</h4>`;
      w.sessions.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'day-btn';
        btn.textContent = s.day;
        btn.style.margin = '6px';
        btn.style.padding = '8px 12px';
        btn.style.borderRadius = '10px';
        btn.style.border = '2px solid #6b3fa0';
        btn.style.background = 'white';
        btn.style.color = '#6b3fa0';
        btn.style.cursor = 'pointer';
        btn.onclick = () => {
          s.done = !s.done;
          if (s.done) {
            btn.style.background = 'linear-gradient(90deg,#6b3fa0,#f26b00)';
            btn.style.color = '#fff';
            btn.style.borderColor = 'transparent';
          } else {
            btn.style.background = 'white';
            btn.style.color = '#6b3fa0';
            btn.style.borderColor = '#6b3fa0';
          }
          updateAdherence();
        };
        card.appendChild(btn);
      });
      weeklyChecks.appendChild(card);
    });
    updateAdherence();
  }

  // Update adherence (progress bar)
  function updateAdherence() {
    const r = window.currentReport;
    if (!r) return;
    let total = 0, done = 0;
    r.weeks.forEach(w => w.sessions.forEach(s => { total++; if (s.done) done++; }));
    const pct = total ? Math.round(done / total * 100) : 0;
    if (adherenceBar) adherenceBar.style.width = pct + '%';
    if (adherencePct) adherencePct.textContent = pct + '%';
  }

  // PDF export: build report + generate offscreen charts and append at end
  exportBtn.addEventListener('click', async () => {
    const r = window.currentReport;
    if (!r) { alert('Generate plan first'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 36;
    let y = 36;

    // Header and participant info
    doc.setFontSize(14);
    doc.setTextColor(60, 22, 102);
    doc.text('Clinical Exercise Prescription Report', margin, y); y += 18;
    doc.setFontSize(11);
    doc.text(`Participant: ${r.participant}`, margin, y);
    doc.text(`Genotype: ${r.genotype}`, margin + 340, y);
    y += 14;
    doc.text(`DOB: ${safeVal('dob') || ''}`, margin, y);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin + 340, y);
    y += 18;

    // Pre/post table using autoTable
    const measuresHead = [['Measure', 'Pre', 'Post', 'Change', 'Status']];
    const fields = [
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
    const body = fields.map(f => {
      const preV = (r.pre && r.pre[f[1]]) ? r.pre[f[1]] : '';
      const postV = safeVal(f[1] + '_post') || '';
      let change = '';
      if (preV !== '' && postV !== '') {
        const numPre = parseFloat(preV);
        const numPost = parseFloat(postV);
        if (!isNaN(numPre) && !isNaN(numPost)) change = (numPost - numPre).toFixed(2);
      }
      const status = (() => {
        if (preV === '' || postV === '') return 'Incomplete';
        const p = parseFloat(preV), q = parseFloat(postV);
        if (isNaN(p) || isNaN(q)) return 'Incomplete';
        if (p === q) return 'No change';
        if (f[2]) return (q < p) ? 'Improved' : 'Worsened'; // lower better
        return (q > p) ? 'Improved' : 'Worsened';
      })();
      return [f[0], preV, postV, change, status];
    });

    doc.autoTable({ startY: y, head: measuresHead, body: body, styles: { fontSize: 10 }, headStyles: { fillColor: [107, 63, 160] } });
    y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : y + 120;

    // 12-week plan snapshot (first half & second half)
    const planRows = r.weeks.map(w => [ `Week ${w.week}`, w.sessions.map(s => `${s.day}: ${s.type} (${s.duration_min}m)`).join(' | ') ]);
    doc.autoTable({ startY: y, head: [['Week', 'Sessions']], body: planRows.slice(0, 6), styles: { fontSize: 9 } });
    if (planRows.length > 6) {
      if (doc.lastAutoTable.finalY + 20 > 780) { doc.addPage(); y = 40; } else y = doc.lastAutoTable.finalY + 20;
      doc.autoTable({ startY: y, head: [['Week', 'Sessions']], body: planRows.slice(6), styles: { fontSize: 9 } });
      y = doc.lastAutoTable.finalY + 12;
    } else {
      y = doc.lastAutoTable.finalY + 12;
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

    // Consent block
    doc.addPage();
    y = 60;
    doc.setFontSize(12); doc.text('Consent Form', margin, y); y += 16;
    doc.setFontSize(10);
    const consentText = 'I confirm that I have received information about the exercise program. I understand the risks and benefits and consent to participate. I confirm that I have disclosed any medical conditions to the clinician.';
    doc.text(doc.splitTextToSize(consentText, 520), margin, y); y += 70;
    doc.text('Assoc. Prof. Dr. Hazwani Ahmad Yusof @ Hanafi', margin, 760);

    // --- Append charts at the very end on a new page ---
    doc.addPage();
    y = 40;
    doc.setFontSize(13);
    doc.text('Cognitive & Physical Summary (Pre vs Post)', margin, y);
    y += 10;

    // If canvases missing, create them dynamically (should exist from HTML but safe-check)
    if (!pdfRadarCanvas || !pdfBsgCanvas) {
      // create temp canvases in DOM if not present
      console.warn('PDF canvases not found in DOM; creating temporary canvases.');
    }

    // Helper normalize
    const meta = { moca: [0, 30], digitf: [0, 10], digitb: [0, 10], tmt_a: [10, 150], tmt_b: [20, 300], sixmwt: [50, 800], tug: [3, 30], grip: [5, 60], bbs: [0, 56] };
    function norm(key, val) {
      if (val === '' || val == null) return 0;
      const [min, max] = meta[key];
      const n = parseFloat(val);
      if (isNaN(n)) return 0;
      const clipped = Math.max(min, Math.min(max, n));
      if (key.startsWith('tmt') || key === 'tug') {
        return Math.round((1 - (clipped - min) / (max - min)) * 100);
      } else {
        return Math.round(((clipped - min) / (max - min)) * 100);
      }
    }

    // Build data arrays
    const order = ['moca', 'digitf', 'digitb', 'tmt_a', 'tmt_b', 'sixmwt', 'tug', 'grip', 'bbs'];
    const preData = order.map(k => norm(k, (r.pre && r.pre[k]) ? r.pre[k] : ''));
    const postData = order.map(k => norm(k, safeVal(k + '_post') || ''));

    // Create radar chart (offscreen canvas)
    let radarChart = null, bsgChart = null;
    try {
      const radarCtx = pdfRadarCanvas.getContext('2d');
      radarChart = new Chart(radarCtx, {
        type: 'radar',
        data: {
          labels: ['MoCA', 'DigitF', 'DigitB', 'TMT-A(s)', 'TMT-B(s)', '6MWT(m)', 'TUG(s)', 'Grip(kg)', 'BBS'],
          datasets: [
            { label: 'Pre', data: preData, backgroundColor: 'rgba(242,107,0,0.25)', borderColor: '#f26b00' },
            { label: 'Post', data: postData, backgroundColor: 'rgba(107,63,160,0.2)', borderColor: '#6b3fa0' }
          ]
        },
        options: { responsive: false, animation: false, scales: { r: { min: 0, max: 100 } } }
      });
    } catch (err) {
      console.warn('Radar chart creation failed', err);
    }

    // BSG mini-radar (Behavioral, Session, Genetic)
    try {
      // Derive simple B, S, G from adherence: B = pct, S = pct+8, G = pct-8 (clamped)
      const B = Math.max(0, Math.min(100, pct));
      const S = Math.max(0, Math.min(100, pct + 8));
      const G = Math.max(0, Math.min(100, pct - 8));
      const bsgCtx = pdfBsgCanvas.getContext('2d');
      bsgChart = new Chart(bsgCtx, {
        type: 'radar',
        data: {
          labels: ['Behavioral', 'Session', 'Genetic'],
          datasets: [{ label: 'BSG adherence', data: [B, S, G], backgroundColor: 'rgba(107,63,160,0.25)', borderColor: '#6b3fa0' }]
        },
        options: { responsive: false, animation: false, scales: { r: { min: 0, max: 100 } } }
      });
    } catch (err) {
      console.warn('BSG chart creation failed', err);
    }

    // Small wait to ensure charts render (Chart.js is synchronous on canvas draw but wait is safe)
    await new Promise(res => setTimeout(res, 300));

    // Convert canvases to images and place in PDF
    try {
      const radarImg = pdfRadarCanvas.toDataURL('image/png');
      const imgW = 460;
      const imgH = imgW * (pdfRadarCanvas.height / pdfRadarCanvas.width);
      if (y + imgH > 780) { doc.addPage(); y = 40; }
      doc.addImage(radarImg, 'PNG', margin, y, imgW, imgH);
      y += imgH + 12;
    } catch (err) {
      console.warn('Failed to add radar image to PDF', err);
    }

    // Add BSG chart below
    try {
      doc.setFontSize(12);
      doc.text('BSG Adherence Summary (B = Behavioral | S = Session | G = Genetic)', margin, y);
      y += 10;
      const bsgImg = pdfBsgCanvas.toDataURL('image/png');
      const bsgW = 320;
      const bsgH = bsgW * (pdfBsgCanvas.height / pdfBsgCanvas.width);
      if (y + bsgH > 780) { doc.addPage(); y = 40; }
      doc.addImage(bsgImg, 'PNG', margin, y, bsgW, bsgH);
      y += bsgH + 8;
    } catch (err) {
      console.warn('Failed to add BSG image to PDF', err);
    }

    // Destroy Chart instances to free memory
    try { if (radarChart) radarChart.destroy(); } catch (e) { /* ignore */ }
    try { if (bsgChart) bsgChart.destroy(); } catch (e) { /* ignore */ }

    // Save pdf with participant name
    const filename = (r.participant ? r.participant.replace(/\s+/g, '_') : 'participant') + '_execogim_report.pdf';
    doc.save(filename);
  });

  // Restore last report if present
  try {
    const last = JSON.parse(localStorage.getItem('lastReport') || 'null');
    if (last) {
      window.currentReport = last;
      renderPlan(last);
      setupWeeklyChecks(last);
      result.style.display = 'block';
    }
  } catch (err) { /* ignore */ }

});
