---
title: 使用 Gradle 自動初始化 Spock
date: 2018-05-20 22:23:10
tags:
- gradle
- unit test
---

第一次接觸gradle是從v1.7這個版本開始的(2013年)
工作上則是使用v2.2版本(2014年)，開發上測試是使用junit
但私底下都使用Spock來測試我自己寫的程式
因為寫過Spock後就不會想寫junit了... 只是工作上就是規定使用junit...也只能乖乖配合

最近升級gradle順便看一下有支援哪些新的功能，發現從v2.11開始可以直接建立Spock的專案了
[gradle v2.11 release-notes](https://docs.gradle.org/2.11/release-notes.html?_ga=2.65549740.32788303.1526825308-661634901.1526653677)

再往前查看了一下，發現早在v2.6版開始就有支援Spock，只是沒有指令可以直接建立Spock測試，所以只能算半成品吧，直到v2.11後才算完整
[gradle v2.6 release-notes](https://docs.gradle.org/2.6/release-notes.html?_ga=2.129521294.32788303.1526825308-661634901.1526653677)

指令很簡單，只需打一行
```java
gradle init --type java-library --test-framework spock

```
想到以後就不需要再自己引入Spock，太感動了
gradle真的是越來越方便，難怪Android會使用gradle來建立專案
