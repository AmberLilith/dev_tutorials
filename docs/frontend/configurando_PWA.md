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

---

## 1. Adicionando o suporte a PWA

No terminal, dentro do projeto Angular, execute:

```bash
ng add @angular/pwa
```

Este comando já faz tudo que é necessário para o funcionamento básico da PWA:

- Instala o pacote `@angular/service-worker`
- Cria e registra o **Service Worker** automaticamente
- Cria o arquivo `ngsw-config.json` com as configurações de cache
- Cria o arquivo `manifest.webmanifest` com configurações iniciais
- Gera ícones padrão em `src/assets/icons`
- Atualiza o `angular.json` adicionando o manifest nos assets
- Adiciona a tag `<link rel="manifest">` no `index.html`

:::caution Atenção
O Service Worker **só funciona em build de produção**. Ao rodar `ng serve` localmente ele não estará ativo. Para testar o comportamento real, faça o build e sirva localmente com um servidor estático (veja a seção de testes abaixo).
:::

---

## 2. Personalizando o manifest.webmanifest

Após rodar o comando, abra o arquivo `src/manifest.webmanifest` gerado e ajuste os valores para os da sua aplicação:

```json
{
  "name": "Nome da sua aplicação",
  "short_name": "Nome curto",
  "theme_color": "#8936FF",
  "background_color": "#2EC6FE",
  "display": "standalone",
  "scope": "./",
  "start_url": "./",
  "icons": [
    {
      "src": "assets/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

---

## 3. Substituindo os ícones

Os ícones gerados pelo comando são apenas placeholders. Para usar o ícone da sua aplicação, substitua os arquivos em `src/assets/icons` pelos seus nas mesmas resoluções.

Você pode gerar os ícones em todos os tamanhos necessários a partir de uma imagem de **512x512** usando um dos sites abaixo:

- https://app-manifest.firebaseapp.com/
- https://progressier.com/pwa-manifest-generator
- https://www.infyways.com/tools/web-manifest-generator/

---

## 4. Verificando a configuração no navegador

Ao rodar `ng serve`, você pode verificar se o manifest está sendo reconhecido abrindo o DevTools do Chrome (`Ctrl + Shift + I`), navegando até a aba **Application** e clicando em **Manifest**.

Deve aparecer com o nome, ícones e as configurações do seu manifest exibidos corretamente.

:::info
Lembre-se: o **Service Worker** não estará ativo com `ng serve`. Para testá-lo, você precisa fazer o build de produção.
:::

---

## 5. Testando a instalação localmente

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

## 6. Deploy e instalação real

Após o deploy (por exemplo no Firebase Hosting), acesse a aplicação pelo navegador do celular ou desktop. O Chrome exibirá automaticamente o prompt **"Adicionar à tela inicial"** quando todas as condições forem atendidas.

:::tip
Para auditar sua PWA antes do deploy e garantir que está tudo correto, utilize o [PWA Builder](https://www.pwabuilder.com/). Ele aponta o que está faltando ou pode ser melhorado.
:::

## Incluindo botao de instalação

O navegador dispara um evento chamado beforeinstallprompt quando percebe que seu PWA é válido. É possível "esconder" esse evento e o liberar apenas quando o usuário clica no seu botão do Material Design.
Para isso crie uma service e inclua o código abaixo:

```
import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  deferredPrompt: any;
  showInstallButton = false;

  @HostListener('window:beforeinstallprompt', ['$event'])
  onBeforeInstallPrompt(e: Event) {
    // Impede o Chrome de mostrar o aviso automático
    e.preventDefault();
    // Guarda o evento para usar depois
    this.deferredPrompt = e;
    // Mostra o seu botão customizado
    this.showInstallButton = true;
  }

  installPWA() {
    this.showInstallButton = false;
    // Dispara o prompt guardado
    this.deferredPrompt.prompt();
    // Verifica a escolha do usuário
    this.deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuário aceitou a instalação');
      }
      this.deferredPrompt = null;
    });
  }
}
```

Depois de injetar a service criada acima, no HTML, inclua um elemento que só vai aparecer se a aplicação ainda não tiver sido instalada. Veja exemplo abaixo de como fazer:

```
@if(showInstallButton){
  <button (click)="installPWA()" matTooltip="Instalar Aplicativo">
    Instalar
  </button> 
}

```

## Notificação sobre atualizações na aplicação

O PWA tem uma característica única: ele fica "cacheado" no navegador do usuário. Qualquer alteração feita na aplicação, mesmo fazendo o deploy, o usuário pode continuar vendo a versão antiga porque o Service Worker ainda está servindo os arquivos do cache.

Para resolver isso, pode se usar o serviço SwUpdate do próprio @angular/service-worker.

Para implementar:

### 1. Crie uma service
      E use o código abaixo:
      ```
      verifyUpdate(callback: () => void) {
    // 1. Verifica se o Service Worker está ativo
    if (this.swUpdate.isEnabled) {

      // 2. Escuta quando uma nova versão foi baixada e está pronta
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          callback();
        });
    }
  }

  update() {
    window.location.reload();
  }
  ```

  A callback recebida no xxx é usada para exibir um modal, snackbar ou qualquer outra forma de janela que avise sobre a atualização e exiba para o usário opção de instalar.

### 2. Chame o método verifyUpdate()
    No ngOnInit() do componente desejado, inclua a chamada do método verifyUpdate().
    Exemplo: 

    ```
    ngOnInit(): void {
    this.notificationService.onNotification$.subscribe(notification => {
      this.alertMessage = notification.message;
      this.alertType = notification.type;
      setTimeout(() => this.globalAlert.show());
    });
    this.pwaService.verifyUpdate(() =>{this.showModalUpdate = true});
  }
    ```

### 3. Incluia o método update()
    Chame o método update() no botão confirmar da notificação de atualização exibida ao usuário.

Como tudo funciona na prática?

O Gatilho: Quando você faz um novo ng build e sobe para o servidor, o navegador detecta que o arquivo ngsw.json (o manifesto do Service Worker) mudou.
Esse arquivo contém uma lista de todos os arquivos da sua aplicação (main.js, styles.css, polyfills.js, etc.) e um código único (hash) para cada um deles.

Se você mudar uma única linha de lógica num componente .ts, o arquivo final gerado (ex: main.123abc.js) terá um conteúdo diferente.

O Angular percebe que o hash desse arquivo no servidor é diferente do hash que está guardado no navegador do usuário.

Isso invalida o cache antigo e dispara o evento de atualização.

O Download: O Service Worker baixa a nova versão em segundo plano enquanto o usuário usa o app.

A Notificação: Assim que o download termina, o evento VERSION_READY é disparado e a notificação aparece.

A Troca: Quando o usuário confirmar que quer atualziar, o window.location.reload() força o navegador a descartar o cache antigo e carregar os arquivos novos.