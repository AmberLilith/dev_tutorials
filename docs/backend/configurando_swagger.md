---
sidebar_position: 2
title: "Configurando Swagger"
---

Adicionar no pom.xml a dependência (Caso seja maven):
```
<dependency>
    <groupId>io.springfox</groupId>
    <artifactId>springfox-swagger2</artifactId>
    <version>2.7.0</version>
</dependency>
<dependency>
    <groupId>io.springfox</groupId>
    <artifactId>springfox-swagger-ui</artifactId>
    <version>2.7.0</version>
</dependency>
```
Criar na raiz pacote config e dentro classe com as configurações do Swagger:
``` 
@Configuration
@EnableSwagger2
public class SwaggerConfig {
            	
    @Bean
    public Docket productApi() {
        return new Docket(DocumentationType.SWAGGER_2)
            .select()
            .apis(RequestHandlerSelectors.basePackage("com.br.nomeAplicacao"))
            .paths(regex("/api.*"))
            .build()
            .apiInfo(metaInfo());
    }
            	
    private ApiInfo metaInfo() {
            	
        ApiInfo apiInfo = new ApiInfo(
            "Produtos API REST",
            "API REST de cadastro de produtos.",
            "1.0",
            "Terms of Service",
            new Contact("Seu nome", "seu site",
            "seu email"),
            "Apache License Version 2.0",
            "https://www.apache.org/licesen.html", new ArrayList<VendorExtension>()
            );         	
            return apiInfo;
    }
```
 
Sobre a assinatura de cada classe controller:
```
@CrossOrigin(origins = "*")
@Api(value="API REST Produtos")
```
E em cada método/endpoint:
```
@ApiOperation(value="Descrição do que o endpoint faz/retorna")
```
