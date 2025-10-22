// EXECOGIM v5 Light — charts offscreen (PDF only)
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ EXECOGIM light version loaded');

  // === Generate Plan ===
  document.getElementById('inputForm').addEventListener('submit', e => {
    e.preventDefault();

    const participant = document.getElementById('participant_name').value || 'Participant';
    const genotype = document.getElementById('genotype').value;
    const fitness = parseInt(document.getElementById('fitness_slider').value) || 3;

    const pre = {
      moca: moca_pre.value, digitf: digitf_pre.value, digitb: digitb_pre.value,
      tmt_a: tmt_a_pre.value, tmt_b: tmt_b_pre.value, sixmwt: sixmwt_pre.value,
      tug: tug_pre.value, grip: grip_pre.value, bbs: bbs_pre.value
    };

    const template = genotype.toLowerCase().startsWith('val')
      ? { label:'Val/Val', sessions_per_week:4, session_length:30, intensity:'moderate-to-vigorous' }
      : { label:'Met carrier', sessions_per_week:5, session_length:40, intensity:'light-to-moderate' };

    if (fitness < 3) { template.sessions_per_week = Math.max(3, template.sessions_per_week - 1); template.session_length = Math.round(template.session_length * 0.9); }
    if (fitness > 3) { template.sessions_per_week += 1; template.session_length = Math.round(template.session_length * 1.1); }

    const weeks = [];
    for (let wk = 1; wk <= 12; wk++) {
      const sessions = [];
      ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d => {
        let type='Rest', dur=0;
        if (template.label==='Val/Val') {
          if (d==='Mon') { type='HIIT'; dur=template.session_length; }
          else if (d==='Tue') { type='Resistance'; dur=Math.round(template.session_length*0.9); }
          else if (d==='Wed') { type='Skill/Dual-task'; dur=Math.round(template.session_length*0.8); }
          else if (d==='Thu') { type='Active Recovery'; dur=20; }
          else if (d==='Fri') { type='Mixed Cardio-Strength'; dur=template.session_length; }
          else if (d==='Sat') { type='Optional Sport'; dur=30; }
        } else {
          if (d==='Mon') { type='Endurance'; dur=template.session_length; }
          else if (d==='Tue') { type='Strength+Balance'; dur=Math.round(template.session_length*0.8); }
          else if (d==='Wed') { type='Adventure Mode'; dur=20; }
          else if (d==='Thu') { type='Yoga/Tai Chi'; dur=30; }
          else if (d==='Fri') { type='Endurance Intervals'; dur=template.session_length; }
          else if (d==='Sat') { type='Light Aerobic + Memory'; dur=30; }
        }
        sessions.push({ day:d, type, duration_min:dur, done:false });
      });
      weeks.push({ week:wk, sessions });
    }

    window.currentReport = { participant, genotype, fitness, template, pre, weeks };
    renderPlan(window.currentReport);
    setupWeeklyChecks(window.currentReport);
    document.getElementById('result').style.display = 'block';
  });

  function renderPlan(r){
    document.getElementById('result-title').textContent = `${r.participant} — ${r.genotype}`;
    document.getElementById('summary').innerHTML =
      `<p><strong>Sessions/week:</strong> ${r.template.sessions_per_week} • <strong>Session length:</strong> ${r.template.session_length} min • <strong>Intensity:</strong> ${r.template.intensity}</p>`;
    const weeksDiv = document.getElementById('weeks'); weeksDiv.innerHTML='';
    r.weeks.forEach(w=>{
      const div=document.createElement('div');
      div.innerHTML=`<strong>Week ${w.week}</strong>`;
      const ul=document.createElement('ul');
      w.sessions.forEach(s=>{
        const li=document.createElement('li');
        li.textContent=`${s.day}: ${s.type} — ${s.duration_min} min`;
        ul.appendChild(li);
      });
      div.appendChild(ul); weeksDiv.appendChild(div);
    });
  }

  function setupWeeklyChecks(r){
    const container=document.getElementById('weeklyChecks'); container.innerHTML='';
    r.weeks.forEach(w=>{
      const card=document.createElement('div');
      card.innerHTML=`<strong>Week ${w.week}</strong>`;
      w.sessions.forEach(s=>{
        const btn=document.createElement('button');
        btn.textContent=s.day;
        btn.onclick=()=>{ s.done=!s.done; btn.style.background=s.done?'linear-gradient(90deg,#f26b00,#6b3fa0)':'transparent'; updateAdherence(); };
        card.appendChild(btn);
      });
      container.appendChild(card);
    });
    updateAdherence();
  }

  function updateAdherence(){
    const r=window.currentReport; if(!r) return;
    let total=0,done=0; r.weeks.forEach(w=>w.sessions.forEach(s=>{total++;if(s.done)done++;}));
    const pct=Math.round((done/total)*100);
    document.getElementById('adherenceBar').style.width=pct+'%';
    document.getElementById('adherencePct').textContent=pct+'%';
  }

  // === PDF Export (charts rendered offscreen) ===
  document.getElementById('exportPdf').addEventListener('click', async ()=>{
    const r=window.currentReport; if(!r){ alert('Generate plan first'); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:'pt',format:'a4'});
    const margin=36; let y=40;

    doc.setFontSize(14);
    doc.text('Clinical Exercise Prescription Report', margin, y); y+=20;
    doc.setFontSize(10);
    doc.text(`Participant: ${r.participant} | Genotype: ${r.genotype}`, margin, y); y+=16;

    const radarCanvas=document.getElementById('radarChart');
    const bsgCanvas=document.getElementById('bsgChart');

    // Prepare data
    const labels=['MoCA','DigitF','DigitB','TMT-A','TMT-B','6MWT','TUG','Grip','BBS'];
    const meta={moca:[0,30],digitf:[0,10],digitb:[0,10],tmt_a:[10,150],tmt_b:[20,300],sixmwt:[50,800],tug:[3,30],grip:[5,60],bbs:[0,56]};
    function norm(k,v){ if(v===''||v==null)return 0; const [min,max]=meta[k]; const n=parseFloat(v); const c=Math.max(min,Math.min(max,n)); return (k.startsWith('tmt')||k==='tug')?Math.round((1-(c-min)/(max-min))*100):Math.round(((c-min)/(max-min))*100);}
    const order=['moca','digitf','digitb','tmt_a','tmt_b','sixmwt','tug','grip','bbs'];
    const preData=order.map(k=>norm(k,r.pre[k]));
    const postData=order.map(k=>norm(k,document.getElementById(k+'_post').value));

    const radarChart=new Chart(radarCanvas.getContext('2d'),{
      type:'radar', data:{labels,datasets:[
        {label:'Pre',data:preData,backgroundColor:'rgba(242,107,0,0.25)',borderColor:'#f26b00'},
        {label:'Post',data:postData,backgroundColor:'rgba(107,63,160,0.2)',borderColor:'#6b3fa0'}]},
      options:{responsive:false,animation:false,scales:{r:{min:0,max:100}}}
    });

    const bsgChart=new Chart(bsgCanvas.getContext('2d'),{
      type:'radar',data:{labels:['Behavioral','Session','Genetic'],
      datasets:[{label:'Adherence',data:[70,80,60],backgroundColor:'rgba(107,63,160,0.25)',borderColor:'#6b3fa0'}]},
      options:{responsive:false,animation:false,scales:{r:{min:0,max:100}}}
    });

    await new Promise(r=>setTimeout(r,800));

    const radarImg=radarCanvas.toDataURL('image/png');
    const bsgImg=bsgCanvas.toDataURL('image/png');

    const imgW=400,imgH=imgW*(radarCanvas.height/radarCanvas.width);
    doc.addImage(radarImg,'PNG',margin,y,imgW,imgH); y+=imgH+20;
    doc.text('BSG Adherence Summary (B = Behavioral | S = Session | G = Genetic-fit)', margin, y); y+=10;
    doc.addImage(bsgImg,'PNG',margin,y,300,220);

    radarChart.destroy(); bsgChart.destroy();
    doc.save(`${r.participant.replace(/\s+/g,'_')}_execogim_report.pdf`);
  });
});
