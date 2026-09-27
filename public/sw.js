const CACHE='strategic-shell-v2';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/','/icon.svg','/icon-192.png','/icon-512.png','/manifest.webmanifest'])));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;if(req.mode==='navigate'){event.respondWith(fetch(req).catch(()=>caches.match('/')));return;}if(['script','style','image','font'].includes(req.destination)){event.respondWith(fetch(req).catch(()=>caches.match(req)));}});
