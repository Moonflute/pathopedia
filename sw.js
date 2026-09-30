const VERSION = '0.7.1';
const PREFIX = `pathopedia:${new URL(self.registration.scope).pathname}:`;
const CACHE = PREFIX + VERSION;
const FILES = ['./','./index.html','./src/app.mjs','./src/engine.mjs','./src/style.css','./src/compact.css','./data/organisms.json','./data/sources.json','./data/schema.json','./favicon.svg','./manifest.webmanifest','./assets/pathopedia-icon-180.png?v=0.7.1','./assets/pathopedia-icon-192.png?v=0.7.1','./assets/pathopedia-icon-512.png?v=0.7.1'];
const absolute = path => new URL(path,self.registration.scope).href;
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(absolute)))));
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
