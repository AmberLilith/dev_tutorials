---
sidebar_position: 3
title: "Implementando Open Feign"
---

O OpenFeign é uma biblioteca Java que simplifica a comunicação entre microserviços através de REST APIs. Ele permite criar clientes HTTP declarativos, o que significa que você pode definir interfaces Java que correspondem às APIs remotas, e o OpenFeign cuidará de toda a implementação necessária para fazer as chamadas HTTP.

## Inserir a dependencia no pom.xml (No caso de maven):
```
<dependency>
<groupId>org.springframework.cloud</groupId>
	<artifactId>spring-cloud-starter-openfeign</artifactId>
	<version>4.0.0</version>
</dependency>
```
## Adicionar a anotação abaixo na class main da aplicação:
```
@EnableFeignClients
```
## Implementar uma interface como no exemplo abaixo:
```
@FeignClient(value = obtem-taxas"", url = "https://api.bcb.gov.br/dados/serie")
public interface TaxaFeign {

    @GetMapping("/bcdata.sgs.{serie}/dados?formato=json&dataInicial={dataInicial}&dataFinal={dataFinal}")
    List<TaxaMediaJuros> obtemTaxaMediaJurtos(@PathVariable String serie, @PathVariable String dataInicial, @PathVariable String dataFinal);
    @GetMapping("/bcdata.sgs.{serie}/dados?formato=json&dataInicial={dataInicial}&dataFinal={dataFinal}")
    List<TaxaInadimplencia> obtemTaxaInadimplencia(@PathVariable String serie, @PathVariable String dataInicial, @PathVariable String dataFinal);
}
```
Observações:
Tem que ter value na anotação **@FeignClient** senão na hora de subir vai quebrar.

## Onde for chamar  feign, use **@Autowired**:
```
@Autowired
    private TaxaFeign taxaFeign;
```
