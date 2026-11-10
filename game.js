(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $('city-map'), ctx = canvas.getContext('2d');
  const districtData = [
    {name:'Old Harbor', type:'WATERFRONT', desc:'Salt air, old warehouses, and a tight-knit community.', color:'#63c8b7', value:2, growth:0, trust:3, rival:1},
    {name:'Market Row', type:'COMMERCE', desc:'A lively bazaar where small businesses keep the lights on.', color:'#f4b474', value:3, growth:0, trust:2, rival:2},
    {name:'Centro', type:'DOWNTOWN', desc:'The bright heart of Puerto Sol. Everyone passes through.', color:'#d5fa63', value:4, growth:1, trust:2, rival:2},
    {name:'Palm Heights', type:'RESIDENTIAL', desc:'Quiet streets, shaded courtyards, and proud neighbors.', color:'#a78ee8', value:2, growth:0, trust:4, rival:1},
    {name:'The Yards', type:'INDUSTRIAL', desc:'A hard-working district ready for a new chapter.', color:'#ed7f77', value:3, growth:0, trust:1, rival:3}
  ];
  const defaults = {week:1,cash:42,crew:5,goodwill:8,attention:16,score:0,selected:2,gameOver:false,logs:[{text:'A new season begins. Puerto Sol is full of promise.',tag:'NOW'},{text:'Neighbors are watching to see who steps up.',tag:'TODAY'}],districts:districtData.map(d=>({influence:d.growth, trust:d.trust, rival:d.rival, developed:0}))};
  let state;
  try { const saved=JSON.parse(localStorage.getItem('neon-district-save')); state=saved&&saved.districts?.length===5?{...defaults,...saved}:structuredClone(defaults); } catch { state=structuredClone(defaults); }
  let toastTimer;
  const money=(n)=>`${n<0?'−':''}$${Math.abs(n)}`;
  function save(){try{localStorage.setItem('neon-district-save',JSON.stringify(state));}catch{}}
  function log(text,tag='WEEK '+String(state.week).padStart(2,'0')){state.logs.unshift({text,tag});state.logs=state.logs.slice(0,4);}
  function notify(text){const t=$('toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2100);}
  function render(){
    const displayWeek=state.gameOver?12:((state.week-1)%12)+1,displaySeason=Math.ceil((state.week-(state.gameOver?1:0))/12);$('season-label').textContent='SEASON '+String(displaySeason).padStart(2,'0');$('week-label').textContent='WEEK '+String(displayWeek).padStart(2,'0');
    const resources=[['◈','CASH',money(state.cash),''],['♟','CREW',state.crew,'members'],['✳','GOODWILL',state.goodwill,'pts']];
    $('resource-grid').innerHTML=resources.map(r=>`<div class="resource"><span class="resource-label"><i>${r[0]}</i>${r[1]}</span><div class="resource-value">${r[2]}${r[3]?`<small>${r[3]}</small>`:''}</div></div>`).join('');
    const heat=state.attention, label=heat<30?'LOW':heat<60?'NOTICEABLE':heat<82?'ELEVATED':'CRITICAL';$('heat-value').textContent=label;$('heat-value').style.color=heat<40?'var(--lime)':heat<70?'var(--orange)':'var(--red)';$('heat-meter-fill').style.width=heat+'%';$('heat-meter-fill').style.background=heat<40?'var(--lime)':heat<70?'var(--orange)':'var(--red)';
    $('district-strip').innerHTML=districtData.map((d,i)=>`<button class="district-tab ${i===state.selected?'active':''}" data-district="${i}"><strong>${d.name}</strong><span>${d.type}</span></button>`).join('');
    const i=state.selected,d=districtData[i],s=state.districts[i];$('action-context').textContent=d.type;
    $('district-detail').innerHTML=`<div class="district-copy"><strong>${d.name}</strong><p>${d.desc}</p></div><div class="district-stats"><span>YOUR REACH <b>${s.influence}</b></span><span>COMMUNITY <b>${s.trust}</b></span></div>`;
    const actions=[
      {id:'expand',icon:'↗',title:'Grow your reach',cost:'$12 · +1 crew',disabled:state.cash<12||state.crew<1},
      {id:'invest',icon:'✳',title:'Back local shops',cost:'$8 · +2 goodwill',disabled:state.cash<8},
      {id:'connect',icon:'♡',title:'Meet the neighbors',cost:'2 crew · +3 trust',disabled:state.crew<2},
      {id:'cooldown',icon:'◌',title:'Keep a low profile',cost:'$5 · −12 attention',disabled:state.cash<5}
    ];
    $('action-list').innerHTML=actions.map(a=>`<button class="action-btn" data-action="${a.id}" ${a.disabled||state.gameOver?'disabled':''}><span class="action-icon">${a.icon}</span><span class="action-text"><b>${a.title}</b><small>${a.cost}</small></span></button>`).join('');
    $('advance-btn').disabled=false;$('advance-btn').style.opacity='1';
    $('log-list').innerHTML=state.logs.map(x=>`<div class="log-entry"><i></i><span>${x.text}</span><small>${x.tag}</small></div>`).join('');
    $('advance-btn').innerHTML=state.gameOver?'<span>START NEW SEASON</span><b>↻</b>':'<span>END WEEK</span><b>→</b>';
    $('district-strip').querySelectorAll('button').forEach(b=>b.disabled=state.gameOver);
    save();drawMap();
  }
  function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function polygon(points,fill,stroke){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let p=1;p<points.length;p++)ctx.lineTo(points[p][0],points[p][1]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
  function shade(hex,amount){const n=parseInt(hex.slice(1),16),r=Math.max(0,Math.min(255,(n>>16)+amount)),g=Math.max(0,Math.min(255,((n>>8)&255)+amount)),b=Math.max(0,Math.min(255,(n&255)+amount));return`rgb(${r},${g},${b})`}
  function drawBuilding(x,y,w,h,color,seed){
    const depth=w*.28;
    polygon([[x-w/2,y],[x+depth,y+depth*.45],[x+depth,y-h+depth*.45],[x-w/2,y-h]],'#0c1518a8');
    polygon([[x-w/2,y-h],[x,y-h-w*.075],[x+depth,y-h+depth*.45],[x-w/2+depth,y-h+depth*.45]],color);
    polygon([[x-w/2,y-h],[x-w/2+depth,y-h+depth*.45],[x-w/2+depth,y+depth*.45],[x-w/2,y]],shade(color,-22));
    polygon([[x-w/2+depth,y-h+depth*.45],[x+depth,y-h+depth*.45],[x+depth,y+depth*.45],[x-w/2+depth,y+depth*.45]],shade(color,-42));
    ctx.fillStyle='#ffe2a0a8';const cols=2,rows=Math.max(2,Math.floor(h/18));for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const wx=x-w/2+depth+5+c*((w-depth-10)/cols);const wy=y-h+depth*.45+7+r*((h-depth*.45-8)/rows);if(((seed+r*3+c)%5)!==0)ctx.fillRect(wx,wy,Math.max(2,w*.055),Math.max(3,h*.045));}
    ctx.fillStyle='#d5fa6385';ctx.fillRect(x-w*.16,y-h-2,w*.22,2);
  }
  function drawTree(x,y,s){ctx.fillStyle='#101b1b';ctx.beginPath();ctx.ellipse(x+s*.15,y+s*.12,s*.48,s*.22,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#637d58';ctx.beginPath();ctx.arc(x,y-s*.45,s*.48,0,Math.PI*2);ctx.fill();ctx.fillStyle='#88a166';ctx.beginPath();ctx.arc(x-s*.15,y-s*.58,s*.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#725641';ctx.fillRect(x-1,y-s*.42,2,s*.54)}
  function drawMap(){
    if(!canvas.clientWidth)return;const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);const W=rect.width,H=rect.height,scale=W/700;ctx.clearRect(0,0,W,H);
    const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#1c3031');grad.addColorStop(.55,'#1b2c2d');grad.addColorStop(1,'#122022');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    for(let i=0;i<30;i++){const x=((i*71)%W),bw=16+(i*19%34),bh=22+(i*37%70);ctx.fillStyle=i%3?'#1a292b':'#203032';ctx.fillRect(x,35,bw,bh);ctx.fillStyle='#e3c36c24';for(let j=0;j<3;j++)ctx.fillRect(x+4+j*8,42+(i*j%12),2,3);}
    ctx.fillStyle='#243b36';ctx.beginPath();ctx.moveTo(0,H*.39);for(let x=0;x<=W;x+=W/6)ctx.quadraticCurveTo(x+W/12,H*.27+(x%3)*3,x+W/6,H*.4);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
    const zoneW=W/5,tileW=Math.min(zoneW*.68,86*scale),tileH=tileW*.42,baseY=H*.65;
    ctx.fillStyle='#174047';ctx.fillRect(0,H*.75,W,H*.25);ctx.fillStyle='#1f5760';for(let x=10;x<W;x+=37){ctx.fillRect(x,H*.83+(x%3)*3,18,1);ctx.fillRect(x+10,H*.9,12,1)}
    for(let z=0;z<5;z++){
      const cx=zoneW*(z+.5),focus=z===state.selected,ds=state.districts[z],color=districtData[z].color;
      const points=[[cx,baseY-tileH*2.35],[cx+tileW*1.1,baseY-tileH*1.22],[cx,baseY],[cx-tileW*1.1,baseY-tileH*1.22]];
      polygon(points,focus?'#34483d':'#2b3c37',focus?color+'99':'#45544a');
      for(let gy=0;gy<3;gy++)for(let gx=0;gx<2;gx++){const tx=cx+(gx-gy*.5)*tileW*.55,ty=baseY-tileH*1.05+gy*tileH*.52+gx*tileH*.52;polygon([[tx,ty-tileH*.45],[tx+tileW*.28,ty],[tx,ty+tileH*.45],[tx-tileW*.28,ty]],(gx+gy)%2?'#34443d':'#394940','#526052');if((gx*3+gy+z)%4===0)drawTree(tx-tileW*.1,ty-tileH*.12,tileW*.12);}
      const heights=[[.22,.3,.2],[.35,.2,.3],[.42,.3,.23],[.25,.36,.25],[.3,.25,.39]][z];
      for(let b=0;b<3;b++){const bx=cx+(b-1)*tileW*.34,by=baseY-tileH*(.58+(b%2)*.48),bw=tileW*(b===1?.34:.27),bh=H*heights[b]*.47+ds.developed*2;const buildingColor=focus?['#71917a','#899b78','#778d8d'][b]:['#586c66','#6b7c72','#526963'][b];drawBuilding(bx,by,bw,bh,buildingColor,b+z);}
      const markerY=baseY-tileH*2.6;if(ds.influence>0){ctx.strokeStyle=color+'55';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(cx,baseY-tileH*.6,tileW*.55,tileH*.22,0,0,Math.PI*2);ctx.stroke();}
      roundRect(cx-18*scale,markerY-11*scale,36*scale,16*scale,5*scale);ctx.fillStyle=focus?color:'#182526';ctx.fill();ctx.strokeStyle=focus?'#f2ffbd':'#61716a';ctx.stroke();ctx.fillStyle=focus?'#17221b':'#d8dfd3';ctx.font=`500 ${8*scale}px "DM Mono", monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(ds.influence).padStart(2,'0'),cx,markerY-3*scale);
      ctx.fillStyle=focus?'#f0f3db':'#9eadaa';ctx.font=`600 ${Math.max(7,8*scale)}px Manrope, sans-serif`;ctx.fillText(districtData[z].name.toUpperCase(),cx,baseY+tileH*.35);
      if(ds.rival>1){ctx.fillStyle='#ed9870';ctx.beginPath();ctx.arc(cx+tileW*.43,baseY-tileH*1.35,2.4*scale,0,Math.PI*2);ctx.fill();}
    }
    ctx.strokeStyle='#c2b27735';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,H*.715);ctx.lineTo(W,H*.715);ctx.stroke();
    for(let z=0;z<5;z++){const x=zoneW*(z+.5);ctx.fillStyle=z===state.selected?'#d5fa63':'#e5bf74';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=8;ctx.beginPath();ctx.arc(x,H*.71,2*scale,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
  }
  function action(id){if(state.gameOver)return;const d=state.districts[state.selected],name=districtData[state.selected].name;
    if(id==='expand'){if(state.cash<12||state.crew<1)return;state.cash-=12;state.crew--;d.influence++;d.developed++;state.attention=Math.min(100,state.attention+6);state.score+=2;log(`Your network found a new foothold in ${name}.`);notify(`${name}: your presence grows.`);}
    else if(id==='invest'){if(state.cash<8)return;state.cash-=8;state.goodwill+=2;d.trust=Math.min(10,d.trust+1);d.developed++;state.attention=Math.max(0,state.attention-2);state.score++;log(`Local shops in ${name} received a welcome boost.`);notify('Goodwill is growing.');}
    else if(id==='connect'){if(state.crew<2)return;state.crew-=2;d.trust=Math.min(10,d.trust+2);state.goodwill++;d.rival=Math.max(0,d.rival-1);state.attention=Math.max(0,state.attention-5);log(`A neighborhood gathering eased tensions in ${name}.`);notify('A new connection made.');}
    else if(id==='cooldown'){if(state.cash<5)return;state.cash-=5;state.attention=Math.max(0,state.attention-12);log('Your crew took a quiet week and let the city breathe.');notify('Attention is cooling down.');}
    render();
  }
  function endWeek(){
    if(state.gameOver){state.week=1;state.cash=42;state.crew=5;state.goodwill=8;state.attention=16;state.score=0;state.gameOver=false;state.districts=districtData.map(d=>({influence:d.growth,trust:d.trust,rival:d.rival,developed:0}));state.selected=2;state.logs=[];log('A fresh season begins. Puerto Sol is full of promise.','NOW');render();notify('Welcome to a new season.');return;}
    const reach=state.districts.reduce((sum,d)=>sum+d.influence,0),income=4+reach;state.cash+=income;state.crew=Math.min(12,state.crew+1);state.attention=Math.min(100,Math.max(0,state.attention-3+Math.floor(reach/5)));
    if(state.goodwill>=10&&Math.random()<.42){state.cash+=3;log('A neighborhood fundraiser brought a little extra support.');}
    if(state.attention>=75){state.cash=Math.max(0,state.cash-5);state.goodwill=Math.max(0,state.goodwill-1);log('City tensions are high. Everyone took a step back this week.');}
    else if(state.attention<40&&Math.random()<.35){state.goodwill++;log('A calm week helped community trust grow.');}
    const target=state.districts[(state.week+1)%5];if(target.rival>0&&Math.random()<.32)target.rival--;
    state.week++;
    if(state.week%12===1)log('The city has turned a new page. A season of possibility starts now.');
    if(state.week%12===1){state.gameOver=true;const finalReach=state.districts.reduce((sum,d)=>sum+d.influence,0),rank=finalReach>=14&&state.goodwill>=10?'A city legend':finalReach>=9?'A neighborhood name':'A promising start';log(`Season complete: ${rank}. Final reach ${finalReach}, goodwill ${state.goodwill}.`,'FINAL');$('modal-title').innerHTML='Season <span>complete.</span>';$('modal-backdrop').hidden=false;$('modal-backdrop').dataset.result='true';document.querySelector('.modal > p').textContent=`Your season in Puerto Sol is complete. ${rank} — you built a reach of ${finalReach} and earned ${state.goodwill} goodwill. Every season tells a new story.`;$('guide-start').innerHTML='START A NEW SEASON <span>↻</span>';}
    else log(`Week ${((state.week-2)%12)+1} closed. Your network earned ${money(income)} in support.`);
    render();if(state.gameOver)notify('Season complete — see your field guide.');
  }
  function openGuide(){
    $('modal-title').innerHTML='A city of <span>possibility.</span>';
    document.querySelector('.modal > p').textContent='Build a neighborhood network, earn the trust of the people, and become Puerto Sol’s most influential crew. The city is yours to shape—one week at a time.';
    $('guide-start').innerHTML='LET’S PLAY <span>→</span>';$('modal-backdrop').dataset.result='false';$('modal-backdrop').hidden=false;
  }
  $('district-strip').addEventListener('click',e=>{const b=e.target.closest('[data-district]');if(!b||state.gameOver)return;state.selected=Number(b.dataset.district);render();});
  $('action-list').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&!b.disabled)action(b.dataset.action);});
  $('advance-btn').addEventListener('click',endWeek);
  canvas.addEventListener('pointerup',e=>{if(state.gameOver)return;const r=canvas.getBoundingClientRect(),x=e.clientX-r.left;state.selected=Math.max(0,Math.min(4,Math.floor(x/r.width*5)));render();});
  $('help-btn').addEventListener('click',openGuide);
  $('modal-close').addEventListener('click',()=>{$('modal-backdrop').hidden=true;});
  $('modal-backdrop').addEventListener('click',e=>{if(e.target===$('modal-backdrop'))$('modal-backdrop').hidden=true;});
  $('guide-start').addEventListener('click',()=>{if($('modal-backdrop').dataset.result==='true')endWeek();$('modal-backdrop').hidden=true;});
  $('sound-toggle').addEventListener('click',e=>{const enabled=e.currentTarget.dataset.on!=='true';e.currentTarget.dataset.on=String(enabled);e.currentTarget.style.color=enabled?'var(--lime)':'';e.currentTarget.textContent=enabled?'♫':'♪';notify(enabled?'Sound indicators on':'Sound indicators off');});
  window.addEventListener('resize',drawMap,{passive:true});
  render();
  if(!localStorage.getItem('neon-district-intro')){openGuide();localStorage.setItem('neon-district-intro','seen');}
})();
