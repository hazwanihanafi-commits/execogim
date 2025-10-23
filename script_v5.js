// =============================================
// EXECOGIM v15 — FINAL (with full 12-week plan + adherence in PDF)
// =============================================

document.addEventListener("DOMContentLoaded", () => {
  const resultDiv = document.getElementById("result");
  const weeksDiv = document.getElementById("weeks");
  const adherenceBar = document.getElementById("adherenceBar");
  const adherencePct = document.getElementById("adherencePct");

  // ======================================================
  // GENERATE PLAN
  // ======================================================
  const form = document.getElementById("inputForm");
  if (form)
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      generatePlan();
    });

  function generatePlan() {
    const participant = document.getElementById("participant_name").value || "Participant";
    const genotype = document.getElementById("genotype").value || "Val/Val";
    const fitness = parseInt(document.getElementById("fitness_slider").value) || 3;

    const fitnessLevels = {
      1: "Low (Sedentary or limited activity)",
      2: "Below Average (Occasional exercise)",
      3: "Moderate (Active lifestyle)",
      4: "Good (Regular exerciser)",
      5: "Excellent (Highly active)",
    };

    const genotypeInfo = genotype.toLowerCase().startsWith("val")
      ? "Val/Val — Higher BDNF expression, responds better to high-intensity exercise."
      : "Met carrier — Lower BDNF expression, benefits more from consistent light-to-moderate exercise.";

    const pre = getValues("pre");
    const post = getValues("post");
    const lowerIsBetter = ["tmt_a", "tmt_b", "tug"];

    // --- Summary Table ---
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

    // --- Template ---
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

    // --- 12-week plan ---
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
          else if (d === "Fri") { type = "Endurance Intervals"; dur = template.session_length; cog = "Executive Function"; }
          else if (d === "Sat") { type = "Light Aerobic + Memory"; dur = 30; cog = "Memory Recall"; }
        }
        const prog = Math.floor((wk - 1) / 4) * 2;
        sessions.push({ day: d, type, duration_min: Math.round(dur + prog), cognitive: cog, done: false });
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
      <p class="instruction">✔️ Tap any exercise to mark it done — progress updates automatically.</p>`;
    weeksDiv.innerHTML = "";
    report.weeks.forEach((w) => {
      const div = document.createElement("div");
      div.className = "week-card";
      div.innerHTML = `<strong>Week ${w.week}</strong><br>`;
      w.sessions.forEach((s) => {
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
  // UTILITY FUNCTIONS
  // ======================================================
  function getValues(type) {
    const ids = ["moca", "digitf", "digitb", "tmt_a", "tmt_b", "sixmwt", "tug", "grip", "bbs"];
    const res = {};
    ids.forEach((id) => (res[id] = parseFloat(document.getElementById(`${id}_${type}`).value) || 0));
    return res;
  }

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
  // PDF EXPORT (includes summary, radar, adherence, and 12-week plan)
  // ======================================================
  document.getElementById("exportPdf").addEventListener("click", async () => {
    const r = window.currentReport;
    if (!r) return alert("Generate a plan first.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 36;
    let y = 36;

    // --- HEADER ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Clinical Exercise Prescription Report", margin, y);
    y += 24;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Participant: ${r.participant}`, margin, y);
    doc.text(`Genotype: ${r.genotype}`, margin + 300, y);
    y += 20;
    doc.text(`Fitness Level: ${r.fitnessLevels[r.fitness]}`, margin, y);
    y += 20;
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y);
    y += 25;

    // --- PLAN SUMMARY ---
    doc.setFontSize(11);
    doc.text(`Sessions/week: ${r.template.sessions_per_week} | Session length: ${Math.round(r.template.session_length)} min | Intensity: ${r.template.intensity}`, margin, y);
    y += 16;
    doc.text(`Genotype Info: ${r.genotypeInfo}`, margin, y);
    y += 20;

    // --- ASSESSMENT TABLE ---
    const headers = [["Measure", "Pre", "Post", "Change", "Status"]];
    const rows = [];
    const lowerIsBetter = ["tmt_a", "tmt_b", "tug"];
    Object.keys(r.pre).forEach((k) => {
      const diff = r.post[k] - r.pre[k];
      let status = "No change";
      if (lowerIsBetter.includes(k)) {
        if (diff < 0) status = "Improved";
        else if (diff > 0) status = "Worsened";
      } else {
        if (diff > 0) status = "Improved";
        else if (diff < 0) status = "Worsened";
      }
      rows.push([k.toUpperCase(), r.pre[k], r.post[k], diff > 0 ? "+" + diff : diff, status]);
    });

    doc.autoTable({ startY: y, head: headers, body: rows, theme: "grid", headStyles: { fillColor: [60, 22, 102], textColor: 255 } });
    y = doc.lastAutoTable.finalY + 30;

    // --- ADHERENCE SUMMARY ---
    const total = r.weeks.reduce((s, w) => s + w.sessions.length, 0);
    const done = r.weeks.reduce((s, w) => s + w.sessions.filter((x) => x.done).length, 0);
    const pct = Math.round((done / total) * 100);
    doc.text(`Overall Adherence: ${done}/${total} sessions completed (${pct}%)`, margin, y);
    y += 20;

    // --- 12-WEEK PLAN TABLE ---
    const planRows = [];
    r.weeks.forEach((w) => {
      w.sessions.forEach((s) => {
        planRows.push([`Week ${w.week}`, s.day, s.type, s.duration_min, s.cognitive, s.done ? "Done" : "Pending"]);
      });
    });

    doc.autoTable({
      startY: y,
      head: [["Week", "Day", "Exercise Type", "Duration (min)", "Cognitive Focus", "Status"]],
      body: planRows,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [107, 63, 160], textColor: 255 },
    });

    doc.save(`${r.participant.replace(/\s+/g, "_")}_EXECOGIM_Report.pdf`);
  });

  // ======================================================
  // EXCEL EXPORT
  // ======================================================
  document.getElementById("downloadXlsx").addEventListener("click", () => {
    const r = window.currentReport;
    if (!r) return alert("Generate a plan first.");
    const wb = XLSX.utils.book_new();
    const data = [["Week", "Day", "Type", "Duration (min)", "Cognitive Task", "Done"]];
    r.weeks.forEach((w) =>
      w.sessions.forEach((s) => {
        data.push([`Week ${w.week}`, s.day, s.type, s.duration_min, s.cognitive, s.done ? "Yes" : "No"]);
      })
    );
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Exercise Plan");
    XLSX.writeFile(wb, `${r.participant.replace(/\s+/g, "_")}_EXECOGIM.xlsx`);
  });
});
