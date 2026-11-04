// Интеграция с Yandex Games SDK (реклама, готовность загрузки и т.д.).
// Вне площадки Яндекс Игр SDK просто не загружается, и все методы
// становятся безопасными no-op — на сайте/в Telegram/на iPhone ничего не сломается.
window.YandexSDK = (function(){
  let ysdk = null;
  let ready = false;
  let deathsSinceAd = 0;
  const AD_EVERY_N_DEATHS = 3; // не показываем рекламу после каждой смерти подряд

  function loadScript(){
    return new Promise((resolve)=>{
      const s = document.createElement('script');
      s.src = 'https://yandex.ru/games/sdk/v2';
      s.async = true;
      s.onload = ()=>resolve(true);
      s.onerror = ()=>resolve(false);
      document.head.appendChild(s);
      // если мы не на Яндекс Играх, скрипт может просто не загрузиться — не ждём вечно
      setTimeout(()=>resolve(false), 4000);
    });
  }

  async function init(){
    const loaded = await loadScript();
    if(!loaded || !window.YaGames) return null;
    try{
      ysdk = await window.YaGames.init();
      ready = true;
      return ysdk;
    }catch(e){ return null; }
  }

  // Вызывать один раз, когда стартовый экран уже отрисован —
  // сигнализирует Яндексу, что можно убрать их экран загрузки
  function gameReady(){
    try{ if(ready) ysdk.features.LoadingAPI.ready(); }catch(e){}
  }

  // Опционально: отмечаем начало/конец активного игрового процесса
  // (используется Яндексом для аналитики удержания игроков)
  function gameplayStart(){ try{ if(ready) ysdk.features.GameplayAPI.start(); }catch(e){} }
  function gameplayStop(){ try{ if(ready) ysdk.features.GameplayAPI.stop(); }catch(e){} }

  // Полноэкранная межстраничная реклама — не чаще раза в AD_EVERY_N_DEATHS смертей
  function maybeShowInterstitial(onOpen, onResume){
    if(!ready) return;
    deathsSinceAd++;
    if(deathsSinceAd < AD_EVERY_N_DEATHS) return;
    deathsSinceAd = 0;
    try{
      ysdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: ()=>{ if(onOpen) onOpen(); },
          onClose: ()=>{ if(onResume) onResume(); },
          onError: ()=>{ if(onResume) onResume(); }
        }
      });
    }catch(e){}
  }

  // Видео за вознаграждение — используем для "продолжить после падения"
  function showRewarded(onReward, onClose){
    if(!ready){ if(onClose) onClose(false); return; }
    try{
      ysdk.adv.showRewardedVideo({
        callbacks: {
          onRewarded: ()=>{ if(onReward) onReward(); },
          onClose: ()=>{ if(onClose) onClose(true); },
          onError: ()=>{ if(onClose) onClose(false); }
        }
      });
    }catch(e){ if(onClose) onClose(false); }
  }

  return {
    init, gameReady, gameplayStart, gameplayStop,
    maybeShowInterstitial, showRewarded,
    get isReady(){ return ready; }
  };
})();
