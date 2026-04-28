// Service Worker para CineList
const CACHE_NAME = 'cinelist-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/filmes.json',
  '/offline.html'
];

// Instalar o Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Cache aberto e arquivos adicionados');
      return cache.addAll(ASSETS_TO_CACHE).catch((error) => {
        console.warn('Alguns arquivos não puderam ser cacheados:', error);
      });
    })
  );
  self.skipWaiting();
});

// Ativar o Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker ativado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia Network First com Fallback para Cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignorar requisições não-GET
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clonar a resposta
        const clonedResponse = response.clone();

        // Armazenar no cache
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clonedResponse);
        });

        return response;
      })
      .catch(() => {
        // Se a rede falhar, tentar o cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Se não houver cache, retornar página offline
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }

          // Retornar uma resposta padrão para outros tipos
          return new Response('Recurso não disponível offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Sincronização em background (opcional)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-filmes') {
    event.waitUntil(
      fetch('/filmes.json')
        .then((response) => response.json())
        .then((data) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put('/filmes.json', new Response(JSON.stringify(data)));
          });
        })
        .catch((error) => {
          console.error('Erro na sincronização:', error);
        })
    );
  }
});
