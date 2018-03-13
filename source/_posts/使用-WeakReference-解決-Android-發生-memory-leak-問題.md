---
title: 使用 WeakReference 解決 Android 發生 memory leak 問題
date: 2018-03-10 21:03:49
tags:
- java
- android
- memory leak
---

先說解法
使用 WeakReference 讓 activityContext 可以被系統正常GC
不會因被因AsyncTask長期佔用造成memory leak的問題發生

```java WeakReference 使用方式
    WeakReference<Context> contextRef = new WeakReference<Context>(activityContext);
    if(null != contextRef.get()){//判斷有無被系統GC
        Context context = contextRef.get();
        //可以執行到這，就表示 context 還未被系統回收，可繼續做接下來的任務
    }
```

為什麼會發生 memory leak 
主要是 AsyncTask 取得 activityContext 長時間佔用，造成 Activity 無法被回收
主要原因是 AsyncTask 任務是向 server request 資料回手機後，接著將資料更新到UI上
所以有可能 AsyncTask 的生命週期會長於 Activity 的生命週期
因 activityContext 無法回收，最終發生 memory leak...




