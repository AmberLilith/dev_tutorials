---
sidebar_position: 6
title: "Aplicação Angular com Supabase"
---

# Guia Completo: Angular + Angular Material + Supabase + Firebase Hosting

> Documentação baseada no desenvolvimento do projeto **Diário de Vivências** — uma aplicação Angular 17+ com autenticação, banco de dados em tempo real, upload de imagens e deploy no Firebase Hosting.

---

## Índice

1. [Stack e decisões de arquitetura](#1-stack-e-decisões-de-arquitetura)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Criando o projeto](#3-criando-o-projeto)
4. [Configurando o Supabase](#4-configurando-o-supabase)
5. [Estrutura de pastas](#5-estrutura-de-pastas)
6. [Models](#6-models)
7. [Serviços principais](#7-serviços-principais)
8. [Guards](#8-guards)
9. [Componentes](#9-componentes)
10. [Roteamento](#10-roteamento)
11. [Temas claro e escuro](#11-temas-claro-e-escuro)
12. [Editor rico com Quill](#12-editor-rico-com-quill)
13. [Realtime](#13-realtime)
14. [Paginação server-side](#14-paginação-server-side)
15. [Busca e filtros](#15-busca-e-filtros)
16. [Upload de imagens](#16-upload-de-imagens)
17. [Deploy no Firebase Hosting](#17-deploy-no-firebase-hosting)
18. [Referência rápida](#18-referência-rápida)

---

## 1. Stack e decisões de arquitetura

### Por que Supabase?

O Firebase Storage passou a exigir o plano Blaze (pago) mesmo para uso mínimo. O Supabase oferece:

- **1 GB de storage** no plano gratuito real
- **PostgreSQL** com realtime nativo
- **Autenticação** embutida e gratuita
- **Row Level Security (RLS)** — cada usuário só acessa os próprios dados
- **SDK JS oficial** (`@supabase/supabase-js`)

### Por que Firebase Hosting?

- Gratuito no plano Spark
- Deploy simples com CLI
- CDN global
- Não requer o Firebase Database — funciona independentemente

### Arquitetura geral

```
Angular (frontend) → Supabase (auth + banco + storage) → Firebase Hosting (deploy)
```

O Angular após o `ng build` gera arquivos estáticos (HTML, CSS, JS). O Supabase é acessado diretamente do navegador — sem backend intermediário.

---

## 2. Pré-requisitos

- Node.js v20+ (requerido pelo Firebase CLI)
- Angular CLI instalado globalmente
- Conta no [supabase.com](https://supabase.com)
- Conta no [firebase.google.com](https://firebase.google.com)

```bash
# Verificar versão do Node
node -v  # deve ser v20+

# Instalar Angular CLI
npm install -g @angular/cli
```

---

## 3. Criando o projeto

### 3.1 Novo projeto Angular

```bash
ng new nome-do-projeto --routing --style=scss --standalone
cd nome-do-projeto
```

Quando perguntar sobre SSR, responda **N**.

### 3.2 Instalar dependências

```bash
# Angular Material
ng add @angular/material

# Supabase
npm install @supabase/supabase-js

# Tipos do Node (necessário para o Supabase Storage)
npm install --save-dev @types/node
```

### 3.3 Configurar tipos do Node

No `tsconfig.app.json` adicione:

```json
{
  "compilerOptions": {
    "types": ["node"]
  }
}
```

### 3.4 Configurar o app

**`src/app/app.component.html`** — remova o conteúdo padrão:

```html
<router-outlet></router-outlet>
```

**`src/app/app.config.ts`:**

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
  ],
};
```

---

## 4. Configurando o Supabase

### 4.1 Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **Project Settings → API Keys** e copie:
   - **Project URL**
   - **anon public key**

### 4.2 Variáveis de ambiente

**`src/environments/environment.ts`:**

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://SEU_PROJECT_ID.supabase.co',
  supabaseAnonKey: 'SUA_ANON_KEY',
};
```

### 4.3 Schema SQL

Execute no **SQL Editor** do Supabase:

```sql
create extension if not exists "uuid-ossp";

-- Tabela de humores
create table public.emotions (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  label       text not null,
  emoji       text not null,
  color       text not null,
  created_at  timestamptz default now() not null
);

-- Tabela de relatos
create table public.entries (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  content       text not null,
  content_text  text,
  emotion_id    uuid references public.emotions(id) on delete set null,
  photos_paths  text[],
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

-- Trigger para atualizar updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger entries_updated_at
  before update on public.entries
  for each row execute procedure public.handle_updated_at();

-- Row Level Security
alter table public.emotions enable row level security;
alter table public.entries  enable row level security;

-- Policies: emotions
create policy "ver próprios humores"    on public.emotions for select using (auth.uid() = user_id);
create policy "criar próprios humores"  on public.emotions for insert with check (auth.uid() = user_id);
create policy "editar próprios humores" on public.emotions for update using (auth.uid() = user_id);
create policy "deletar próprios humores" on public.emotions for delete using (auth.uid() = user_id);

-- Policies: entries
create policy "ver próprios relatos"    on public.entries for select using (auth.uid() = user_id);
create policy "criar próprios relatos"  on public.entries for insert with check (auth.uid() = user_id);
create policy "editar próprios relatos" on public.entries for update using (auth.uid() = user_id);
create policy "deletar próprios relatos" on public.entries for delete using (auth.uid() = user_id);

-- Índices
create index entries_user_id_created_at_idx on public.entries(user_id, created_at desc);
create index emotions_user_id_idx on public.emotions(user_id);
```

### 4.4 Realtime

```sql
alter publication supabase_realtime add table public.entries;
```

### 4.5 Bucket de storage

1. Vá em **Storage → New bucket**
2. Nome: `entry-photos`
3. Public: **desativado**

Execute as políticas de storage no SQL Editor:

```sql
create policy "upload próprias fotos"
  on storage.objects for insert
  with check (
    bucket_id = 'entry-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "ver próprias fotos"
  on storage.objects for select
  using (
    bucket_id = 'entry-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "deletar próprias fotos"
  on storage.objects for delete
  using (
    bucket_id = 'entry-photos' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## 5. Estrutura de pastas

```
src/app/
├── core/
│   ├── models/
│   │   └── index.ts
│   ├── services/
│   │   ├── supabase.service.ts
│   │   ├── auth.service.ts
│   │   ├── entries.service.ts
│   │   └── emotions.service.ts
│   └── guards/
│       └── auth.guard.ts
├── features/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   └── login/
│   │       └── login.component.ts
│   ├── entries/
│   │   ├── entries-list/
│   │   │   ├── entries-list.component.ts
│   │   │   ├── entries-list.component.html
│   │   │   └── entries-list.component.css
│   │   ├── entry-form/
│   │   │   ├── entry-form.component.ts
│   │   │   ├── entry-form.component.html
│   │   │   └── entry-form.component.css
│   │   └── entry-detail/
│   │       ├── entry-detail.component.ts
│   │       ├── entry-detail.component.html
│   │       └── entry-detail.component.css
│   └── emotions/
│       └── emotion-picker-dialog/
│           └── emotion-picker-dialog.component.ts
├── shared/
│   └── components/
│       └── lightbox/
│           └── lightbox.component.ts
├── services/
│   └── helper/
│       └── helper.service.ts
├── app.routes.ts
└── app.config.ts
```

---

## 6. Models

**`src/app/core/models/index.ts`:**

```typescript
export interface Emotion {
  id: string;
  user_id: string;
  label: string;
  emoji: string;
  color: string;
  created_at: string;
}

export interface Entry {
  id: string;
  user_id: string;
  content: string;
  content_text: string | null;
  emotion_id: string | null;
  emotion?: Emotion;
  photos_paths?: string[];
  created_at: string;
  updated_at: string;
}

export interface EntryForm {
  content: string;
  emotion_id: string | null;
  photos_paths: string[];
}

export interface EmotionForm {
  label: string;
  emoji: string;
  color: string;
}
```

---

## 7. Serviços principais

### 7.1 SupabaseService

**`src/app/core/services/supabase.service.ts`:**

```typescript
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor() {
    this.client = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
  }
}
```

### 7.2 AuthService

Gerencia sessão com Signals do Angular 17. Aguarda a sessão ser verificada antes de liberar o guard.

**`src/app/core/services/auth.service.ts`:**

```typescript
import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { Session } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _session = signal<Session | null>(null);
  private _ready = signal(false);

  readonly user = computed(() => this._session()?.user ?? null);
  readonly isLoggedIn = computed(() => !!this._session());
  readonly ready = computed(() => this._ready());

  constructor(private supabase: SupabaseService, private router: Router) {
    this.supabase.client.auth.getSession().then((result: { data: { session: Session | null } }) => {
      this._session.set(result.data.session);
      this._ready.set(true);
    });

    this.supabase.client.auth.onAuthStateChange((_: any, session: Session | null) => {
      this._session.set(session);
      if (!session && this._ready()) this.router.navigate(['/auth/login']);
    });
  }

  async signUp(email: string, password: string) {
    const { error } = await this.supabase.client.auth.signUp({ email, password });
    if (error) throw error;
  }

  async signIn(email: string, password: string) {
    const { error } = await this.supabase.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.router.navigate(['/entries']);
  }

  async signOut() {
    await this.supabase.client.auth.signOut();
  }

  getUserId(): string {
    const id = this.user()?.id;
    if (!id) throw new Error('Usuário não autenticado');
    return id;
  }

  waitForReady(): Promise<void> {
    return new Promise(resolve => {
      if (this._ready()) { resolve(); return; }
      const interval = setInterval(() => {
        if (this._ready()) { clearInterval(interval); resolve(); }
      }, 50);
    });
  }
}
```

### 7.3 EntriesService

**`src/app/core/services/entries.service.ts`:**

```typescript
import { Injectable } from '@angular/core';
import { Entry, EntryForm } from '../models';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class EntriesService {
  private readonly BUCKET = 'entry-photos';

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService
  ) {}

  async search(
    page: number = 0,
    pageSize: number = 6,
    searchTerm?: string,
    dateFrom?: Date | null,
    dateTo?: Date | null
  ): Promise<{ data: Entry[], count: number }> {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase.client
      .from('entries')
      .select('*, emotion:emotions(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (dateFrom) {
      const start = new Date(dateFrom);
      start.setHours(0, 0, 0, 0);
      query = query.gte('created_at', start.toISOString());
    }

    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }

    if (searchTerm?.trim()) {
      query = query.ilike('content_text', `%${searchTerm.trim().toLowerCase()}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data as Entry[], count: count ?? 0 };
  }

  async getById(id: string): Promise<Entry> {
    const { data, error } = await this.supabase.client
      .from('entries')
      .select('*, emotion:emotions(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Entry;
  }

  async create(form: EntryForm): Promise<Entry> {
    const userId = this.auth.getUserId();

    const { data, error } = await this.supabase.client
      .from('entries')
      .insert({
        user_id: userId,
        content: form.content,
        content_text: this.extractText(form.content),
        emotion_id: form.emotion_id || null,
        photos_paths: form.photos_paths,
      })
      .select('*, emotion:emotions(*)')
      .single();

    if (error) throw error;
    return data as Entry;
  }

  async update(id: string, form: EntryForm): Promise<Entry> {
    const { error } = await this.supabase.client
      .from('entries')
      .update({
        content: form.content,
        content_text: this.extractText(form.content),
        emotion_id: form.emotion_id || null,
        photos_paths: form.photos_paths,
      })
      .eq('id', id);

    if (error) throw error;
    return this.getById(id);
  }

  async delete(id: string): Promise<void> {
    const { data } = await this.supabase.client
      .from('entries')
      .select('photos_paths')
      .eq('id', id)
      .single();

    if (data?.photos_paths && data.photos_paths.length > 0) {
      await this.supabase.client.storage
        .from(this.BUCKET)
        .remove(data.photos_paths);
    }

    const { error } = await this.supabase.client
      .from('entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async deletePhotos(photosPaths: string[]): Promise<void> {
    const { error } = await this.supabase.client.storage
      .from(this.BUCKET)
      .remove(photosPaths);
    if (error) throw error;
  }

  async uploadTempPhoto(file: File, userId: string): Promise<string> {
    const ext = file.name.split('.').pop();
    const path = `${userId}/temp/${Date.now()}.${ext}`;

    const { error } = await this.supabase.client.storage
      .from(this.BUCKET)
      .upload(path, file, { upsert: false });

    if (error) throw error;

    const { data } = await this.supabase.client.storage
      .from(this.BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 365);

    if (!data?.signedUrl) throw new Error('Erro ao gerar URL');
    return data.signedUrl;
  }

  private extractText(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '')
      .replace(/\s+/g, ' ').trim().toLowerCase();
  }
}
```

### 7.4 EmotionsService

**`src/app/core/services/emotions.service.ts`:**

```typescript
import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Emotion, EmotionForm } from '../models';

@Injectable({ providedIn: 'root' })
export class EmotionsService {
  readonly emotions = signal<Emotion[]>([]);

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService
  ) {}

  async loadAll(): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('emotions')
      .select('*')
      .order('label');

    if (error) throw error;
    this.emotions.set(data as Emotion[]);
  }

  async create(form: EmotionForm): Promise<Emotion> {
    const { data, error } = await this.supabase.client
      .from('emotions')
      .insert({ ...form, user_id: this.auth.getUserId() })
      .select()
      .single();

    if (error) throw error;
    const emotion = data as Emotion;
    this.emotions.update(list => [...list, emotion]);
    return emotion;
  }

  async update(id: string, form: EmotionForm): Promise<Emotion> {
    const { data, error } = await this.supabase.client
      .from('emotions')
      .update(form)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const updated = data as Emotion;
    this.emotions.update(list => list.map(e => e.id === id ? updated : e));
    return updated;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('emotions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    this.emotions.update(list => list.filter(e => e.id !== id));
  }
}
```

### 7.5 ThemeService

**`src/app/core/services/theme.service.ts`:**

```typescript
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'theme';

  theme = signal<'light' | 'dark'>('light');

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY) as 'light' | 'dark' | null;
    if (saved) {
      this.setTheme(saved);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light');
    }
  }

  toggle() {
    this.setTheme(this.theme() === 'light' ? 'dark' : 'light');
  }

  private setTheme(theme: 'light' | 'dark') {
    this.theme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
  }
}
```

---

## 8. Guards

**`src/app/core/guards/auth.guard.ts`:**

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Aguarda a sessão ser verificada antes de decidir
  await auth.waitForReady();

  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/auth/login']);
};
```

:::tip Por que o `waitForReady`?
Sem isso, ao recarregar a página o guard vê `isLoggedIn = false` antes do Supabase terminar de verificar a sessão, redirecionando para o login desnecessariamente.
:::

---

## 9. Componentes

### 9.1 Login

**`src/app/features/auth/login/login.component.ts`** — tabs com login e cadastro usando `ReactiveFormsModule` e Angular Material.

Pontos importantes:
- Usa `signal` para controlar loading e visibilidade da senha
- Trata erros com `MatSnackBar`
- Após login bem-sucedido, o `AuthService` redireciona para `/entries`

### 9.2 Entries List

Listagem com:
- **Paginação server-side** (6 por página)
- **Busca** por texto (campo `content_text` sem HTML)
- **Filtro por período** com `MatDatepicker`
- **Realtime** via Supabase channel
- **Debounce** de 400ms na busca para não disparar requisição a cada tecla

### 9.3 Entry Form

Formulário com:
- Editor rico **Quill** (sem toolbar nativa — toolbar customizada com Angular Material)
- Upload de foto direto no cursor
- **Lightbox** ao clicar na imagem
- Seletor de humor via dialog
- Limpeza automática de imagens removidas do bucket ao salvar

### 9.4 Entry Detail

Visualização somente leitura com:
- Conteúdo HTML renderizado via `[innerHTML]`
- Lightbox ao clicar em imagens
- Botões de editar e excluir

### 9.5 Lightbox

**`src/app/shared/components/lightbox/lightbox.component.ts`:**

```typescript
import { Component, Inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-lightbox',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="lightbox-container">
      <button mat-icon-button class="close-btn" (click)="close()">
        <mat-icon>close</mat-icon>
      </button>
      <img [src]="data.url" [alt]="data.alt || 'Foto'" class="lightbox-image">
    </div>
  `,
  styles: [`
    .lightbox-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background: black;
      width: 100%;
      height: 100%;
    }
    .lightbox-image {
      max-width: 100%;
      max-height: 90vh;
      object-fit: contain;
      border-radius: 4px;
    }
    .close-btn {
      position: absolute;
      top: 8px; right: 8px;
      color: white;
      background: rgba(0,0,0,0.5);
      z-index: 10;
    }
  `]
})
export class LightboxComponent {
  constructor(
    private dialogRef: MatDialogRef<LightboxComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { url: string; alt?: string }
  ) {}

  close() { this.dialogRef.close(); }
}
```

Adicione no `styles.scss`:

```scss
.lightbox-dialog .mat-mdc-dialog-container {
  padding: 0 !important;
  background: black;
  border-radius: 8px;
  overflow: hidden;
}
.lightbox-dialog .mdc-dialog__surface {
  background: black !important;
  border-radius: 8px !important;
}
```

---

## 10. Roteamento

**`src/app/app.routes.ts`:**

```typescript
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: 'entries',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/entries/entries-list/entries-list.component')
            .then(m => m.EntriesListComponent),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./features/entries/entry-form/entry-form.component')
            .then(m => m.EntryFormComponent),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./features/entries/entry-form/entry-form.component')
            .then(m => m.EntryFormComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/entries/entry-detail/entry-detail.component')
            .then(m => m.EntryDetailComponent),
      },
    ],
  },
  { path: '', redirectTo: 'entries', pathMatch: 'full' },
  { path: '**', redirectTo: 'entries' },
];
```

**`src/app/features/auth/auth.routes.ts`:**

```typescript
import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then(m => m.LoginComponent),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
```

---

## 11. Temas claro e escuro

### 11.1 Renomear styles

Renomeie `src/styles.css` para `src/styles.scss` e atualize o `angular.json`:

```json
"styles": [
  "node_modules/quill/dist/quill.snow.css",
  "src/styles.scss"
],
```

### 11.2 styles.scss

```scss
@use '@angular/material' as mat;

@include mat.core();

$primary: mat.define-palette(mat.$deep-purple-palette);
$accent:  mat.define-palette(mat.$amber-palette);
$warn:    mat.define-palette(mat.$red-palette);

$light-theme: mat.define-light-theme((
  color: (primary: $primary, accent: $accent, warn: $warn)
));

$dark-theme: mat.define-dark-theme((
  color: (primary: $primary, accent: $accent, warn: $warn)
));

html, body {
  height: 100%;
  margin: 0;
  font-family: Roboto, "Helvetica Neue", sans-serif;
}

html {
  @include mat.all-component-themes($light-theme);
  background-color: #ffffff;
  color: #000000;
}

html[data-theme="dark"] {
  @include mat.all-component-colors($dark-theme);
  background-color: #121212;
  color: #ffffff;

  body { background-color: #121212; }

  .ql-container, .ql-editor {
    background-color: #1e1e1e !important;
    color: #ffffff !important;
  }

  .mat-mdc-card {
    background-color: #1e1e1e !important;
    color: #ffffff !important;
  }

  .mat-mdc-dialog-container {
    background-color: #1e1e1e !important;
    color: #ffffff !important;
  }
}

@media (prefers-color-scheme: dark) {
  html:not([data-theme="light"]) {
    @include mat.all-component-colors($dark-theme);
    background-color: #121212;
    color: #ffffff;

    body { background-color: #121212; }

    .ql-container, .ql-editor {
      background-color: #1e1e1e !important;
      color: #ffffff !important;
    }

    .mat-mdc-card {
      background-color: #1e1e1e !important;
      color: #ffffff !important;
    }
  }
}
```

### 11.3 Botão de toggle

Injete o `ThemeService` no componente desejado e adicione o botão:

```typescript
theme = inject(ThemeService);
```

```html
<button mat-icon-button (click)="theme.toggle()" matTooltip="Alternar tema">
  <mat-icon>{{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
</button>
```

---

## 12. Editor rico com Quill

### 12.1 Instalação

```bash
npm install quill ngx-quill@25 --legacy-peer-deps
npm install --save-dev @types/quill
```

:::warning Versão do ngx-quill
Use `ngx-quill@25` para compatibilidade com Angular 17. Versões superiores exigem Angular 21+.
:::

### 12.2 Configurar no app.config.ts

```typescript
import { importProvidersFrom } from '@angular/core';
import { QuillConfigModule } from 'ngx-quill';

providers: [
  ...
  importProvidersFrom(
    QuillConfigModule.forRoot({ modules: { toolbar: false } })
  ),
]
```

### 12.3 Toolbar customizada

Use botões do Angular Material como toolbar em vez da toolbar nativa do Quill:

```html
<div class="editor-toolbar">
  <button type="button" mat-icon-button (click)="format('bold')">
    <mat-icon>format_bold</mat-icon>
  </button>
  <button type="button" mat-icon-button (click)="format('italic')">
    <mat-icon>format_italic</mat-icon>
  </button>
  <button type="button" mat-icon-button (click)="photoInput.click()">
    <mat-icon>add_photo_alternate</mat-icon>
  </button>
</div>

<quill-editor
  formControlName="content"
  [modules]="{ toolbar: false }"
  (onEditorCreated)="onEditorCreated($event)">
</quill-editor>
```

```typescript
quillInstance: any = null;

onEditorCreated(quill: any) {
  this.quillInstance = quill;
}

format(type: string) {
  if (!this.quillInstance) return;
  const current = this.quillInstance.getFormat();
  this.quillInstance.format(type, !current[type]);
}
```

### 12.4 Inserir foto na posição do cursor

```typescript
async onPhotoSelected(event: Event) {
  const files = Array.from((event.target as HTMLInputElement).files ?? []);
  for (const file of files) {
    const signedUrl = await this.entriesService.uploadTempPhoto(file, this.auth.getUserId());
    const range = this.quillInstance.getSelection(true);
    this.quillInstance.insertEmbed(range.index, 'image', signedUrl);
    this.quillInstance.setSelection(range.index + 1);
  }
}
```

### 12.5 Obter conteúdo atualizado ao salvar

:::warning Atenção
O `formControl` do Quill não atualiza automaticamente quando imagens são inseridas via `insertEmbed`. Sempre pegue o conteúdo diretamente da instância:
:::

```typescript
// ❌ Errado — pode estar desatualizado
const content = this.form.value.content;

// ✅ Correto — sempre atualizado
const content = this.quillInstance.root.innerHTML;
```

---

## 13. Realtime

### 13.1 Habilitar no Supabase

```sql
alter publication supabase_realtime add table public.entries;
```

### 13.2 Subscrever mudanças no componente

```typescript
private realtimeChannel: any = null;

ngOnInit() {
  this.loadPage();
  this.subscribeRealtime();
}

ngOnDestroy() {
  if (this.realtimeChannel) {
    this.supabase.client.removeChannel(this.realtimeChannel);
  }
}

private subscribeRealtime() {
  this.realtimeChannel = this.supabase.client
    .channel('entries-realtime')
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table: 'entries' },
      async () => await this.loadPage()
    )
    .subscribe();
}
```

:::tip
Implemente `OnDestroy` e remova o channel para evitar memory leaks.
:::

---

## 14. Paginação server-side

A paginação é feita no banco usando `.range(from, to)` do Supabase — nunca carregue todos os registros em memória.

```typescript
async search(page = 0, pageSize = 6, ...): Promise<{ data: Entry[], count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await this.supabase.client
    .from('entries')
    .select('*, emotion:emotions(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  return { data: data as Entry[], count: count ?? 0 };
}
```

No componente:

```typescript
onPageChange(event: PageEvent) {
  this.currentPage.set(event.pageIndex);
  this.loadPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
```

---

## 15. Busca e filtros

### 15.1 Campo content_text

Para busca sem tags HTML, salve um campo separado com texto puro:

```typescript
private extractText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || div.innerText || '')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}
```

Ao criar/atualizar, salve `content_text: this.extractText(form.content)`.

Para registros existentes, rode no SQL Editor:

```sql
update public.entries
set content_text = lower(
  regexp_replace(
    regexp_replace(content, '<[^>]*>', ' ', 'g'),
    '\s+', ' ', 'g'
  )
);
```

### 15.2 Busca com debounce

```typescript
private searchDebounce: any = null;

onSearch(term: string) {
  this.searchTerm.set(term);
  if (this.searchDebounce) clearTimeout(this.searchDebounce);
  this.searchDebounce = setTimeout(() => {
    this.currentPage.set(0);
    this.loadPage();
  }, 400);
}
```

---

## 16. Upload de imagens

### 16.1 Estrutura de paths no bucket

```
entry-photos/
└── {userId}/
    └── temp/
        └── {timestamp}.{ext}
```

### 16.2 Signed URLs

O bucket é privado — use signed URLs com validade de 1 ano:

```typescript
const { data } = await this.supabase.client.storage
  .from(this.BUCKET)
  .createSignedUrl(path, 60 * 60 * 24 * 365);
```

### 16.3 Rastrear paths das imagens

Salve os paths no campo `photos_paths` (array) do relato para poder deletar do bucket depois:

```typescript
// Extrai o path de uma signed URL do Supabase
// URL: https://xxx.supabase.co/storage/v1/object/sign/entry-photos/userId/temp/1234.jpg?token=...
// Path: userId/temp/1234.jpg
```

### 16.4 Limpeza ao editar

Ao salvar uma edição, compare os paths antes e depois para deletar imagens removidas:

```typescript
const previousPaths = this.entryToEdit?.photos_paths ?? [];
const currentPaths = this.helper.getAllPhotosPaths(currentContent);
const pathsToDelete = previousPaths.filter(p => !currentPaths?.includes(p));

if (pathsToDelete.length > 0) {
  await this.entriesService.deletePhotos(pathsToDelete);
}
```

---

## 17. Deploy no Firebase Hosting

### 17.1 Instalar Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### 17.2 Inicializar

```bash
firebase init hosting
```

Respostas:
- **Public directory:** `dist/nome-do-projeto/browser`
- **Single-page app?** `Y`
- **GitHub auto-deploy?** `N`
- **Overwrite index.html?** `N`

### 17.3 Build e deploy

```bash
ng build
firebase deploy
```

### 17.4 Redeploys

Para atualizações futuras, sempre rode os dois comandos:

```bash
ng build && firebase deploy
```

:::tip
O `angular.json` não precisa de `baseHref` para o Firebase Hosting — diferente do GitHub Pages.
:::

---

## 18. Referência rápida

### Comandos úteis

```bash
# Desenvolvimento
ng serve

# Build de produção
ng build

# Deploy
firebase deploy

# Gerar componente standalone
ng generate component features/nome --standalone

# Gerar serviço
ng generate service core/services/nome
```

### Padrões usados neste projeto

| Padrão | Uso |
|--------|-----|
| Signals | Estado local nos componentes |
| Computed | Valores derivados de signals |
| Standalone components | Todos os componentes |
| Lazy loading | Todas as rotas |
| `inject()` | Injeção de dependências |
| `async/await` | Todas as chamadas ao Supabase |

### Gotchas importantes

| Problema | Solução |
|----------|---------|
| Guard redireciona para login ao recarregar | Implementar `waitForReady()` no AuthService |
| Quill não atualiza o formControl com imagens | Usar `quillInstance.root.innerHTML` ao salvar |
| Busca com tags HTML no conteúdo | Salvar campo `content_text` separado |
| Imagens órfãs no bucket | Salvar `photos_paths` e limpar ao editar/deletar |
| ngx-quill incompatível | Usar `ngx-quill@25` para Angular 17 |
| Firebase Hosting com roteamento | Configurar como SPA no `firebase init` |
| Angular Material sem tema escuro | Usar `styles.scss` com `define-light/dark-theme` |