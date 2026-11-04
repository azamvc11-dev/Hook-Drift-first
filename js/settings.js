// Настройки: язык интерфейса + предпочитаемая ориентация экрана + музыка.
//
// Ориентация: настоящий screen.orientation.lock() работает только в
// полноэкранном режиме и только в части браузеров (в основном Android
// Chrome) — в Safari на iOS его вообще нет. Поэтому визуальный разворот
// экрана делаем сами через CSS-трансформацию (#wrap.force-rotate-*), а
// чтобы при этом не сломать вёрстку — считаем "эффективные" (с учётом
// разворота) ширину/высоту и публикуем их как CSS-переменные --evw/--evh,
// которые использует вся адаптивная вёрстка вместо нативных vw/vh
// (те всегда меряются от реального, неразвёрнутого экрана и не знают
// о нашей трансформации).
window.SettingsManager = (function(){
  let orientation = 'auto'; // auto | portrait | landscape
  let musicGenre = 'calm';
  let musicAutoChange = false;
  let lastDims = { effW: window.innerWidth, effH: window.innerHeight, rotate: null };

  async function load(){
    try{
      if(window.storage){
        const r = await window.storage.get('hookdrift_orientation', false);
        if(r && r.value) orientation = r.value;
      }
    }catch(e){}
    try{
      if(window.storage){
        const g = await window.storage.get('hookdrift_music_genre', false);
        if(g && g.value) musicGenre = g.value;
      }
    }catch(e){}
    try{
      if(window.storage){
        const a = await window.storage.get('hookdrift_music_auto', false);
        if(a && a.value) musicAutoChange = a.value === '1';
      }
    }catch(e){}
    AudioEngine.setGenre(musicGenre);
    AudioEngine.setAutoChange(musicAutoChange);
  }

  async function setMusicGenre(id){
    musicGenre = id;
    AudioEngine.setGenre(id);
    try{ if(window.storage) await window.storage.set('hookdrift_music_genre', id, false); }catch(e){}
  }

  async function setMusicAutoChange(v){
    musicAutoChange = v;
    AudioEngine.setAutoChange(v);
    try{ if(window.storage) await window.storage.set('hookdrift_music_auto', v?'1':'0', false); }catch(e){}
  }

  async function setOrientation(v){
    orientation = v;
    try{ if(window.storage) await window.storage.set('hookdrift_orientation', v, false); }catch(e){}
    apply(); // switch instantly — don't wait for the device to physically rotate
  }

  // Работает только там, где браузер это реально поддерживает (обычно
  // Android Chrome, и только в полноэкранном режиме) — на iOS Safari это
  // всегда no-op, там всю работу делает CSS-разворот ниже.
  function tryRealLock(){
    try{
      if(orientation === 'auto'){
        if(screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
        return;
      }
      const type = orientation === 'landscape' ? 'landscape' : 'portrait';
      if(screen.orientation && screen.orientation.lock){
        screen.orientation.lock(type).catch(()=>{});
      }
    }catch(e){}
  }

  function computeEffectiveDims(){
    const realW = window.innerWidth, realH = window.innerHeight;
    const realIsPortrait = realH >= realW;
    let rotate = null;
    if(orientation === 'landscape' && realIsPortrait) rotate = 'cw';
    else if(orientation === 'portrait' && !realIsPortrait) rotate = 'ccw';
    const effW = rotate ? realH : realW;
    const effH = rotate ? realW : realH;
    return { realW, realH, effW, effH, rotate };
  }

  function getEffectiveDims(){ return lastDims; }

  function apply(){
    tryRealLock();
    const dims = computeEffectiveDims();
    lastDims = dims;

    const html = document.documentElement;
    const wrap = document.getElementById('wrap');
    if(wrap){
      wrap.classList.toggle('force-rotate-cw', dims.rotate === 'cw');
      wrap.classList.toggle('force-rotate-ccw', dims.rotate === 'ccw');
    }

    // Публикуем эффективные размеры как CSS-переменные — вся вёрстка в
    // css/style.css использует calc(var(--evw)*N) вместо Nvw по этой причине.
    html.style.setProperty('--evw', (dims.effW/100)+'px');
    html.style.setProperty('--evh', (dims.effH/100)+'px');

    // JS-управляемые брейкпоинты вместо @media — те тоже меряют от
    // реального экрана и не видят наш разворот.
    html.classList.toggle('narrow-screen', dims.effW <= 420);
    html.classList.toggle('very-narrow-screen', dims.effW <= 340);
    html.classList.toggle('short-screen', dims.effH <= 480);
    html.classList.toggle('wide-screen', dims.effW >= 700);

    if(window.Game) Game.resize();
  }

  return { load, setOrientation, apply, tryRealLock, getEffectiveDims, setMusicGenre, setMusicAutoChange,
    get orientation(){ return orientation; },
    get musicGenre(){ return musicGenre; },
    get musicAutoChange(){ return musicAutoChange; } };
})();
