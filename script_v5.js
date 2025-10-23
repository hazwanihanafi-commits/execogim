// =============================================
// EXECOGIM v9 — Clinical Exercise Prescription App
// =============================================

document.addEventListener("DOMContentLoaded", () => {
  const resultDiv = document.getElementById("result");
  const weeksDiv = document.getElementById("weeks");
  const adherenceBar = document.getElementById("adherenceBar");
  const adherencePct = document.getElementById("adherencePct");

  // --- Onboarding Close Button ---
  const onboardCard = document.querySelector(".card");
  const closeOnboard = document.getElementById("closeOnboard");
  if (closeOnboard && onboardCard) {
    closeOnboard.addEventListener("click", () => {
      onboardCard.style.transition = "opacity 0.4s ease";
      onboardCard.style.opacity = "0";
      setTimeout(() => onboardCard.style.display = "none", 400);
    });
  }

 // --- Normative references (General Adults) ---
const norms = {
  moca: "Normal: ≥26/30. Mild impairment: 18–25. Severe: <18. Lower scores indicate cognitive decline.",
  digitf: "Normal: 6–9 digits forward span. <6 indicates reduced attention or short-term memory.",
  digitb: "Normal: 4–8 digits backward span. <4 suggests weak working memory or executive function deficits.",
  tmt_a: "Normal: <40 sec (lower is better). 40–78 sec = borderline. >78 sec = impaired attention or processing speed.",
  tmt_b: "Normal: <90 sec (lower is better). 90–273 sec = borderline. >273 sec = poor cognitive flexibility or executive dysfunction.",
  sixmwt: "Normal: 400–700 m (varies by age & sex). <400 m = reduced aerobic capacity or functional limitation.",
  tug: "Normal: <10 sec (independent mobility). 10–13.5 sec = borderline. >13.5 sec = risk of falls or mobility impairment.",
  grip: "Normal: ≥30 kg (men), ≥20 kg (women). <26 kg (men) or <16 kg (women) = weak grip strength (sarcopenia risk).",
  bbs: "Normal: 50–56 = safe balance. 41–49 = low fall risk. <40 = high fall risk or poor postural control."
};

  // --- Info Modal ---
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");

  // --- Touch / Hover Info Button ---
document.querySelectorAll(".info-btn").forEach((btn) => {
  const showInfo = () => {
    const key = btn.dataset.key;
    modalTitle.textContent = key.toUpperCase();
    modalBody.textContent = norms[key] || "Reference data not available.";
    modalBackdrop.style.display = "flex";
  };

  // Support both hover (desktop) and touchstart (mobile)
  btn.addEventListener("mouseenter", showInfo);  // for desktop hover
  btn.addEventListener("touchstart", (e) => {
    e.preventDefault(); // prevent click conflict
    showInfo();
  }, { passive: true });
});

  modalClose.addEventListener("click", () => (modalBackdrop.style.display = "none"));
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) modalBackdrop.style.display = "none";
  });

  // --- Generate Plan Button ---
  const form = document.getElementById("inputForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      generatePlan();
    });
  }

  function generatePlan() {
    const participant = document.getElementById("participant_name").value || "Participant";
    const genotype = document.getElementById("genotype").value;
    const fitness = parseInt(document.getElementById("fitness_slider").value) || 3;
    const constraints = Array.from(document.querySelectorAll('input[name="constraint"]:checked')).map(c => c.value);

    const pre = {
      moca: +moca_pre.value || 0, digitf: +digitf_pre.value || 0, digitb: +digitb_pre.value || 0,
      tmt_a: +tmt_a_pre.value || 0, tmt_b: +tmt_b_pre.value || 0, sixmwt: +sixmwt_pre.value || 0,
      tug: +tug_pre.value || 0, grip: +grip_pre.value || 0, bbs: +bbs_pre.value || 0
    };

    const post = {
      moca: +moca_post.value || 0, digitf: +digitf_post.value || 0, digitb: +digitb_post.value || 0,
      tmt_a: +tmt_a_post.value || 0, tmt_b: +tmt_b_post.value || 0, sixmwt: +sixmwt_post.value || 0,
      tug: +tug_post.value || 0, grip: +grip_post.value || 0, bbs: +bbs_post.value || 0
    };

    // --- Genotype-specific template ---
    const template = genotype.toLowerCase().startsWith("val")
      ? { label: "Val/Val", sessions_per_week: 4, session_length: 30, intensity: "moderate-to-vigorous" }
      : { label: "Met carrier", sessions_per_week: 5, session_length: 40, intensity: "light-to-moderate" };

    if (fitness < 3) {
      template.sessions_per_week = Math.max(3, template.sessions_per_week - 1);
      template.session_length = Math.round(template.session_length * 0.9);
    }
    if (fitness > 3) {
      template.sessions_per_week += 1;
      template.session_length = Math.round(template.session_length * 1.1);
    }

    // --- 12-week plan generator ---
    const weeks = [];
    for (let wk = 1; wk <= 12; wk++) {
      const sessions = [];
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((d) => {
        let type = "Rest", dur = 0, cog = "";
        if (template.label === "Val/Val") {
          if (d === "Mon") { type = "HIIT"; dur = template.session_length; cog = "Reaction"; }
          else if (d === "Tue") { type = "Resistance"; dur = Math.round(template.session_length * 0.9); cog = "Random Cue"; }
          else if (d === "Wed") { type = "Skill/Dual-task"; dur = Math.round(template.session_length * 0.8); cog = "Coordination"; }
          else if (d === "Thu") { type = "Active Recovery"; dur = 20; cog = "Relaxation"; }
          else if (d === "Fri") { type = "Mixed Cardio-Strength"; dur = template.session_length; cog = "Focus"; }
          else if (d === "Sat") { type = "Optional Sport"; dur = 30; cog = "Strategy"; }
        } else {
          if (d === "Mon") { type = "Endurance (steady)"; dur = template.session_length; cog = "Memory"; }
          else if (d === "Tue") { type = "Strength+Balance"; dur = Math.round(template.session_length * 0.8); cog = "Attention"; }
          else if (d === "Wed") { type = "Adventure Mode"; dur = 20; cog = "Decision-making"; }
          else if (d === "Thu") { type = "Yoga/Tai Chi"; dur = 30; cog = "Mindfulness"; }
          else if (d === "Fri") { type = "Endurance intervals"; dur = template.session_length; cog = "Executive Function"; }
          else if (d === "Sat") { type = "Light aerobic + memory"; dur = 30; cog = "Memory Recall"; }
        }
        const prog = Math.floor((wk - 1) / 4) * 2;
const finalDuration = type === "Rest" ? 0 : dur + prog;
sessions.push({ day: d, type, duration_min: finalDuration, cognitive: cog, done: false });
      });
      weeks.push({ week: wk, sessions });
    }

    // --- Summary Table (Pre vs Post) ---
    const summaryTable = document.getElementById("summaryTable");
    if (summaryTable) {
      summaryTable.innerHTML = `
        <tr><th>Measure</th><th>Pre</th><th>Post</th><th>Change</th><th>Status</th></tr>`;
      Object.keys(pre).forEach(k => {
        const diff = post[k] - pre[k];
       if (diff > 0) status = "Improved";
      else if (diff < 0) status = "Worsened";
      else status = "No change";
        summaryTable.innerHTML += `
          <tr>
            <td>${k.toUpperCase()}</td>
            <td>${pre[k]}</td>
            <td>${post[k]}</td>
            <td>${diff > 0 ? "+" + diff : diff}</td>
            <td>${status}</td>
          </tr>`;
      });
    }

    // --- Render Plan ---
    window.currentReport = { participant, genotype, fitness, constraints, template, pre, post, weeks };
    renderPlan(window.currentReport);
    setupWeeklyChecks(window.currentReport);
    resultDiv.style.display = "block";
  }

  // --- Render Plan ---
function renderPlan(report) {
  document.getElementById("result-title").textContent = `${report.participant} — ${report.genotype}`;
  document.getElementById("summary").innerHTML = `
    <p><strong>Sessions/week:</strong> ${report.template.sessions_per_week} • 
    <strong>Session length:</strong> ${report.template.session_length} min • 
    <strong>Intensity:</strong> ${report.template.intensity}</p>
    <p class="instruction">✔️ <em>Tap any exercise once to mark it done — progress syncs automatically across sections.</em></p>`;

  weeksDiv.innerHTML = "";

  report.weeks.forEach((w, wi) => {
    const div = document.createElement("div");
    div.className = "week-card";
    div.innerHTML = `<strong>Week ${w.week}</strong><br>`;

    w.sessions.forEach((s, si) => {
      const btn = document.createElement("button");

      // ✅ Clean display: Hide duration/cognitive info on Rest days
      btn.textContent = s.type === "Rest"
        ? `${s.day}: Rest`
        : `${s.day}: ${s.type} — ${s.duration_min} min (${s.cognitive})`;

      btn.className = "day-btn";
      if (s.type === "Rest") btn.classList.add("rest");
      if (s.done) btn.classList.add("done");

      // ✅ Toggle + sync to Weekly Progress
      btn.onclick = () => {
        s.done = !s.done;
        btn.classList.toggle("done");
        syncWeeklyButton(wi, si, s.done);
        updateAdherence();
      };

      div.appendChild(btn);
    });

    weeksDiv.appendChild(div);
  });
}

// --- Weekly checks for adherence ---
function setupWeeklyChecks(report) {
  const container = document.getElementById("weeklyChecks");
  container.innerHTML = "";

  report.weeks.forEach((w, wi) => {
    const card = document.createElement("div");
    card.className = "week-card";

    const title = document.createElement("h4");
    title.textContent = `Week ${w.week}`;
    card.appendChild(title);

    const list = document.createElement("div");
    w.sessions.forEach((s, si) => {
      const btn = document.createElement("button");
      btn.textContent = s.day;
      btn.className = "day-btn";
      if (s.done) btn.classList.add("done");

      // ✅ Toggle + sync back to Exercise Plan
      btn.addEventListener("click", () => {
        s.done = !s.done;
        btn.classList.toggle("done");
        syncPlanButton(wi, si, s.done);
        updateAdherence();
      });

      list.appendChild(btn);
    });

    card.appendChild(list);
    container.appendChild(card);
  });
}

// --- Sync buttons between Exercise Plan and Weekly Progress ---
function syncPlanButton(weekIndex, sessionIndex, isDone) {
  const planWeeks = weeksDiv.querySelectorAll(".week-card");
  const targetWeek = planWeeks[weekIndex];
  if (!targetWeek) return;
  const targetButton = targetWeek.querySelectorAll(".day-btn")[sessionIndex];
  if (targetButton) {
    targetButton.classList.toggle("done", isDone);
  }
}

function syncWeeklyButton(weekIndex, sessionIndex, isDone) {
  const weekCards = document.getElementById("weeklyChecks").querySelectorAll(".week-card");
  const targetWeek = weekCards[weekIndex];
  if (!targetWeek) return;
  const targetButton = targetWeek.querySelectorAll(".day-btn")[sessionIndex];
  if (targetButton) {
    targetButton.classList.toggle("done", isDone);
  }
}

  // --- Adherence logic ---
function updateAdherence() {
  const r = window.currentReport;
  if (!r) return;

  let total = 0, done = 0;
  r.weeks.forEach((w) =>
    w.sessions.forEach((s) => {
      total++;
      if (s.done) done++;
    })
  );

  const pct = total ? Math.round((done / total) * 100) : 0;
  adherenceBar.style.width = pct + "%";
  adherencePct.textContent = `${done}/${total} sessions completed (${pct}%)`;
}

  // --- PDF Export ---
  document.getElementById("exportPdf").addEventListener("click", async () => {
    const r = window.currentReport;
    if (!r) { alert("Generate a plan first."); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 36;
    let y = 36;

    doc.setFontSize(14);
    doc.setTextColor(60, 22, 102);
    doc.text("Clinical Exercise Prescription Report", margin, y);
    y += 30;
    doc.setFontSize(11);
    doc.text(`Participant: ${r.participant}`, margin, y);
    doc.text(`Genotype: ${r.genotype}`, margin + 300, y);
    y += 20;
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y);
    y += 20;

   // --- Assessment Summary ---
const headers = [["Measure", "Pre", "Post", "Change", "Status"]];
const rows = [];
const lowerIsBetter = ["tmt_a", "tmt_b", "tug"];

Object.keys(r.pre).forEach(k => {
  const diff = r.post[k] - r.pre[k];
  let status = "No change";

  if (lowerIsBetter.includes(k)) {
    if (diff < 0) status = "\u2191 Improved";     // lower post = better
    else if (diff > 0) status = "\u2193 Worsened";
  } else {
    if (diff > 0) status = "\u2191 Improved";     // higher post = better
    else if (diff < 0) status = "\u2193 Worsened";
  }

  rows.push([k.toUpperCase(), r.pre[k], r.post[k], diff > 0 ? "+" + diff : diff, status]);
});
doc.autoTable({ startY: y, head: headers, body: rows, styles: { fontSize: 10 } });

    // --- Radar Chart (PDF only) ---
    const radarCanvas = document.createElement("canvas");
    radarCanvas.width = 500; radarCanvas.height = 500;
    const ctx = radarCanvas.getContext("2d");
    new Chart(ctx, {
      type: "radar",
      data: {
        labels: Object.keys(r.pre).map(k => k.toUpperCase()),
        datasets: [
          { label: "Pre", data: Object.values(r.pre), backgroundColor: "rgba(242,107,0,0.25)", borderColor: "#f26b00" },
          { label: "Post", data: Object.values(r.post), backgroundColor: "rgba(107,63,160,0.25)", borderColor: "#6b3fa0" }
        ]
      },
      options: { responsive: false, scales: { r: { beginAtZero: true } } }
    });
    await new Promise(res => setTimeout(res, 800));
    const img = radarCanvas.toDataURL("image/png");
    doc.addImage(img, "PNG", margin, y, 520, 320);
    y += 340;

    // --- Exercise Plan ---
const planHeaders = [["Week", "Day", "Type", "Duration (min)", "Cognitive Focus"]];
const planRows = [];

// ✅ Skip Rest sessions in the PDF for clarity
r.weeks.forEach(w => {
  w.sessions.forEach(s => {
    if (s.type !== "Rest") {
      planRows.push([`Week ${w.week}`, s.day, s.type, s.duration_min, s.cognitive]);
    }
  });
});

doc.autoTable({
  startY: y,
  head: planHeaders,
  body: planRows,
  styles: { fontSize: 9 }
});
y = doc.lastAutoTable.finalY + 20;

        // --- Adherence (for PDF export) ---
    const pdfTotal = r.weeks.reduce((sum, w) => sum + w.sessions.length, 0);
    const pdfDone = r.weeks.reduce((sum, w) => sum + w.sessions.filter(s => s.done).length, 0);
    const pdfPct = pdfTotal ? Math.round((pdfDone / pdfTotal) * 100) : 0;

    doc.setFontSize(11);
    doc.text(`Overall adherence: ${pdfDone}/${pdfTotal} sessions completed (${pdfPct}%)`, margin, y);

    // ✅ Save the PDF
    doc.save(`${r.participant.replace(/\s+/g, "_")}_report.pdf`);
  }); // ✅ close the PDF export function properly here


  // --- PWA Install Banner ---
  let deferredPrompt;
  const installContainer = document.getElementById("installContainer");
  const installBtn = document.getElementById("installBtn");

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installContainer) installContainer.style.display = "block";
  });

  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      installContainer.style.display = "none";
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`📲 User ${outcome}`);
      deferredPrompt = null;
    });
  }

  window.addEventListener("appinstalled", () => {
    console.log("✅ EXECOGIM installed");
    if (installContainer) installContainer.style.display = "none";
  });
});
