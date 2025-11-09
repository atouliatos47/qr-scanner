self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('qr-scanner-cache').then(cache => {
            return cache.addAll([
                '/',
                '/index.html',
                '/app.js',
                'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js'
            ]);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});