// Блоки-препятствия: при столкновении отражают игрока (рикошет), а не убивают его.
// Плюс отдельные "батутные" блоки внизу — подбрасывают игрока вверх, чтобы помочь ему.
// Поддерживает масштаб мира (setScale) — на узких телефонных экранах блоки и
// расстояния между ними пропорционально меньше, чтобы ничего не "вылезало" за экран.
window.BlockManager = (function(){
  let blocks = [];
  let boosts = [];
  let nextBoostX = 0;
  let scale = 1;

  const RESTITUTION = 1.0;
  const MAX_BOUNCE_SPEED = 18;
  const MAX_DOWN_SPEED_AFTER_BOUNCE = 6;

  function rand(a,b){ return a + Math.random()*(b-a); }

  function setScale(s){ scale = s; }

  function reset(){
    blocks = [];
    boosts = [];
    nextBoostX = rand(2700, 5400) * scale; // первый батут через 150-300м (метр = 18px)
  }

  function spawnBetween(x1, y1, x2, y2){
    if(Math.random() > 0.35) return;
    const t = 0.35 + Math.random()*0.3;
    const bx = x1 + (x2-x1)*t;
    const by = y1 + (y2-y1)*t + (Math.random()<0.5 ? -70*scale : 70*scale);
    const w = (44 + Math.random()*28) * scale;
    const h = (44 + Math.random()*28) * scale;
    blocks.push({ x: bx - w/2, y: by - h/2, w, h });
  }

  function maybeSpawnBoosts(frontierX, bottomY){
    while(nextBoostX < frontierX + 1400*scale){
      const w = 92*scale, h = 22*scale;
      boosts.push({ x: nextBoostX - w/2, y: bottomY - h, w, h });
      nextBoostX += rand(2700, 5400) * scale;
    }
  }

  function all(){ return blocks; }
  function allBoosts(){ return boosts; }

  function pruneBehind(minX){
    blocks = blocks.filter(b => b.x + b.w > minX - 200);
    boosts = boosts.filter(b => b.x + b.w > minX - 200);
  }

  function checkCollision(px, py, radius){
    for(const b of blocks){
      const cx = Math.max(b.x, Math.min(px, b.x + b.w));
      const cy = Math.max(b.y, Math.min(py, b.y + b.h));
      const dx = px - cx, dy = py - cy;
      const distSq = dx*dx + dy*dy;
      if(distSq < radius*radius){
        const dist = Math.sqrt(distSq) || 0.001;
        return { block: b, nx: dx/dist, ny: dy/dist, penetration: radius - dist };
      }
    }
    return null;
  }

  function checkBoostCollision(px, py, radius){
    for(const b of boosts){
      const cx = Math.max(b.x, Math.min(px, b.x + b.w));
      const cy = Math.max(b.y, Math.min(py, b.y + b.h));
      const dx = px - cx, dy = py - cy;
      if(dx*dx + dy*dy < radius*radius) return b;
    }
    return null;
  }

  function reflect(vx, vy, nx, ny){
    const dot = vx*nx + vy*ny;
    let rvx = vx - 2*dot*nx;
    let rvy = vy - 2*dot*ny;
    rvx *= RESTITUTION; rvy *= RESTITUTION;
    const sp = Math.hypot(rvx, rvy);
    if(sp > MAX_BOUNCE_SPEED){ rvx *= MAX_BOUNCE_SPEED/sp; rvy *= MAX_BOUNCE_SPEED/sp; }
    if(rvy > MAX_DOWN_SPEED_AFTER_BOUNCE) rvy = MAX_DOWN_SPEED_AFTER_BOUNCE;
    return { vx: rvx, vy: rvy };
  }

  return {
    reset, spawnBetween, maybeSpawnBoosts, setScale,
    all, allBoosts, pruneBehind,
    checkCollision, checkBoostCollision, reflect
  };
})();
