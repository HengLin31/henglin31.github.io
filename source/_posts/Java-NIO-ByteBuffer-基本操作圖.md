---
title: Java NIO ByteBuffer 基本操作圖
date: 2020-01-13 21:02:08
tags:
- java
- nio
---
剛剛在刪舊圖片時發現以前為了學 ByteBuffer 時自己畫的操作圖
<img src="/images/nio-byte-buffer-001.png" width="50%" height="50%" alt="img1"/>
這張圖簡單顯示 ByteBuffer 的寫入與讀取時 position point 和 limit point 的位移
allocate 宣告 buffer capacity
put(bytes[4]) position 一路從 0 移動到 4 ，0 ~ 3 依序放入內容值， 4 為下一個寫入位置
flip() 為準備讀取 buffer 資料前的動作，為了讀取剛剛寫入 0 ~ 3 的內容，則改變 point 指向位置 limit = position 接著 position = 0
get(bytes[4]) position 一路從 0 移動到 4 ，0 ~ 3 依序取出內容值
clear() 清除不是真的清除資料，也只是改變 point 指向位置， position = 0 且 limit = capacity ，因為下次有資料寫入會直接覆蓋 buffer 內的舊值
