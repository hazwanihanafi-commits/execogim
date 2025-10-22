// EXECOGIM v5.3 — Adds B–S–G adherence radar chart + PDF export integration
document.addEventListener('DOMContentLoaded', () => {

  const modal = document.getElementById('exerciseModal');
  if (modal) {
    document.getElementById('modalClose').onclick = () => modal.style.display = 'none';
    document.getElementById('modalAlt').onclick = () => alert('Alternative exercise (demo)');
  }

  // --- MAIN RADAR CHART ---
  let radarChart = null;
  function createRadar(pre, post) {
    const canvas = document.getElementById('radarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const labels = ['MoCA','DigitF','DigitB','TMT-A','TMT-B','6MWT','TUG','Grip','BBS'];
    const meta = { moca:[0,30], digitf:[0,10], digitb:[0,10], tmt_a:[10,150], tmt_b:[20,300], sixmwt:[50,800], tug:[3,30], grip:[5,60], bbs:[0,56] };
    function norm(key,val){ if(val===''||val==null)return 0; const [min,max]=meta[key]; const num=parseFloat(val);
      const clip=Math.max(min,Math.min(max,num)); return (key.startsWith('tmt')||key==='tug')?Math.round((1-(clip-min)/(max-min))*100):Math.round(((clip-min)/(max-min))*100);}
    const order=['moca','digitf','digitb','tmt_a','tmt_b','sixmwt','tug','grip','bbs'];
    const preData=order.map(k=>norm(k,pre[k]));
    const postData=order.map(k=>norm(k,post[k]));
    document.getElementById('chartCard').style.display='block';
    if(radarChart) radarChart.destroy();
    radarChart=new Chart(ctx,{type:'radar',data:{labels,datasets:[
      {label:'Pre (USM orange)',data:preData,backgroundColor:'rgba(242,107,0,0.25)',borderColor:'#f26b00'},
      {label:'Post (IPPT purple)',data:postData,backgroundColor:'rgba(107,63,160,0.25)',borderColor:'#6b3fa0'}
    ]},options:{responsive:true,maintainAspectRatio:false,scales:{r:{min:0,max:100,ticks:{stepSize:25}}},plugins:{legend:{position:'top'}}}});
  }

  // --- BSG MINI RADAR ---
  let bsgChart = null;
  function createBSGRadar(b,s,g){
    const canvas=document.getElementById('bsgChart'); if(!canvas)return;
    const ctx=canvas.getContext('2d'); if(bsgChart)bsgChart.destroy();
    bsgChart=new Chart(ctx,{type:'radar',data:{labels:['Behavioral','Session','Genetic'],datasets:[{label:'Adherence (%)',data:[b,s,g],backgroundColor:'rgba(107,63,160,0.25)',borderColor:'#6b3fa0',borderWidth:2,pointBackgroundColor:'#f26b00'}]},options:{responsive:true,maintainAspectRatio:false,scales:{r:{min:0,max:100,ticks:{stepSize:25}}},plugins:{legend:{display:false}}}});
  }

  // --- Generate Plan ---
  document.getElementById('inputForm').addEventListener('submit',(e)=>{
    e.preventDefault();
    const participant=document.getElementById('participant_name').value||'Participant';
    const genotype=document.getElementById('genotype').value;
    const fitness=parseInt(document.getElementById('fitness_slider').value)||3;
    const pre={moca:moca_pre.value,digitf:digitf_pre.value,digitb:digitb_pre.value,tmt_a:tmt_a_pre.value,tmt_b:tmt_b_pre.value,sixmwt:sixmwt_pre.value,tug:tug_pre.value,grip:grip_pre.value,bbs:bbs_pre.value};
    const template=genotype.toLowerCase().startsWith('val')?{label:'Val/Val',sessions_per_week:4,session_length:30,intensity:'moderate-to-vigorous'}:{label:'Met carrier',sessions_per_week:5,session_length:40,intensity:'light-to-moderate'};
    if(fitness<3){template.sessions_per_week=Math.max(3,template.sessions_per_week-1);template.session_length=Math.round(template.session_length*0.9);}
    if(fitness>3){template.sessions_per_week+=1;template.session_length=Math.round(template.session_length*1.1);}
    const weeks=[]; for(let wk=1;wk<=12;wk++){const sessions=[];['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d=>{let type='Rest',dur=0;if(template.label==='Val/Val'){if(d==='Mon'){type='HIIT';dur=template.session_length;}else if(d==='Tue'){type='Resistance';dur=Math.round(template.session_length*0.9);}else if(d==='Wed'){type='Skill/Dual-task';dur=Math.round(template.session_length*0.8);}else if(d==='Thu'){type='Active Recovery';dur=20;}else if(d==='Fri'){type='Mixed Cardio-Strength';dur=template.session_length;}else if(d==='Sat'){type='Optional Sport';dur=30;}}else{if(d==='Mon'){type='Endurance (steady)';dur=template.session_length;}else if(d==='Tue'){type='Strength+Balance';dur=Math.round(template.session_length*0.8);}else if(d==='Wed'){type='Adventure Mode';dur=20;}else if(d==='Thu'){type='Yoga/Tai Chi';dur=30;}else if(d==='Fri'){type='Endurance intervals';dur=template.session_length;}else if(d==='Sat'){type='Light aerobic + memory';dur=30;}}const prog=Math.floor((wk-1)/4)*2;sessions.push({day:d,type,duration_min:dur+prog,done:false});});weeks.push({week:wk,sessions});}
    window.currentReport={participant,genotype,fitness,template,pre,weeks};
    renderPlan(window.currentReport);
    setupWeeklyChecks(window.currentReport);
    const post={moca:moca_post.value,digitf:digitf_post.value,digitb:digitb_post.value,tmt_a:tmt_a_post.value,tmt_b:tmt_b_post.value,sixmwt:sixmwt_post.value,tug:tug_post.value,grip:grip_post.value,bbs:bbs_post.value};
    createRadar(pre,post); createBSGRadar(60,70,80);
    document.getElementById('result').style.display='block';
  });

  function renderPlan(r){document.getElementById('result-title').textContent=`${r.participant} — ${r.genotype}`;document.getElementById('summary').innerHTML=`<p><strong>Sessions/week:</strong> ${r.template.sessions_per_week} | <strong>Length:</strong> ${r.template.session_length}min | <strong>Intensity:</strong> ${r.template.intensity}</p>`;const wDiv=document.getElementById('weeks');wDiv.innerHTML='';r.weeks.forEach(w=>{const div=document.createElement('div');div.innerHTML=`<strong>Week ${w.week}</strong>`;const ul=document.createElement('ul');w.sessions.forEach(s=>{const li=document.createElement('li');li.textContent=`${s.day}: ${s.type} — ${s.duration_min}min`;ul.appendChild(li);});div.appendChild(ul);wDiv.appendChild(div);});}

  function setupWeeklyChecks(r){const c=document.getElementById('weeklyChecks');c.innerHTML='';r.weeks.forEach(w=>{const d=document.createElement('div');d.innerHTML=`<strong>Week ${w.week}</strong>`;w.sessions.forEach(s=>{const btn=document.createElement('button');btn.className='btn ghost';btn.textContent=s.day;btn.onclick=()=>{s.done=!s.done;btn.style.background=s.done?'linear-gradient(90deg,#f26b00,#6b3fa0)':'transparent';updateAdherence();};d.appendChild(btn);});c.appendChild(d);});updateAdherence();}

  function updateAdherence(){const r=window.currentReport;if(!r)return;let total=0,done=0;r.weeks.forEach(w=>w.sessions.forEach(s=>{total++;if(s.done)done++;}));const pct=total?Math.round(done/total*100):0;adherenceBar.style.width=pct+'%';adherencePct.textContent=pct+'%';const badges=document.getElementById('badges');badges.innerHTML='';if(pct>=75){badges.innerHTML='<div class="badge gold">G</div>';}else if(pct>=50){badges.innerHTML='<div class="badge silver">S</div>';}else if(pct>=25){badges.innerHTML='<div class="badge bronze">B</div>';}createBSGRadar(pct,Math.min(100,pct+10),Math.max(0,pct-10));}

  // --- PDF Export ---
  document.getElementById('exportPdf').addEventListener('click', async () => {
    const r = window.currentReport;
    if (!r) { alert('Generate a plan first'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 36; let y = 40;
    doc.setFontSize(16); doc.text('Clinical Exercise Prescription Report', margin, y); y += 20;
    doc.setFontSize(10); doc.text(`Participant: ${r.participant} | Genotype: ${r.genotype}`, margin, y); y += 12;
    const canvas = document.getElementById('radarChart');
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const imgW = 420; const imgH = imgW * (canvas.height / canvas.width);
      doc.addImage(dataUrl, 'PNG', margin, y, imgW, imgH); y += imgH + 10;
    }
    // ✅ Include BSG radar + title
    doc.setFontSize(12); doc.text('BSG Adherence Summary (Behavioral–Session–Genetic)', margin, y); y += 10;
    const bsgCanvas = document.getElementById('bsgChart');
    if (bsgCanvas) {
      const bsgDataUrl = bsgCanvas.toDataURL('image/png', 1.0);
      const bsgW = 300; const bsgH = bsgW * (bsgCanvas.height / bsgCanvas.width);
      doc.addImage(bsgDataUrl, 'PNG', margin, y, bsgW, bsgH); y += bsgH + 10;
      doc.setFontSize(9); doc.text('B = Behavioral adherence | S = Session adherence | G = Genetic-fit adherence', margin, y); y += 15;
    }
    doc.save(`${r.participant.replace(/\s+/g,'_')}_execogim_report.pdf`);
  });

});
