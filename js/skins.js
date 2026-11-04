// Список скинов — "костюмы" по мотивам референса (рыцарь, ниндзя, демон, маг и т.д.),
// но в чёрно-бело-серой палитре: разница между скинами не в цвете, а в силуэте/аксессуаре
// (accessory), который отрисовывает game.js поверх базового стикмена.
window.SKINS = [
  { id:'classic', name:'Классик',     threshold:0,    body:'#f4f4f6', outline:'#0a0a0b', accent:'#8e8e93', accessory:'none' },
  { id:'band',    name:'Повязка',     threshold:100,  body:'#e5e5ea', outline:'#0a0a0b', accent:'#0a0a0b', accessory:'band' },
  { id:'mask',    name:'Ниндзя',      threshold:250,  body:'#3a3a3d', outline:'#000000', accent:'#f4f4f6', accessory:'mask' },
  { id:'demon',   name:'Демон',       threshold:400,  body:'#1c1c1e', outline:'#000000', accent:'#c7c7cc', accessory:'horns' },
  { id:'knight',  name:'Рыцарь',      threshold:700,  body:'#d8d8dc', outline:'#0a0a0b', accent:'#8e8e93', accessory:'helm' },
  { id:'scout',   name:'Разведчик',   threshold:950,  body:'#c7c7cc', outline:'#0a0a0b', accent:'#3a3a3d', accessory:'cap' },
  { id:'mystic',  name:'Мистик',      threshold:1200, body:'#2c2c2e', outline:'#000000', accent:'#e5e5ea', accessory:'hood' },
  { id:'cyborg',  name:'Киборг',      threshold:1600, body:'#efeff1', outline:'#0a0a0b', accent:'#000000', accessory:'visor' },
  { id:'punk',    name:'Панк',        threshold:2000, body:'#0a0a0b', outline:'#f4f4f6', accent:'#8e8e93', accessory:'spikes' },
  { id:'noble',   name:'Дворянин',    threshold:2500, body:'#f4f4f6', outline:'#0a0a0b', accent:'#3a3a3d', accessory:'cape' },
  { id:'royal',   name:'Король',      threshold:3200, body:'#e5e5ea', outline:'#0a0a0b', accent:'#0a0a0b', accessory:'crown' },
  { id:'legend',  name:'Легенда',     threshold:4000, body:'#ffffff', outline:'#0a0a0b', accent:'#8e8e93', accessory:'halo' },
];

window.SkinManager = {
  best: 0,
  selected: 'classic',

  async load(){
    try{
      if(window.storage){
        const b = await window.storage.get('hookdrift_best', false);
        if(b && b.value) this.best = parseInt(b.value) || 0;
      }
    }catch(e){ /* key not found yet, keep default */ }

    try{
      if(window.storage){
        const s = await window.storage.get('hookdrift_selected_skin', false);
        if(s && s.value) this.selected = s.value;
      }
    }catch(e){ /* key not found yet, keep default */ }
  },

  isUnlocked(id){
    const sk = SKINS.find(s=>s.id===id);
    return !!sk && this.best >= sk.threshold;
  },

  async setSelected(id){
    if(!this.isUnlocked(id)) return false;
    this.selected = id;
    try{ if(window.storage) await window.storage.set('hookdrift_selected_skin', id, false); }catch(e){}
    return true;
  },

  // returns skins that just became unlocked between oldBest and newBest
  async updateBest(score){
    const oldBest = this.best;
    let improved = false;
    if(score > this.best){
      this.best = score;
      improved = true;
      try{ if(window.storage) await window.storage.set('hookdrift_best', String(this.best), false); }catch(e){}
    }
    const newlyUnlocked = SKINS.filter(s=>s.threshold>oldBest && s.threshold<=this.best);
    return { improved, newlyUnlocked };
  },

  current(){ return SKINS.find(s=>s.id===this.selected) || SKINS[0]; }
};
