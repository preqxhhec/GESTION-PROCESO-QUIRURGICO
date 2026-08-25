// Service Worker mínimo — su único propósito es cumplir el requisito
// técnico de Chrome/Android para poder "Instalar" la app (agrega un ícono
// de app real a la pantalla de inicio, en vez de un simple acceso directo).
//
// NO cachea nada a propósito: esta app depende de datos en vivo (Firebase
// Realtime Database), así que responder con algo cacheado mostraría
// información desactualizada en un sistema hospitalario. Cada fetch se deja
// pasar sin interceptar.
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
    // Sin event.respondWith(): el navegador maneja la petición normalmente.
});
