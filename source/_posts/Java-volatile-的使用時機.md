---
title: Java volatile 的使用時機
date: 2020-01-03 18:35:13
tags:
- java
- thread
---
最近重頭複習 java multi-thread 的相關知識，紀錄下來方便自己往後開發時可參照
今天來談 volatile 它可以當成一個輕量的鎖
我通常使用它來控制 multi-thread 共享變數，用來通知多個 thread 任務完成後正常離開
但它不能用於 java 計數，如 `count++`, `index--` 之類的操作
因為它不保證 atomic ，若有計數的需求需使用 AtomicInteger, AtomicReference, AtomicStampedReference 之類的 lib 來實現

在使用 volatile 之前要先了解 java thread 使用記憶體的情況
在 process 下宣告變數時記憶體會提供空間存放變數資料
但是在多個 thread 使用共享變數時，記憶體一樣會有一份共享變數資料
不同的是多個 thread 並不是直接共用此份共享變數資料
而是各自從共享變數 copy 一份變數資料到各自的 thread 中
當 thread 更新變數資料時，首先是改變自己內部的資料後再寫回記憶體中的那份共享變數
所以若是其他 thread 沒有從記憶體內的共享變數重新更新新的資料回自己的 thread 時
會造成資料不一致的後果

為了避免 thread 共享變數資料不一致得問題發生 volatile 就派上用場了
volatile 可以強迫 thread 更新資料回記憶體共享變數資料後並通知前他 thread 更新它們內部的資料
來保證資料的可見性
前面有說過 volatile 並不可用於計數相關的處理，因為它並不是真的鎖住整個物件
所以不保證只有一個 thread 可進入後單獨更新變數，因此當此 thread 可能在數值更新時並未 assign 回變數時
就被其他 thread 取得 cpu 控制權，並 assign 同筆資料時造成互蓋的問題

之前有做過實驗使用 10 個 thread 並將共享變數宣告為 volatile 從0一路增加到1000
在預期的情況下 10 * 1000 會是 10000 ，但在實際運行多次的情況下沒有一次得到10000
通常數值落在 7000 ~ 9000 多，就是高併發快速交錯運行下互蓋資料的後果

結論
1. volatile 可確保資料可見性，一個 thread 更新變數，其他 thread 也會重新更新內部變數
2. volatile 不保證atomic，不可用於計數操作
