(function(){
  // ---------- Telegram WebApp (safe no-op outside Telegram) ----------
  window.addEventListener('load', ()=>{
    try{
      if(window.Telegram && window.Telegram.WebApp){
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
        if(Telegram.WebApp.setBackgroundColor) Telegram.WebApp.setBackgroundColor('#0a0a0c');
        if(Telegram.WebApp.disableVerticalSwipes) Telegram.WebApp.disableVerticalSwipes();
      }
    }catch(e){}
  });

  // ---------- Service worker (offline / installable on iPhone) ----------
  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    });
  }

  const canvas = document.getElementById('game');
  const scoreVal = document.getElementById('scoreVal');
  const bestVal = document.getElementById('bestVal');
  const bestValStart = document.getElementById('bestValStart');
  const startScreen = document.getElementById('startScreen');
  const overScreen = document.getElementById('overScreen');
  const authScreen = document.getElementById('authScreen');
  const leaderboardScreen = document.getElementById('leaderboardScreen');
  const leaderboardDetailScreen = document.getElementById('leaderboardDetailScreen');
  const leaderboardList = document.getElementById('leaderboardList');
  const leaderboardDetailList = document.getElementById('leaderboardDetailList');
  const finalScore = document.getElementById('finalScore');
  const finalBest = document.getElementById('finalBest');
  const unlockNotice = document.getElementById('unlockNotice');
  const skinRow = document.getElementById('skinRow');
  const spiderToggleRow = document.getElementById('spiderToggleRow');
  const accountPanel = document.getElementById('accountPanel');
  const musicBtn = document.getElementById('musicBtn');
  const sfxBtn = document.getElementById('sfxBtn');
  const reviveBtn = document.getElementById('reviveBtn');

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Shows an overlay screen and (re)plays its entrance animation from
  // animate.css. Re-triggering an animate.css class requires removing it,
  // forcing a reflow, then re-adding it — otherwise the browser just sees
  // "class already applied" and skips the animation on repeat visits.
  function showEl(el, animClass){
    animClass = animClass || el.dataset.anim || 'animate__fadeIn';
    el.classList.remove('hidden');
    el.classList.remove('animate__animated', 'animate__faster', animClass);
    void el.offsetWidth;
    el.classList.add('animate__animated', 'animate__faster', animClass);
  }

  Game.init(canvas);
  window.addEventListener('resize', ()=>{ SettingsManager.apply(); });
  window.addEventListener('orientationchange', ()=>setTimeout(()=>{ SettingsManager.apply(); }, 150));

  // ---------- Yandex Games SDK (ads) — safe no-op outside Yandex Games ----------
  YandexSDK.init();

  // =====================================================================
  // ACCOUNT / AUTH
  // =====================================================================

  const LB_FIELDS = {
    distance: { field:'best_distance',
      get title(){ return I18N.t('lb_title_distance'); }, get desc(){ return I18N.t('lb_desc_distance'); } },
    playtime: { field:'total_playtime_seconds',
      get title(){ return I18N.t('lb_title_playtime'); }, get desc(){ return I18N.t('lb_desc_playtime'); } }
  };
  let activeLbTab = 'distance';

  function formatFieldValue(tab, value){
    if(tab === 'playtime') return PlaytimeTracker.formatDuration(value);
    return (value||0) + 'м';
  }

  function renderAccountPanel(){
    if(!AuthManager.enabled()){
      accountPanel.innerHTML = '';
      return;
    }
    if(AuthManager.isLoggedIn() && AuthManager.profile){
      const p = AuthManager.profile;
      accountPanel.innerHTML = `
        <div class="account-card">
          <div class="who">
            <div class="u">👤 ${escapeHtml(p.username)}</div>
            <div class="p">${I18N.t('playtime_label')}: ${PlaytimeTracker.formatDuration(p.total_playtime_seconds)}</div>
          </div>
          <button id="logoutBtn">${I18N.t('logout_btn')}</button>
        </div>`;
      document.getElementById('logoutBtn').addEventListener('click', async ()=>{
        await AuthManager.logout();
        renderAccountPanel();
      });
    } else {
      accountPanel.innerHTML = `
        <div class="account-card">
          <div class="who">
            <div class="u">${I18N.t('guest_title')}</div>
            <div class="p">${I18N.t('guest_desc')}</div>
          </div>
          <button id="loginOpenBtn">${I18N.t('login_btn')}</button>
        </div>`;
      document.getElementById('loginOpenBtn').addEventListener('click', ()=>openAuth('login'));
    }
  }

  // ---------- Auth screen ----------
  const authTitle = document.getElementById('authTitle');
  const authUsername = document.getElementById('authUsername');
  const authPassword = document.getElementById('authPassword');
  const authError = document.getElementById('authError');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authSwitchBtn = document.getElementById('authSwitchBtn');
  let authMode = 'login';

  function openAuth(mode){
    authMode = mode;
    authError.textContent = '';
    authUsername.value = '';
    authPassword.value = '';
    updateAuthMode();
    startScreen.classList.add('hidden');
    showEl(authScreen);
  }
  function updateAuthMode(){
    if(authMode === 'login'){
      authTitle.textContent = I18N.t('auth_title_login');
      authSubmitBtn.textContent = I18N.t('auth_submit_login');
      authSwitchBtn.textContent = I18N.t('auth_switch_to_register');
    } else {
      authTitle.textContent = I18N.t('auth_title_register');
      authSubmitBtn.textContent = I18N.t('auth_submit_register');
      authSwitchBtn.textContent = I18N.t('auth_switch_to_login');
    }
  }
  authSwitchBtn.addEventListener('click', ()=>{
    authMode = authMode === 'login' ? 'register' : 'login';
    authError.textContent = '';
    updateAuthMode();
  });
  document.getElementById('authCancelBtn').addEventListener('click', ()=>{
    authScreen.classList.add('hidden');
    showEl(startScreen);
  });
  authSubmitBtn.addEventListener('click', async ()=>{
    const u = authUsername.value.trim();
    const p = authPassword.value;
    if(!u || !p){ authError.textContent = I18N.t('auth_fill_both'); return; }
    authSubmitBtn.disabled = true;
    authError.textContent = I18N.t('auth_wait');
    const res = authMode === 'login' ? await AuthManager.login(u,p) : await AuthManager.register(u,p);
    authSubmitBtn.disabled = false;
    if(!res.ok){
      authError.textContent = res.raw ? res.error : I18N.t(res.error || 'auth_err_generic');
      return;
    }
    authError.textContent = '';
    authScreen.classList.add('hidden');
    showEl(startScreen);
    renderAccountPanel();
  });

  // =====================================================================
  // SKINS / SPIDER MODE (unchanged: driven by local best score)
  // =====================================================================

  function buildSkinRow(){
    skinRow.innerHTML = '';
    SKINS.forEach((skin,i)=>{
      const unlocked = SkinManager.isUnlocked(skin.id);
      const el = document.createElement('div');
      el.className = 'skin-swatch animate__animated animate__zoomIn' + (unlocked?'':' locked') + (SkinManager.selected===skin.id?' selected':'');
      el.style.animationDelay = (i*35)+'ms';
      el.style.animationDuration = '0.35s';
      el.innerHTML = `<div class="dot" style="background:${skin.body};box-shadow:0 0 12px ${skin.body}"></div>` +
        (unlocked ? '' : `<div class="lock-label">${skin.threshold}м</div>`);
      if(unlocked){
        el.addEventListener('click', async ()=>{
          await SkinManager.setSelected(skin.id);
          buildSkinRow();
        });
      }
      skinRow.appendChild(el);
    });
  }

  function buildSpiderRow(){
    if(!AbilityManager.spiderUnlocked){
      spiderToggleRow.classList.add('hidden');
      spiderToggleRow.innerHTML = '';
      return;
    }
    spiderToggleRow.classList.remove('hidden');
    spiderToggleRow.innerHTML =
      `<button class="spider-toggle ${AbilityManager.spiderEnabled?'on':''}">` +
      `🕷️ ${I18N.t('spider_toggle_label')}: ${AbilityManager.spiderEnabled?I18N.t('spider_on'):I18N.t('spider_off')}</button>`;
    spiderToggleRow.querySelector('button').addEventListener('click', async ()=>{
      await AbilityManager.setEnabled(!AbilityManager.spiderEnabled);
      Game.setSpiderMode(AbilityManager.spiderEnabled);
      buildSpiderRow();
    });
  }

  // =====================================================================
  // GAME EVENTS
  // =====================================================================

  Game.onScoreChange = (v)=>{ scoreVal.textContent = v+'м'; };

  Game.onDeath = async (score)=>{
    YandexSDK.gameplayStop();
    PlaytimeTracker.flush();
    finalScore.textContent = score+'м';

    const oldBest = SkinManager.best;
    await SkinManager.updateBest(score);
    const newBest = SkinManager.best;
    bestVal.textContent = newBest+'м';
    finalBest.textContent = newBest+'м';

    AbilityManager.refreshUnlock(newBest);
    Game.setSpiderMode(AbilityManager.spiderEnabled);

    if(AuthManager.isLoggedIn()) await AuthManager.submitDistance(score);
    renderAccountPanel();

    const newlyUnlockedSkins = SKINS.filter(s=>s.threshold>oldBest && s.threshold<=newBest);
    const spiderJustUnlocked = oldBest < SPIDER_THRESHOLD && newBest >= SPIDER_THRESHOLD;
    const messages = newlyUnlockedSkins.map(s=>I18N.t('unlock_skin_prefix')+' «'+s.name+'»');
    if(spiderJustUnlocked) messages.push(I18N.t('unlock_spider'));

    if(messages.length){
      unlockNotice.textContent = I18N.t('unlock_prefix') + ': ' + messages.join(', ');
      unlockNotice.classList.remove('hidden');
      AudioEngine.unlockSkin();
    } else {
      unlockNotice.classList.add('hidden');
    }
    buildSkinRow();
    buildSpiderRow();

    reviveBtn.classList.toggle('hidden', !(YandexSDK.isReady && Game.canRevive()));

    setTimeout(()=>{
      showEl(overScreen);
      const overTitle = overScreen.querySelector('h1.title');
      overTitle.classList.remove('animate__shakeX');
      void overTitle.offsetWidth;
      overTitle.classList.add('animate__shakeX');
    }, 450);

    YandexSDK.maybeShowInterstitial(
      ()=>{ AudioEngine.stopMusic(); },
      ()=>{ if(AudioEngine.musicOn) AudioEngine.startMusic(); }
    );
  };

  // =====================================================================
  // INPUT
  // =====================================================================

  let activeCanvasGesture = false;
  function onDown(e){
    activeCanvasGesture = true;
    if(e.cancelable) e.preventDefault();
    AudioEngine.unlock();
    Game.pointerDown();
  }
  function onUp(e){
    if(!activeCanvasGesture) return; // gesture didn't start on the canvas — let buttons/UI handle it normally
    activeCanvasGesture = false;
    if(e.cancelable) e.preventDefault();
    Game.pointerUp();
  }
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  canvas.addEventListener('touchstart', onDown, {passive:false});
  window.addEventListener('touchend', onUp, {passive:false});

  function tapPulse(el){
    el.classList.remove('animate__animated','animate__pulse','animate__faster');
    void el.offsetWidth;
    el.classList.add('animate__animated','animate__pulse','animate__faster');
  }

  function refreshAudioButtons(){
    musicBtn.classList.toggle('off', !AudioEngine.musicOn);
    sfxBtn.classList.toggle('off', !AudioEngine.sfxOn);
  }
  musicBtn.addEventListener('click', ()=>{
    AudioEngine.unlock(); AudioEngine.setMusic(!AudioEngine.musicOn); refreshAudioButtons(); tapPulse(musicBtn);
  });
  sfxBtn.addEventListener('click', ()=>{
    AudioEngine.unlock(); AudioEngine.setSfx(!AudioEngine.sfxOn); refreshAudioButtons(); tapPulse(sfxBtn);
  });
  refreshAudioButtons();

  // =====================================================================
  // LEADERBOARD SCREENS
  // =====================================================================

  function renderRows(container, rows, tab, highlightUsername){
    if(!rows.length){
      container.innerHTML = `<div class="lb-empty">${I18N.t('lb_empty')}</div>`;
      return;
    }
    container.innerHTML = rows.map((row,i)=>{
      const mine = highlightUsername && row.username && row.username.toLowerCase()===highlightUsername.toLowerCase();
      const val = LB_FIELDS[tab].field;
      return `<div class="lb-row${mine?' me':''}"><span class="lb-rank">#${i+1}</span>` +
        `<span class="lb-name">${escapeHtml(row.username||'—')}</span>` +
        `<span class="lb-score">${formatFieldValue(tab, row[val])}</span></div>`;
    }).join('');
  }

  async function loadTop10(){
    if(!Leaderboard.enabled()){
      leaderboardList.innerHTML = `<div class="lb-empty">${I18N.t('lb_not_configured')}</div>`;
      return;
    }
    leaderboardList.innerHTML = `<div class="lb-empty">${I18N.t('lb_loading')}</div>`;
    const field = LB_FIELDS[activeLbTab].field;
    const rows = await Leaderboard.top(field, 10);
    const myName = AuthManager.profile ? AuthManager.profile.username : null;
    renderRows(leaderboardList, rows, activeLbTab, myName);
  }

  document.getElementById('lbTabDistance').addEventListener('click', ()=>switchLbTab('distance'));
  document.getElementById('lbTabPlaytime').addEventListener('click', ()=>switchLbTab('playtime'));
  function switchLbTab(tab){
    activeLbTab = tab;
    document.getElementById('lbTabDistance').classList.toggle('active', tab==='distance');
    document.getElementById('lbTabPlaytime').classList.toggle('active', tab==='playtime');
    loadTop10();
  }

  document.getElementById('leaderboardBtn').addEventListener('click', ()=>{
    startScreen.classList.add('hidden');
    showEl(leaderboardScreen);
    switchLbTab(activeLbTab);
  });
  document.getElementById('closeLeaderboardBtn').addEventListener('click', ()=>{
    leaderboardScreen.classList.add('hidden');
    showEl(startScreen);
  });

  // ---------- Detail screen: full list + player's own rank ----------
  document.getElementById('lbDetailBtn').addEventListener('click', async ()=>{
    leaderboardScreen.classList.add('hidden');
    showEl(leaderboardDetailScreen);
    const meta = LB_FIELDS[activeLbTab];
    document.getElementById('lbDetailTitle').textContent = meta.title;
    document.getElementById('lbDetailDesc').textContent = meta.desc;

    const myRankBox = document.getElementById('myRankBox');
    myRankBox.classList.remove('show');
    leaderboardDetailList.innerHTML = `<div class="lb-empty">${I18N.t('lb_loading')}</div>`;

    if(!Leaderboard.enabled()){
      leaderboardDetailList.innerHTML = `<div class="lb-empty">${I18N.t('lb_not_configured')}</div>`;
      return;
    }

    const rows = await Leaderboard.full(meta.field, 200);
    const myName = AuthManager.profile ? AuthManager.profile.username : null;
    renderRows(leaderboardDetailList, rows, activeLbTab, myName);

    if(AuthManager.isLoggedIn() && AuthManager.profile){
      const rank = await Leaderboard.myRank(meta.field);
      const myVal = AuthManager.profile[meta.field];
      if(rank){
        myRankBox.textContent = `${I18N.t('lb_my_rank')}: #${rank} · ${formatFieldValue(activeLbTab, myVal)}`;
        myRankBox.classList.add('show');
      }
    }
  });
  document.getElementById('closeLeaderboardDetailBtn').addEventListener('click', ()=>{
    leaderboardDetailScreen.classList.add('hidden');
    showEl(leaderboardScreen);
  });

  // =====================================================================
  // REVIVE (Yandex rewarded ad)
  // =====================================================================

  reviveBtn.addEventListener('click', ()=>{
    YandexSDK.showRewarded(
      ()=>{
        overScreen.classList.add('hidden');
        Game.revive();
        YandexSDK.gameplayStart();
      },
      ()=>{}
    );
  });

  // =====================================================================
  // SETTINGS SCREEN
  // =====================================================================

  const settingsScreen = document.getElementById('settingsScreen');

  function refreshSettingsButtons(){
    document.querySelectorAll('.settings-opt[data-lang]').forEach(btn=>{
      btn.classList.toggle('active', btn.getAttribute('data-lang') === I18N.current);
    });
    document.querySelectorAll('.settings-opt[data-orientation]').forEach(btn=>{
      btn.classList.toggle('active', btn.getAttribute('data-orientation') === SettingsManager.orientation);
    });
    document.querySelectorAll('.settings-opt[data-genre]').forEach(btn=>{
      btn.classList.toggle('active', btn.getAttribute('data-genre') === SettingsManager.musicGenre);
    });
    document.getElementById('autoChangeToggle').classList.toggle('active', SettingsManager.musicAutoChange);
  }

  let settingsOpenedDuringGame = false;
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('settingsBtnMenu').addEventListener('click', openSettings);
  function openSettings(){
    settingsOpenedDuringGame = Game.running;
    if(!settingsOpenedDuringGame) startScreen.classList.add('hidden');
    showEl(settingsScreen);
    refreshSettingsButtons();
  }
  document.getElementById('closeSettingsBtn').addEventListener('click', ()=>{
    settingsScreen.classList.add('hidden');
    if(!settingsOpenedDuringGame) showEl(startScreen);
  });
  document.querySelectorAll('.settings-opt[data-lang]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      await I18N.setLang(btn.getAttribute('data-lang'));
      renderAccountPanel();
      buildSpiderRow();
      refreshSettingsButtons();
    });
  });
  document.querySelectorAll('.settings-opt[data-orientation]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      await SettingsManager.setOrientation(btn.getAttribute('data-orientation'));
      refreshSettingsButtons();
    });
  });
  document.querySelectorAll('.settings-opt[data-genre]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      AudioEngine.unlock();
      await SettingsManager.setMusicGenre(btn.getAttribute('data-genre'));
      refreshSettingsButtons();
    });
  });
  document.getElementById('autoChangeToggle').addEventListener('click', async ()=>{
    await SettingsManager.setMusicAutoChange(!SettingsManager.musicAutoChange);
    refreshSettingsButtons();
  });

  // =====================================================================
  // SCREEN NAVIGATION
  // =====================================================================

  document.getElementById('startBtn').addEventListener('click', beginGame);
  document.getElementById('retryBtn').addEventListener('click', beginGame);
  document.getElementById('menuBtn').addEventListener('click', goToMenu);

  function beginGame(){
    AudioEngine.unlock();
    AudioEngine.startMusic();
    startScreen.classList.add('hidden');
    overScreen.classList.add('hidden');
    Game.start();
    YandexSDK.gameplayStart();
  }

  function goToMenu(){
    overScreen.classList.add('hidden');
    bestValStart.textContent = SkinManager.best+'м';
    buildSkinRow();
    buildSpiderRow();
    renderAccountPanel();
    Game.menu();
    showEl(startScreen);
  }

  // =====================================================================
  // BOOT
  // =====================================================================

  (async function boot(){
    await I18N.load();
    I18N.apply();
    await SettingsManager.load();
    SettingsManager.apply();

    await SkinManager.load();
    await AbilityManager.load();
    AbilityManager.refreshUnlock(SkinManager.best);
    Game.setSpiderMode(AbilityManager.spiderEnabled);

    await AuthManager.init();

    bestVal.textContent = SkinManager.best+'м';
    bestValStart.textContent = SkinManager.best+'м';
    buildSkinRow();
    buildSpiderRow();
    renderAccountPanel();
    PlaytimeTracker.start();

    Game.draw();
    Game.loop();

    YandexSDK.gameReady();
  })();
})();
