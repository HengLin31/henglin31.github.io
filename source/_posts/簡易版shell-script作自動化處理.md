---
title: 簡易版shell script作自動化處理
date: 2019-10-22 16:26:18
tags:
- shell
---

好久沒有寫sh了...都快忘光了...所以今天寫一個簡單的自動化腳本作為複習

* 最常見的就是滿足三個功能
 * 執行某個命令後自動化處理某些事情
 * 更改設定黨特定參數
 * 參數防呆，避免將數值改壞

先來完成第一步
首先要透過發出不同的命令去執行特定任務，大多都會使用case來針對不同命令做特定處理，最後增加一個case \*) 當命令錯誤時可提示使用方式
這裡將處理的任務各自寫成獨立的function，是為了方便後續的維護與修改
下方的＄1是sh檔取得command line輸入的第一個參數，若有多個參數數值會依序count，如：\$1, \$2, \$3...


 ```bash
cmd=$1

function edit_config() {
    echo 'edit config'
}

function run_start() {
    echo 'run start'
}

function run_stop() {
    echo 'run stop'
}

case $cmd in
    config)
        edit_config;
        ;;
    start)
        run_start;
        ;;
    stop)
        run_stop;
        ;;
    *)
        echo 'Usage 1. config id, 2. start, 3. stop'
        ;;
esac
```

第二步來修改設定檔案特定的參數
假設現在要修改某個config檔案叫作test.cfg，裡面內容如下

```bash

# test config
# id
id=0

# other
other.cmd=xxx

```

想要修改數值可以使用sed命令即時修改特定參數id
```bash
sed -i 's/原字串/取代字串/g 修改檔案名稱
```
因為筆電是macbook所以直接執行會出錯，要在前面再加一個空字串...
```bash
sed -i '' 's/原字串/取代字串/g 修改檔案名稱
```
接下來使用if/else來檢查第二參數id有沒有參數 (防呆) ，參數-z為檢查字串長度，若是0則為true，所以可用來判斷是否有輸入id
```bash
if [ -z $id ]
```
檢查命令為config才設置id
```bash
cmd=$1
file=test.cfg

if [ $cmd == 'config' ]
then
    id=$2
fi

function edit_config() {
    if [ -z $id ]
    then
        echo 'no arg "id"'
    else
        echo 'edit config, id='$id
        sed -i '' 's/\(id=\).*/id='$id'/g' $file 
    fi
}

```
最終完成後的格式如下
```bash
#!/bin/bash

cmd=$1
file=test.cfg

if [ $cmd == 'config' ]
then
    id=$2
fi

function edit_config() {
    if [ -z $id ]
    then
        echo 'no arg "id"'
    else
        echo 'edit config, id='$id
        sed -i '' 's/\(id=\).*/id='$id'/g' $file 
    fi
}

function run_start() {
    echo 'run start'
}

function run_stop() {
    echo 'run stop'
}

case $cmd in
    config)
        edit_config;
        ;;
    start)
        run_start;
        ;;
    stop)
        run_stop;
        ;;
    *)
        echo 'Usage 1. config id, 2. start, 3. stop'
        ;;
esac

```

測試命令
```shell
./test_cmd.sh
Usage 1. config id, 2. start, 3. stop

./test_cmd.sh config
no arg "id"

./test_cmd.sh config 2
edit config, id=2

./test_cmd.sh start
run start

./test_cmd.sh stop
run stop
```

將結果放到 /etc/rc.local 在server開啟時自動執行 /server-script/test_cmd start
如果是做成 service 可以放到 /etc/init.d/ 後啟動，使用 chkconfig 設定此 service 為 on
