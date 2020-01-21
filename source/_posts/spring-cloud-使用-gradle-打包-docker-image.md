---
title: spring cloud 使用 gradle 打包 docker image
date: 2019-11-11 16:59:11
tags:
- gradle
- docker
- spring cloud
---

目前在github上看到的spring cloud project中大部分都是使用maven來建立專案
使用gradle的不太多，更別說是使用gradle將spring cloud service打包成docker image
因此花了一些時間研究一下如何使用gradle直接建立docker image而不是透過DockerFile
目前找到一個可以直接將springBootApplication打包成docker image的plugin

在此先看一下目錄結構
<img src="/images/spring-cloud-gradle-docker-001.png" width="300px" height="15%" alt="img1"/>

第一步先來到spring-cloud project (root)下設置gradle檔案
第10行引入"com.bmuschko:gradle-docker-plugin:5.3.0"才可以讓gradle script實現打包docker image的功能
第19行引入apply plugin: "com.bmuschko.docker-spring-boot-application"讓整個sub project中的module都可以使用

```java
buildscript {
    repositories {
        jcenter()
        maven { url 'https://repo.spring.io/milestone' }
        maven { url 'https://plugins.gradle.org/m2/' }
    }

    dependencies {
        classpath "org.springframework.boot:spring-boot-gradle-plugin:${springBootVersion}"
        classpath "com.bmuschko:gradle-docker-plugin:5.3.0"
    }
}

subprojects {
    apply plugin: 'idea'
    apply plugin: 'java'
    apply plugin: 'org.springframework.boot'
    apply plugin: "io.spring.dependency-management"
    apply plugin: "com.bmuschko.docker-spring-boot-application"

    group = 'pers.henglin'
    version = '0.0.1-SNAPSHOT'
    sourceCompatibility = JavaVersion.VERSION_1_8

    jar.enabled = true
    bootJar.enabled = false

    repositories {
        jcenter()
        maven { url 'https://repo.spring.io/milestone' }
    }

    dependencies {
        compileOnly 'org.projectlombok:lombok'
        annotationProcessor 'org.projectlombok:lombok'
        testImplementation "org.springframework.boot:spring-boot-starter-test"
    }

    dependencyManagement {
        imports {
            mavenBom "org.springframework.cloud:spring-cloud-dependencies:${springCloudVersion}"
        }
    }
}
```
root project下的settings.gradle也要記得設定使用哪些module，不然subprojects區塊內的效果不會引入

```yml
rootProject.name = 'spring-cloud'
include 'core'
include 'eureka'
include 'demo-server'
include 'demo-client'
```
- - -
第二步來到eureka module下的gradle檔案中設置
第8~14行打包docker成docker images，baseImage指定docker image，ports指定預設docker image exposed ports
還有其他的應用和設定可以查看文件：
https://bmuschko.github.io/gradle-docker-plugin/
此例子是直接使用文件中第4節所提到的springBootApplication的打包功能

```java
dependencies {
    implementation 'org.springframework.cloud:spring-cloud-starter-netflix-eureka-server'

    implementation 'org.springframework:springloaded:1.2.8.RELEASE'
    implementation 'org.springframework.boot:spring-boot-devtools'
}

docker {
    springBootApplication {
        baseImage = 'openjdk:jre-alpine'
        maintainer = 'heng-lin "enjoymycodinglife@gmail.com"'
        ports = [8761]
    }
}
```
- - -
第三步實現在docker中動態傳參數的效果
來到eureka module下的application.yml檔案中動態設置hostname
在此使用環境變量${EUREKA_HOST:localhost}，此語法為若環境變量中有EUREKA_HOST就使用其內容，若無則使用預設值localhost
未來可在docker下動態設置環境變量來達成傳參的效果

```yml
server:
  port: 8761

eureka:
  instance:
    hostname: ${EUREKA_HOST:localhost}
  client:
    register-with-eureka: false
    fetch-registry: false
    service-url:
      defaultZone: http://${eureka.instance.hostname}:${server.port}/eureka/

```
- - -
設置docker-compose目錄下的spring-cloud.env檔
內容中EUREKA_HOST指定hostname為sc-eureka，sc是spring cloud的意思

```yml
## docker-compose

### mysql
DATASOURCE_DBTYPE=mysql
DATASOURCE_HOST=sc-mysql
DATASOURCE_PORT=3306
DATASOURCE_USERNAME=root
DATASOURCE_PASSWORD=123456
DATASOURCE_DRIVER=com.mysql.jdbc.Driver

### eureka
EUREKA_HOST=sc-eureka
```
- - -
設置docker-compose目錄下的docker-compose.yml
第27~34行為eureka module於docker建立container時的設定
第34行env_file指定spring-cloud.env為變數時，會將EUREKA_HOST=sc-eureka設為docker的環境變數
因此eureka module下的application.yml也會將hostname: ${EUREKA_HOST:localhost}值設為sc-eureka而不是預設的localhost

```yml
version: '3'
services:
  mysql:
    image: mysql:5.7
    container_name: sc-mysql
    restart: always
    networks:
      - sc-net
    ports:
      - 3306:3306
    volumes:
      - ../data/mysql:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: 123456

  demo-server:
    image: pers.henglin/demo-server:0.0.1-snapshot
    container_name: sc-demo-server
    networks:
      - sc-net
    ports:
      - 8081:8081
    env_file: spring-cloud.env
    depends_on:
      - eureka

  eureka:
    image: pers.henglin/eureka:0.0.1-snapshot
    container_name: sc-eureka
    networks:
      - sc-net
    ports:
      - 8761:8761
    env_file: spring-cloud.env

networks:
  sc-net:
    external: false
```
- - -
最後來到spring-cloud目錄(root)下設定eureka.sh
第4~8行移動到eureka module下執行gradle DockerBuildImage會觸發gradle下的docker{...}的打包作業
第14~17行移動到docker-compose目錄下指定執行eureka (daemon)，會依據docker-compose.yml設定環境變數
並且啟動docker container

```sh
#!/bin/bash

# build gradle to docker image
cd eureka || exit 1
echo 'current dir: ' && pwd
docker rm -f sc-eureka &> /dev/null
echo 'build docker image...'
gradle DockerBuildImage

# root
cd - || exit 1

# docker run
cd docker-compose || exit 1
echo 'current dir: ' && pwd
echo 'docker run...'
docker-compose -f docker-compose.yml up -d eureka
```
- - -
執行docker ps看到sc-eureka container已啟動
<img src="/images/spring-cloud-gradle-docker-002.png" width="100%" height="50%" alt="img2"/>
