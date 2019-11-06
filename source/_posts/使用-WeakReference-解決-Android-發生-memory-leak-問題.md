---
title: 使用 WeakReference 解決 Android 發生 memory leak 問題
date: 2018-03-10 21:03:49
tags:
- java
- android
- memory leak
---

源由:
前陣子幫離職的同事維護Android APP
因為客戶反映此APP在運行一天之後輕則沒有反應，重則crash...
所以需要常常重啟APP

在Android Studio上觀察了一下memory
執行了一段時間後發現記憶體會不正常增長，就算手動執行GC也無法釋放
初步研判是發生了memory leak
馬上做heap dump
再使用MAT稍微分析了一下

果然...
<!-- more -->
activity的context沒有被正常釋放掉
主因是activity將自身的context傳給了AsyncTask去執行跟Server拿資料的任務
因為此APP是屬於Web Service，需要頻繁的執行request
所以同時間會產生多個AsyncTask
最終造成多個AsyncTask需等待其他AsyncTask完成任務
但又佔用activity的context，所以activity無法釋放

簡單的說就是AsyncTask的生命週期比activity的生命週期還要長
所以activity沒辦法回收memory

確認問題的原因後，接下來就好辦了

首先是解決activity context無法釋放的問題
在這裡我是將傳入activity context宣告成WeakReference
WeakReference是Java的弱引用，可以讓 activityContext 可以被系統正常GC
不會因AsyncTask長期佔用 activityContext 造成 memory 無法釋放的問題發生

```java WeakReference 使用方式
    WeakReference<Context> contextRef = new WeakReference<Context>(activityContext);
    if(null != contextRef.get()){//判斷有無被系統GC
        Context context = contextRef.get();
        //可以執行到這，就表示 context 還未被系統回收，可繼續做接下來的任務
    }
```

但是最佳的做法應該是不要隨意傳遞activity的context，因為他的生命週期非常短暫
若真的需要使用context的話應該使用application context，而不是activity context
因為application context是APP的context，所以不像activity context一直不斷被創建和釋放
只是application context不能用來更新UI

若想使用activity context去更新UI的話，也應該要回歸到activity內部執行
而不是讓外部的Object直接引用，無形中提高了memory leak發生的風險


