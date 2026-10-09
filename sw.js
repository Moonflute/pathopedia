const VERSION = '0.13.0';
const PREFIX = `pathopedia:${new URL(self.registration.scope).pathname}:`;
const CACHE = PREFIX + VERSION;
const FILES = ['./','./index.html','./src/app.mjs','./src/engine.mjs','./src/treatment-engine.mjs','./src/treatment-ui.mjs','./src/library-ui.mjs','./src/card-prototype-ui.mjs','./src/reference-card.mjs','./src/card-catalog.mjs','./src/card-models.mjs','./src/card-gallery-ui.mjs','./src/style.css','./src/compact.css','./src/treatment.css','./src/library.css','./src/reference-card.css','./src/card-gallery.css','./data/organisms.json','./data/library.json','./data/library-schema.json','./data/sources.json','./data/schema.json','./data/treatment-questions.json','./assets/fonts/SUIT-Variable.woff2','./favicon.svg','./manifest.webmanifest','./assets/pathopedia-icon-180.png?v=0.13.0','./assets/pathopedia-icon-192.png?v=0.13.0','./assets/pathopedia-icon-512.png?v=0.13.0'];
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
self.addEventListener('message',event=>{if(event.data==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||!event.request.url.startsWith(self.registration.scope))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(event.request.mode==='navigate')return (await cache.match(absolute('./index.html')))||fetch(event.request);
  return (await cache.match(event.request))||fetch(event.request);
 })());
});
