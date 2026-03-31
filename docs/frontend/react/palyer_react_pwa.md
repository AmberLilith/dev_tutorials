---
sidebar_position: 1
title: "Player PWA — Documentação Completa"
---

# Player PWA — Documentação Completa

Este guia documenta a criação de um **player de mídia PWA** (Progressive Web App) do zero, usando **React + Vite + TypeScript**. O app toca músicas e vídeos de arquivos locais, funciona offline, pode ser instalado no celular ou computador como um app nativo, e lembra a última faixa reproduzida — incluindo o ponto exato onde você parou.

---

## O que você vai precisar

- [Node.js](https://nodejs.org/) instalado (versão 18 ou superior)
- Um editor de código (recomendado: [VS Code](https://code.visualstudio.com/))
- Um navegador moderno (Chrome ou Edge — Firefox não suporta PWA com a mesma completude)

---

## Conceitos fundamentais antes de começar

Antes de partir para o código, é importante entender três conceitos que aparecem o tempo todo no React:

**Componente** é uma função que retorna HTML (chamado JSX). Tudo no React é um componente — um botão, uma tela inteira, o app todo.

**Estado (`useState`)** é uma variável especial. Quando ela muda, o componente redesenha automaticamente. É o coração do React.

**Efeito (`useEffect`)** é um código que roda quando algo muda. Usado para buscar dados, manipular elementos da página, salvar informações, etc.

---

## Etapa 1 — Criando o projeto

No terminal, rode os comandos abaixo:

```bash
npm create vite@latest player -- --template react-ts
cd player
npm install
npm run dev
```

Abra `http://localhost:5173` no browser. Você vai ver a tela padrão do Vite.

**O que cada comando fez:**
- `npm create vite@latest` — cria um projeto novo usando o Vite como bundler
- `--template react-ts` — usa React com TypeScript
- `npm install` — baixa as dependências
- `npm run dev` — sobe o servidor de desenvolvimento

:::info O que é o `--` sozinho no comando?
É uma convenção do terminal que significa "tudo que vem depois são argumentos para o comando filho, não para o npm". O npm repassa o `--template` para o Vite.
:::

:::info O que é o Vite?
O browser só entende HTML, CSS e JavaScript puro. Quando você escreve React, usa TypeScript e JSX — coisas que o browser não entende nativamente. O Vite transforma tudo isso em JavaScript puro antes de servir para o browser. Em desenvolvimento, ele atualiza a tela em milissegundos quando você salva um arquivo (HMR — Hot Module Replacement).
:::

### Estrutura de pastas criada

```
player/
├── public/          → arquivos estáticos (ícones, manifest, service worker)
├── src/
│   ├── components/  → componentes reutilizáveis
│   ├── pages/       → telas da aplicação
│   │   ├── Music.tsx
│   │   └── Video.tsx
│   ├── App.tsx      → componente raiz
│   ├── db.ts        → utilitário do banco de dados local
│   ├── main.tsx     → ponto de entrada
│   └── index.css    → estilos globais
├── index.html
└── package.json
```

### Limpando o projeto padrão

Substitua o conteúdo de `src/App.tsx` por:

```tsx
function App() {
  return (
    <div>
      <h1>Meu Player</h1>
    </div>
  )
}

export default App
```

---

## Etapa 2 — Estrutura de telas e navegação

Instale o React Router, a biblioteca de navegação mais usada no React:

```bash
npm install react-router-dom
```

Crie a pasta `src/pages/` e os arquivos `Music.tsx` e `Video.tsx` com conteúdo inicial simples:

```tsx
// src/pages/Music.tsx
function Music() {
  return <h1>Tela de Música</h1>
}
export default Music
```

```tsx
// src/pages/Video.tsx
function Video() {
  return <h1>Tela de Vídeo</h1>
}
export default Video
```

Configure as rotas no `App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Music from './pages/Music'
import Video from './pages/Video'

function App() {
  return (
    <BrowserRouter>
      <nav>
        <NavLink to="/music">Música</NavLink>
        <NavLink to="/video">Vídeo</NavLink>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Music />} />
          <Route path="/music" element={<Music />} />
          <Route path="/video" element={<Video />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
```

**O que cada elemento faz:**
- `BrowserRouter` — envolve o app e habilita o sistema de rotas
- `Routes` — olha a URL atual e renderiza só a rota que combina
- `Route` — define o par `URL → componente`
- `NavLink` — link que adiciona classe `active` automaticamente quando a rota está ativa

---

## Etapa 3 — Banco de dados local (IndexedDB)

Para que músicas e vídeos não sumam ao fechar o browser, precisamos de um banco de dados local. O **IndexedDB** é o banco de dados do próprio browser, capaz de guardar arquivos binários (gigabytes de dados).

:::info Por que não usar o localStorage?
O `localStorage` só guarda texto e tem limite de 5-10MB. Uma única música em MP3 já estouraria esse limite. O IndexedDB não tem esse problema.
:::

Crie o arquivo `src/db.ts`:

```typescript
const DB_NAME = 'PlayerDB';
const STORE_NAME = 'media';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const salvarNoDB = async (name: string, blob: Blob) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put({ name, blob });
};

export const buscarTodosDoDB = async (): Promise<{ name: string, blob: Blob }[]> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
  });
};

export const deletarDoDB = async (name: string) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(name);
};
```

:::tip Dica de debug
Para ver os arquivos salvos no IndexedDB, abra o DevTools (F12) → aba **Application** → **IndexedDB**. Você verá o `PlayerDB` e todos os arquivos guardados.
:::

---

## Etapa 4 — App.tsx (o cérebro do player)

O `App.tsx` é o componente pai que gerencia todo o estado global. Todo estado que precisa ser compartilhado entre telas (lista de músicas, música atual, vídeo atual) vive aqui.

:::info Por que o estado fica no App e não nas páginas?
No React, quando você troca de rota, a página anterior é "destruída". Se o estado da música estivesse em `Music.tsx`, ele sumia ao navegar para a tela de vídeo. Colocando no pai (`App`), ele persiste independente de qual tela está ativa — é por isso que a música continua tocando quando você muda de aba.
:::

Crie a interface `MediaFile` e o componente `App` completo:

```tsx
// src/App.tsx
import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { buscarTodosDoDB, deletarDoDB, salvarNoDB } from './db'
import Music from './pages/Music'
import Video from './pages/Video'
import IconComponent from './components/icons'

export interface MediaFile {
  name: string
  url: string
  type: 'audio' | 'video'
}

function App() {
  const [musicas, setMusicas] = useState<MediaFile[]>([])
  const [videos, setVideos] = useState<MediaFile[]>([])
  const [musicaAtual, setMusicaAtual] = useState<MediaFile | null>(null)
  const [videoAtual, setVideoAtual] = useState<MediaFile | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [repetir, setRepetir] = useState(false)
  const isRestoring = useRef(false) // flag para diferenciar restauração de clique do usuário

  // 1. CARREGA OS DADOS DO BANCO AO ABRIR O APP
  useEffect(() => {
    const carregar = async () => {
      const dados = await buscarTodosDoDB();
      const mTemp: MediaFile[] = [];
      const vTemp: MediaFile[] = [];

      dados.forEach(item => {
        const file = {
          name: item.name,
          url: URL.createObjectURL(item.blob),
          type: item.blob.type.includes('audio') ? 'audio' : 'video' as any
        };
        if (file.type === 'audio') mTemp.push(file);
        else vTemp.push(file);
      });

      setMusicas(mTemp);
      setVideos(vTemp);

      // Restaura a última música que estava tocando
      const ultimaMusicaNome = localStorage.getItem('ultima_musica_nome');
      if (ultimaMusicaNome) {
        const encontrada = mTemp.find(m => m.name === ultimaMusicaNome);
        if (encontrada) {
          isRestoring.current = true  // sinaliza que é restauração (não clique do usuário)
          setMusicaAtual(encontrada);
        }
      }
    };
    carregar();
  }, []);

  // 2. SALVA O PROGRESSO A CADA SEGUNDO
  useEffect(() => {
    const interval = setInterval(() => {
      if (audioRef.current && musicaAtual) {
        localStorage.setItem('ultimo_progresso_tempo', audioRef.current.currentTime.toString());
        localStorage.setItem('ultima_musica_nome', musicaAtual.name);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [musicaAtual]);

  // 3. DÁ PLAY QUANDO A MÚSICA MUDA (mas não na restauração do app)
  useEffect(() => {
    if (audioRef.current && musicaAtual) {
      if (isRestoring.current) {
        isRestoring.current = false  // reseta a flag
        return  // não dá play, só carrega a música
      }
      audioRef.current.play();
    }
  }, [musicaAtual]);

  // Reordena a playlist sem interromper o áudio
  const reordenarMusicas = (novaOrdem: MediaFile[]) => {
    setMusicas(novaOrdem)
  }

  // Adiciona ou substitui mídia no banco e no estado
  const adicionarMedia = async (files: File[], limparAnterior: boolean, tipo: 'audio' | 'video') => {
    if (limparAnterior) {
      const todos = await buscarTodosDoDB();
      for (const item of todos) {
        const ehAudio = item.blob.type.includes('audio');
        if ((tipo === 'audio' && ehAudio) || (tipo === 'video' && !ehAudio)) {
          await deletarDoDB(item.name);
        }
      }
      if (tipo === 'audio') { setMusicas([]); setMusicaAtual(null); }
      else { setVideos([]); setVideoAtual(null); }
    }

    const novasTemp: MediaFile[] = [];
    for (const file of files) {
      await salvarNoDB(file.name, file);
      novasTemp.push({
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type.includes('audio') ? 'audio' : 'video' as any
      });
    }

    if (tipo === 'audio') setMusicas(p => limparAnterior ? novasTemp : [...p, ...novasTemp]);
    else setVideos(p => limparAnterior ? novasTemp : [...p, ...novasTemp]);
  };

  // Exclui toda a biblioteca de um tipo
  const excluirTudo = async (tipo: 'audio' | 'video') => {
    const confirmacao = window.confirm(
      `Tem certeza que deseja excluir todos os ${tipo === 'audio' ? 'áudios' : 'vídeos'}?`
    );
    if (!confirmacao) return;

    const todos = await buscarTodosDoDB();
    for (const item of todos) {
      const ehAudio = item.blob.type.includes('audio');
      if ((tipo === 'audio' && ehAudio) || (tipo === 'video' && !ehAudio)) {
        await deletarDoDB(item.name);
      }
    }

    if (tipo === 'audio') { setMusicas([]); setMusicaAtual(null); }
    else { setVideos([]); setVideoAtual(null); }
  };

  // Toca o próximo vídeo da lista
  const tocarProximoVideo = () => {
    if (!videoAtual) return;
    const index = videos.findIndex(v => v.name === videoAtual.name);
    if (index !== -1 && index < videos.length - 1) {
      setVideoAtual(videos[index + 1]);
    }
  };

  // Lida com o fim de uma música (toca a próxima ou repete)
  const lidarComFimDaMusica = () => {
    const indexAtual = musicas.findIndex(m => m.name === musicaAtual?.name);
    const ehUltimaMusica = indexAtual === musicas.length - 1;

    let proxima: MediaFile | null = null;

    if (repetir && ehUltimaMusica) {
      proxima = musicas[0]; // volta para a primeira se repetir estiver ativo
    } else if (!ehUltimaMusica) {
      proxima = musicas[indexAtual + 1];
    }

    if (proxima) {
      setMusicaAtual(proxima);
      // Delay necessário para o React atualizar o src antes de dar play
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(_ => {
            console.log("Autoplay bloqueado pelo browser.");
          });
        }
      }, 100);
    }
  };

  // Props do Music agrupadas para evitar repetição nas rotas
  const musicaProps = {
    musicas,
    onAdd: (f: File[], limpar: boolean) => adicionarMedia(f, limpar, 'audio'),
    onSelect: (m: MediaFile) => { setVideoAtual(null); setMusicaAtual(m); },
    onRemove: async (n: string) => {
      if (musicaAtual?.name === n) {
        const index = musicas.findIndex(m => m.name === n);
        if (index !== -1 && index < musicas.length - 1) {
          setMusicaAtual(musicas[index + 1]);
        } else if (musicas.length > 1) {
          setMusicaAtual(musicas[0]);
        } else {
          setMusicaAtual(null);
        }
      }
      await deletarDoDB(n);
      setMusicas(p => p.filter(x => x.name !== n));
    },
    musicaAtiva: musicaAtual,
    onClearAll: () => excluirTudo('audio'),
    onReorder: reordenarMusicas,
  }

  return (
    <BrowserRouter>
      <nav style={{ padding: '15px', background: '#1a1a1a', display: 'flex', gap: '20px' }}>
        <NavLink to="/music" style={({ isActive }) => ({
          color: isActive ? '#4CAF50' : 'white', textDecoration: 'none'
        })}>MÚSICA</NavLink>
        <NavLink to="/video" style={({ isActive }) => ({
          color: isActive ? '#4CAF50' : 'white', textDecoration: 'none'
        })}>VÍDEO</NavLink>
      </nav>

      <main style={{ padding: '20px', paddingBottom: '120px' }}>
        <Routes>
          <Route path="/" element={<Music {...musicaProps} />} />
          <Route path="/music" element={<Music {...musicaProps} />} />
          <Route path="/video" element={
            <Video
              videos={videos}
              onAdd={(f, limpar) => adicionarMedia(f, limpar, 'video')}
              onSelect={(v) => {
                if (audioRef.current) audioRef.current.pause();
                setVideoAtual(v);
              }}
              onRemove={async (n) => {
                if (videoAtual?.name === n) {
                  const index = videos.findIndex(v => v.name === n);
                  if (index !== -1 && index < videos.length - 1) {
                    setVideoAtual(videos[index + 1]);
                  } else if (videos.length > 1) {
                    setVideoAtual(videos[0]);
                  } else {
                    setVideoAtual(null);
                  }
                }
                await deletarDoDB(n);
                setVideos(p => p.filter(x => x.name !== n));
              }}
              videoAtivo={videoAtual}
              onEnded={tocarProximoVideo}
              onClearAll={() => excluirTudo('video')}
            />
          } />
        </Routes>
      </main>

      {/* MINIPLAYER FIXO NO RODAPÉ */}
      {musicaAtual && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#222', color: 'white', padding: '15px',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '10px', zIndex: 9999,
          boxShadow: '0 -5px 15px rgba(0,0,0,0.5)'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '15px',
            width: '100%', maxWidth: '800px'
          }}>
            <button
              onClick={() => setRepetir(!repetir)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '24px',
                color: repetir ? 'var(--primary-gold)' : '#888',
                transition: 'all 0.3s ease', display: 'flex', alignItems: 'center'
              }}
              title={repetir ? "Repetir Playlist: Ligado" : "Repetir Playlist: Desligado"}
            >
              {IconComponent("repeat", repetir ? 'var(--primary-gold)' : '#888')}
            </button>

            <audio
              ref={audioRef}
              src={musicaAtual.url}
              controls
              onEnded={lidarComFimDaMusica}
              onLoadedMetadata={() => {
                const tempoSalvo = localStorage.getItem('ultimo_progresso_tempo');
                const nomeSalvo = localStorage.getItem('ultima_musica_nome');
                if (tempoSalvo && nomeSalvo === musicaAtual.name && audioRef.current) {
                  audioRef.current.currentTime = parseFloat(tempoSalvo);
                }
              }}
              style={{ width: '100%', maxWidth: '500px' }}
            />
          </div>

          <div style={{
            fontSize: '14px', color: 'var(--primary-gold)',
            textAlign: 'center', width: '100%', maxWidth: '500px'
          }}>
            🎵 {musicaAtual.name}
          </div>
        </div>
      )}
    </BrowserRouter>
  )
}

export default App
```

---

## Etapa 5 — Tela de Música (`Music.tsx`)

A tela de música usa a biblioteca `@dnd-kit` para permitir arrastar e reordenar as faixas da playlist.

Instale a biblioteca:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Crie `src/pages/Music.tsx`:

```tsx
import {
    closestCenter, DndContext, PointerSensor,
    useSensor, useSensors, type DragEndEvent
} from '@dnd-kit/core'
import {
    arrayMove, SortableContext,
    useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { MediaFile } from '../App'

interface MusicProps {
    musicas: MediaFile[]
    onAdd: (f: File[], l: boolean) => void
    onSelect: (m: MediaFile) => void
    onRemove: (n: string) => void
    musicaAtiva: MediaFile | null
    onClearAll: () => void
    onReorder: (novaOrdem: MediaFile[]) => void
}

interface ItemProps {
    musica: MediaFile
    ativa: boolean
    onSelect: (m: MediaFile) => void
    onRemove: (n: string) => void
}

// Componente de cada item da lista (separado para o useSortable funcionar)
function MusicItem({ musica, ativa, onSelect, onRemove }: ItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: musica.name })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <li
            ref={setNodeRef}
            style={{
                ...style,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 15px', marginBottom: '8px', borderRadius: '6px',
                background: 'var(--bg-card)', cursor: 'pointer',
                border: ativa ? '1px solid var(--primary-gold)' : '1px solid #222',
                transition: 'all 0.2s ease',
            }}
            onClick={() => onSelect(musica)}
        >
            {/* Handle de drag — só esta área arrasta */}
            <span
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                style={{
                    cursor: 'grab', padding: '0 10px 0 0',
                    color: '#555', fontSize: '18px',
                    userSelect: 'none', flexShrink: 0,
                }}
                title="Arraste para reordenar"
            >
                ⠿
            </span>

            <span style={{
                flex: 1,
                color: ativa ? 'var(--primary-gold)' : 'var(--text-main)',
                fontSize: '14px', fontWeight: ativa ? '600' : '400',
                pointerEvents: 'none', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
                {musica.name}
            </span>

            <button
                onClick={(e) => { e.stopPropagation(); onRemove(musica.name) }}
                style={{
                    color: '#ff4444', border: 'none', background: 'none',
                    cursor: 'pointer', padding: '8px', fontSize: '18px', flexShrink: 0,
                }}
            >
                🗑️
            </button>
        </li>
    )
}

function Music({ musicas, onAdd, onSelect, onRemove, musicaAtiva, onClearAll, onReorder }: MusicProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )

    const handleInput = (limpar: boolean, isDirectory: boolean) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        ;(input as any).webkitdirectory = isDirectory
        ;(input as any).directory = isDirectory
        input.accept = 'audio/*'
        input.onchange = (e) => {
            const f = (e.target as HTMLInputElement).files
            if (f) {
                const soAudio = Array.from(f).filter(file => file.type.startsWith('audio/'))
                if (soAudio.length > 0) onAdd(soAudio, limpar)
            }
        }
        input.click()
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIndex = musicas.findIndex(m => m.name === active.id)
        const newIndex = musicas.findIndex(m => m.name === over.id)
        onReorder(arrayMove(musicas, oldIndex, newIndex))
    }

    return (
        <div>
            <h1 style={{ textAlign: 'center' }}>Minhas Músicas</h1>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', justifyContent: 'center' }}>
                <button onClick={() => handleInput(true, true)}
                    style={{ padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    📂 Abrir Pasta
                </button>
                <button onClick={() => handleInput(false, false)}
                    style={{ padding: '10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    ➕ Adicionar à Playlist
                </button>
                {musicas.length > 0 && (
                    <button onClick={onClearAll}
                        style={{ padding: '10px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        🗑️ Limpar Biblioteca
                    </button>
                )}
            </div>

            {musicas.length === 0 ? (
                <div style={{
                    maxWidth: '500px', margin: '40px auto 0 auto', padding: '40px',
                    textAlign: 'center', border: '2px dashed #333',
                    borderRadius: '12px', color: 'var(--text-dim)'
                }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}>🎧</span>
                    <h2 style={{ color: 'var(--primary-gold)' }}>Sua biblioteca está vazia</h2>
                    <p>Clique em <strong>Abrir Pasta</strong> para carregar suas músicas.</p>
                    <p style={{ fontSize: '12px' }}>A playlist é armazenada apenas no seu navegador.</p>
                </div>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={musicas.map(m => m.name)} strategy={verticalListSortingStrategy}>
                        <ul style={{ listStyle: 'none', padding: 0, marginTop: '20px' }}>
                            {musicas.map((m) => (
                                <MusicItem
                                    key={m.name}
                                    musica={m}
                                    ativa={musicaAtiva?.name === m.name}
                                    onSelect={onSelect}
                                    onRemove={onRemove}
                                />
                            ))}
                        </ul>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    )
}

export default Music
```

---

## Etapa 6 — Tela de Vídeo (`Video.tsx`)

Crie `src/pages/Video.tsx`:

```tsx
import { useRef, useEffect } from 'react'
import type { MediaFile } from '../App'

interface VideoProps {
    videos: MediaFile[]
    onAdd: (files: File[], limpar: boolean) => void
    onSelect: (v: MediaFile) => void
    onRemove: (name: string) => void
    onEnded: () => void
    videoAtivo: MediaFile | null
    onClearAll: () => void
}

function Video({ videos, onAdd, onSelect, onRemove, onEnded, videoAtivo, onClearAll }: VideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null)

    const handleInput = (limpar: boolean, isDirectory: boolean) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        ;(input as any).webkitdirectory = isDirectory
        ;(input as any).directory = isDirectory
        input.accept = 'video/*'
        input.onchange = (e) => {
            const f = (e.target as HTMLInputElement).files
            if (f) {
                const soVideo = Array.from(f).filter(file => file.type.startsWith('video/'))
                if (soVideo.length > 0) onAdd(soVideo, limpar)
            }
        }
        input.click()
    }

    useEffect(() => {
        if (videoAtivo && videoRef.current) {
            videoRef.current.play();
        }
    }, [videoAtivo])

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1>Meus Vídeos</h1>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button onClick={() => handleInput(true, true)}
                    style={{ padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    📂 Abrir Pasta
                </button>
                <button onClick={() => handleInput(false, false)}
                    style={{ padding: '10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    ➕ Adicionar Vídeos
                </button>
                {videos.length > 0 && (
                    <button onClick={onClearAll}
                        style={{ padding: '10px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        🗑️ Excluir Todos
                    </button>
                )}
            </div>

            {videoAtivo && (
                <div style={{ background: '#000', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
                    <video ref={videoRef} src={videoAtivo.url} controls onEnded={onEnded}
                        style={{ width: '100%', maxHeight: '450px' }} />
                </div>
            )}

            {videos.length === 0 ? (
                <div style={{
                    marginTop: '40px', padding: '40px', textAlign: 'center',
                    border: '2px dashed #333', borderRadius: '12px', color: 'var(--text-dim)'
                }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}>🎬</span>
                    <h2 style={{ color: 'var(--primary-gold)' }}>Nenhum vídeo encontrado</h2>
                    <p>Selecione seus arquivos de vídeo para começar.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                    {videos.map((v) => (
                        <div key={v.name} onClick={() => onSelect(v)} style={{
                            position: 'relative',
                            border: videoAtivo?.name === v.name ? '2px solid var(--primary-gold)' : '1px solid #222',
                            padding: '10px', borderRadius: '5px',
                            background: 'var(--bg-card)', cursor: 'pointer'
                        }}>
                            <div style={{ color: videoAtivo?.name === v.name ? 'var(--primary-gold)' : 'var(--text-main)' }}>
                                🎬 {v.name}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(v.name); }}
                                style={{ position: 'absolute', top: '5px', right: '5px', color: '#ff4444', border: 'none', background: 'none', cursor: 'pointer' }}>
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Video
```

---

## Etapa 7 — Componente de ícones

Crie a pasta `src/components/` e o arquivo `src/components/icons.tsx`:

```tsx
const IconComponent = (iconName: string, fillColor: string) => {
    const icons: Record<string, string> = {
        "repeat": "M280-80 120-240l160-160 56 58-62 62h406v-160h80v240H274l62 62-56 58Zm-80-440v-240h486l-62-62 56-58 160 160-160 160-56-58 62-62H280v160h-80Z",
    };
    return (
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960"
            width="24px" fill={fillColor || "#000000"}>
            <path d={icons[iconName]} />
        </svg>
    );
};

export default IconComponent;
```

---

## Etapa 8 — Estilo global (`index.css`)

Substitua o conteúdo de `src/index.css`:

```css
:root {
  --bg-dark: #0a0a0b;
  --bg-card: #161618;
  --primary-gold: #d4af37;
  --accent-blue: #00d2ff;
  --text-main: #e0e0e0;
  --text-dim: #a0a0a0;
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, sans-serif;
  background-color: var(--bg-dark);
  color: var(--text-main);
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--bg-dark); }
::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: var(--primary-gold); }

nav {
  border-bottom: 1px solid #222;
  box-shadow: 0 4px 10px rgba(0,0,0,0.5);
}

button {
  transition: all 0.3s ease;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

button:hover {
  transform: translateY(-2px);
  filter: brightness(1.2);
  box-shadow: 0 0 15px rgba(0, 210, 255, 0.3);
}

li, .video-card {
  background: var(--bg-card) !important;
  border: 1px solid #222 !important;
  color: var(--text-main) !important;
  transition: border-color 0.3s;
}

li:hover { border-color: var(--accent-blue) !important; }

.active-item {
  border-left: 4px solid var(--primary-gold) !important;
  background: linear-gradient(90deg, #1a1a1d, #161618) !important;
}

.player-bar {
  background: rgba(22, 22, 24, 0.95) !important;
  backdrop-filter: blur(10px);
  border-top: 1px solid var(--primary-gold);
  box-shadow: 0 -5px 20px rgba(0,0,0,0.8);
}

h1 {
  color: var(--primary-gold);
  margin-bottom: 25px;
  font-weight: 300;
  text-transform: uppercase;
  letter-spacing: 2px;
}

main {
  background-color: var(--bg-dark);
  min-height: 100vh;
}

span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 10px;
}

ul {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}
```

---

## Etapa 9 — Configurando o PWA

### 9.1 Manifest (`public/manifest.json`)

Crie o arquivo `public/manifest.json`:

```json
{
  "short_name": "Player",
  "name": "Meu Player de Música e Vídeo",
  "icons": [
    {
      "src": "logo512.png",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/png"
    },
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

:::info O que é `display: standalone`?
Faz o app abrir sem a barra de endereços do browser, parecendo um app nativo instalado.
:::

:::caution Ícones com bordas brancas no Android
Isso acontece porque o Android usa ícones adaptativos. A propriedade `"purpose": "any maskable"` instrui o Android a usar a cor de fundo `background_color` em vez de branco. Após alterar, desinstale e reinstale o app no celular.
:::

### 9.2 Service Worker (`public/sw.js`)

Crie o arquivo `public/sw.js`:

```javascript
const CACHE_NAME = 'player-v1';
const urlsToCache = ['/', '/index.html'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
```

### 9.3 Registro do Service Worker (`src/serviceWorkerRegistration.ts`)

Crie `src/serviceWorkerRegistration.ts`:

```typescript
export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        console.log('SW registrado:', registration.scope);
      }).catch(error => {
        console.log('Falha ao registrar SW:', error);
      });
    });
  }
}
```

### 9.4 Registrar no `main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import * as serviceWorkerRegistration from './serviceWorkerRegistration.ts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

serviceWorkerRegistration.register();
```

### 9.5 Vincular o manifest no `index.html`

Abra `index.html` na raiz do projeto e adicione dentro de `<head>`:

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#1a1a1a">
```

:::danger Atenção ao caminho do manifest
Use `/manifest.json` e não `/public/manifest.json`. No Vite, tudo que está em `public/` é servido na raiz — se você colocar `/public/` no caminho, o browser vai procurar uma pasta que não existe e o PWA não será detectado.
:::

---

## Etapa 10 — Build e deploy

### Build local

```bash
npm run build
npx serve -s dist
```

Acesse `http://localhost:3000`. O ícone de instalação aparecerá na barra do browser.

:::caution O botão de instalar não aparece?
Verifique: o manifest está acessível em `http://localhost:3000/manifest.json`? Se abrir e mostrar o JSON, o problema é cache. Tente abrir em aba anônima. Se der 404, o caminho no `index.html` está errado (veja a seção 9.5).
:::

### Deploy no Vercel

O Vercel é a forma mais simples de hospedar — detecta automaticamente que é um projeto Vite e configura tudo.

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique em **Add New → Project**
3. Importe o repositório do player
4. O Vercel detecta Vite automaticamente. Confirme que **Build Command** é `npm run build` e **Output Directory** é `dist`
5. Clique em **Deploy**

Se ao navegar para `/music` diretamente der erro 404, crie o arquivo `vercel.json` na raiz do projeto:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

---

## Problemas encontrados e soluções

| Problema | Causa | Solução |
|---|---|---|
| Seleção de arquivo cancelada no `showOpenFilePicker` | API não suportada em alguns browsers | Usar `input.click()` com `document.createElement('input')` |
| Playlist sumia ao trocar de tela | Estado dentro do componente de página | Mover o estado para o `App.tsx` (componente pai) |
| Música tocava ao reabrir o app | `useEffect` dando play na restauração | Usar `useRef` como flag `isRestoring` para diferenciar restauração de clique do usuário |
| Próxima música não tocava ao terminar | React atualizando o `src` depois do `play()` | Adicionar `setTimeout` de 100ms antes do `play()` |
| Browser bloqueava autoplay | Política de autoplay dos browsers modernos | Usar `.catch()` para capturar o erro silenciosamente |
| Player de vídeo sumia ao terminar | `onEnded` chamava `setVideoAtual(null)` | Chamar `tocarProximoVideo()` em vez de `null` |
| Progresso sendo salvo para várias músicas | Chave dinâmica no localStorage | Usar chaves fixas `ultimo_progresso_tempo` e `ultima_musica_nome` |
| Manifest não detectado pelo browser | Caminho `/public/manifest.json` no `index.html` | Corrigir para `/manifest.json` |
| Ícone com bordas brancas no Android | Android usa ícones adaptativos | Adicionar `"purpose": "any maskable"` no manifest |
| Pasta carregando todos os tipos de arquivo | `webkitdirectory` ignora o `accept` | Filtrar manualmente com `.filter(file => file.type.startsWith('audio/'))` |
| App dava 404 no GitHub Pages | SPA não suportado nativamente | Migrar para Vercel ou adicionar arquivo `404.html` |

---

## Funcionalidades implementadas

- Carregar músicas e vídeos de pasta ou arquivos individuais
- Filtro automático de tipo (só áudio na tela de música, só vídeo na tela de vídeo)
- Persistência via IndexedDB (arquivos não somem ao fechar o browser)
- Memória da última faixa e posição exata (continua de onde parou)
- Autoplay da próxima faixa ao terminar
- Botão de repetir playlist
- Reordenar músicas via drag and drop
- Excluir item individual ou toda a biblioteca
- Ao excluir a faixa atual, toca automaticamente a próxima
- Música continua tocando ao navegar para a tela de vídeo
- Vídeo pausa o áudio automaticamente
- Estado vazio com instrução para o usuário
- Design dark com paleta preto, dourado e azul
- PWA instalável com ícone e modo standalone
- Funciona offline após primeira abertura