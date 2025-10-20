// ===== Canvas Floating Hearts =====
(function(){
  const cvs = document.getElementById('bg');
  const ctx = cvs.getContext('2d');
  const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let hearts = [], running = !prefersReduce, last = 0, dpr = 1, W = 0, H = 0;

  function resize(){
    dpr = (window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cvs.style.width = W+'px'; cvs.style.height = H+'px';
    cvs.width = Math.floor(W*dpr); cvs.height = Math.floor(H*dpr);
    ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr,dpr);
  }
  window.addEventListener('resize', resize, {passive:true});
  resize();

  const palette = ['#ff4d8d','#ff7ab6','#ffa3cf','#e879f9','#a855f7'];

  function drawHeartPath(ctx,x,y,s){
    ctx.beginPath();
    ctx.moveTo(x, y + s*0.35);
    ctx.bezierCurveTo(x - s*1.4, y - s*0.65, x - s*0.4, y - s*1.4, x, y - s*0.35);
    ctx.bezierCurveTo(x + s*0.4, y - s*1.4, x + s*1.4, y - s*0.65, x, y + s*0.35);
    ctx.closePath();
  }

  class Heart{
    constructor(x, y, size, vy, vx, life){
      this.x=x; this.y=y; this.size=size; this.vy=vy; this.vx=vx; this.life=life; this.age=0; this.spin=(Math.random()*2-1)*0.8;
      this.color = palette[Math.floor(Math.random()*palette.length)];
      this.alpha = 1; this.rot=0;
    }
    step(dt){ this.age += dt; const t = this.age/this.life; this.alpha = Math.max(0, 1 - t); this.y += this.vy*dt; this.x += this.vx*dt; this.rot = this.spin*this.age; }
    draw(){ const s = this.size*(0.9+0.2*Math.sin(this.age*3)); ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.rot); ctx.globalAlpha = this.alpha*0.95; drawHeartPath(ctx, 0, 0, s); ctx.fillStyle=this.color; ctx.fill(); ctx.restore(); }
  }

  function spawnRandom(n){
    for(let i=0;i<n;i++){
      const x = Math.random()*W; const y = H + 20 + Math.random()*80;
      const size = 8 + Math.random()*18; const vy = - (40 + Math.random()*60); const vx = (Math.random()*2-1)*30;
      const life = 4 + Math.random()*4; hearts.push(new Heart(x,y,size,vy,vx,life));
    }
  }
  function burst(x,y,n){
    const count = typeof n==='number' ? n : 28;
    for(let i=0;i<count;i++){
      const angle = Math.random()*Math.PI*2; const speed = 80+Math.random()*200;
      const vx = Math.cos(angle)*speed; const vy = Math.sin(angle)*speed;
      const size = 6+Math.random()*14; const life = 1.6+Math.random()*1.4;
      hearts.push(new Heart(x,y,size,vy,vx,life));
    }
  }

  function loop(ts){
    const dt = Math.min(0.033, (ts-last)/1000 || 0.016); last = ts;
    if(running) spawnRandom(3);
    ctx.clearRect(0,0,W,H);
    for(const h of hearts){ h.step(dt); h.draw(); }
    hearts = hearts.filter(h=>h.age < h.life);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.addEventListener('click', (e)=> burst(e.clientX, e.clientY, 36));
  window.addEventListener('keydown', (e)=>{ if(e.key.toLowerCase()==='l'){ running = !running; }});

  // expose for UI celebrations
  window.__burst = burst;
})();

// ===== Typewriter, UI, Modal & Audio =====
(function(){
  const $ = (id)=>document.getElementById(id);
  const tw = $('tw');
  const nameA = $('nameA');
  const nameB = $('nameB');
  const iA = $('iA');
  const iB = $('iB');
  const iDate = $('iDate');
  const iMsg = $('iMsg');
  const btnStart = $('btnStart');
  const btnLetter = $('btnLetter');
  const daysTogether = $('daysTogether');

  const themeSel = $('theme');
  const fontSel = $('font');
  const btnMusic = $('btnMusic');
  const vol = $('vol');

  const modal = $('modal');
  const closeModal = $('closeModal');
  const toName = $('toName');
  const letterBody = $('letterBody');
  const todaySpan = $('today');

  const msgsBase = [
    'Aku mencintaimu seperti variabel yang tak pernah diubah.',
    'Jika kamu adalah fungsi, kau selalu mengembalikan kebahagiaan.',
    "console.log('I ❤ U') — berulang-ulang di hatiku.",
    'Bersamamu, waktu.setInterval(bahagia, 1 hari).',
    'Di antara jutaan piksel, aku memilihmu.'
  ];
  let allMsgs = msgsBase.slice();

  // --- Simple typewriter ---
  let idx=0, char=0, erasing=false, pause=0;
  function typeStep(){
    if(pause>0){ pause--; return; }
    const cur = allMsgs[idx] || '';
    tw.textContent = cur.slice(0, char);
    if(!erasing){
      if(char < cur.length){ char++; }
      else { erasing = true; pause = 40; }
    }else{
      if(char>0){ char--; }
      else { erasing=false; idx=(idx+1)%allMsgs.length; pause = 18; }
    }
  }
  setInterval(typeStep, 22);

  function fmt(n){ return String(n).padStart(2,'0'); }

  function computeDays(){
    const v = iDate.value; if(!v){ daysTogether.textContent = 'Isi nama & tanggal untuk menghitung hari bersama ✨'; return; }
    const start = new Date(v+'T00:00:00'); const now = new Date();
    if(isNaN(start.getTime())){ daysTogether.textContent='Tanggal tidak valid.'; return; }
    const diff = Math.floor((now - start)/86400000);
    const years = Math.floor(diff/365); const days = diff - years*365;
    daysTogether.textContent = `Kita sudah bersama ${diff} hari` + (years>0? ` (≈ ${years} tahun ${days} hari)`: '') + ' 💞';
  }

  // --- Ambient music (WebAudio, tanpa file) ---
  class AmbientPlayer{
    constructor(){ this.ctx=null; this.gain=null; this.interval=null; this.running=false; }
    async start(){
      if(this.running) return; this.running=true;
      if(!this.ctx){ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); this.gain = this.ctx.createGain(); this.gain.gain.value = Number(vol.value)||0.15; this.gain.connect(this.ctx.destination); }
      const playPad = () => {
        const base = 220 * (Math.random()<0.5?1:1.12246); // A3 atau Bb3
        [1, 5/4, 3/2].forEach((ratio,i)=>{ // triad
          const osc = this.ctx.createOscillator(); const g = this.ctx.createGain();
          osc.type = ['sine','triangle','sine'][i%3]; osc.frequency.value = base*ratio;
          const now = this.ctx.currentTime; const dur = 3.2 + Math.random()*1.6;
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(this.gain.gain.value*0.5, now+0.4);
          g.gain.linearRampToValueAtTime(0, now+dur);
          osc.connect(g).connect(this.gain);
          osc.start(now); osc.stop(now+dur+0.05);
        });
      };
      playPad();
      this.interval = setInterval(()=>{ if(this.running) playPad(); }, 2200);
    }
    stop(){ this.running=false; if(this.interval){ clearInterval(this.interval); this.interval=null; } }
    setVolume(v){ if(this.gain) this.gain.gain.value = v; }
  }
  const player = new AmbientPlayer();

  // --- State ---
  const state = { A:'', B:'', date:'', msg:'', theme:'merona', font:'sans', vol: Number(vol.value)||0.15 };
  function save(){ try{ localStorage.setItem('lovePage', JSON.stringify(state)); }catch{} }
  function restore(){
    // URL query (opsional): ?a=Faris&b=adella&date=2022-08-01&msg=Kamu terbaik!&theme=ocean&font=serif
    const params = new URLSearchParams(location.search);
    const fromLS = (()=>{ try{ return JSON.parse(localStorage.getItem('lovePage')||'null'); }catch{return null} })() || {};
    const get = (k, def) => params.get(k) ?? fromLS[k] ?? def;
    state.A = get('a','Kamu'); state.B = get('b','adella'); state.date = get('date',''); state.msg = get('msg','');
    state.theme = get('theme','merona'); state.font = get('font','sans'); state.vol = Number(get('vol',state.vol));

    iA.value = state.A; iB.value = state.B; iDate.value = state.date; iMsg.value = state.msg;
    themeSel.value = ['sunset','ocean','forest'].includes(state.theme) ? state.theme : 'merona';
    fontSel.value = ['serif','handwriting'].includes(state.font) ? state.font : 'sans';
    vol.value = String(state.vol);
    applyThemeFont();
    computeDays();
    updateNames();
    rebuildMessages();
  }

  function updateNames(){ nameA.textContent = (state.A||'Kamu'); nameB.textContent = (state.B||'Dia'); }

  function rebuildMessages(){
    allMsgs = msgsBase.slice();
    if(state.msg && state.msg.trim().length){ allMsgs.splice(1,0, state.msg.trim()); }
  }

  function applyThemeFont(){
    document.body.classList.remove('theme-sunset','theme-ocean','theme-forest','font-serif','font-handwriting');
    if(state.theme==='sunset') document.body.classList.add('theme-sunset');
    if(state.theme==='ocean') document.body.classList.add('theme-ocean');
    if(state.theme==='forest') document.body.classList.add('theme-forest');
    if(state.font==='serif') document.body.classList.add('font-serif');
    if(state.font==='handwriting') document.body.classList.add('font-handwriting');
  }

  function letterText(){
    const A = state.A||'Kamu'; const B = state.B||'Dia';
    const today = new Date(); const todayStr = `${fmt(today.getDate())}-${fmt(today.getMonth()+1)}-${today.getFullYear()}`;

    const customPart = state.msg ? state.msg + "\n\n" : '';

    let togetherPart = '';
    if(state.date){
      const start = new Date(state.date+'T00:00:00');
      if(!isNaN(start.getTime())){
        const diff = Math.floor((today - start)/86400000);
        togetherPart = `\n\nSejak ${start.toLocaleDateString('id-ID')} kita sudah berjalan ${diff} hari bersama. Terima kasih untuk setiap detik yang terasa seperti keajaiban.`;
      }
    }

    const body = `${customPart}${B},\n\nTerima kasih sudah jadi baris kode paling cantik dalam aplikasiku. Kalau cintaku adalah fungsi, parameternya hanya satu: ${B}. Dan nilai kembalinya selalu ${A} + ${B}.${togetherPart}\n\n— ${A}`;
    return { body, todayStr };
  }

  function apply(){
    state.A = (iA.value||'').trim() || 'Kamu';
    state.B = (iB.value||'').trim() || 'Dia';
    state.date = (iDate.value||'').trim();
    state.msg = (iMsg.value||'').trim();
    updateNames();
    rebuildMessages();
    computeDays();
    save();
    // Perayaan kecil
    if(typeof window.__burst==='function'){ window.__burst(window.innerWidth/2, window.innerHeight*0.6, 42); }
  }

  // Modal handlers
  function openLetter(){
    const {body, todayStr} = letterText();
    toName.textContent = state.B||'Kamu';
    letterBody.textContent = body;
    todaySpan.textContent = todayStr;
    document.getElementById('modal').classList.add('show');
  }
  function closeLetter(){ document.getElementById('modal').classList.remove('show'); }

  // --- Events ---
  btnStart.addEventListener('click', apply);
  btnLetter.addEventListener('click', ()=>{ apply(); openLetter(); });
  closeModal.addEventListener('click', closeLetter);
  document.getElementById('modal').addEventListener('click', (e)=>{ if(e.target===document.getElementById('modal')) closeLetter(); });
  window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeLetter(); });

  iA.addEventListener('input', ()=>{ state.A = iA.value; updateNames(); save(); });
  iB.addEventListener('input', ()=>{ state.B = iB.value; updateNames(); save(); });
  iMsg.addEventListener('input', ()=>{ state.msg = iMsg.value; rebuildMessages(); save(); });
  iDate.addEventListener('change', ()=>{ state.date = iDate.value; computeDays(); save(); });

  themeSel.addEventListener('change', ()=>{ state.theme = themeSel.value; applyThemeFont(); save(); });
  fontSel.addEventListener('change', ()=>{ state.font = fontSel.value; applyThemeFont(); save(); });

  btnMusic.addEventListener('click', async ()=>{
    if(!player.running){ await player.start(); btnMusic.textContent = 'Jeda Musik ⏸️'; }
    else { player.stop(); btnMusic.textContent = 'Musik Lembut 🎵'; }
  });
  vol.addEventListener('input', ()=>{ const v = Number(vol.value)||0; state.vol=v; player.setVolume(v); save(); });

  // Init
  restore();
  // Hint: auto-apply once if LS has values
  if(localStorage.getItem('lovePage')) apply();
})();