/* ===========================================================
 * sw.js
 * ===========================================================
 * Copyright 2016 @huxpro
 * Licensed under Apache 2.0 
 * Register service worker.
 * ========================================================== */

const PRECACHE = 'precache-v1';
const RUNTIME = 'runtime';
const HOSTNAME_WHITELIST = [
  self.location.hostname,
  "huangxuan.me",
  "cdnjs.cloudflare.com"
]

/**
 *  @Lifecycle Install
 *  Precache anything static to this version of your app.
 *  e.g. App Shell, 404, JS/CSS dependencies...
 *
 *  waitUntil() : installing ====> installed
 *  skipWaiting() : waiting(installed) ====> activating
 */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(PRECACHE).then(cache => {
      return cache.add('./offline.html')
      .then(self.skipWaiting())
      .catch(err => console.log(err))
    })
  )
});


/**
 *  @Lifecycle Activate
 *  New one activated when old isnt being used.
 *
 *  waitUntil(): activating ====> activated
 */
self.addEventListener('activate',  event => {
  console.log('service worker activated.')
  // There is no need to take control immediately
  //event.waitUntil(self.clients.claim());
});


/**
 *  @Functional Fetch
 *  All network requests are being intercepted here.
 * 
 *  void respondWith(Promise<Response> r);
 */
self.addEventListener('fetch', event => {
  // log for debugging
  console.log("fetch", event.request.url)

  // Skip some of cross-origin requests, like those for Google Analytics.
  if (HOSTNAME_WHITELIST.indexOf(new URL(event.request.url).hostname) > -1) {

    // Stale-while-revalidate 
    // ready to upgrade to https://gist.github.com/surma/eb441223daaedf880801ad80006389f1.
    event.respondWith(
      caches.open(RUNTIME).then(cache => {
        return caches.match(event.request).then(cachedResponse => {
          // fetch(httpURL) is active mixed content, fetch(httpRequest) is not supported yet...
          var fixedUrl = event.request.url.replace('http://', '//')
          // query as cache busting
          var fetchPromise = fetch(`${fixedUrl}?${Math.random()}`,  {
            cache: "no-store",  
            redirect: "follow"
          })
            .then(networkResponse => {
              // Fetch API not throw error on 404, 500 etc
              // if (!networkResponse.ok) return caches.match('404.html')
              if (!networkResponse.ok) throw Error('not OK')

              cache.put(event.request, networkResponse.clone())
              return networkResponse;
            })
            .catch(error => {
              console.log(error);
              // fallback to offline.html
              return caches.match('offline.html')
            })
        
          // Return the response from cache or wait for network.
          return cachedResponse || fetchPromise;
        })
      })
    );
  }
});
