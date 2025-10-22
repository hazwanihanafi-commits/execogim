// EXECOGIM v5.2 — Adds B–S–G adherence radar chart to main report
document.addEventListener('DOMContentLoaded', () => {

  // --- onboarding, tooltips, modal same as before ---

  const modal = document.getElementById('exerciseModal');
  if (modal) {
    document.getElementById('modalClose').onclick = () => modal.style.display = 'none';
    document.getElementById('modalAlt').onclick = () => alert('Alternative exercise (demo)');
  }

  // --- MAIN RADAR CHART ---
  let radarChart = null;
  function createRadar(pre, post, title) {
    const canvas = document.getElementById('radarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const labels = ['MoCA','DigitF','DigitB','TMT-A(s)','TMT-B(s)','6MWT(m)','TUG(s)','Grip(kg)','BBS'];
    const meta = {
      moca:[0,30], digitf:[0,10], digitb:[0,10],
      tmt_a:[10,150], tmt_b:[20,300],
      sixmwt:[50,800], tug:[3,30], grip:[5,60], bbs:[0,56]
    };
    function norm(key,val){
      if(val===''||val==null) return 0;
      const [min,max]=meta[key]; const num=parseFloat(val);
      const clip=Math.max(min,Math.min(max,num));
      if(key.startsWith('tmt')||key==='tug'){ return Math.round((1-(clip-min)/(max-min))*100);}
      else{ return Math.round(((clip-min)/(max-min))*100);}
    }
    const order=['moca','digitf','digitb','tmt_a','tmt_b','sixmwt','tug','grip','bbs'];
    const preData=order.map(k=>norm(k,pre[k]));
    const postData=order.map(k=>norm(k,post[k]));
    document.getElementById('chartCard').style.display='block';
    if(radarChart) radarChart.destroy();
    radarChart=new Chart(ctx,{
      type:'radar',
      data:{
        labels,
        datasets:[
          {label:'Pre (USM orange)',data:preData,backgroundColor:'rgba(242,107,0,0.25)',borderColor:'#f26b00'},
          {label:'Post (IPPT purple)',data:postData,backgroundColor:'rgba(107,63,160,0.25)',borderColor:'#6b3fa0'}
        ]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        scales:{r:{min:0,max:100,ticks:{stepSize:25}}},
        plugins:{legend:{position:'top'}}
      }
    });
  }

  // --- BSG MINI RADAR ---
  let bsgChart = null;
  function createBSGRadar(b, s, g) {
    const canvas = document.getElementById('bsgChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (bsgChart) bsgChart.destroy();
    bsgChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Behavioral', 'Session', 'Genetic'],
        datasets: [{
          label: 'Adherence (%)',
          data: [b, s, g],
          backgroundColor: 'rgba(107,63,160,0.25)',
          borderColor: '#6b3fa0',
          borderWidth: 2,
          pointBackgroundColor: '#f26b00'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { r: { min: 0, max: 100, ticks: { stepSize: 25 } } },
        plugins: { legend: { display: false }, title: { display: false } }
      }
    });
  }

  // --- Generate Plan (same as before) ---
  document.getElementById('inputForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const participant = document.getElementById('participant_name').value || 'Participant';
    const genotype = document.getElementById('genotype').value;
    const fitness = parseInt(document.getElementById('fitness_slider').value) || 3;
    const constraints = Array.from(document.querySelectorAll('input[name="constraint"]:checked')).map(c=>c.value);
    const pre = {
      moca: moca_pre.value, digitf: digitf_pre.value, digitb: digitb_pre.value,
      tmt_a: tmt_a_pre.value, tmt_b: tmt_b_pre.value, sixmwt: sixmwt_pre.value,
      tug: tug_pre.value, grip: grip_pre.value, bbs: bbs_pre.value
    };

    const template = genotype.toLowerCase().startsWith('val')
      ? { label: 'Val/Val', sessions_per_week: 4, session_length: 30, intensity: 'moderate-to-vigorous' }
      : { label: 'Met carrier', sessions_per_week: 5, session_length: 40, intensity: 'light-to-moderate' };

    if (fitness < 3) { template.sessions_per_week = Math.max(3, template.sessions_per_week - 1); template.session_length = Math.round(template.session_length * 0.9); }
    if (fitness > 3) { template.sessions_per_week += 1; template.session_length = Math.round(template.session_length * 1.1); }

    const weeks = [];
    for (let wk = 1; wk <= 12; wk++) {
      const sessions = [];
      ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d=>{
        let type='Rest', dur=0, cog='';
        if(template.label==='Val/Val'){
          if(d==='Mon'){type='HIIT';dur=template.session_length;cog='reaction';}
          else if(d==='Tue'){type='Resistance';dur=Math.round(template.session_length*0.9);cog='random-cue';}
          else if(d==='Wed'){type='Skill/Dual-task';dur=Math.round(template.session_length*0.8);}
          else if(d==='Thu'){type='Active Recovery';dur=20;}
          else if(d==='Fri'){type='Mixed Cardio-Strength';dur=template.session_length;}
          else if(d==='Sat'){type='Optional Sport';dur=30;}
        }else{
          if(d==='Mon'){type='Endurance (steady)';dur=template.session_length;}
          else if(d==='Tue'){type='Strength+Balance';dur=Math.round(template.session_length*0.8);}
          else if(d==='Wed'){type='Adventure Mode';dur=20;}
          else if(d==='Thu'){type='Yoga/Tai Chi';dur=30;}
          else if(d==='Fri'){type='Endurance intervals';dur=template.session_length;}
          else if(d==='Sat'){type='Light aerobic + memory';dur=30;}
        }
        const prog=Math.floor((wk-1)/4)*2;
        sessions.push({day:d,type,duration_min:dur+prog,cognitive:cog,done:false});
      });
      weeks.push({week:wk,sessions});
    }

    window.currentReport={participant,genotype,fitness,constraints,template,pre,weeks};
    renderPlan(window.currentReport);
    setupWeeklyChecks(window.currentReport);

    const post={
      moca:moca_post?.value||'',digitf:digitf_post?.value||'',digitb:digitb_post?.value||'',
      tmt_a:tmt_a_post?.value||'',tmt_b:tmt_b_post?.value||'',sixmwt:sixmwt_post?.value||'',
      tug:tug_post?.value||'',grip:grip_post?.value||'',bbs:bbs_post?.value||''
    };

    createRadar(window.currentReport.pre,post,`Cognitive & Physical Summary — ${participant} — ${genotype}`);

    // create sample BSG (placeholder until user logs adherence)
    createBSGRadar(60, 70, 80);

    document.getElementById('result').style.display='block';
    try{localStorage.setItem('lastReport',JSON.stringify(window.currentReport));}catch(e){}
  });

  // --- renderPlan, setupWeeklyChecks, updateAdherence same as before ---
  // Add inside updateAdherence() end to update BSG radar dynamically:
  function updateAdherence(){
    const r=window.currentReport; if(!r) return;
    let total=0,done=0;
    r.weeks.forEach(w=>w.sessions.forEach(s=>{total++;if(s.done)done++;}));
    const pct=total?Math.round(done/total*100):0;
    adherenceBar.style.width=pct+'%';
    adherencePct.textContent=pct+'%';
    const badges=document.getElementById('badges'); badges.innerHTML='';
    if(pct>=75){const g=document.createElement('div');g.className='badge gold';g.textContent='G';badges.appendChild(g);}
    else if(pct>=50){const s=document.createElement('div');s.className='badge silver';s.textContent='S';badges.appendChild(s);}
    else if(pct>=25){const b=document.createElement('div');b.className='badge bronze';b.textContent='B';badges.appendChild(b);}
    // Derive dummy B,S,G scores (for now proportional to overall)
    const B=pct;
    const S=Math.max(0,Math.min(100,pct+10));
    const G=Math.max(0,Math.min(100,pct-10));
    createBSGRadar(B,S,G);
    try{localStorage.setItem('lastReport',JSON.stringify(r));}catch(e){}
  }

  // --- Restore last report ---
  try{
    const last=JSON.parse(localStorage.getItem('lastReport')||'null');
    if(last){window.currentReport=last;renderPlan(last);setupWeeklyChecks(last);}
  }catch(e){}

});
