---
sidebar_position: 2
title: "Configuração de PWA em Aplicação React + Vite"
---

# Configuração de PWA em Aplicação React + Vite

Guia completo baseado em implementação real, incluindo suporte offline, install prompt e share target.

---

## Pré-requisitos

- Aplicação React com Vite
- HTTPS em produção (ou `localhost` em desenvolvimento)
- Ícones: `logo192.png` e `logo512.png` na pasta `public/`

---

## 1. Estrutura de Arquivos

```
public/
├── manifest.json
├── sw.js
├── logo192.png
├── logo512.png
└── body-bg.png   ← e demais assets estáticos usados pelo app
src/
└── main.tsx
```

---

## 2. manifest.json

Crie o arquivo `public/manifest.json`:

```json
{
  "short_name": "Player",
  "name": "Meu App",
  "icons": [
    {
      "src": "logo192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "any maskable"
    },
    {
      "src": "logo512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "any maskable"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#111111",
  "background_color": "#111111"
}
```

---

## 3. index.html

Referencie o manifest e defina o `theme-color` no `<head>`:

```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.png" />
  <link rel="manifest" href="/manifest.json" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#1a1a1a" />
  <title>Meu App</title>
</head>
```

---

## 4. Registrar o Service Worker

Em `src/main.tsx`, registre o SW após o carregamento da página:

```tsx
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

---

## 5. Service Worker (sw.js)

Crie `public/sw.js`. Este é o arquivo mais importante — ele é responsável pelo funcionamento offline.

```js
const CACHE_NAME = 'app-v1';

// Liste TODOS os arquivos necessários para o app funcionar offline.
// Os assets do Vite (JS e CSS) têm hash no nome — veja a seção
// "Atualizando os nomes dos assets" abaixo.
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/body-bg.png',                     // imagens de fundo e assets estáticos
  '/assets/index-XXXXXXXX.js',        // ← substitua pelo nome gerado pelo build
  '/assets/index-XXXXXXXX.css',       // ← substitua pelo nome gerado pelo build
];

// Instalação: cacheia todos os arquivos listados
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Ativação: limpa caches antigos de versões anteriores
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: serve do cache se disponível, senão busca na rede
self.addEventListener('fetch', event => {
  // Ignora requisições POST (ex: share target)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(networkResponse => {
        // Cacheia dinamicamente scripts, estilos e imagens
        if (
          event.request.destination === 'script' ||
          event.request.destination === 'style' ||
          event.request.destination === 'image'
        ) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      });
    }).catch(() => caches.match('/index.html')) // fallback para o app shell
  );
});
```

---

## 6. Atualizando os nomes dos assets após cada build

O Vite gera arquivos com hash no nome (ex: `index-BuH8UAAr.js`). Esses nomes mudam a cada `npm run build`.

### Verificar os nomes gerados

```bash
ls dist/assets/
# Exemplo de saída:
# index-BuH8UAAr.js
# index-y4iYIl_9.css
```

### Script automático de atualização

Crie `update-sw.js` na raiz do projeto:

```js
import fs from 'fs';

const assetsDir = './dist/assets';
const swPath = './dist/sw.js';

const files = fs.readdirSync(assetsDir);
const js  = files.find(f => f.endsWith('.js'));
const css = files.find(f => f.endsWith('.css'));

let sw = fs.readFileSync(swPath, 'utf-8');
sw = sw.replace(/\/assets\/index-.*?\.js/,  `/assets/${js}`);
sw = sw.replace(/\/assets\/index-.*?\.css/, `/assets/${css}`);
fs.writeFileSync(swPath, sw);

console.log(`✅ SW atualizado: ${js}, ${css}`);
```

### Automatizar no build

Em `package.json`:

```json
"scripts": {
  "build": "vite build && node update-sw.js"
}
```

Assim, toda execução de `npm run build` atualiza automaticamente os nomes no SW.

---

## 7. Install Prompt (botão de instalação customizado)

Em vez de depender do prompt automático do browser, capture o evento e exiba seu próprio dialog.

```tsx
// App.tsx
const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
const [showInstallButton, setShowInstallButton] = useState(false);

// Registra o listener apenas se o app ainda não estiver instalado
useEffect(() => {
  const jaInstalado =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true; // iOS Safari

  if (jaInstalado) return;

  const handler = (e: Event) => {
    e.preventDefault();
    setDeferredPrompt(e);
    setShowInstallButton(true);
  };

  window.addEventListener('beforeinstallprompt', handler);
  return () => window.removeEventListener('beforeinstallprompt', handler);
}, []);

// Abre o dialog quando o estado mudar
useEffect(() => {
  if (showInstallButton) dialog.open();
}, [showInstallButton]);

// Função chamada ao confirmar a instalação
const handleInstallClick = async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') setShowInstallButton(false);
  setDeferredPrompt(null);
};
```

```tsx
// No JSX
<Dialog isOpen={dialog.isOpen} onClose={dialog.close} title="Instalar App">
  <p>Deseja instalar o aplicativo no seu dispositivo?</p>
  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
    <button onClick={dialog.close}>Agora não</button>
    <button onClick={() => { handleInstallClick(); dialog.close(); }}>
      Instalar
    </button>
  </div>
</Dialog>
```

> **Nota:** O evento `beforeinstallprompt` só dispara no Chrome/Edge, em HTTPS ou localhost, e apenas quando o app ainda não está instalado.

---

## 8. Testando o PWA

### No navegador (Chrome DevTools)

1. Abra o DevTools → aba **Application**
2. Em **Service Workers**: verifique se o SW está registrado e ativo
3. Em **Cache Storage**: confirme que os arquivos estão cacheados
4. Em **Manifest**: verifique se o manifest foi lido corretamente

### Testando offline

1. Acesse o app online pelo menos **uma vez** para popular o cache
2. DevTools → **Network** → marque **Offline**
3. Recarregue a página — o app deve funcionar normalmente

### Forçar atualização do SW durante desenvolvimento

Sempre que atualizar o `sw.js`, incremente o `CACHE_NAME`:

```js
const CACHE_NAME = 'app-v2'; // era v1
```

E no DevTools → Application → Service Workers → clique em **Unregister** e **Clear storage** para limpar o cache antigo.

---

## Problemas comuns

| Sintoma | Causa | Solução |
|---|---|---|
| Tela branca offline | Assets JS/CSS não estão no cache | Adicione os nomes corretos em `urlsToCache` |
| Fundo não carrega offline | Imagem estática não cacheada | Adicione o caminho da imagem em `urlsToCache` |
| SW não atualiza | Cache antigo ainda ativo | Incremente `CACHE_NAME` e faça Unregister no DevTools |
| Install prompt não aparece | App já instalado ou browser não suporta | Verifique com `display-mode: standalone` |
| SW não registra | Erro no `sw.js` | Verifique o console do DevTools por erros de sintaxe |