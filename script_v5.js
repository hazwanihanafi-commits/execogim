// =============================================
// EXECOGIM v9 — Clinical Exercise Prescription App (FINAL + PWA ENABLED)
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
    tmt_a: "Trail Making Test A — measures visual attention and processing speed. Lower time = better.",
    tmt_b: "Trail Making Test B — measures cognitive flexibility and sequencing. Lower time = better.",
    sixmwt: "Six-Minute Walk Test — evaluates aerobic endurance. Normal 400–700 m, varies by age and sex.",
    tug: "Timed Up and Go Test — measures mobility and balance. Normal <10 s. >13.5 s = fall risk.",
    grip: "Handgrip Strength — assesses upper-limb strength. Normal ≥30 kg (men), ≥20 kg (women).",
    bbs: "Berg Balance Scale — evaluates balance and stability. 50–56 = good, <45 = fall risk."
  };

  // --- Info Modal (tap/hover) ---
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalClose = document.getElementById("modalClose");

  document.querySelectorAll(".info-btn").forEach((btn) => {
    const showInfo = () => {
      const key = btn.dataset.key;
      modalTitle.textContent = key ? key.toUpperCase() : "Info";
      modalBody.textContent = norms[key] || "Reference data not available.";
      modalBackdrop.style.display = "flex";
    };
    btn.addEventListener("mouseenter", showInfo);
    btn.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        showInfo();
      },
      { passive: false }
    );
  });

  modalClose.addEventListener("click", () => (modalBackdrop.style.display = "none"));
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) modalBackdrop.style.display = "none";
  });

  // --- Generate Plan ---
  const form = document.getElementById("inputForm");
  if (form) form.addEventListener("submit", (e) => {
    e.preventDefault();
    generatePlan();
  });

  // ======================================================
  // FUNCTION: GENERATE PLAN
  // ======================================================
  function generatePlan() {
    const participant = document.getElementById("participant_name").value || "Participant";
    const genotype = document.getElementById("genotype").value || "Val/Val";
    const fitness = parseInt(document.getElementById("fitness_slider").value) || 3;
    const constraints = Array.from(
      document.querySelectorAll('input[name="constraint"]:checked')
    ).map((c) => c.value);

    // --- Fitness Level Info ---
    const fitnessLevels = {
      1: "Low (Sedentary or limited activity)",
      2: "Below Average (Occasional exercise)",
      3: "Moderate (Active lifestyle)",
      4: "Good (Regular exerciser)",
      5: "Excellent (Athletic/highly active)"
    };

    // --- Genotype explanation ---
    const genotypeInfo = genotype.toLowerCase().startsWith("val")
      ? "Val/Val — Higher BDNF expression, responds better to high-intensity exercise."
      : "Met carrier — Lower BDNF expression, benefits more from consistent light-to-moderate activity.";

    // --- Pre and Post values ---
    const pre = {
      moca: +moca_pre.value || 0,
      digitf: +digitf_pre.value || 0,
      digitb: +digitb_pre.value || 0,
      tmt_a: +tmt_a_pre.value || 0,
      tmt_b: +tmt_b_pre.value || 0,
      sixmwt: +sixmwt_pre.value || 0,
      tug: +tug_pre.value || 0,
      grip: +grip_pre.value || 0,
      bbs: +bbs_pre.value || 0
    };
    const post = {
      moca: +moca_post.value || 0,
      digitf: +digitf_post.value || 0,
      digitb: +digitb_post.value || 0,
      tmt_a: +tmt_a_post.value || 0,
      tmt_b: +tmt_b_post.value || 0,
      sixmwt: +sixmwt_post.value || 0,
      tug: +tug_post.value || 0,
      grip: +grip_post.value || 0,
      bbs: +bbs_post.value || 0
    };

    const lowerIsBetter = ["tmt_a", "tmt_b", "tug"];

    // --- Summary Table (on screen) ---
    const summaryTable = document.getElementById("summaryTable");
    if (summaryTable) {
      summaryTable.innerHTML =
        `<tr><th>Measure</th><th>Pre</th><th>Post</th><th>Change</th><th>Status</th></tr>`;
      Object.keys(pre).forEach((k) => {
        const diff = post[k] - pre[k];
        let status = "No change";
        if (lowerIsBetter.includes(k)) {
          if (diff < 0) status = `<span style="color:green;">Improved</span>`;
          else if (diff > 0) status = `<span style="color:red;">Worsened</span>`;
        } else {
          if (diff > 0) status = `<span style="color:green;">Improved</span>`;
          else if (diff < 0) status = `<span style="color:red;">Worsened</span>`;
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
    }

    // --- Genotype template ---
    const template = genotype.toLowerCase().startsWith("val")
      ? {
          label: "Val/Val",
          sessions_per_week: 4,
          session_length: 30,
          intensity: "moderate-to-vigorous"
        }
      : {
          label: "Met carrier",
          sessions_per_week: 5,
          session_length: 40,
          intensity: "light-to-moderate"
        };

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
          if (d === "Mon") { type="HIIT"; dur=template.session_length; cog="Reaction"; }
          else if (d==="Tue"){ type="Resistance"; dur=Math.round(template.session_length*0.9); cog="Random Cue"; }
          else if (d==="Wed"){ type="Skill/Dual-task"; dur=Math.round(template.session_length*0.8); cog="Coordination"; }
          else if (d==="Thu"){ type="Active Recovery"; dur=20; cog="Relaxation"; }
          else if (d==="Fri"){ type="Mixed Cardio-Strength"; dur=template.session_length; cog="Focus"; }
          else if (d==="Sat"){ type="Optional Sport"; dur=30; cog="Strategy"; }
        } else {
          if (d==="Mon"){ type="Endurance (steady)"; dur=template.session_length; cog="Memory"; }
          else if (d==="Tue"){ type="Strength+Balance"; dur=Math.round(template.session_length*0.8); cog="Attention"; }
          else if (d==="Wed"){ type="Adventure Mode"; dur=20; cog="Decision-making"; }
          else if (d==="Thu"){ type="Yoga/Tai Chi"; dur=30; cog="Mindfulness"; }
          else if (d==="Fri"){ type="Endurance intervals"; dur=template.session_length; cog="Executive Function"; }
          else if (d==="Sat"){ type="Light aerobic + memory"; dur=30; cog="Memory Recall"; }
        }
        const prog = Math.floor((wk - 1) / 4) * 2;
        const finalDuration = type === "Rest" ? 0 : dur + prog;
        sessions.push({ day: d, type, duration_min: finalDuration, cognitive: cog, done: false });
      });
      weeks.push({ week: wk, sessions });
    }

    window.currentReport = { participant, genotype, fitness, constraints, template, pre, post, weeks, genotypeInfo, fitnessLevels };
    renderPlan(window.currentReport, fitnessLevels, genotypeInfo);
    setupWeeklyChecks(window.currentReport);
    resultDiv.style.display = "block";
  }

  // ======================================================
  // FUNCTION: RENDER PLAN
  // ======================================================
  function renderPlan(report, fitnessLevels, genotypeInfo) {
    document.getElementById("result-title").textContent = `${report.participant} — ${report.genotype}`;
    document.getElementById("summary").innerHTML = `
      <p><strong>Sessions/week:</strong> ${report.template.sessions_per_week} • 
      <strong>Session length:</strong> ${report.template.session_length} min • 
      <strong>Intensity:</strong> ${report.template.intensity}</p>
      <p><strong>Genotype Info:</strong> ${report.genotypeInfo}</p>
      <p><strong>Fitness Level:</strong> ${report.fitnessLevels[report.fitness]}</p>
      <p class="instruction">✔️ Tap any exercise once to mark it done — progress syncs automatically.</p>`;

    weeksDiv.innerHTML = "";
    report.weeks.forEach((w, wi) => {
      const div = document.createElement("div");
      div.className = "week-card";
      div.innerHTML = `<strong>Week ${w.week}</strong><br>`;
      w.sessions.forEach((s, si) => {
        const btn = document.createElement("button");
        btn.textContent =
          s.type === "Rest"
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
// FUNCTION: SETUP WEEKLY CHECKS (Save & Restore Progress)
// ======================================================
function setupWeeklyChecks(report) {
  // Load existing data from localStorage
  const saved = localStorage.getItem("execogim_progress");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      report.weeks.forEach((w, wi) => {
        w.sessions.forEach((s, si) => {
          if (parsed[wi]?.[si]) s.done = true;
        });
      });
    } catch (e) {
      console.error("Error parsing saved progress:", e);
    }
  }

  // Save progress automatically on every change
  updateAdherence = function () {
    const data = report.weeks.map((w) =>
      w.sessions.map((s) => (s.done ? 1 : 0))
    );
    localStorage.setItem("execogim_progress", JSON.stringify(data));

    const total = report.weeks.reduce(
      (sum, w) => sum + w.sessions.length,
      0
    );
    const done = report.weeks.reduce(
      (sum, w) => sum + w.sessions.filter((s) => s.done).length,
      0
    );
    const pct = Math.round((done / total) * 100);
    adherenceBar.style.width = `${pct}%`;
    adherencePct.textContent = `${pct}%`;
  };

  // Initialize progress bar
  updateAdherence();
}

 // ======================================================
// PDF EXPORT (with Radar Chart + Summary)
// ======================================================
const pdfBtn = document.getElementById("exportPdf");
if (pdfBtn) {
  pdfBtn.addEventListener("click", async () => {
    const r = window.currentReport;
    if (!r) return alert("Generate a plan first.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 36;
    let y = 36;

    // --- Header ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(60, 22, 102);
    doc.text("Clinical Exercise Prescription Report", margin, y);
    y += 28;

    // --- Participant Info ---
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Participant: ${r.participant}`, margin, y);
    doc.text(`Genotype: ${r.genotype}`, margin + 300, y);
    y += 20;
    doc.text(`Fitness Level: ${r.fitnessLevels[r.fitness]}`, margin, y);
    y += 20;
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 25;

    // --- Assessment Table ---
    const headers = [["Measure", "Pre", "Post", "Change", "Status"]];
    const rows = [];
    const lowerIsBetter = ["tmt_a", "tmt_b", "tug"];
    const fullNames = {
      moca: "Montreal Cognitive Assessment (MoCA)",
      digitf: "Digit Span Forward (DigitF)",
      digitb: "Digit Span Backward (DigitB)",
      tmt_a: "Trail Making Test A (TMT-A)",
      tmt_b: "Trail Making Test B (TMT-B)",
      sixmwt: "Six-Minute Walk Test (6MWT)",
      tug: "Timed Up and Go Test (TUG)",
      grip: "Handgrip Strength (Grip)",
      bbs: "Berg Balance Scale (BBS)"
    };

    Object.keys(r.pre).forEach((k) => {
      const diff = r.post[k] - r.pre[k];
      let status = "No change";
      if (lowerIsBetter.includes(k)) {
        if (diff < 0) status = "Improved (lower = better)";
        else if (diff > 0) status = "Worsened (higher = slower)";
      } else {
        if (diff > 0) status = "Improved (higher = better)";
        else if (diff < 0) status = "Worsened (lower = decline)";
      }
      rows.push([
        fullNames[k] || k.toUpperCase(),
        r.pre[k],
        r.post[k],
        diff > 0 ? "+" + diff : diff,
        status
      ]);
    });

    doc.autoTable({
      startY: y,
      head: headers,
      body: rows,
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: { 0: { cellWidth: 190 } },
      headStyles: { fillColor: [60, 22, 102], textColor: 255, fontStyle: "bold" }
    });

    y = doc.lastAutoTable.finalY + 30;

    // ======================================================
    // RADAR CHART (Cognitive vs Physical)
    // ======================================================
    const radarCanvas = document.getElementById("radarChart");
    const ctxRadar = radarCanvas.getContext("2d");

    // Create radar chart dynamically
    const radarChart = new Chart(ctxRadar, {
      type: "radar",
      data: {
        labels: ["MoCA", "DigitF", "DigitB", "6MWT", "TUG", "Grip", "BBS"],
        datasets: [
          {
            label: "Pre",
            data: [
              r.pre.moca,
              r.pre.digitf,
              r.pre.digitb,
              r.pre.sixmwt,
              r.pre.tug,
              r.pre.grip,
              r.pre.bbs
            ],
            borderWidth: 2,
            borderColor: "rgba(255,99,132,0.9)",
            backgroundColor: "rgba(255,99,132,0.2)"
          },
          {
            label: "Post",
            data: [
              r.post.moca,
              r.post.digitf,
              r.post.digitb,
              r.post.sixmwt,
              r.post.tug,
              r.post.grip,
              r.post.bbs
            ],
            borderWidth: 2,
            borderColor: "rgba(54,162,235,0.9)",
            backgroundColor: "rgba(54,162,235,0.2)"
          }
        ]
      },
      options: {
        responsive: false,
        scales: { r: { min: 0, grid: { color: "rgba(0,0,0,0.1)" } } },
        plugins: { legend: { position: "top" } }
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 500)); // wait for chart draw

    const radarImg = radarCanvas.toDataURL("image/png", 1.0);
    doc.addImage(radarImg, "PNG", margin, y, 520, 400);
    radarChart.destroy();

    y += 420;

    // ======================================================
    // ADHERENCE SUMMARY
    // ======================================================
    const total = r.weeks.reduce((sum, w) => sum + w.sessions.length, 0);
    const done = r.weeks.reduce(
      (sum, w) => sum + w.sessions.filter((s) => s.done).length,
      0
    );
    const pct = Math.round((done / total) * 100);

    doc.setFontSize(12);
    doc.text(
      `Adherence Summary: ${done}/${total} sessions completed (${pct}%)`,
      margin,
      y + 20
    );

    // --- Save PDF ---
    doc.save(`${r.participant.replace(/\s+/g, "_")}_report.pdf`);
  });
}

// ======================================================
// EXCEL EXPORT (.xlsx)
// ======================================================
const xlsxBtn = document.getElementById("downloadXlsx");
if (xlsxBtn) {
  xlsxBtn.addEventListener("click", () => {
    const r = window.currentReport;
    if (!r) return alert("Generate a plan first before downloading Excel.");

    // Prepare worksheet data
    const sheetData = [
      ["Clinical Exercise Prescription Report"],
      ["Participant", r.participant],
      ["Genotype", r.genotype],
      ["Fitness Level", r.fitnessLevels[r.fitness]],
      ["Generated On", new Date().toLocaleString()],
      [],
      ["Assessment Summary (Pre vs Post)"],
      ["Measure", "Pre", "Post", "Change", "Status"]
    ];

    const lowerIsBetter = ["tmt_a", "tmt_b", "tug"];
    const fullNames = {
      moca: "Montreal Cognitive Assessment (MoCA)",
      digitf: "Digit Span Forward (DigitF)",
      digitb: "Digit Span Backward (DigitB)",
      tmt_a: "Trail Making Test A (TMT-A)",
      tmt_b: "Trail Making Test B (TMT-B)",
      sixmwt: "Six-Minute Walk Test (6MWT)",
      tug: "Timed Up and Go Test (TUG)",
      grip: "Handgrip Strength (Grip)",
      bbs: "Berg Balance Scale (BBS)"
    };

    Object.keys(r.pre).forEach((k) => {
      const diff = r.post[k] - r.pre[k];
      let status = "No change";
      if (lowerIsBetter.includes(k)) {
        if (diff < 0) status = "Improved (lower = better)";
        else if (diff > 0) status = "Worsened (higher = slower)";
      } else {
        if (diff > 0) status = "Improved (higher = better)";
        else if (diff < 0) status = "Worsened (lower = decline)";
      }
      sheetData.push([
        fullNames[k] || k.toUpperCase(),
        r.pre[k],
        r.post[k],
        diff > 0 ? "+" + diff : diff,
        status
      ]);
    });

    sheetData.push([]);
    sheetData.push(["12-Week Exercise Plan"]);
    sheetData.push(["Week", "Day", "Type", "Duration (min)", "Cognitive Task", "Completed"]);

    r.weeks.forEach((w) => {
      w.sessions.forEach((s) => {
        sheetData.push([
          w.week,
          s.day,
          s.type,
          s.duration_min,
          s.cognitive,
          s.done ? "Yes" : "No"
        ]);
      });
    });

    // Create workbook and sheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, "Exercise Plan");

    // Export Excel file
    XLSX.writeFile(
      wb,
      `${r.participant.replace(/\s+/g, "_")}_EXECOGIM_Report.xlsx`
    );
  });
}

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
