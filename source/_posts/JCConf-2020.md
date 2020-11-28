---
title: JCConf 2020
date: 2020-11-28 12:15:49
tags:
- conference
---

上星期也去參加 JCConf ，本以為今年會停辦，沒想到會正常舉行，現場也滿多人的
受疫情影響今年國外講師都是透過視訊連線，主題跟去年差不多都是環繞 Microservices
對我來說今年的亮點應該是上午場的 RSocket
現場有示範 RSocket 在 Spring 上的應用
回家後查了 RSocket 發現不是只有 Java 版本，還有 JS, Go 和 C++ 的版本

它可以有四種交互方式:
  - request / response (stream of 1) 與傳統的 http 一樣一去一回
  - request / stream (finite stream of many) 神奇，回傳一個 stream 給你操作
  - fire-and-forget (no response) 單向，不需要回應
  - channel (bi-directional streams) 雙向 streams 與 websocket 一樣一直來來回回

值得花點時間研究一下

今年的識別證
<img src="/images/jcconf-2020-001.png" width="50%" height="50%" alt="img1"/>
