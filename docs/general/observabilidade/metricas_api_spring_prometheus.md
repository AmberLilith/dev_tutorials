---
sidebar_position: 1
title: "Implementando métricas com Prometheus"
---
import Details from '@theme/Details';

## Incluindo dependências
O primeiro passo é incluir as dependências abaixo.
O exemplo a seguir é para gradle/kotlin:

```gradle
implementation("org.springframework.boot:spring-boot-starter-web")
implementation("org.springframework.boot:spring-boot-starter-actuator")
implementation("io.micrometer:micrometer-registry-prometheus")
```
### O que cada dependência faz
<Details>
1. implementation("org.springframework.boot:spring-boot-starter-web"):   
  Função: Essa dependência inclui os componentes necessários para criar e expor uma API RESTful no Spring Boot.
  O que fornece:  
  Configura automaticamente o Tomcat como servidor embutido.  
  Inclui suporte para servlets, JSON, Jackson (para serialização/deserialização), e Spring MVC (para mapear requisições HTTP para controladores).


2. implementation("org.springframework.boot:spring-boot-starter-actuator"):  
  Função: Essa dependência habilita endpoints de monitoramento e gestão da aplicação Spring Boot.  
  O que fornece:  
  Exposição de endpoints como /actuator/health, /actuator/metrics, e outros para verificar o estado da aplicação.  
  Suporte para métricas, informações de versão, auditoria, e rastreamento.  
  Integração com monitoramento como logs e métricas de performance.  




3. implementation("io.micrometer:micrometer-registry-prometheus"):  
  Função: Integra o Micrometer, uma biblioteca de métricas, com o Prometheus, uma plataforma de monitoramento e alertas.  
  O que fornece:  
  Coleta métricas detalhadas da aplicação (como uso de memória, CPU, latência de requisições, etc.).  
  Formata essas métricas no formato compreensível pelo Prometheus.  
  Exposição das métricas em um endpoint específico (/actuator/prometheus), que o Prometheus pode acessar para coletar dados e construir dashboards.  
</Details>
## Inclindo configurações no application.yml
Incluindo as configurações abaixo no seu application.yml (Ou application.properties no formato específico):
```gradle
management:
  endpoint:
    metrics:
      enable: true
  endpoints:
    web:
      path-mapping:
        prometheus: prometheus
      exposure:
        include: health, prometheus, info
  metrics:
    export:
      prometheus:
        enabled: true
    distribution:
      slo:
        http:
          server:
            requests: 50ms, 100ms, 150ms, 250ms, 1s, 2s, 5s
          client:
            requests: 50ms, 100ms, 150ms, 250ms, 1s, 2s, 5s
      percentiles:
        http:
          server:
            requests: 0.99, 0.95, 0.70
          client:
            requests: 0.99, 0.95, 0.70
      percentiles-histogram:
        http:
          server:
            requests: true
          client:
            requests: true
```
:::info
Perceba que a chave "management" é uma chave mãe, ou seja, ela não deriva de nenhuma outra. 
:::
<Details>
  <summary>O que cada configuração acima faz:</summary>

   1. management.endpoint.metrics.enable: true
   Descrição: Habilita o endpoint de métricas na API. Isso permite que as métricas sejam coletadas e expostas pela aplicação, geralmente em /actuator/metrics.  
   Propósito: Garantir que as métricas da aplicação estejam disponíveis para visualização e monitoramento.  

   2. management.endpoints.web.path-mapping.prometheus: prometheus  
   Descrição: Mapeia o endpoint Prometheus para um caminho específico. Neste caso, o caminho /actuator/prometheus será acessível em /prometheus.  
   Propósito: Facilita o acesso às métricas do Prometheus, criando um caminho mais amigável ou personalizado.  

   3. management.endpoints.web.exposure.include: health, prometheus, info  
   Descrição: Define quais endpoints do Actuator serão expostos pela API. Aqui, os endpoints health, prometheus e info estão incluídos.  
   health: Exibe o estado de saúde da aplicação.  
   prometheus: Exibe as métricas no formato Prometheus.  
   info: Exibe informações sobre a aplicação, como versão e outras informações personalizadas.  
   Propósito: Controla quais endpoints de monitoramento e gerenciamento estarão disponíveis externamente.  

   4. management.metrics.export.prometheus.enabled: true  
   Descrição: Habilita a exportação de métricas para o Prometheus. Com isso, o Micrometer estará configurado para enviar as métricas coletadas no formato esperado pelo Prometheus.  
   Propósito: Garante que a aplicação envie dados para o Prometheus, permitindo monitoramento contínuo.  

   5. management.metrics.distribution.slo.http.server.requests: 50ms, 100ms, 150ms, 250ms, 1s, 2s, 5s  
   Descrição: Define os objetivos de nível de serviço (SLO) para as requisições HTTP no servidor. Esses SLOs são tempos limite para os tempos de resposta da API.  
   Por exemplo: você está medindo se as requisições ao servidor são atendidas em 50ms, 100ms, etc.  
   Propósito: Isso é útil para monitoramento detalhado de performance, ajudando a garantir que a maioria das requisições sejam atendidas dentro de um tempo aceitável.  

   6. management.metrics.distribution.slo.http.client.requests: 50ms, 100ms, 150ms, 250ms, 1s, 2s, 5s  
   Descrição: Define SLOs para requisições HTTP feitas como cliente (ou seja, quando sua aplicação faz chamadas HTTP para outros serviços).  
   Propósito: Permite monitorar a latência das requisições de saída e garantir tempos de resposta aceitáveis ao consumir APIs externas.  

   7. management.metrics.distribution.percentiles.http.server.requests: 0.99, 0.95, 0.70  
   Descrição: Configura a coleta de percentis das requisições HTTP no servidor. Isso permite calcular que porcentagem de requisições é atendida dentro de um determinado tempo.  
   0.99 significa que 99% das requisições foram mais rápidas do que o valor medido.  
   Propósito: Oferece uma visão mais detalhada da performance da API, além da média ou mediana. Percentis mais altos (como 99%) indicam como as requisições mais lentas estão se comportando.  

   8. management.metrics.distribution.percentiles.http.client.requests: 0.99, 0.95, 0.70  
   Descrição: O mesmo conceito de percentis, mas aplicado às requisições HTTP feitas como cliente, monitorando chamadas feitas a APIs externas.  
   Propósito: Monitora o desempenho de chamadas externas e como elas impactam a latência total da aplicação.  

   9. management.metrics.distribution.percentiles-histogram.http.server.requests: true  
   Descrição: Habilita a criação de histogramas de percentis para requisições HTTP no servidor.  
   Propósito: Permite uma visualização mais detalhada da distribuição de latências das requisições. É útil para sistemas de monitoramento como Prometheus para construir gráficos que mostram como a latência se distribui ao longo do tempo.  

   10. management.metrics.distribution.percentiles-histogram.http.client.requests: true  
   Descrição: Ativa histogramas de percentis para requisições HTTP feitas pela aplicação como cliente.  
   Propósito: Isso permite coletar dados mais detalhados sobre a latência das requisições de saída, o que pode ajudar a identificar problemas ao consumir serviços externos.
</Details>
## Acessando métricas localmente
Após os passos acima, ao subir sua aplicação local, já será possível acessar as métricas localmente através do endereço [localhost://8080/actuator](http://localhost:8081/actuator).  
Será exibida uma página parecido com abaixo:

```json
{
  "_links": {
    "self": {
      "href": "http://localhost:8081/actuator",
      "templated": false
    },
    "health": {
      "href": "http://localhost:8081/actuator/health",
      "templated": false
    },
    "health-path": {
      "href": "http://localhost:8081/actuator/health/{*path}",
      "templated": true
    },
    "info": {
      "href": "http://localhost:8081/actuator/info",
      "templated": false
    },
    "prometheus": {
      "href": "http://localhost:8081/actuator/prometheus",
      "templated": false
    }
  }
}
```
