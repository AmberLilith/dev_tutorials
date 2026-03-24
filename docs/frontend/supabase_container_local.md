---
sidebar_position: 7
title: "Deploy no Firebase Hosting (Aplicação Angular)"
---
# Supabase Local com Docker

Este guia documenta o processo de configuração de um ambiente Supabase local via Docker para desenvolvimento, evitando que você bata na base de produção durante os testes.

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado
- [Git](https://git-scm.com/) instalado
- `dos2unix` instalado (necessário no Windows)

---

## 1. Clonando o repositório

Configure o Git para usar LF (evita problemas de line ending no Windows) **apenas para este repositório**:

```bash
cd ~/documents
git clone https://github.com/supabase/supabase
cd supabase/docker
git config core.autocrlf false
git config core.eol lf
```

:::caution Atenção — não use `--global`
Usar `git config --global core.autocrlf false` afetaria todos os seus repositórios. Configure apenas localmente como mostrado acima.
:::

---

## 2. Convertendo line endings (Windows)

No Windows, arquivos clonados do Git podem ter line endings `CRLF`, o que causa falha nos scripts shell dentro dos containers Linux.

Converta todos os arquivos relevantes:

```bash
find . -type f \( -name "*.sh" -o -name "*.yml" -o -name "*.yaml" \) | xargs dos2unix
```

:::danger Problema: `exec /home/kong/kong-entrypoint.sh: no such file or directory`
Este erro no container `supabase-kong` é causado por line endings `CRLF` no arquivo `kong-entrypoint.sh` dentro da imagem. A conversão acima resolve o problema. Se persistir, delete a pasta e clone novamente após configurar o Git.
:::

---

## 3. Configurando o `.env`

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Edite o `.env` com as configurações necessárias para desenvolvimento local:

```env
# Confirma usuários automaticamente sem enviar email de confirmação
# NUNCA deixe isso habilitado em produção!
ENABLE_EMAIL_AUTOCONFIRM=true

# Necessário para evitar warnings no startup
POOLER_TENANT_ID=local-tenant

# URL da sua aplicação frontend
SITE_URL=http://localhost:4200
ADDITIONAL_REDIRECT_URLS=http://localhost:4200
API_EXTERNAL_URL=http://localhost:54321
```

:::caution Problema: porta 5432 já em uso
Se ao subir os containers aparecer o erro `Bind for 0.0.0.0:5432 failed: port is already allocated`, significa que você tem um PostgreSQL local rodando nessa porta. Solução mais simples — pare o serviço PostgreSQL local temporariamente:

```bash
# Windows (PowerShell como admin)
net stop postgresql-x64-17  # ajuste a versão conforme a sua
```

Ou altere a porta no `.env` e no `docker-compose.yml`:

```env
POSTGRES_PORT=5433
```

```yaml
# docker-compose.yml — serviço db
ports:
  - "5433:5432"
```
:::

:::caution Problema: `GOTRUE_MAILER_AUTOCONFIRM` não funciona no `.env`
A variável correta no `.env` é `ENABLE_EMAIL_AUTOCONFIRM`, não `GOTRUE_MAILER_AUTOCONFIRM`. Isso porque o `docker-compose.yml` usa `${ENABLE_EMAIL_AUTOCONFIRM}` internamente para setar o `GOTRUE_MAILER_AUTOCONFIRM` no container. Adicionar `GOTRUE_MAILER_AUTOCONFIRM` direto no `.env` não tem efeito.
:::

---

## 4. Subindo os containers

```bash
docker compose up -d
```

Aguarde todos os containers ficarem com status `Healthy`:

```
Container supabase-db       Healthy
Container supabase-auth     Healthy
Container supabase-kong     Healthy
Container supabase-studio   Healthy
...
```

:::danger Problema: `dependency failed to start: container for service "kong" is unhealthy`
Verifique os logs do kong:

```bash
docker logs supabase-kong --tail 20
```

Se aparecer `exec /home/kong/kong-entrypoint.sh: no such file or directory`, é problema de line endings. Veja a seção 2 deste guia.
:::

:::caution Problema: Studio não abre no browser (`localhost:54323`)
Verifique se a porta está sendo exposta:

```bash
docker ps | grep studio
```

Se aparecer apenas `3000/tcp` sem mapeamento `0.0.0.0:54323->3000/tcp`, o arquivo `docker-compose.yml` tinha CRLF. Rode `dos2unix docker-compose.yml` e reinicie:

```bash
dos2unix docker-compose.yml
docker compose down
docker compose up -d
```
:::

---

## 5. Acessando o Studio local

Com todos os containers `Healthy`, acesse:

```
http://localhost:54323
```

---

## 6. Criando as tabelas

No Studio local, acesse **SQL Editor** e execute o script de criação das suas tabelas. Exemplo do schema do projeto:

```sql
create extension if not exists "uuid-ossp";

-- Tabela de emoções
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
create policy "ver próprios humores"     on public.emotions for select using (auth.uid() = user_id);
create policy "criar próprios humores"   on public.emotions for insert with check (auth.uid() = user_id);
create policy "editar próprios humores"  on public.emotions for update using (auth.uid() = user_id);
create policy "deletar próprios humores" on public.emotions for delete using (auth.uid() = user_id);

-- Policies: entries
create policy "ver próprios relatos"     on public.entries for select using (auth.uid() = user_id);
create policy "criar próprios relatos"   on public.entries for insert with check (auth.uid() = user_id);
create policy "editar próprios relatos"  on public.entries for update using (auth.uid() = user_id);
create policy "deletar próprios relatos" on public.entries for delete using (auth.uid() = user_id);

-- Índices
create index entries_user_id_created_at_idx on public.entries(user_id, created_at desc);
create index emotions_user_id_idx on public.emotions(user_id);
```

Crie também o bucket de imagens em **Storage** com o mesmo nome usado em produção.

---

## 7. Configurando o Angular

### Estrutura de environments

Mantenha dois arquivos de environment no projeto Angular:

```
src/environments/
  environment.ts                 → arquivo base (importado no código)
  environment.development.ts     → aponta para o Supabase local
  environment.prod.ts            → aponta para o Supabase de produção
```

**`environment.ts`** — arquivo base (contrato):
```typescript
export const environment = {
  production: false,
  supabaseUrl: '',
  supabaseKey: ''
};
```

**`environment.development.ts`**:
```typescript
export const environment = {
  production: false,
  supabaseUrl: 'http://localhost:8000',  // porta do Kong
  supabaseKey: 'sua_anon_key_do_.env_local'
};
```

**`environment.prod.ts`**:
```typescript
export const environment = {
  production: true,
  supabaseUrl: 'https://xxxxxxxxxxx.supabase.co',
  supabaseKey: 'sua_anon_key_do_supabase_real'
};
```

:::info Por que `localhost:8000` e não `localhost:54321`?
O Kong (API Gateway do Supabase) é exposto na porta `8000` por padrão. A porta `54321` só estará disponível se você configurar o mapeamento manualmente no `docker-compose.yml`:

```yaml
kong:
  ports:
    - "54321:8000"
    - "54322:8443"
```

Se preferir usar `54321`, adicione esse mapeamento e reinicie os containers.
:::

### Configurando o `angular.json`

```json
"configurations": {
  "production": {
    "fileReplacements": [
      {
        "replace": "src/environments/environment.ts",
        "with": "src/environments/environment.prod.ts"
      }
    ]
  },
  "development": {
    "fileReplacements": [
      {
        "replace": "src/environments/environment.ts",
        "with": "src/environments/environment.development.ts"
      }
    ]
  }
}
```

### Rodando em cada ambiente

```bash
# Desenvolvimento local (Supabase Docker)
ng serve --configuration=development

# Build de produção
ng build --configuration=production
```

### Usando no código

```typescript
import { environment } from '../environments/environment';

const supabase = createClient(
  environment.supabaseUrl,
  environment.supabaseKey
);
```

O Angular substitui automaticamente o `environment.ts` pelo arquivo correto conforme a flag `--configuration`. Funciona como uma interface em orientação a objetos — `environment.ts` define o contrato e os outros arquivos são as implementações concretas para cada ambiente.

---

## 8. Obtendo a ANON_KEY local

A `ANON_KEY` está no `.env` que você criou. Procure pela variável:

```env
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Cole esse valor no `environment.development.ts`.

---

## 9. Comandos úteis

```bash
# Subir os containers
docker compose up -d

# Parar os containers
docker compose down

# Parar e remover volumes (reset completo)
docker compose down -v

# Ver status dos containers
docker ps

# Ver logs de um serviço específico
docker logs supabase-auth --tail 30
docker logs supabase-kong --tail 30

# Verificar variável de ambiente dentro de um container
docker exec supabase-auth env | grep AUTOCONFIRM
```

---

## Resumo de problemas e soluções

| Problema | Causa | Solução |
|---|---|---|
| `exec kong-entrypoint.sh: no such file or directory` | Line endings CRLF no Windows | `find . -name "*.sh" \| xargs dos2unix` |
| `Bind for 0.0.0.0:5432 failed` | PostgreSQL local usando a porta | Parar o PostgreSQL local ou mudar a porta no `.env` |
| `dependency failed: kong is unhealthy` | Line endings CRLF | Converter arquivos com `dos2unix` e reiniciar |
| Studio não abre em `localhost:54323` | Porta não mapeada no `docker-compose.yml` | `dos2unix docker-compose.yml` e reiniciar |
| `504 Gateway Timeout` no signup | Auth tentando enviar email de confirmação | Adicionar `ENABLE_EMAIL_AUTOCONFIRM=true` no `.env` |
| `ERR_CONNECTION_REFUSED` na porta `54321` | Kong exposto na `8000`, não na `54321` | Usar `localhost:8000` ou mapear a porta no `docker-compose.yml` |
| `CORS policy blocked` | Frontend não listado nas origens permitidas | Adicionar `SITE_URL` e `ADDITIONAL_REDIRECT_URLS` no `.env` |