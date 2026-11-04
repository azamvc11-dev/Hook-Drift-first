// Вся музыка и звуки синтезируются через Web Audio API на лету —
// внешние mp3/wav не нужны, поэтому игра работает полностью офлайн
// и не весит лишних мегабайт. Пять жанров генерируются процедурно,
// каждый со своей гаммой, темпом, тембром и (где уместно) ритм-секцией.
window.AudioEngine = (function(){
  let ctx=null, masterGain=null, musicGain=null, sfxGain=null, delayNode=null, delayFeedback=null;
  let musicOn=true, sfxOn=true;
  let musicTimer=null, droneTimer=null, percTimer=null, hatTimer=null;
  let autoChange=false, autoChangeTimer=null;
  let currentGenreId='calm';

  const GENRES = {
    calm: {
      name:'Спокойная', scale:[261.6,293.7,329.6,392.0,440.0], droneScale:[130.8,146.8,164.8,196.0],
      noteMs:700, droneMs:6000, noteDur:1.7, droneDur:5.5, wave:'sine', vol:0.075, droneVol:0.045,
      delay:0.42, feedback:0.32, perc:null
    },
    phonk: {
      name:'Фонк', scale:[110,116.5,130.8,138.6], droneScale:[55,58.3], noteMs:300, droneMs:2600,
      noteDur:0.5, droneDur:2.4, wave:'sawtooth', vol:0.09, droneVol:0.09,
      delay:0.18, feedback:0.22, perc:{ kickMs:600, hatMs:150, kickVol:0.35, hatVol:0.10 }
    },
    synth: {
      name:'Электро', scale:[329.6,392.0,440.0,493.9,587.3], droneScale:[164.8,196.0], noteMs:220,
      droneMs:3200, noteDur:0.35, droneDur:3, wave:'square', vol:0.05, droneVol:0.05,
      delay:0.28, feedback:0.3, perc:{ kickMs:480, hatMs:240, kickVol:0.28, hatVol:0.08 }
    },
    chip: {
      name:'Чиптюн', scale:[523.3,587.3,659.3,784.0,880.0,987.8], droneScale:[261.6,329.6], noteMs:170,
      droneMs:2800, noteDur:0.14, droneDur:2.2, wave:'square', vol:0.045, droneVol:0.03,
      delay:0.12, feedback:0.15, perc:{ kickMs:680, hatMs:170, kickVol:0.18, hatVol:0.06 }
    },
    space: {
      name:'Эмбиент', scale:[220.0,246.9,277.2,329.6], droneScale:[110.0,116.5,130.8], noteMs:1500,
      droneMs:9000, noteDur:3.2, droneDur:8, wave:'sine', vol:0.06, droneVol:0.05,
      delay:0.6, feedback:0.42, perc:null
    }
  };

  function genreList(){
    return Object.keys(GENRES).map(id=>({ id, name:GENRES[id].name }));
  }

  function ensureCtx(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return false;
      ctx = new AC();
      masterGain = ctx.createGain(); masterGain.gain.value = 0.9; masterGain.connect(ctx.destination);
      musicGain  = ctx.createGain(); musicGain.gain.value  = 0.1; musicGain.connect(masterGain);
      sfxGain    = ctx.createGain(); sfxGain.gain.value    = 0.5; sfxGain.connect(masterGain);

      delayNode = ctx.createDelay(2.0); delayNode.delayTime.value = 0.42;
      delayFeedback = ctx.createGain(); delayFeedback.gain.value = 0.32;
      delayNode.connect(delayFeedback); delayFeedback.connect(delayNode);
      musicGain.connect(delayNode); delayNode.connect(masterGain);
    }
    if(ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function blip(freq, dur, type, dest, vol){
    if(!ensureCtx()) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.value = 0;
    o.connect(g); g.connect(dest || sfxGain);
    const t = ctx.currentTime;
    g.gain.linearRampToValueAtTime(vol || 0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, vol, dest){
    if(!ensureCtx()) return;
    const size = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<size;i++) data[i] = (Math.random()*2-1) * (1 - i/size);
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const g = ctx.createGain(); g.gain.value = vol || 0.35;
    src.connect(g); g.connect(dest || sfxGain);
    src.start();
  }

  function kickThump(vol){
    if(!ensureCtx()) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    const t = ctx.currentTime;
    o.type='sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t+0.15);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t+0.22);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t+0.24);
  }

  function musicStep(){
    if(!musicOn) return;
    const g = GENRES[currentGenreId];
    const note = g.scale[Math.floor(Math.random()*g.scale.length)] * (Math.random() < 0.12 ? 2 : 1);
    blip(note, g.noteDur, g.wave, musicGain, g.vol);
  }
  function droneStep(){
    if(!musicOn) return;
    const g = GENRES[currentGenreId];
    const note = g.droneScale[Math.floor(Math.random()*g.droneScale.length)];
    blip(note, g.droneDur, 'sine', musicGain, g.droneVol);
  }
  function percStep(){
    if(!musicOn) return;
    const g = GENRES[currentGenreId];
    if(!g.perc) return;
    kickThump(g.perc.kickVol);
  }
  function hatStep(){
    if(!musicOn) return;
    const g = GENRES[currentGenreId];
    if(!g.perc) return;
    noiseBurst(0.04, g.perc.hatVol, musicGain);
  }

  function clearTimers(){
    if(musicTimer){ clearInterval(musicTimer); musicTimer=null; }
    if(droneTimer){ clearInterval(droneTimer); droneTimer=null; }
    if(percTimer){ clearInterval(percTimer); percTimer=null; }
    if(hatTimer){ clearInterval(hatTimer); hatTimer=null; }
  }

  function startMusic(){
    if(!ensureCtx()) return;
    clearTimers();
    if(!musicOn) return;
    const g = GENRES[currentGenreId];
    if(delayNode) delayNode.delayTime.value = g.delay;
    if(delayFeedback) delayFeedback.gain.value = g.feedback;
    musicStep(); droneStep();
    musicTimer = setInterval(musicStep, g.noteMs);
    droneTimer = setInterval(droneStep, g.droneMs);
    if(g.perc){
      percTimer = setInterval(percStep, g.perc.kickMs);
      hatTimer = setInterval(hatStep, g.perc.hatMs);
    }
  }
  function stopMusic(){ clearTimers(); }

  function setGenre(id){
    if(!GENRES[id]) return;
    currentGenreId = id;
    if(musicOn) startMusic();
  }

  function setAutoChange(v){
    autoChange = v;
    if(autoChangeTimer){ clearInterval(autoChangeTimer); autoChangeTimer=null; }
    if(autoChange){
      autoChangeTimer = setInterval(()=>{
        const ids = Object.keys(GENRES).filter(id=>id!==currentGenreId);
        setGenre(ids[Math.floor(Math.random()*ids.length)]);
      }, 75000);
    }
  }

  return {
    unlock(){ ensureCtx(); },

    hook(){ if(sfxOn) blip(660, 0.12, 'square', sfxGain, 0.25); },
    bounce(){ if(sfxOn){ blip(180, 0.15, 'sawtooth', sfxGain, 0.3); noiseBurst(0.08, 0.22); } },
    death(){ if(sfxOn) blip(140, 0.6, 'sawtooth', sfxGain, 0.35); },
    boost(){
      if(!sfxOn || !ensureCtx()) return;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'triangle';
      const t = ctx.currentTime;
      o.frequency.setValueAtTime(260, t);
      o.frequency.exponentialRampToValueAtTime(760, t + 0.22);
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(0.32, t+0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.28);
      o.connect(g); g.connect(sfxGain);
      o.start(t); o.stop(t+0.3);
    },
    unlockSkin(){
      if(!sfxOn) return;
      blip(880, 0.15, 'sine', sfxGain, 0.3);
      setTimeout(()=>blip(1174, 0.2, 'sine', sfxGain, 0.3), 120);
    },

    startMusic, stopMusic, setGenre, setAutoChange, genreList,
    setMusic(v){ musicOn = v; if(v) startMusic(); else stopMusic(); },
    setSfx(v){ sfxOn = v; },
    get musicOn(){ return musicOn; },
    get sfxOn(){ return sfxOn; },
    get currentGenre(){ return currentGenreId; },
    get autoChangeOn(){ return autoChange; },
  };
})();
