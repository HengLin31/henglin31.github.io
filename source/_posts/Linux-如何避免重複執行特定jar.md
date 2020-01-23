---
title: Linux 如何避免重複執行特定jar
date: 2018-03-17 21:00:34
tags:
- shell
---

因為Linux是真正多人多工，若是在不同電腦上遠端登入
執行同一個特定jar，就會造成重複執行
所以在一般情況下，會寫script 做成 service
再透過 start stop restart 去執行

但是有些時候我們只是要執行一個Java的小程式
不會想要花費時間將它製作成 service 
所以只需寫一個script，去檢查特定程式的JVM是否已經啟動
若是已經啟動的話就刪除目前執行的JVM

應該有其他指令可以做到直接刪除，這裡只是提供一種強制停止JVM的思路


```bash kill jar JVM, if exist .sh
#!/bin/bash

PID=$(ps aux | grep jar-[0-9] | awk '{print $2}')
echo "PID: "$PID
if [ -z $PID ]; then
	echo "not exist PID"
else
    echo "kill PID: "$PID
    kill -9 $PID
fi

```

第3行 ps aux 是找出所有目前執行中的process
接著使用 grep 找出特定的process，因為這個jar會帶版號
例如： jar-1.1.jar 或是升級後 jar-1.2.jar
所以多判斷帶版號的regex
最後執行 awk 印出第2欄（因為第2欄是process的PID）
第5行是檢查PID是否為空字串
若PID不是空字串就表示JVM已經存在需要執行第9行去強制刪除JVM
PS: 要不要刪除JVM就看個人了，因為這是用在開發中的jar，需要重新執行，所以使用kill

這樣一個簡單的script就完成了，現在只需要在執行jar前呼叫此.sh檔
就可以避免重複執行了

