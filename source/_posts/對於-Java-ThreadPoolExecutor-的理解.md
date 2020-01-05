---
title: 對於 Java ThreadPoolExecutor 的理解
date: 2020-01-05 19:26:00
tags:
- java
- thread
---
Executors 有提供好幾種 thread pool 如 newFixedThreadPool, newSingleThreadExecutor, newCachedThreadPool 等
它們的底層都是使用 ThreadPoolExecutor 搭配不同參數所實現的
在正常情況下我會依據問題的需求自己調整參數，因為 Executors 大多使用的 LinkedBlockingQueue 預設容量為 Integer.MAX_VALUE
在高併發下，最終可能累計過多 task 造成 OutOfMemory 的情況發生

ThreadPoolExecutor 有7個參數可供調整，只要熟悉每個參數的使用，就可以根據需求來設計 thread pool
```java
public ThreadPoolExecutor(
            int corePoolSize,
            int maximumPoolSize,
            long keepAliveTime,
            TimeUnit unit,
            BlockingQueue<Runnable> workQueue,
            ThreadFactory threadFactory,
            RejectedExecutionHandler handler) {
                ...
}
```
corePoolSize: thread pool 建立後初始化的 thread 個數
maximumPoolSize: thread pool 內同時間執行 thread 的上限值，因為當 workQueue 滿了又有 task 進入時需要創建更多 thread 來處理，但不能無限增加 thread 數量，故使用此設定值
keepAliveTime: thread pool 沒用到的空閒 thread 的存活時間，因為當 loading 降低時，需要將 thread pool 個數需要降回 corePoolSize 減少資源的浪費
unit: keepAliveTime 時間的單位
workQueue: 任何實現 BlockingQueue 的 queue，放尚未被執行的 task
threadFactory: 沒什麼好說的，就生成 thread 用的 factory ，用預設值就好
handler(rejected): 當 workQueue滿了且 thread pool 內的 thread 已達 maximumPoolSize 的上限，無法處理新的 task 所以需進行額外的處理
- - -
畫個圖簡單說明 ThreadPoolExecutor 執行的情況，以下系列圖中的 t 為 task ，所以 t1 表示 task 1
實線方體為可用 thread ，虛線方體為未存在的 thread ，長方灰階為 work queue
這裡 corePoolSize = 2 所以有兩個實線方體， maximumPoolSize = 5 所以最多可生成5個 thread ， workQueue = 4 所以長方灰階最多可排4個 task
<img src="/images/thread-pool-executor-001.png" width="50%" height="50%" alt="img1"/>
- - -
假設目前 t1, t2, t3 3個 task 執行 execute() 此時需決定是否取得 thread 執行 task ，或者放入 workQueue 等待
<img src="/images/thread-pool-executor-002.png" width="50%" height="50%" alt="img2"/>
- - -
可用 thread 個數為2，所以 t1, t2 取得 thread 執行， 而 t3 進入 workQueue 等待
<img src="/images/thread-pool-executor-003.png" width="50%" height="50%" alt="img3"/>
- - -
此時 t4, t5, t6 3個 task 執行 execute() 後需決定是否取得 thread 執行 task ，或者放入 workQueue 等待
<img src="/images/thread-pool-executor-004.png" width="50%" height="50%" alt="img4"/>
- - -
無可用 thread 所以 t4, t5, t6 放入 workQueue 等待
<img src="/images/thread-pool-executor-005.png" width="50%" height="50%" alt="img5"/>
- - -
很快的 t7, t8, t9 也執行 execute()
<img src="/images/thread-pool-executor-006.png" width="50%" height="50%" alt="img6"/>
- - -
無可用 thread 且 workQueue 已滿，所以生成3個 thread 讓 t3, t4, t5 取得 thread 後 t7, t8, t9 放入 workQueue
<img src="/images/thread-pool-executor-007.png" width="50%" height="50%" alt="img7"/>
- - -
t10 執行 execute() 後發現 thread 個數已達 maximumPoolSize 且 workQueue 已滿，觸發 handler 處理
RejectedExecutionHandler 提供四種策略
AbortPolicy: 直接拋出 RejectedExecutionException 阻止正常執行
CallerRunsPolicy: 不會觸發 exception，回給 caller 執行
DiscardOldestPolicy: 移除 workQueue 內等待最久的 task ，並將新的 task 放入
DiscardPolicy: 直接拒絕 task 不觸發任何 exception
<img src="/images/thread-pool-executor-008.png" width="50%" height="50%" alt="img8"/>
- - -
過一段時間 workQueue 已空且只剩2個 thread 被 t8, t9 取用
<img src="/images/thread-pool-executor-009.png" width="50%" height="50%" alt="img9"/>
- - -
又過了一段時間，根據 keepAliveTime = 60, unit = sec 所以在3個未用的 thread 經過60秒後銷毀
<img src="/images/thread-pool-executor-010.png" width="50%" height="50%" alt="img10"/>
- - -
已無任何 task 需要執行， thread pool 回到原始狀態
<img src="/images/thread-pool-executor-001.png" width="50%" height="50%" alt="img11"/>
- - -
了解執行原理後，接下來就需要根據經驗來調整參數
要如何合理的配置 thread pool 的 thread 個數
這需要牽扯到要解的問題是遇到 CPU bound 還是 I/O bound
若是 CPU bound 可以設置 maximumPoolSize 設為趨近目前電腦或 VM 所配置的核心數，減少 context switch 的切換
Java 可用 Runtime.getRuntime().availableProcessors() 取得此數據
若是 I/O bound 就可以盡量設置高一點，因為在做頻繁 I/O 時 task 大多需要等待 I/O 執行完畢，卡在身上不如給其他人使用，提高 CPU 的利用率
以此為基礎多跑幾次實驗，最終可調出較佳的結果，這東西很迷沒有正確的數值只能慢慢調整

結論
1. 為了效能需求 thread pool 最好使用 ThreadPoolExecutor 依據需求自行設定
2. 請根據 CPU bound 或 I/O bound 進行調整 thread 個數

