---
title: 提升Socket傳送Large file的速度
date: 2018-05-13 23:43:53
tags:
- java
---

在工作上遇到前端上傳large file後需再透過socket傳送給某個service處理
在傳送前一開始就會拿到一個完整的byte array
若只是幾kb的小檔案最快的做法當然是直接
`write(byte[] b, 0, b.length);`
但是遇到這麼大的檔案不可能這麼做，只能分成多次寫入
最先想到的是用NIO的方式ByteBuffer.allocate(size)方式建立緩衝，取得channel後分批寫入SocketChannel，想必處理速度會快很多
但經過測試各種方法後，發現直接取得檔案大小後直接切好buffer大小，接著操作OutputStream直接寫入的處理的速度是最快的
在此情境下NIO(buffer)處理比直接寫OutputStream(stream)慢有可能與service方的socket server實現的方式有關吧...

其實這個做法其實跟Java本身提供的BufferedOutputStream做法一樣
只是不需要另外檢查buffer是否寫滿(因為這個做法在一開始就知道要切到哪一個byte)
也少了一層FilterOutputStream (它們的繼承關係 BufferedOutputStream -> FilterOutputStrean -> OutputStream)
而是選擇直接操作OutputStream，所以才可以做到如此快速

提醒一下
這個方式比較不適合用在"讀檔"後使用socket傳送大檔案
因為讀檔可以邊讀邊傳(寫入)可以有效降低memory的使用量，所以直接串BufferedOutputStream就好

最終的程式碼如下
<!-- more -->
```java
    private static final int BYTE_BUF_SIZE = 8192;
    
    private boolean sendCmd(String ip, int port, byte[] byteArray){
        boolean isSuccess = true;
        Socket socket = null;
        int bufSize = BYTE_BUF_SIZE;//一次寫入多少byte
        int byteArrayLength = byteArray.length;
        int writeCount = byteArrayLength / bufSize;//分幾次寫
        int byteRemain = byteArrayLength % bufSize;//剩餘的byte
        int off = 0;
        try {
            socket = new Socket(ip, port);
            OutputStream out = socket.getOutputStream();
            for(int count=0; count<writeCount; count++){
                out.write(byteArray, off, bufSize);
                off += bufSize;
            }
            if(byteRemain > 0){//最後有剩(不足buf的)
                out.write(byteArray, off, byteRemain);
            }
            out.flush();
            out.close();
        } catch (IOException e) {
            logger.warn("use socket send command fail!!, ip: {}, port: {} exceptionMsg:{}", ip, port, e);
            isSuccess = false;
        }finally {
            if(socket != null){
                try {
                    socket.close();
                } catch (IOException e1) {
                    logger.warn("socket close fail: {}", e1);
                    isSuccess = false;
                }
            }
            return isSuccess;
        }
    }
```
