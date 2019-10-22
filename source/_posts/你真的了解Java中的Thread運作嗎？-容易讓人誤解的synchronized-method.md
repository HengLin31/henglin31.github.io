---
title: 你真的了解Java中的Thread運作嗎？ - 容易讓人誤解的synchronized method
date: 2018-04-29 22:11:28
tags:
- java
- thread
---
今天下午無意中聽到後方正在討論java的同事說“在method上面加上synchronized後，當多個thread執行此method時，同一時間只會有一個thread可以進入執行，但沒有synchronized的method不會被鎖住可以進入執行，因為thread是鎖method的”
最後一句話聽起來怪怪的...“thread是鎖method的”，真的是這樣嗎？

我在剛接觸java的時候，其實也有相同的疑問，因為在某個method上面增加synchronized很直覺的會認為只是會鎖此method，但若實際寫code去驗證的話，會發現不是鎖method而是會鎖住整個object，很多時候程式實際運作與自己想像是有落差的，不論是書上寫的或者在技術blog上讀到的都不一定是對的，只有自己嘗試寫code執行過才會知道
