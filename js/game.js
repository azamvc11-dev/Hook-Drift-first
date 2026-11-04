window.Game = (function(){
  let canvas, ctx, W, H, DPR;
  let worldScale = 1; // <1 on narrow phone screens — shrinks spatial layout so nothing runs off-screen

  const G = 0.54;
  let PLAYER_R = 13;
  let NODE_R = 8;
  const REEL_SPEED = 2.1;
  let MIN_ROPE = 46;
  let MAX_HOOK_DIST = 720;
  const BOTTOM_DEATH_MARGIN = 60;
  let SPIDER_SPEED = 15;
  let NODE_Y_MIN = 60, NODE_Y_MAX = 340;
  let GAP_X_MIN = 150, GAP_X_MAX = 250, GAP_Y = 140;

  let state = 'idle'; // idle | swing | spider | fly | dead
  let player, camX, camY, nodes, particles, ambient;
  let lastNodeUsedIndex, distanceScore, holdReel;
  let anchor = null, ropeLen = 0;
  let running = false;
  let onScoreChange = null, onDeath = null;
  let spiderMode = false;
  let spiderDir = { x:0, y:0 };
  let revivesUsed = 0;

  function rand(a,b){ return a + Math.random()*(b-a); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  function init(canvasEl){
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    resetWorld();
    running = false;
    state = 'idle';
  }

  function resize(){
    DPR = Math.min(window.devicePixelRatio||1, 2.5);
    if(window.SettingsManager){
      const dims = SettingsManager.getEffectiveDims();
      W = dims.effW; H = dims.effH;
    } else {
      W = window.innerWidth; H = window.innerHeight;
    }
    canvas.width = W*DPR; canvas.height = H*DPR;
    canvas.style.width = W+'px'; canvas.style.height = H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    updateScale();
  }

  // Recomputes every spatial constant from the real screen size, so a narrow
  // phone screen gets a proportionally smaller, denser world instead of the
  // desktop-calibrated layout running off the edges.
  function updateScale(){
    const REF_W = 900;
    worldScale = clamp(Math.min(W,1400)/REF_W, 0.55, 1);
    PLAYER_R = 13*worldScale;
    NODE_R = 8*worldScale;
    MIN_ROPE = 46*worldScale;
    MAX_HOOK_DIST = Math.max(420, 720*worldScale);
    SPIDER_SPEED = 15*worldScale;
    GAP_X_MIN = 150*worldScale; GAP_X_MAX = 250*worldScale; GAP_Y = 140*worldScale;
    NODE_Y_MIN = H*0.08; NODE_Y_MAX = H*0.55;
    if(window.BlockManager) BlockManager.setScale(worldScale);
  }

  function resetWorld(){
    player = { x:80, y:H*0.2, vx:5.5*worldScale, vy:0 };
    camX = 0; camY = 0;
    nodes = [];
    particles = [];
    ambient = [];
    lastNodeUsedIndex = -1;
    distanceScore = 0;
    state = 'fly';
    holdReel = false;
    anchor = null; ropeLen = 0;

    BlockManager.reset();

    let x = 260*worldScale, y = H*0.3;
    let px = player.x, py = player.y;
    for(let i=0;i<40;i++){
      x += rand(GAP_X_MIN,GAP_X_MAX);
      y += rand(-GAP_Y,GAP_Y);
      y = clamp(y, NODE_Y_MIN, NODE_Y_MAX);
      nodes.push({x,y,used:false,star:(i%4===2)});
      BlockManager.spawnBetween(px,py,x,y);
      px=x; py=y;
    }
    BlockManager.maybeSpawnBoosts(x, H);
    seedAmbient(-200, W*2);
  }

  function seedAmbient(fromX, toX){
    for(let i=0;i<36;i++){
      ambient.push({
        x: rand(fromX,toX), y: rand(-40,H+40),
        vx: rand(-0.12,0.12), vy: rand(-0.3,-0.06),
        r: rand(1,2.4)*worldScale, a: rand(0.15,0.5)
      });
    }
  }

  function nextHookIndex(){
    for(let i=lastNodeUsedIndex+1;i<nodes.length;i++){
      if(nodes[i].x > player.x - 20) return i;
    }
    return -1;
  }

  function tryHook(){
    if(state==='dead' || !running) return;
    const idx = nextHookIndex();
    if(idx===-1) return;
    const n = nodes[idx];
    const dx = n.x-player.x, dy = n.y-player.y;
    const dist = Math.hypot(dx,dy);
    if(dist > MAX_HOOK_DIST) return;
    anchor = n;
    lastNodeUsedIndex = idx;
    n.used = true;
    spawnBurst(n.x, n.y, '#e5e5ea');
    AudioEngine.hook();

    if(spiderMode){
      const len = dist || 0.001;
      spiderDir = { x: dx/len, y: dy/len };
      state = 'spider';
    } else {
      ropeLen = dist;
      state = 'swing';
      holdReel = true;
    }
  }

  function releaseHook(){
    if(state==='swing' || state==='spider'){
      state = 'fly';
      anchor = null;
      holdReel = false;
    }
  }

  function pointerDown(){
    if(!running) return;
    if(state==='dead') return;
    if(state==='fly' || state==='idle'){ tryHook(); }
    else if(state==='swing'){ holdReel = true; }
  }
  function pointerUp(){
    releaseHook();
  }

  function spawnBurst(x,y,color,n){
    n = n||10;
    for(let i=0;i<n;i++){
      particles.push({x,y,vx:rand(-3,3)*worldScale,vy:rand(-4,1)*worldScale,life:26,size:3*worldScale,color});
    }
  }

  // Continuous trail behind the player, Geometry Dash style — small motes
  // peeling off opposite the direction of travel, tinted with the skin colour.
  function spawnTrail(){
    const skin = SkinManager.current();
    const speed = Math.hypot(player.vx, player.vy);
    if(speed < 1) return;
    const back = Math.atan2(player.vy, player.vx) + Math.PI;
    const spread = 0.5;
    for(let i=0;i<2;i++){
      const a = back + rand(-spread,spread);
      const s = rand(0.6,1.6)*worldScale;
      particles.push({
        x: player.x + Math.cos(a)*PLAYER_R*0.6,
        y: player.y + Math.sin(a)*PLAYER_R*0.6,
        vx: Math.cos(a)*s + player.vx*0.15,
        vy: Math.sin(a)*s + player.vy*0.15,
        life: 16, maxLife:16, size: rand(1.2,2.2)*worldScale,
        color: Math.random()<0.5 ? skin.body : skin.accent
      });
    }
  }

  function update(){
    if(state==='dead' || !running) return;

    if(state==='swing' && anchor){
      player.vy += G;
      let nx = player.x + player.vx;
      let ny = player.y + player.vy;
      if(holdReel && ropeLen > MIN_ROPE) ropeLen -= REEL_SPEED*worldScale;
      const dx = nx - anchor.x, dy = ny - anchor.y;
      const d = Math.hypot(dx,dy) || 0.0001;
      const sc = ropeLen/d;
      nx = anchor.x + dx*sc;
      ny = anchor.y + dy*sc;
      player.vx = nx - player.x;
      player.vy = ny - player.y;
      player.x = nx; player.y = ny;

      const maxSp = 22*worldScale;
      const sp = Math.hypot(player.vx,player.vy);
      if(sp>maxSp){ player.vx *= maxSp/sp; player.vy *= maxSp/sp; }
    } else if(state==='spider' && anchor){
      player.x += spiderDir.x * SPIDER_SPEED;
      player.y += spiderDir.y * SPIDER_SPEED;
      player.vx = spiderDir.x * SPIDER_SPEED;
      player.vy = spiderDir.y * SPIDER_SPEED;
      const passed = (player.x-anchor.x)*spiderDir.x + (player.y-anchor.y)*spiderDir.y;
      if(passed >= 0){
        state = 'fly';
        anchor = null;
      }
    } else if(state==='fly' || state==='idle'){
      player.vy += G;
      player.x += player.vx;
      player.y += player.vy;
      if(state==='idle') state='fly';
    }

    const hit = BlockManager.checkCollision(player.x, player.y, PLAYER_R);
    if(hit){
      if(state==='swing' || state==='spider'){ state='fly'; anchor=null; holdReel=false; }
      player.x += hit.nx * hit.penetration;
      player.y += hit.ny * hit.penetration;
      const r = BlockManager.reflect(player.vx, player.vy, hit.nx, hit.ny);
      player.vx = r.vx; player.vy = r.vy;
      spawnBurst(player.x, player.y, '#9a9a9e', 14);
      AudioEngine.bounce();
    }

    const boostHit = BlockManager.checkBoostCollision(player.x, player.y, PLAYER_R);
    if(boostHit){
      if(state==='swing' || state==='spider'){ state='fly'; anchor=null; holdReel=false; }
      player.y = boostHit.y - PLAYER_R - 1;
      player.vy = -19*worldScale;
      player.vx = Math.max(player.vx, 7*worldScale);
      spawnBurst(player.x, player.y, '#ffffff', 16);
      AudioEngine.boost();
    }

    camX += ( (player.x - W*0.36) - camX ) * 0.12;
    camY += ( (player.y - H*0.5) - camY ) * 0.08;

    const d = Math.max(0, Math.floor(player.x/(18*worldScale)));
    if(d>distanceScore){
      distanceScore = d;
      if(onScoreChange) onScoreChange(distanceScore);
    }

    const last = nodes[nodes.length-1];
    if(last.x - player.x < 900*worldScale){
      let x = last.x + rand(GAP_X_MIN,GAP_X_MAX);
      let y = last.y + rand(-GAP_Y,GAP_Y);
      y = clamp(y, NODE_Y_MIN, NODE_Y_MAX);
      nodes.push({x,y,used:false,star:(nodes.length%4===2)});
      BlockManager.spawnBetween(last.x,last.y,x,y);
    }
    BlockManager.maybeSpawnBoosts(player.x + 1200*worldScale, H);
    BlockManager.pruneBehind(player.x - 400);

    spawnTrail();

    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.life--;
      if(p.life<=0) particles.splice(i,1);
    }

    // ambient floating motes: drift, wrap vertically, recycle horizontally
    for(const p of ambient){
      p.x+=p.vx; p.y+=p.vy;
      if(p.y<-40) p.y=H+40;
      if(p.y>H+40) p.y=-40;
    }
    ambient = ambient.filter(p=>p.x > camX-150);
    while(ambient.length < 36){
      ambient.push({
        x: camX + rand(W*0.3,W*1.5), y: rand(-40,H+40),
        vx: rand(-0.12,0.12), vy: rand(-0.3,-0.06),
        r: rand(1,2.4)*worldScale, a: rand(0.15,0.5)
      });
    }

    const screenY = player.y - camY;
    if(screenY > H + BOTTOM_DEATH_MARGIN){
      die();
    }
  }

  function die(){
    if(state==='dead') return;
    state='dead';
    running=false;
    spawnBurst(player.x, player.y, '#9a9a9e');
    AudioEngine.death();
    if(onDeath) onDeath(distanceScore);
  }

  // ---------- Drawing ----------
  function worldToScreen(x,y){ return [x-camX, y-camY]; }

  function drawBackground(){
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#0a0a0c');
    g.addColorStop(.55,'#2a2a2e');
    g.addColorStop(1,'#4a4a4e');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

    const sunX = W*0.78 - camX*0.05;
    const sunY = H*0.22 + camY*0.05;
    const sg = ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,140*worldScale+H*0.15);
    sg.addColorStop(0,'rgba(255,255,255,0.4)');
    sg.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(sunX,sunY,140*worldScale+H*0.15,0,Math.PI*2); ctx.fill();

    drawBuildings(camX*0.25, H*0.72, 0.55, 'rgba(35,35,38,0.55)', Math.max(50,90*worldScale));
    drawBuildings(camX*0.5, H*0.8, 0.85, 'rgba(35,35,38,0.8)', Math.max(35,60*worldScale));

    ctx.fillStyle='rgba(255,255,255,0.5)';
    for(let i=0;i<60;i++){
      const sy = (i*71) % (H*0.5);
      ctx.globalAlpha = 0.15 + (i%5)*0.08;
      const sx = (((i*137 - camX*0.15)%(W+200))+W+200)%(W+200)-100;
      ctx.fillRect(sx, sy, 2,2);
    }
    ctx.globalAlpha=1;
  }

  function drawBuildings(offsetX, baseY, seedMul, color, unit){
    ctx.fillStyle = color;
    const start = Math.floor((camX - offsetX)/unit)-2;
    for(let i=start;i<start+(W/unit)+4;i++){
      const h = 60*worldScale + (Math.abs(Math.sin(i*seedMul*12.9898))*160*worldScale);
      const bx = i*unit - (camX-offsetX);
      ctx.fillRect(bx, baseY-h, unit-8, h+400);
    }
  }

  function drawAmbient(){
    for(const p of ambient){
      const [sx,sy] = worldToScreen(p.x,p.y);
      if(sx<-10||sx>W+10) continue;
      ctx.globalAlpha = p.a;
      ctx.fillStyle = '#f4f4f6';
      ctx.beginPath(); ctx.arc(sx,sy,p.r,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawRope(){
    if((state==='swing' || state==='spider') && anchor){
      const [ax,ay] = worldToScreen(anchor.x, anchor.y);
      const [px,py] = worldToScreen(player.x, player.y);
      ctx.strokeStyle = 'rgba(244,244,246,0.85)';
      ctx.lineWidth = Math.max(1.5, 2.4*worldScale);
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(px,py); ctx.stroke();
    }
  }

  function drawNodes(){
    for(const n of nodes){
      if(n.x - camX < -60 || n.x-camX > W+60) continue;
      const [sx,sy] = worldToScreen(n.x,n.y);
      const glowR = 22*worldScale;
      const glow = ctx.createRadialGradient(sx,sy,0,sx,sy,glowR);
      const c = n.used ? 'rgba(120,120,125,0.25)' : (n.star?'rgba(255,255,255,0.7)':'rgba(229,229,234,0.7)');
      glow.addColorStop(0, c); glow.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(sx,sy,glowR,0,Math.PI*2); ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = n.used ? '#4a4a4d' : (n.star ? '#ffffff' : '#e5e5ea');
      ctx.arc(sx,sy,NODE_R,0,Math.PI*2); ctx.fill();
      ctx.lineWidth=Math.max(1.2,2*worldScale); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
    }
  }

  function drawBoosts(){
    for(const b of BlockManager.allBoosts()){
      if(b.x - camX < -80 || b.x-camX > W+80) continue;
      const sx = b.x-camX, sy = b.y-camY;
      const glow = ctx.createRadialGradient(sx+b.w/2, sy+b.h/2, 0, sx+b.w/2, sy+b.h/2, b.w*0.8);
      glow.addColorStop(0,'rgba(255,255,255,0.3)');
      glow.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(sx-20, sy-20, b.w+40, b.h+40);

      ctx.fillStyle = '#1c1c1e';
      ctx.fillRect(sx, sy, b.w, b.h);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5,2.5*worldScale);
      ctx.strokeRect(sx, sy, b.w, b.h);

      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1.5,3*worldScale);
      const cw = b.w/3;
      for(let i=0;i<3;i++){
        const cx = sx + cw*i + cw/2;
        ctx.beginPath();
        ctx.moveTo(cx-8*worldScale, sy+b.h*0.7);
        ctx.lineTo(cx, sy+b.h*0.25);
        ctx.lineTo(cx+8*worldScale, sy+b.h*0.7);
        ctx.stroke();
      }
    }
  }

  function drawBlocks(){
    for(const b of BlockManager.all()){
      if(b.x - camX < -80 || b.x-camX > W+80) continue;
      const sx = b.x-camX, sy = b.y-camY;
      ctx.fillStyle = 'rgba(154,154,158,0.18)';
      ctx.fillRect(sx-4, sy-4, b.w+8, b.h+8);
      ctx.fillStyle = '#232325';
      ctx.fillRect(sx, sy, b.w, b.h);
      ctx.strokeStyle = '#9a9a9e'; ctx.lineWidth = Math.max(1.5,2.5*worldScale);
      ctx.strokeRect(sx, sy, b.w, b.h);
      ctx.save();
      ctx.beginPath(); ctx.rect(sx,sy,b.w,b.h); ctx.clip();
      ctx.strokeStyle='rgba(154,154,158,0.35)'; ctx.lineWidth=Math.max(3,6*worldScale);
      for(let i=-b.h;i<b.w;i+=14*worldScale){
        ctx.beginPath(); ctx.moveTo(sx+i,sy+b.h); ctx.lineTo(sx+i+b.h,sy); ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ---------- Procedural stickman ----------
  function drawPlayer(){
    const [sx,sy] = worldToScreen(player.x, player.y);
    const skin = SkinManager.current();
    const t = Date.now();
    const r = PLAYER_R;

    const speed = Math.hypot(player.vx, player.vy);
    const velAngle = speed > 0.6 ? Math.atan2(player.vy, player.vx) : 0;
    const lean = clamp(velAngle, -1.3, 1.3) * 0.32;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(lean);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if(skin.accessory === 'cape'){
      const sway = Math.sin(t/200)*10 - lean*14;
      ctx.beginPath();
      ctx.moveTo(-r*0.5, r*1.3);
      ctx.quadraticCurveTo(-r*2.0+sway, r*2.6, -r*1.6+sway*1.3, r*4.3);
      ctx.lineTo(r*0.15, r*3.9);
      ctx.quadraticCurveTo(-r*0.6, r*2.3, r*0.5, r*1.3);
      ctx.closePath();
      ctx.fillStyle = skin.accent;
      ctx.fill();
      ctx.lineWidth = Math.max(1, r*0.06);
      ctx.strokeStyle = skin.outline;
      ctx.stroke();
    }
    if(skin.accessory === 'band'){
      const flap = Math.sin(t/130);
      ctx.strokeStyle = skin.accent;
      ctx.lineWidth = Math.max(1.4, r*0.16);
      ctx.beginPath();
      ctx.moveTo(-r*0.7, -r*0.05);
      ctx.quadraticCurveTo(-r*1.6, r*0.35+flap*r*0.35, -r*2.3, r*0.15+flap*r*0.55);
      ctx.stroke();
    }

    const headR = r*1.08;
    const torsoLen = r*2.0;
    const torsoW = r*1.15;
    const armLen = r*1.55;
    const legLen = r*1.75;
    const limbW = Math.max(2.2, r*0.5);
    const neckY = headR*0.62;
    const hipY = neckY + torsoLen;
    const shoulderY = neckY + torsoLen*0.1;

    // legs — alternating running/flailing cycle, drawn as thick "meaty" capsules
    const legPhase = t/110 + player.x*0.008;
    const active = (state==='fly' || state==='idle');
    function drawLeg(side, phaseOffset){
      const swing = Math.sin(legPhase + phaseOffset);
      const spread = active ? 1 : 0.4;
      const kneeX = side*legLen*0.3*spread;
      const kneeY = hipY + legLen*0.5;
      const footX = side*legLen*0.48*spread + swing*legLen*0.2*spread;
      const footY = hipY + legLen*0.92 + Math.abs(swing)*legLen*0.1*spread;
      ctx.strokeStyle = skin.body;
      ctx.lineWidth = limbW;
      ctx.beginPath();
      ctx.moveTo(0, hipY*0.94);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();
      ctx.strokeStyle = skin.outline;
      ctx.lineWidth = Math.max(1.2, limbW*0.16);
      ctx.stroke();
    }
    drawLeg(-1, 0);
    drawLeg(1, Math.PI);

    // torso — filled rounded capsule instead of a thin line, for real "body mass"
    ctx.beginPath();
    ctx.moveTo(-torsoW/2, neckY + torsoW/2);
    ctx.arcTo(-torsoW/2, hipY, 0, hipY, torsoW/2);
    ctx.arcTo(torsoW/2, hipY, torsoW/2, neckY, torsoW/2);
    ctx.arcTo(torsoW/2, neckY, 0, neckY, torsoW/2);
    ctx.arcTo(-torsoW/2, neckY, -torsoW/2, neckY+torsoW/2, torsoW/2);
    ctx.closePath();
    ctx.fillStyle = skin.body;
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, limbW*0.16);
    ctx.strokeStyle = skin.outline;
    ctx.stroke();

    // arms — thick capsules, reaching toward the anchor when hooked
    function drawArm(side, angle, reach){
      const handX = Math.cos(angle)*armLen*reach;
      const handY = shoulderY + Math.sin(angle)*armLen*reach;
      const elbowX = handX*0.55 + side*armLen*0.1;
      const elbowY = shoulderY + (handY-shoulderY)*0.55;
      ctx.strokeStyle = skin.body;
      ctx.lineWidth = limbW*0.85;
      ctx.beginPath();
      ctx.moveTo(side*torsoW*0.4, shoulderY);
      ctx.lineTo(elbowX, elbowY);
      ctx.lineTo(handX, handY);
      ctx.stroke();
      ctx.strokeStyle = skin.outline;
      ctx.lineWidth = Math.max(1.1, limbW*0.14);
      ctx.stroke();
    }

    if((state==='swing' || state==='spider') && anchor){
      const worldAngle = Math.atan2(anchor.y-player.y, anchor.x-player.x) - lean;
      drawArm(1, worldAngle, 1.05);
      drawArm(-1, Math.PI*0.75 + Math.sin(t/150)*0.18, 0.55);
    } else {
      const flap = Math.sin(t/120);
      drawArm(1, -0.55 + flap*0.35, 0.85);
      drawArm(-1, Math.PI+0.55 - flap*0.35, 0.85);
    }

    // head — bigger, rounder, with the torso tucked slightly under it (no thin neck gap)
    ctx.beginPath();
    ctx.fillStyle = skin.body;
    ctx.arc(0,0,headR,0,Math.PI*2);
    ctx.fill();
    ctx.lineWidth = Math.max(1.4, r*0.16);
    ctx.strokeStyle = skin.outline;
    ctx.stroke();

    // big expressive round eyes, with an occasional blink for a touch of life
    const blinking = (Math.sin(t/900) > 0.94);
    const eyeDX = headR*0.36, eyeY = -headR*0.05;
    const eyeRX = headR*0.26, eyeRY = blinking ? headR*0.04 : headR*0.32;
    [-1,1].forEach(side=>{
      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      ctx.ellipse(side*eyeDX, eyeY, eyeRX, eyeRY, 0, 0, Math.PI*2);
      ctx.fill();
      if(!blinking){
        ctx.beginPath();
        ctx.fillStyle = skin.outline;
        ctx.ellipse(side*eyeDX + side*eyeRX*0.15, eyeY + eyeRY*0.15, eyeRX*0.44, eyeRY*0.5, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = skin.accent;
        ctx.arc(side*eyeDX - side*eyeRX*0.15, eyeY - eyeRY*0.3, eyeRX*0.14, 0, Math.PI*2);
        ctx.fill();
      }
    });

    switch(skin.accessory){
      case 'band':
        ctx.beginPath();
        ctx.rect(-headR*0.85, -headR*0.12, headR*1.7, headR*0.22);
        ctx.fillStyle = skin.accent;
        ctx.fill();
        break;
      case 'helm':
        ctx.beginPath();
        ctx.arc(0, -headR*0.05, headR*1.05, Math.PI*1.08, Math.PI*1.92);
        ctx.strokeStyle = skin.accent;
        ctx.lineWidth = Math.max(2, headR*0.22);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -headR*0.6); ctx.lineTo(0, headR*0.15);
        ctx.lineWidth = Math.max(1.5, headR*0.12);
        ctx.stroke();
        break;
      case 'mask':
        ctx.beginPath();
        ctx.arc(0, headR*0.1, headR*0.8, 0, Math.PI, false);
        ctx.fillStyle = skin.outline;
        ctx.fill();
        break;
      case 'horns':
        [-1,1].forEach(side=>{
          ctx.beginPath();
          ctx.moveTo(side*headR*0.35, -headR*0.75);
          ctx.quadraticCurveTo(side*headR*0.95, -headR*1.5, side*headR*0.55, -headR*1.78);
          ctx.lineWidth = Math.max(2, headR*0.22);
          ctx.strokeStyle = skin.accent;
          ctx.stroke();
        });
        break;
      case 'hood':
        ctx.beginPath();
        ctx.moveTo(-headR*0.95, -headR*0.15);
        ctx.quadraticCurveTo(0, -headR*1.9, headR*0.95, -headR*0.15);
        ctx.quadraticCurveTo(headR*0.55, -headR*0.7, 0, -headR*0.82);
        ctx.quadraticCurveTo(-headR*0.55, -headR*0.7, -headR*0.95, -headR*0.15);
        ctx.closePath();
        ctx.fillStyle = skin.outline;
        ctx.fill();
        break;
      case 'cap':
        ctx.beginPath();
        ctx.ellipse(0, -headR*0.78, headR*0.72, headR*0.3, 0, Math.PI, 0, true);
        ctx.fillStyle = skin.accent;
        ctx.fill();
        ctx.fillRect(-headR*0.72, -headR*0.88, headR*1.44, headR*0.22);
        break;
      case 'visor':
        ctx.beginPath();
        ctx.rect(-headR*0.62, -headR*0.16, headR*1.24, headR*0.24);
        ctx.fillStyle = skin.accent;
        ctx.fill();
        break;
      case 'spikes':
        for(let i=-2;i<=2;i++){
          ctx.beginPath();
          ctx.moveTo(i*headR*0.26, -headR*0.72);
          ctx.lineTo(i*headR*0.26-headR*0.09, -headR*(1.1+Math.abs(i)*0.1));
          ctx.lineTo(i*headR*0.26+headR*0.09, -headR*0.72);
          ctx.closePath();
          ctx.fillStyle = skin.accent;
          ctx.fill();
        }
        break;
      case 'crown':
        ctx.beginPath();
        ctx.moveTo(-headR*0.55,-headR*0.65);
        ctx.lineTo(-headR*0.55,-headR*1.05);
        ctx.lineTo(-headR*0.28,-headR*0.8);
        ctx.lineTo(0,-headR*1.15);
        ctx.lineTo(headR*0.28,-headR*0.8);
        ctx.lineTo(headR*0.55,-headR*1.05);
        ctx.lineTo(headR*0.55,-headR*0.65);
        ctx.closePath();
        ctx.fillStyle = skin.accent;
        ctx.fill();
        ctx.lineWidth = Math.max(1, headR*0.08);
        ctx.strokeStyle = skin.outline;
        ctx.stroke();
        break;
      case 'halo':
        ctx.beginPath();
        ctx.ellipse(0,-headR*1.55,headR*0.62,headR*0.16,0,0,Math.PI*2);
        ctx.lineWidth = Math.max(1.5,headR*0.14);
        ctx.strokeStyle = skin.accent;
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  function drawParticles(){
    for(const p of particles){
      const [sx,sy] = worldToScreen(p.x,p.y);
      const maxLife = p.maxLife || 26;
      ctx.globalAlpha = Math.max(0,p.life/maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(sx,sy,Math.max(1,p.size||3*worldScale),0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
  }

  function draw(){
    drawBackground();
    drawAmbient();
    drawBoosts();
    drawBlocks();
    drawNodes();
    drawRope();
    drawParticles();
    drawPlayer();
  }

  function loop(){
    update();
    draw();
    requestAnimationFrame(loop);
  }

  function start(){
    resetWorld();
    revivesUsed = 0;
    running = true;
    state = 'fly';
  }

  function getScore(){ return distanceScore; }

  function menu(){
    resetWorld();
    running = false;
    state = 'idle';
  }

  function setSpiderMode(v){ spiderMode = !!v; }
  function getSpiderMode(){ return spiderMode; }

  function canRevive(){ return state==='dead' && revivesUsed < 1; }
  function revive(){
    if(!canRevive()) return false;
    revivesUsed++;
    player.vy = -8*worldScale;
    player.y = camY + H*0.4;
    state = 'fly';
    running = true;
    return true;
  }

  return {
    init, resize, start, menu, draw,
    pointerDown, pointerUp,
    setSpiderMode, getSpiderMode,
    canRevive, revive,
    get running(){ return running; },
    set onScoreChange(fn){ onScoreChange = fn; },
    set onDeath(fn){ onDeath = fn; },
    getScore,
    loop
  };
})();
