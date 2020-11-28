---
title: 你真的了解Java中的Thread運作嗎？ - 容易讓人誤解的synchronized method
date: 2018-04-29 22:11:28
tags:
- java
- thread
---
今天下午聽到討論java的同事說“在method上面加上synchronized後，當多個thread執行此method時，同一時間只會有一個thread可以進入執行，但沒有synchronized的method不會被鎖住可以進入執行，因為thread是鎖method的”
前面敘述是OK的，但最後一句話聽起來怪怪的...“thread是鎖method的”，這個說法有點不妥

在某個method上面增加synchronized很直覺的會認為只是會鎖此method，但若實際寫code去驗證的話，在使用javap查看.class檔案會發現不是針對method鎖而是將整個object當作鎖，與synchronized(this)幾乎是一樣的效果，反之若使用某個object當作key如synchronized(key)，此時key就可以當作進入區間的唯一鑰匙，就看誰先搶到進入

以另外一個角度來看，Java的wait(), notify(), notifyAll()都是定義在Object，而不是在thread上，如果thread在sychronized區塊不是針對Object做鎖的動作，那它就需要一個唯一可以當作鎖的依據，可以在sychronized區塊某些情況下釋放鎖給其他thread，很明顯thread中是沒有定義這個東西，還是需要透過Object內的wait()去blocked和notify()做wakeup thread

很多時候程式實際運作與自己想像是有落差的，不論是書上寫的或者在技術blog上讀到的都不一定是對的，只有自己嘗試寫code執行過才會知道
