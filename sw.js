const VERSION = '0.48.1';
const PREFIX = `pathopedia:${new URL(self.registration.scope).pathname}:`;
const CACHE = PREFIX + VERSION + ':cell-city-three-1';
const FILES = ['./','./index.html','./src/app.mjs','./src/app-routing.mjs','./src/engine.mjs','./src/treatment-engine.mjs','./src/treatment-ui.mjs','./src/defense-data.mjs','./src/defense-engine.mjs','./src/defense-ui.mjs','./src/defense-renderer.mjs','./src/defense.css','./src/vendor/kontra-10.0.2.mjs','./src/vendor/KONTRA-LICENSE.txt','./src/card-prototype-ui.mjs','./src/reference-card.mjs','./src/card-catalog.mjs','./src/card-models.mjs','./src/card-art.mjs','./src/card-art-data.mjs','./src/card-gallery-ui.mjs','./src/card-pathogen-order.mjs','./src/card-drug-order.mjs','./src/card-guide.mjs','./src/card-inspector.mjs','./src/card-stacks.mjs','./src/card-search.mjs','./src/style.css','./src/compact.css','./src/treatment.css','./src/reference-card.css','./src/card-gallery.css','./data/organisms.json','./data/library.json','./data/library-schema.json','./data/sources.json','./data/schema.json','./data/treatment-questions.json','./assets/fonts/SUIT-Variable.woff2','./favicon.svg','./manifest.webmanifest','./assets/pathopedia-icon-180.png?v=0.48.1','./assets/pathopedia-icon-192.png?v=0.48.1','./assets/pathopedia-icon-512.png?v=0.48.1'];
const absolute = path => new URL(path,self.registration.scope).href;
self.addEventListener('install', event => event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await cache.addAll(FILES.map(absolute));
 try {
  const morphologyUrl=absolute('./data/morphology-visuals.json'),response=await fetch(morphologyUrl);
  if(response.ok){const catalog=await response.clone().json();await cache.addAll(catalog.assets.map(asset=>absolute(asset.src)));await cache.put(morphologyUrl,response);}
 } catch { /* Optional microscopy assets must not prevent the core app from installing. */ }
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(event.data==='ACTIVATE_UPDATE')self.skipWaiting();
 if(event.data==='CACHE_CITY')event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  for(const path of ['./src/city.css','./src/city-ui.mjs','./src/city-data.mjs','./src/city-engine.mjs','./src/city-activity.mjs','./src/city-three-layout.mjs','./src/city-renderer.mjs','./src/city-camera.mjs','./src/city-map.mjs','./src/luck-icons.mjs','./src/vendor/LUCIDE-LICENSE.txt']){
   const url=absolute(path);if(!await cache.match(url))await cache.add(url);
  }
 })().catch(()=>{}));
 if(event.data==='CACHE_REROLL')event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  for(const path of ['./src/luck.css','./src/luck-ui.mjs','./src/luck-icons.mjs','./src/vendor/LUCIDE-LICENSE.txt','./src/luck-data.mjs','./src/luck-engine.mjs','./src/luck-renderer.mjs','./src/luck-effects.mjs','./src/survival-audio.mjs']){
   const url=absolute(path);if(!await cache.match(url))await cache.add(url);
  }
 })().catch(()=>{}));
 if(event.data==='CACHE_SURVIVAL')event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  for(const path of ['./src/survival.css','./src/survival-ui.mjs','./src/survival-data.mjs','./src/survival-engine.mjs','./src/survival-renderer.mjs','./src/survival-loadout.mjs','./src/survival-audio.mjs','./src/survival-records.mjs']){
   const url=absolute(path);if(!await cache.match(url))await cache.add(url);
  }
 })().catch(()=>{}));
 if(event.data==='CACHE_PLAY')event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  for(const path of ['./src/play.css','./src/play-ui.mjs','./src/play-data.mjs','./src/play-engine.mjs','./src/play-renderer.mjs','./src/play-audio.mjs','./src/play-map.mjs','./src/play-operation-map.mjs','./src/play-world.mjs','./src/play-scene.mjs']){
   const url=absolute(path);if(!await cache.match(url))await cache.add(url);
  }
 })().catch(()=>{}));
});
self.addEventListener('fetch',event=>{
 // Local development always reads saved files; deployed Pages keeps offline caching.
 if(['localhost','127.0.0.1','[::1]'].includes(self.location.hostname))return;
 if(event.request.method!=='GET'||!event.request.url.startsWith(self.registration.scope))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const manifestUrl=absolute('./manifest.webmanifest');
  // Installation metadata must refresh online; query versions share one offline copy.
  if(new URL(event.request.url).pathname===new URL(manifestUrl).pathname){
   try {
    const response=await fetch(event.request,{cache:'no-cache'});
    if(response.ok)await cache.put(manifestUrl,response.clone());
    return response.ok?response:((await cache.match(manifestUrl))||response);
   } catch(error) {
    const cached=await cache.match(manifestUrl);
    if(cached)return cached;
    throw error;
   }
  }
  if(event.request.mode==='navigate')return (await cache.match(absolute('./index.html')))||fetch(event.request);
  const cached=await cache.match(event.request);if(cached)return cached;
  const response=await fetch(event.request);
  // Load card images on demand so a full encyclopedia does not block PWA installation.
  const pathname=new URL(event.request.url).pathname;
  // Play and survival stay out of the install precache and become available offline after first entry.
  if(response.ok&&(pathname.includes('/assets/cards/illustrations-v1/')||pathname.includes('/assets/city3d/')||pathname.includes('/src/vendor/three/')||/\/src\/(?:(?:play|survival|luck|city)(?:-[a-z]+)*\.(?:mjs|css)$|vendor\/freedoom\/)/.test(pathname))){
   event.waitUntil(cache.put(event.request,response.clone()).catch(()=>{}));
  }
  return response;
 })());
});
