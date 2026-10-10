const VERSION = '0.15.1';
const PREFIX = `pathopedia:${new URL(self.registration.scope).pathname}:`;
const CACHE = PREFIX + VERSION;
const FILES = ['./','./index.html','./src/app.mjs','./src/app-routing.mjs','./src/engine.mjs','./src/treatment-engine.mjs','./src/treatment-ui.mjs','./src/card-prototype-ui.mjs','./src/reference-card.mjs','./src/card-catalog.mjs','./src/card-models.mjs','./src/card-gallery-ui.mjs','./src/card-inspector.mjs','./src/card-stacks.mjs','./src/card-search.mjs','./src/style.css','./src/compact.css','./src/treatment.css','./src/reference-card.css','./src/card-gallery.css','./data/organisms.json','./data/library.json','./data/library-schema.json','./data/sources.json','./data/schema.json','./data/treatment-questions.json','./assets/fonts/SUIT-Variable.woff2','./favicon.svg','./manifest.webmanifest','./assets/pathopedia-icon-180.png?v=0.15.1','./assets/pathopedia-icon-192.png?v=0.15.1','./assets/pathopedia-icon-512.png?v=0.15.1'];
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
  return (await cache.match(event.request))||fetch(event.request);
 })());
});
