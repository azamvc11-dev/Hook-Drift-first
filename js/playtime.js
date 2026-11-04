// Считает реальное игровое время (только пока идёт забег — Game.running === true)
// и периодически отправляет накопленное в Supabase, чтобы не слать запрос на
// каждую секунду.
window.PlaytimeTracker = (function(){
  let accumulated = 0;
  let lastTick = null;

  function tick(){
    if(window.Game && Game.running){
      const now = performance.now();
      if(lastTick !== null) accumulated += (now - lastTick) / 1000;
      lastTick = now;
    } else {
      lastTick = null;
    }
  }

  async function flush(){
    if(accumulated < 1) return;
    const secs = accumulated;
    accumulated = 0;
    await AuthManager.addPlaytime(secs);
  }

  function start(){
    setInterval(tick, 1000);
    setInterval(flush, 20000);
    document.addEventListener('visibilitychange', ()=>{ if(document.hidden) flush(); });
    window.addEventListener('pagehide', ()=>{ flush(); });
  }

  function formatDuration(totalSeconds){
    const s = Math.floor(totalSeconds || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if(h > 0) return h + 'ч ' + m + 'м';
    if(m > 0) return m + 'м';
    return s + 'с';
  }

  return { start, flush, formatDuration };
})();
