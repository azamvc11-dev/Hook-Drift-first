const CACHE_NAME = 'hookdrift-v10';
const CACHE_FILES = [
  './',
  './index.html',
  './css/style.css',
  './js/i18n.js',
  './js/settings.js',
  './js/supabase-config.js',
  './js/auth.js',
  './js/skins.js',
  './js/abilities.js',
  './js/audio.js',
  './js/blocks.js',
  './js/leaderboard.js',
  './js/playtime.js',
  './js/yandex.js',
  './js/game.js',
  './js/main.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event)=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(CACHE_FILES)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', (event)=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

// Cache-first for our own game files. Supabase/CDN requests always go to the
// network (leaderboards need to be live, not cached) — offline play still
// works, it just won't have fresh online leaderboard data until back online.
self.addEventListener('fetch', (event)=>{
  if(event.request.method !== 'GET') return;
  const url = event.request.url;
  const isOwnAsset = url.startsWith(self.location.origin);
  if(!isOwnAsset){ return; } // let Supabase/CDN requests pass straight through

  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached) return cached;
      return fetch(event.request).then(res=>{
        if(res.ok){
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(event.request, clone));
        }
        return res;
      }).catch(()=> cached);
    })
  );
});
