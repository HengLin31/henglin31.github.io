---
title: Java BlockingQueue 適合應用在哪些場景
date: 2020-01-06 18:03:44
tags:
- java
- thread
---
BlockingQueue 適用於緩衝如經典的 producer / consumer 場景
大多用在多個 thread 之間倆倆需要共享資料時，一個放另一個取，非常方便，通常我用它來取代 wait() 和 notify() 做 thread 通信
上一篇 ThreadPoolExecutor 第5個參數就是 BlockingQueue 用來存放等待從 thread pool 取得 thread 的 task
可根據不同的應用場景可搭配適合的 BlockingQueue 
這個主題偏向於應用面的思考，針對不同場景選擇使用 BlockingQueue

- - -
BlockingQueue:
ArrayBlockingQueue

適用場景:
在非高併發任務，且可預估出固定處理速率時
如: 一般的緩衝區

特色:
queue 容量固定個數，屬於有 bounded 的類型，滿或空的時候會 blocking
放入與取出使用同一個 lock ，所以不利於高併發下使用

- - -
BlockingQueue:
PriorityBlockingQueue

適用場景:
當需要優先處理特定任務時，需讓高優先權任務盡快被取出處理，再接著處理次要的任務
如: 在有階級機制下的搶票系統，可根據階級設定每個人的優先權，讓高優先權的人優先取得票

特色:
queue 容量為 Integer.MAX_VALUE – 8 ， Java doc 上說明為 unbounded 
根據 priority 排序，優先級高的會被優先取出處理
比較特別的是它 add(), offer(), put() 操作都一樣，都是 offer() 操作

- - -
BlockingQueue:
LinkedBlockingQueue

適用場景:
需要高併發情況下使用，但需要評估取出時的消耗率，避免高併發下取出速度趕不上放入速度造成 OutOfMemory
如: 即時訊息處理

特色:
queue 容量可調整， Java doc 上說明為 optionally-bounded ，預設值為 Integer.MAX_VALUE，但一般來說會根據需求設值
用於高併發，使用讀寫分離，放入使用 putLock 而取出使用 takeLock
在上一篇 ThreadPoolExecutor 有稍微提到
且 newFixedThreadPool, newSingleThreadExecutor 都使使用 LinkedBlockingQueue 作為 workQueue

- - -
BlockingQueue:
LinkedBlockingDeque

適用場景:
有雙向需求
如: real-time 處理任務，在某些危險的情況下需要警急處理終止命令

特色:
有雙向需求，基本上與 LinkedBlockingQueue 相似
可以當作極端的 PriorityBlockingQueue ，但只有一般和最高兩種權限


- - -
BlockingQueue:
SynchronousQueue

場景:
目前想不到單獨使用的場請，所以需搭配 newCachedThreadPool 使用
newCachedThreadPool 適用於在特定情況或時間下會才一瞬間出現大量 task，但在大部分情況下處理量不高
如: 某些監控系統或感應器，只有在警報發生或瞬間觸發多個動作時需要處理大量 task ，其餘時間皆為正常的處理量

特色:
它沒有容量，所以 peek() 永遠為空，底層是 transfer 且等待為0秒，放與取只能手把手地快速交換
目前所知需搭配 newCachedThreadPool 使用，其底層實作為上一篇提到的 ThreadPoolExecutor
因 SynchronousQueue 沒容量，因此 newCachedThreadPool 可以根據 task 需求量在 thread pool 中創建多個 thread 直到設定的上限值
而不受 workQueue 影響

- - -
BlockingQueue:
DelayQueue

適用場景:
延後處理，或者有時間倒數的情況
如: 某些嚴格的登入系統因安全性考量，當每次登入後可能只有3分鐘時間可處理，等時間超過3分鐘則會自動登出


特色:
queue 容量為 Integer.MAX_VALUE ， Java doc 上說明為 unbounded 
task 放入 queue 後需要過一段時間後才可被取出
假設目前有 t1, t2 兩個 task 需放入 queue
將 t1 設定5秒後處理後放入 queue ，接著 t2 設定2秒後處理後放入 queue
拿的時候會先 blocking 等到2秒後先取出 t2 ，若 t2 需處理較長的時間，假設需要10秒
此時 t1 還在 queue 中，所以可能在10秒後才從 queue 中取出 t1
反之 t2 若瞬間處理結束，則需 blocking 直到5秒後取出 t1

- - -
BlockingQueue:
LinkedTransferQueue

適用場景:
producer 壓榨 consumer ，producer 想要在指定時間內或需要 consumer 立即處理，此時 consumer 需要有快速消耗的能力
如: 追求高併發極限，只要有 task 就立即處理

特色:
確保 producer 的資料能立即被 consumer 處理
底層與 SynchronousQueue 一樣都是使用 transfer ，除非超時，否則會一直 blocking
一般的 BlockingQueue 是 producer 放完資料就結束，除非 queue 滿了才會 blocking
而 LinkedTransferQueue 需要等 consumer 處理才算結束，不然就 blocking
