---
sidebar_position: 5
title: "Criando Docker-Compose"
---


## Criando Arquivo dockerfile

O arquivo docker-compose possui as configurações necessárias para subir um container. No caso desse exemplo, um container de uma aplicação.  
O primeiro passo é criar um Dockerfile para sua aplicação Kotlin Spring Boot. Esse arquivo define como o container será construído.  

Exemplo de um Dockerfile básico:  

```
# Usando uma imagem do JDK 17 como base
FROM openjdk:17-jdk-slim

# Definindo o diretório de trabalho dentro do container
WORKDIR /app

# Copiando o arquivo JAR gerado para o container
COPY build/libs/seu-app.jar app.jar

# Comando para rodar a aplicação Spring Boot
ENTRYPOINT ["java", "-jar", "app.jar"]
```
Onde:
- build/libs/seu-app.jar é o caminho para o arquivo .jar gerado após buildar a aplicação **(*)**

### Passos Detalhados
Dockerfile:
- **Base Image**: Escolha uma imagem base como openjdk:17-jdk-slim ou qualquer versão do JDK que você estiver utilizando.
- **WORKDIR**: Define o diretório de trabalho onde os comandos serão executados no container.
- **COPY**: Copia o JAR da aplicação que foi gerado pela execução de ./gradlew bootJar ou ./gradlew build.
- **ENTRYPOINT**: Define o comando que será executado quando o container iniciar, que neste caso é para rodar o JAR da aplicação.

:::info
(*) Para que buildar a aplicação é preciso usar o comando abaixo:  
```gradle title="Comando para Gradle"
gradle clean build
```

```maven title="Comando para Maven"
gradle clean install
```
:::

## Configurar o docker-compose.yml
Com o Dockerfile pronto, o próximo passo é criar o arquivo docker-compose.yml que orquestrará o container da aplicação. Se você deseja apenas subir a aplicação Spring Boot, aqui está um exemplo básico do arquivo docker-compose.yml:  

```
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: default # ou outro profile ativo
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### Passos Detalhados
docker-compose.yml:  
- **version**: Define a versão do docker-compose.
- **services**: Define os serviços (containers) que serão criados.
- **app**: Nome do serviço para a aplicação.
- **build**: Indica que o Dockerfile será utilizado para construir a imagem.
- **ports**: Faz o mapeamento da porta local (8080) com a porta exposta no container.
- **environment**: Define as variáveis de ambiente, como profiles do Spring Boot ou outras configurações específicas.
- **networks**: Cria uma rede para permitir que diferentes containers se comuniquem entre si.

Se sua aplicação usa um banco de dados, como MySQL ou Postgres, você pode adicionar outro serviço no docker-compose.yml para subir o banco de dados também.  

Exemplo com MySQL:

```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://db:3306/nome_do_banco
      SPRING_DATASOURCE_USERNAME: root
      SPRING_DATASOURCE_PASSWORD: root
    depends_on:
      - db
    networks:
      - app-network

  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: nome_do_banco
    ports:
      - "3306:3306"
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

```

## Executar o Docker Compose
Agora, para subir o container da aplicação, basta rodar o seguinte comando na raiz do projeto, onde o **docker-compose.yml** está localizado:

```bash
docker-compose up --build
```
