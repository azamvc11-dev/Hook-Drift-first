// Секретный режим: вместо раскачивания на тросе, стикмен летит по прямой
// под углом зацепа и автоматически отпускается, пролетая точку крюка.
// Открывается после того, как личный рекорд дистанции достигнет порога.
window.SPIDER_THRESHOLD = 3000;

window.AbilityManager = {
  spiderUnlocked: false,
  spiderEnabled: false,

  async load(){
    try{
      if(window.storage){
        const s = await window.storage.get('hookdrift_spider_enabled', false);
        if(s && s.value) this.spiderEnabled = s.value === '1';
      }
    }catch(e){ /* not set yet */ }
  },

  refreshUnlock(bestScore){
    this.spiderUnlocked = bestScore >= SPIDER_THRESHOLD;
    if(!this.spiderUnlocked) this.spiderEnabled = false;
  },

  async setEnabled(v){
    if(!this.spiderUnlocked) v = false;
    this.spiderEnabled = v;
    try{ if(window.storage) await window.storage.set('hookdrift_spider_enabled', v ? '1' : '0', false); }catch(e){}
  }
};
