// =============================================
// EXECOGIM v13 — FINAL (No Info Buttons + Descriptions Under Labels + Graph in PDF)
// =============================================

document.addEventListener("DOMContentLoaded", () => {
  const resultDiv = document.getElementById("result");
  const weeksDiv = document.getElementById("weeks");
  const adherenceBar = document.getElementById("adherenceBar");
  const adherencePct = document.getElementById("adherencePct");

  // --- Normative references ---
  const norms = {
    moca: "Montreal Cognitive Assessment — evaluates global cognition. Normal ≥26/30.",
    digitf: "Digit Span Forward — measures attention and immediate recall. Normal 6–9 digits.",
    digitb: "Digit Span Backward — measures working memory. Normal 4–8 digits.",
    tmt_a: "Trail Making Test A — visual attention & processing speed. Lower time = better.",
    tmt_b: "Trail Making Test B — cognitive flexibility & sequencing. Lower time = better.",
    sixmwt: "Six-Minute Walk Test — aerobic endurance. Normal 400–700 m.",
    tug: "Timed Up and Go — mobility & balance. Normal <10 s; >13.5 s = fall risk.",
    grip: "Handgrip Strength — upper-limb strength. Normal ≥30 kg (men), ≥20 kg (women).",
    bbs: "Berg Balance Scale — balance & stability. 50–56 = good, <45 = fall risk."
  };

  // --- Place description directly under each label ---
  Object.keys(norms).forEach((key) => {
    const label = document.querySelector(`label[for="${key}_pre"]`);
    if (label && !label.nextElementSibling?.classList.contains("desc")) {
      const desc = document.createElement("small");
      desc.textContent = norms[key];
      desc.className = "desc";
      desc.style.display = "block";
      desc.style.fontSize = "0.8em";
      desc.style.color = "#666";
      desc.style.margin = "2px 0 6px 0";
      label.insertAdjacentElement("afterend", desc);
    }
  });

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
      5: "Excellent (Highly active)"
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
      ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].forEach((d) => {
        let type="Rest",dur=0,cog="";
        if (template.label==="Val/Val"){
          if(d==="Mon"){type="HIIT";dur=template.session_length;cog="Reaction";}
          else if(d==="Tue"){type="Resistance";dur=template.session_length*0.9;cog="Random Cue";}
          else if(d==="Wed"){type="Skill/Dual-task";dur=template.session_length*0.8;cog="Coordination";}
          else if(d==="Thu"){type="Active Recovery";dur=20;cog="Relaxation";}
          else if(d==="Fri"){type="Mixed Cardio-Strength";dur=template.session_length;cog="Focus";}
          else if(d==="Sat"){type="Optional Sport";dur=30;cog="Strategy";}
        } else {
          if(d==="Mon"){type="Endurance (steady)";dur=template.session_length;cog="Memory";}
          else if(d==="Tue"){type="Strength+Balance";dur=template.session_length*0.8;cog="Attention";}
          else if(d==="Wed"){type="Adventure Mode";dur=20;cog="Decision-making";}
          else if(d==="Thu"){type="Yoga/Tai Chi";dur=30;cog="Mindfulness";}
          else if(d==="Fri"){type="Endurance intervals";dur=template.session_length;cog="Executive Function";}
          else if(d==="Sat"){type="Light aerobic + memory";dur=30;cog="Memory Recall";}
        }
        const prog=Math.floor((wk-1)/4)*2;
        sessions.push({day:d,type,duration_min:Math.round(dur+prog),cognitive:cog,done:false});
      });
      weeks.push({week:wk,sessions});
    }

    window.currentReport = { participant, genotype, fitness, genotypeInfo, fitnessLevels, template, pre, post, weeks };
    renderPlan(window.currentReport);
    resultDiv.style.display="block";
  }

  // ======================================================
  // RENDER PLAN
  // ======================================================
  function renderPlan(report){
    document.getElementById("result-title").textContent=`${report.participant} — ${report.genotype}`;
    document.getElementById("summary").innerHTML=`
      <p><strong>Sessions/week:</strong> ${report.template.sessions_per_week} • 
      <strong>Session length:</strong> ${Math.round(report.template.session_length)} min • 
      <strong>Intensity:</strong> ${report.template.intensity}</p>
      <p><strong>Genotype Info:</strong> ${report.genotypeInfo}</p>
      <p><strong>Fitness Level:</strong> ${report.fitnessLevels[report.fitness]}</p>
      <p class="instruction">✔️ Tap any exercise to mark it done — progress updates automatically.</p>`;
    weeksDiv.innerHTML="";
    report.weeks.forEach((w)=>{
      const div=document.createElement("div");
      div.className="week-card";
      div.innerHTML=`<strong>Week ${w.week}</strong><br>`;
      w.sessions.forEach((s)=>{
        const btn=document.createElement("button");
        btn.textContent=s.type==="Rest"?`${s.day}: Rest`:`${s.day}: ${s.type} — ${s.duration_min} min (${s.cognitive})`;
        btn.className="day-btn";
        if(s.done)btn.classList.add("done");
        btn.addEventListener("click",()=>{
          s.done=!s.done;
          btn.classList.toggle("done");
          updateAdherence();
        });
        div.appendChild(btn);
      });
      weeksDiv.appendChild(div);
    });
  }

  function getValues(type){
    const ids=["moca","digitf","digitb","tmt_a","tmt_b","sixmwt","tug","grip","bbs"];
    const res={};ids.forEach(id=>res[id]=parseFloat(document.getElementById(`${id}_${type}`).value)||0);
    return res;
  }

  function updateAdherence(){
    const r=window.currentReport;if(!r)return;
    let total=0,done=0;
    r.weeks.forEach(w=>w.sessions.forEach(s=>{total++;if(s.done)done++;}));
    const pct=total?Math.round((done/total)*100):0;
    adherenceBar.style.width=`${pct}%`;
    adherencePct.textContent=`${pct}% completed`;
  }

  // ======================================================
  // PDF EXPORT (with radar chart)
  // ======================================================
  document.getElementById("exportPdf").addEventListener("click",async()=>{
    const r=window.currentReport;
    if(!r)return alert("Generate a plan first.");
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({unit:"pt",format:"a4"});
    const margin=36;let y=36;
    doc.setFont("helvetica","bold");doc.setFontSize(16);
    doc.text("Clinical Exercise Prescription Report",margin,y);y+=24;
    doc.setFont("helvetica","normal");doc.setFontSize(11);
    doc.text(`Participant: ${r.participant}`,margin,y);
    doc.text(`Genotype: ${r.genotype}`,margin+300,y);y+=20;
    doc.text(`Fitness Level: ${r.fitnessLevels[r.fitness]}`,margin,y);y+=20;
    doc.text(`Generated: ${new Date().toLocaleDateString()}`,margin,y);y+=25;

    const headers=[["Measure","Pre","Post","Change","Status"]];
    const rows=[];const lowerIsBetter=["tmt_a","tmt_b","tug"];
    Object.keys(r.pre).forEach(k=>{
      const diff=r.post[k]-r.pre[k];let status="No change";
      if(lowerIsBetter.includes(k)){if(diff<0)status="Improved";else if(diff>0)status="Worsened";}
      else{if(diff>0)status="Improved";else if(diff<0)status="Worsened";}
      rows.push([k.toUpperCase(),r.pre[k],r.post[k],diff>0?`+${diff}`:diff,status]);
    });
    doc.autoTable({startY:y,head:headers,body:rows,theme:"grid",
      headStyles:{fillColor:[60,22,102],textColor:255,fontStyle:"bold"},styles:{fontSize:10}});
    y=doc.lastAutoTable.finalY+20;

    // --- Radar chart
    const radarCanvas=document.createElement("canvas");
    radarCanvas.width=400;radarCanvas.height=400;
    const ctx=radarCanvas.getContext("2d");
    new Chart(ctx,{
      type:"radar",
      data:{
        labels:["MoCA","DigitF","DigitB","6MWT","TUG","Grip","BBS"],
        datasets:[
          {label:"Pre",data:[r.pre.moca,r.pre.digitf,r.pre.digitb,r.pre.sixmwt,r.pre.tug,r.pre.grip,r.pre.bbs],
           borderColor:"rgba(255,99,132,0.9)",backgroundColor:"rgba(255,99,132,0.2)"},
          {label:"Post",data:[r.post.moca,r.post.digitf,r.post.digitb,r.post.sixmwt,r.post.tug,r.post.grip,r.post.bbs],
           borderColor:"rgba(54,162,235,0.9)",backgroundColor:"rgba(54,162,235,0.2)"}
        ]},
      options:{responsive:false,scales:{r:{beginAtZero:true}}}
    });
    await new Promise(res=>setTimeout(res,600));
    const img=radarCanvas.toDataURL("image/png",1.0);
    doc.addImage(img,"PNG",margin,y,400,400);
    y+=420;

    const total=r.weeks.reduce((s,w)=>s+w.sessions.length,0);
    const done=r.weeks.reduce((s,w)=>s+w.sessions.filter(x=>x.done).length,0);
    const pct=Math.round((done/total)*100);
    doc.text(`Overall adherence: ${done}/${total} sessions (${pct}%)`,margin,y);
    doc.save(`${r.participant.replace(/\s+/g,"_")}_EXECOGIM_Report.pdf`);
  });

  // ======================================================
  // EXCEL EXPORT
  // ======================================================
  document.getElementById("downloadXlsx").addEventListener("click",()=>{
    const r=window.currentReport;if(!r)return alert("Generate a plan first.");
    const wb=XLSX.utils.book_new();
    const data=[["Week","Day","Type","Duration (min)","Cognitive Task","Done"]];
    r.weeks.forEach(w=>w.sessions.forEach(s=>{
      data.push([`Week ${w.week}`,s.day,s.type,s.duration_min,s.cognitive,s.done?"Yes":"No"]);
    }));
    const ws=XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb,ws,"Exercise Plan");
    XLSX.writeFile(wb,`${r.participant.replace(/\s+/g,"_")}_EXECOGIM.xlsx`);
  });

  // ======================================================
  // PWA SUPPORT
  // ======================================================
  let deferredPrompt;
  const installContainer=document.getElementById("installContainer");
  const installBtn=document.getElementById("installBtn");
  window.addEventListener("beforeinstallprompt",e=>{
    e.preventDefault();deferredPrompt=e;
    if(installContainer)installContainer.style.display="block";
  });
  if(installBtn){
    installBtn.addEventListener("click",async()=>{
      if(!deferredPrompt)return;
      installContainer.style.display="none";
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt=null;
    });
  }
  window.addEventListener("appinstalled",()=>{
    if(installContainer)installContainer.style.display="none";
  });
});
