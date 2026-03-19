---
sidebar_position: 4
title: "Configurando Progressive Web App"
---

# Configurando Progressive Web App

PWA ou Progressive Web App significa um aplicativo de web progressivo. É um aplicativo desenvolvido a partir de tecnologias da web que todos nós conhecemos e gostamos, como HTML, CSS e JavaScript, mas com a sensação e funcionalidade que fica bem próxima de um aplicativo nativo de fato. O que possibilita ter uma "aplicação mobile" que roda tanto em Android quanto IOS.

## Pré-requisitos

Para que uma PWA seja **instalável** pelo navegador, três condições precisam ser atendidas:

1. Ter um arquivo `manifest.webmanifest` válido com as informações da aplicação
2. Ter um **Service Worker** registrado
3. A aplicação estar servida via **HTTPS** (ou `localhost` em desenvolvimento)

Sem o Service Worker, mesmo com o manifest configurado corretamente, o navegador não exibirá o prompt de instalação.

---

## 1. Arquivo index.html

Certifique-se de que o arquivo que representa a página inicial da aplicação tenha o nome `index.html`.

---

## 2. Criando o manifest.webmanifest

Crie as dependências necessárias usando um dos sites abaixo:

- https://app-manifest.firebaseapp.com/
- https://progressier.com/pwa-manifest-generator
- https://www.infyways.com/tools/web-manifest-generator/

Ou copie e cole o código abaixo em um arquivo com o nome `manifest.webmanifest`.
Em seguida altere os valores para os da sua aplicação.

**Código exemplo manifest.webmanifest**

```json
{  
  "theme_color": "#8936FF",  
  "background_color": "#2EC6FE",  
  "icons": [  
      {  
          "sizes": "192x192",  
          "src": "assets/icons/icon-192x192.png",  
          "type": "image/png"  
      },  
      {  
          "sizes": "256x256",  
          "src": "assets/icons/icon-256x256.png",  
          "type": "image/png"  
      },  
      {  
          "sizes": "384x384",  
          "src": "assets/icons/icon-384x384.png",  
          "type": "image/png"  
      },  
      {  
          "sizes": "512x512",  
          "src": "assets/icons/icon-512x512.png",  
          "type": "image/png",
          "purpose": "any maskable"
      }  
  ],  
  "orientation": "portrait",  
  "display": "standalone",  
  "dir": "auto",  
  "lang": "pt-BR",  
  "name": "Lockin",  
  "short_name": "Lockin",  
  "start_url": "./",  
  "scope": "./",  
  "description": "Aplicação que possibilita guardar e acessar logins a qualquer momentos pelo navegador."  
}
```

Nos campos **Name** e **Short Name** você pode informar o nome da sua aplicação.

No campo **Display** escolha `standalone` (recomendado para instalação) ou `fullscreen`.

Nos campos **Application Scope** e **Start URL**, informe `./` (ponto e barra).

Em **Icons**, faça upload do ícone da sua aplicação na resolução 512 x 512. Assim, a plataforma irá criar as cópias com resoluções menores.

Quando clicar no botão **GENERATE MANIFEST**, será gerada uma pasta compactada com o nome `manifest` contendo os arquivos gerados.

Depois de descompactar a pasta baixada:
- Salve o arquivo `manifest.webmanifest` dentro de `src`
- Salve as imagens em `src/assets/icons`

Em seguida, altere no arquivo `manifest.webmanifest` o caminho `src` de cada imagem para `assets/icons/nomeDaImagem.png`.

---

## 3. Adicionando o Service Worker com @angular/pwa

Esta é a etapa mais importante para tornar a aplicação instalável. O Angular possui um schematic oficial que configura tudo automaticamente.

No terminal, dentro do projeto Angular, execute:

```bash
ng add @angular/pwa
```

Este comando irá:
- Instalar o pacote `@angular/service-worker`
- Criar o arquivo `ngsw-config.json` com as configurações de cache
- Registrar o Service Worker automaticamente no `app.module.ts` (ou `app.config.ts` em projetos standalone)
- Criar ícones padrão em `src/assets/icons` (você pode substituí-los pelos seus)
- Atualizar o `angular.json` com as configurações necessárias

:::caution Atenção
O Service Worker **só funciona em build de produção**. Ao rodar `ng serve` localmente ele não estará ativo. Para testar o comportamento real, faça o build e sirva localmente com um servidor estático (veja a seção de testes abaixo).
:::

---

## 4. Configurando o angular.json

Abra o arquivo `angular.json` e certifique-se de que o `manifest.webmanifest` está listado nos assets da build, como no exemplo abaixo:

```json
"assets": [
  "src/favicon.ico",
  "src/assets",
  "src/manifest.webmanifest"
],
```

Se você usou o comando `ng add @angular/pwa`, essa linha já terá sido adicionada automaticamente.

---

## 5. Linkando o manifest no index.html

Abra o arquivo `index.html` e acrescente as tags abaixo dentro da tag `<head>`:

```html
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#8936FF">
```

---

## 6. Verificando a configuração no navegador

Ao rodar `ng serve`, você pode verificar se o manifest está sendo reconhecido abrindo o DevTools do Chrome (`Ctrl + Shift + I`), navegando até a aba **Application** e clicando em **Manifest**.

Deve aparecer algo parecido com o exemplo abaixo, com o nome, ícones e as configurações do seu manifest exibidos corretamente.

:::info
Lembre-se: o **Service Worker** não estará ativo com `ng serve`. Para testá-lo, você precisa fazer o build de produção.
:::

---

## 7. Testando a instalação localmente

Para testar se o prompt de instalação aparece corretamente antes de fazer deploy, faça o build de produção e sirva com um servidor estático:

```bash
# Gera o build de produção
ng build

# Instala um servidor estático simples (caso não tenha)
npm install -g http-server

# Serve a pasta de build (ajuste o nome conforme seu projeto)
http-server dist/nome-do-seu-projeto -p 8080
```

Acesse `http://localhost:8080` no Chrome. Se tudo estiver configurado corretamente, o ícone de instalação aparecerá na barra de endereços ou um banner será exibido na parte inferior da tela.

Você também pode verificar o status do Service Worker em **Application > Service Workers** no DevTools.

---

## 8. Deploy e instalação real

Após o deploy (por exemplo no Firebase Hosting), acesse a aplicação pelo navegador do celular ou desktop. O Chrome exibirá automaticamente o prompt **"Adicionar à tela inicial"** quando todas as condições forem atendidas.

:::tip
Para garantir a melhor experiência de instalação, use o [PWA Builder](https://www.pwabuilder.com/) para auditar sua aplicação antes do deploy. Ele aponta o que está faltando ou pode ser melhorado.
:::