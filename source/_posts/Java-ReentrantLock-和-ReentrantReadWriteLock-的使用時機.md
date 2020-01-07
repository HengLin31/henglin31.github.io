---
title: Java ReentrantLock 和 ReentrantReadWriteLock 的使用時機
date: 2020-01-04 14:25:47
tags:
- java
- thread
---
在實際工作中我大多使用 ReentrantReadWriteLock 因為遇到的使用情景都是讀取的需求遠大於寫入
所以除非某些場景需要使用 synchronized 為了更好的效能可能會用 ReentrantLock 取代
synchronized 是 JVM 層級的同步鎖，底層機制鎖死整個區塊，而 Lock 類的是使用 java.util.concurrent 下實現的 lib
而且可以綁定多個 condition 可以喚醒特定的 thread (thread.signal())，不像 synchronized 只能一次喚醒全部或者隨機一個，彈性上強上許多

如果用一句話解釋 ReentrantLock 和 ReentrantReadWriteLock 兩者的差別就是
ReentrantLock: One thread at a time.
ReentrantReadWriteLock: One writer thread at a time or multiple reader threads at a time.
它們分別 implement Lock 和 ReadWriteLock
ReadWriteLock其實就是基於 Lock 上作讀寫分離
```java
public interface ReadWriteLock {
    Lock readLock();
    Lock writeLock();
}
```
- - -
先聊 ReentrantLock
在正常使用下只需針對存取變數block包覆
```java
private static ReentrantLock lock = new ReentrantLock();

private static void accessResource() {
    lock.lock();
    try {
        //access the resource
    } finally {
        lock.unlock();
    }
}
```
ReentrantLock 如字面上的意思他是所以可以重入(會計算重入次數，離開時遞減次數)，但 lock 和 unlock 必須成對出現
但在一般情況下是不會使用兩層 lock ，主要是針對不同 method 之間有交互引用時，存取共享變數資料時好用
```java
private static ReentrantLock lock = new ReentrantLock();

private static void accessResource() {
    lock.lock();
    lock.lock();
    try {
        //access the resource
    } finally {
        lock.unlock();
        lock.unlock();
    }
}
```
還有它初始化時可以設置公平鎖和非公平鎖
```java
public ReentrantLock(boolean fair) {
    sync = fair ? new FairSync() : new NonfairSync();
}
```
FairSync: multi-thread 按照申請鎖的順序來獲取鎖，類似排隊，先來後到
NonfairSync: 獲取鎖的順序並不是按照申請鎖的順序，可能後申請的 thread 比先申請的優先權高，在高併發的情況下，可能造成優先級別反轉或者飢餓現象(長時間都拿不到cpu執行權限)
- - -
接著來談 ReentrantReadWriteLock
簡單的說它與 ReentrantLock 最大的不同在於 readLock 可以放多個讀取操作進入，而且 readLock 與 writeLock 是互斥的
為了更容易了解，就簡單畫個圖來說明，這裡的 t 表示 thread
<img src="/images/reentrant-read-write-lock-001.png" width="50%" height="50%" alt="img1"/>
當 t1 取得鎖在執行寫入操作時(writeLock)，後面有3個thread進入等待
此時 t1 執行完畢後，接著執行 readLock ，允許多個 read 操作進入(same read lock)，所以 t2 和 t4 也進入讀取變數
t5 進入等待區，t5 雖然也是讀取操作，但沒有與 t2 和 t4 一樣進入區間，因為在 t2 和 t4進入後 read 操作的 thread 等待個數為 0 所以下次需讓給 write lock
t2 和 t4 讀取結束，放 t3 進入，因為 t3 為寫操作，所以只能是自已進入作寫入(single thread)

Java中的ReentrantReadWriteLock使用一個 int 作為鎖的計數
sharedCount() 共享鎖(高位元16)，用於 readLock ，允許多個 read thread
exclusiveCount() 獨佔鎖(低位元16)，用於 writeLock ，只允許一個 write thread

有時候為了確保讀寫互斥安全性會做鎖降級或鎖升級
鎖降級: 在 writeLock 沒有釋放的時候，獲取 readLock，再釋放 writeLock
鎖升級: 在 readLock 沒有釋放的時候，獲取 writeLock，再釋放 readLock
這裡示範鎖降級，利用讀寫互斥在 writeLock.unlock() 前面卡 readLock.lock()，避免被其他 write thread 搶佔cpu更新變數，保證一次性的 atomic 操作
```java
private ReentrantReadWriteLock lock = new ReentrantReadWriteLock();
private ReentrantReadWriteLock.ReadLock readLock = lock.readLock();
private ReentrantReadWriteLock.WriteLock writeLock = lock.writeLock();

private volatile boolean isUpdate;

public void readWriteResource(){
    readLock.lock();
    if(isUpdate){
        readLock.unlock();
        writeLock.lock();
        //write the resource
        readLock.lock();
        writeLock.unlock();
    }
    //read the resource
    readLock.lock();
}
```
這裡需注意 isUpdate 需要設置 volatile 讓全部 thread 可見 flag 變化
- - -
結論
1. ReentrantLock 可作為 synchronized 的替代品，需使用公平鎖機制時使用
2. ReentrantReadWriteLock 用於讀取遠大於寫入的場景，

目前先寫到這，其他等以後想到其他再補充吧...
