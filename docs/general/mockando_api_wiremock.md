---
sidebar_position: 1
title: "Criando Mock de API com Wiremock"
---

É preciso ter o docker Desktop instalado no caso de Windows.

## Criando arquivo docker-componse

Na raiz da pasta/projeto que conterá todos os arquivos referentes ao mock, crie um arquivo docker-compose.yaml com o conteúdo a seguir:

```version: "3.7"
services:
  application_wiremock:
    container_name: application_wiremock_teste
    image: holomekc/wiremock-gui:2.27.2.1
    ports: 
      - 8092:8080
    volumes:
      - ./wiremock_mappings/application:/home/wiremock/mappings
    environment:
      WIREMOCK_OPTIONS: "--local-response-templating,--root-dir=/home/wiremock"
    networks:
      - local-network

networks:
  local-network:
    name: local-network
    driver: bridge
````

Onde: 
- **container_name** é no nome do container
- **image** é a imagem do wiremock
- **ports** 
  - o valor a esquerda dos **:** é a porta da máquina hospedeira para acessarmos o container
  - e o valor a direita é a porta do cointaner onde o mock será exposto  
- **volumes** 
  - a esquerda dos **:** (```./wiremock_mappings/application```) é o caminho da pasta no computador hospedeiro contendo o arquivo mappings.json (Que será criado no próximo passo) 
  - e a direita dos **:** (```/home/wiremock/mappings```) é o caminho dentro do container que irá apontar para o caminho no computador hospedeiro descrito acima.
  
O resto pode deixar como está.

Importante!
Para cada API que você quiser mockar as respostas, é preciso criar um bloco de código como acima. 

## Criando arquivo mappings.json
O arquivo mappins.json conterá todos os cenários que desejamos mockar da aplicação.

### Criando pasta mappgins
Na raiz da pasta/projeto crie uma pasta para conter todos os mocks de API que você desejar criar.  
No exemplo aqui, o nome da pasta ficou wiremock_mappings, porém 
pode ser o nome que a pessoa quiser desde que ao definir o item **volumes** no docker-compose.yaml o nome seja igual.  

### Criando pasta para cada API
Para cada API que você desejar mockar, criei uma pasta.

### Crie arquivo mappings.json
Dentro da pasta (criada no passo acima) referente a API que deseja configurar os mocks, crie um arquivo mappings.json.
Nele deverá conter todos os cenários de resposta que você desejar mockar da API.  
Exemplo:  

```{
    "mappings":[
        {
            "request":{
                "urlPathPattern": "/application/[^/]+/convenios/[^/]+",
                "method": "GET",
                "headers": {
                    "wiremock_application":{
                        "equalTo": "APPLICATION_200"
                    }
                }
            },
            "response":{
                "headers":{
                    "Content-Type": "application/json"
                },
                "status": 200,
                "jsonBody":{
                    "name": "Amber Silva",
                    "city": "Uberlândia"
                }
            }
        }
    ]
}
```

Como dá pra ver, existe um objeto **"mapping"** que é uma lista de objetos.  
Cada objeto contindo nessa lista é um cenário de mock.  
E cada cenário pode ser configurado:
- a url do endpoint:
  - "urlPathPattern": ```"/application/[^/]+/convenios/[^/]+"```
- o método do endpoint:
  - ```"method": "GET"```
- o header da request:
    -  ```"headers": {"wiremock_application":{"equalTo": "APPLICATION_200"}} ```
- o header da resposta:
  - ```"headers":{"Content-Type": "application/json"}```
- o status cade:
    - ```"status": 200```
- o body da resposta no caso de métodos POST, PUT, etc:
  - ```"jsonBody":{"name": "Amber Silva","city": "Uberlândia"}```

IMPORTANTE!
Como podemos ver no header de entrada, temos o segui trecho:
```
"wiremock_application":
{
    "equalTo": "APPLICATION_200"
}
```
Esse objeto é usado quando formos chamar o mock da aplicação. Sem ele, o wiremock não conseguirá diferenciar entre cada objeto dentro da lista mapping.
No exemplo aqui, no header de saída de quem está chamando vamos colocar a chave wiremock_application e no valor vai ser APPLICATION_200.
O valor wiremock_application pode ser o mesmo para todos os cenários dentro de mapping, porém o valor de equalTo deve ser único para cada cenário.




