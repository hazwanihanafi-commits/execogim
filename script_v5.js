// =============================================
// EXECOGIM v11 — Clinical Exercise Prescription App (FULLY FIXED + PWA)
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
      setTimeout(() => (onboardCard.style.display = "none"), 400);
    });
  }

  // --- Normative references ---
  const norms = {
    moca: "Montreal Cognitive Assessment — evaluates global cognition. Normal ≥26/30.",
    digitf: "Digit Span Forward — measures attention and immediate recall. Normal 6–9 digits.",
    digitb: "Digit Span Backward — measures working memory. Normal 4–8 digits.",
    tmt_a: "Trail Making Test A — visual attention & processing speed. Lower time = better.",
    tmt_b: "Trail Making Test B — cognitive flexibility & sequencing. Lower time = better.",
    sixmwt: "Six-Minute Walk Test — aerobic endurance. Normal 400–700 m, varies by age/sex.",
    tug: "Timed Up and Go — mobility & balance. Normal <10 s. >13.5 s = fall risk.",
    grip: "Handgrip Strength — upper-limb strength. Normal ≥30 kg (men), ≥20 kg (women).",
    bbs: "Berg Balance Scale — balance/stability. 50–56 = good, <45 = fall risk."
  };

  // --- Auto-hint text below inputs ---
  Object.keys(norms).forEach((key) => {
    const input = document.getElementById(`${key}_pre`);
    if (input && !input.nextElementSibling?.classList.contains("hint")) {
      const hint = document.createElement("small");
      hint.textContent = norms[key];
      hint.className = "hint";
      hint.style.display = "block";
      hint.style.fontSize = "0.8em";
      hint.style.color = "#666";
      hint.style.marginBottom = "6px";
      input.insertAdjacentElement("afterend", hint);
    }
  });

  // --- Info Modal Setup ---
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");

  // Attach modal listener after DOM loaded
  function initInfoButtons() {
    document.querySelectorAll(".info-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const key = btn.dataset.key;
        modalTitle.textContent = key ? key.toUpperCase() : "Info";
        modalBody.textContent = norms[key] || "Reference data not available.";
        modalBackdrop.style.display = "flex";
      });
    });
  }

  modalClose.addEventListener("click", () => (modalBackdrop.style.display = "none"));
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) modalBackdrop.style.display = "none";
  });

  // ======================================================
  // FORM SUBMISSION: Generate Plan
  // ======================================================
  const form = document.getElementById("inputForm");
  if (form)
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      generatePlan();
    });

  // ======================================================
  // GENERATE PLAN FUNCTION
  // ======================================================
  function generatePlan() {
    const participant = document.getElementById("participant_name").value || "Participant";
    const genotype = document.getElementById("genotype").value || "Val/Val";
    const fitness = parseInt(document.getElementById("fitness_slider").value) || 3;

    const fitnessLevels = {
      1: "Low (Sedentary or limited activity)",
      2: "Below Average (Occasional exercise)",
      3: "Moderate (Active lifestyle)",
      4: "Good (Regular exerciser)",
      5: "Excellent (Highly active)"
    };

    const genotypeInfo = genotype.toLowerCase().startsWith("val")
      ? "Val/Val — Higher BDNF expression, responds better to high-intensity exercise."
      : "Met carrier — Lower BDNF expression, benefits more from consistent moderate exercise.";

    const pre = getValues("pre");
    const post = getValues("post");
    const lowerIsBetter = ["tmt_a", "tmt_b", "tug"];

    // Summary Table
    const summaryTable = document.getElementById("summaryTable");
    summaryTable.innerHTML =
      "<tr><th>Measure</th><th>Pre</th><th>Post</th><th>Change</th><th>Status</th></tr>";

    Object.keys(pre).forEach((k) => {
      const diff = post[k] - pre[k];
      let status = "No change";
      if (lowerIsBetter.includes(k)) {
        if (diff < 0) status = `<span style='color:green;'>Improved</span>`;
        else if (diff > 0) status = `<span style='color:red;'>Worsened</span>`;
      } else {
        if (diff > 0) status = `<span style='color:green;'>Improved</span>`;
        else if (diff < 0) status = `<span style='color:red;'>Worsened</span>`;
      }
      summaryTable.innerHTML += `
        <tr>
          <td>${k.toUpperCase()}</td>
          <td>${pre[k]}</td>
          <td>${post[k]}</td>
          <td>${diff > 0 ? "+" + diff : diff}</td>
          <td>${status}</td>
        </tr>`;
    });

    // Template logic
    const template = genotype.toLowerCase().startsWith("val")
      ? { label: "Val/Val", sessions_per_week: 4, session_length: 30, intensity: "moderate-to-vigorous" }
      : { label: "Met carrier", sessions_per_week: 5, session_length: 40, intensity: "light-to-moderate" };

    if (fitness < 3) {
      template.sessions_per_week = Math.max(3, template.sessions_per_week - 1);
      template.session_length *= 0.9;
    } else if (fitness > 3) {
      template.sessions_per_week += 1;
      template.session_length *= 1.1;
    }

    // Generate 12-week plan
    const weeks = [];
    for (let wk = 1; wk <= 12; wk++) {
      const sessions = [];
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((d) => {
        let type = "Rest", dur = 0, cog = "";
        if (template.label === "Val/Val") {
          if (d === "Mon") { type = "HIIT"; dur = template.session_length; cog = "Reaction"; }
          else if (d === "Tue") { type = "Resistance"; dur = template.session_length * 0.9; cog = "Random Cue"; }
          else if (d === "Wed") { type = "Skill/Dual-task"; dur = template.session_length * 0.8; cog = "Coordination"; }
          else if (d === "Thu") { type = "Active Recovery"; dur = 20; cog = "Relaxation"; }
          else if (d === "Fri") { type = "Mixed Cardio-Strength"; dur = template.session_length; cog = "Focus"; }
          else if (d === "Sat") { type = "Optional Sport"; dur = 30; cog = "Strategy"; }
        } else {
          if (d === "Mon") { type = "Endurance (steady)"; dur = template.session_length; cog = "Memory"; }
          else if (d === "Tue") { type = "Strength+Balance"; dur = template.session_length * 0.8; cog = "Attention"; }
          else if (d === "Wed") { type = "Adventure Mode"; dur = 20; cog = "Decision-making"; }
          else if (d === "Thu") { type = "Yoga/Tai Chi"; dur = 30; cog = "Mindfulness"; }
          else if (d === "Fri") { type = "Endurance intervals"; dur = template.session_length; cog = "Executive Function"; }
          else if (d === "Sat") { type = "Light aerobic + memory"; dur = 30; cog = "Memory Recall"; }
        }
        const prog = Math.floor((wk - 1) / 4) * 2;
        const finalDur = Math.round(dur + prog);
        sessions.push({ day: d, type, duration_min: finalDur, cognitive: cog, done: false });
      });
      weeks.push({ week: wk, sessions });
    }

    window.currentReport = { participant, genotype, fitness, genotypeInfo, fitnessLevels, template, pre, post, weeks };
    renderPlan(window.currentReport);
    resultDiv.style.display = "block";
  }

  // ======================================================
  // RENDER PLAN
  // ======================================================
  function renderPlan(report) {
    document.getElementById("result-title").textContent = `${report.participant} — ${report.genotype}`;
    document.getElementById("summary").innerHTML = `
      <p><strong>Sessions/week:</strong> ${report.template.sessions_per_week} • 
      <strong>Session length:</strong> ${Math.round(report.template.session_length)} min • 
      <strong>Intensity:</strong> ${report.template.intensity}</p>
      <p><strong>Genotype Info:</strong> ${report.genotypeInfo}</p>
      <p><strong>Fitness Level:</strong> ${report.fitnessLevels[report.fitness]}</p>
      <p class="instruction">✔️ Tap any exercise to mark it done — progress syncs automatically.</p>`;

    weeksDiv.innerHTML = "";
    weeksDiv.style.display = "flex";
    report.weeks.forEach((w) => {
      const div = document.createElement("div");
      div.className = "week-card";
      div.innerHTML = `<strong>Week ${w.week}</strong><br>`;
      w.sessions.forEach((s) => {
        const btn = document.createElement("button");
        btn.textContent = s.type === "Rest"
          ? `${s.day}: Rest`
          : `${s.day}: ${s.type} — ${s.duration_min} min (${s.cognitive})`;
        btn.className = "day-btn";
        if (s.done) btn.classList.add("done");
        btn.addEventListener("click", () => {
          s.done = !s.done;
          btn.classList.toggle("done");
          updateAdherence();
        });
        div.appendChild(btn);
      });
      weeksDiv.appendChild(div);
    });
  }

  // ======================================================
  // HELPER: Get Pre/Post Values
  // ======================================================
  function getValues(type) {
    const ids = ["moca", "digitf", "digitb", "tmt_a", "tmt_b", "sixmwt", "tug", "grip", "bbs"];
    const result = {};
    ids.forEach((id) => {
      result[id] = parseFloat(document.getElementById(`${id}_${type}`).value) || 0;
    });
    return result;
  }

  // ======================================================
  // ADHERENCE BAR
  // ======================================================
  function updateAdherence() {
    const r = window.currentReport;
    if (!r) return;
    let total = 0, done = 0;
    r.weeks.forEach((w) => w.sessions.forEach((s) => { total++; if (s.done) done++; }));
    const pct = total ? Math.round((done / total) * 100) : 0;
    adherenceBar.style.width = `${pct}%`;
    adherencePct.textContent = `${pct}% completed`;
  }

  // ======================================================
  // INIT INFO BUTTONS (after everything loaded)
  // ======================================================
  initInfoButtons();

  // ======================================================
  // PWA INSTALL SUPPORT
  // ======================================================
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
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    });
  }

  window.addEventListener("appinstalled", () => {
    if (installContainer) installContainer.style.display = "none";
  });
});
