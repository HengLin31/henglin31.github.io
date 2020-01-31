---
title: 對於 Java Fork Join framework 的理解
date: 2020-01-07 20:05:00
tags:
- java
- thread
---
老實說我在工作中沒直接用過 Java 的 Fork Join 只有以前在作自主練習時用過，知道這個東西
如果沒有特別需要，也沒有必要為了使用而使用，一切還是要回歸需求面
因最近複習 multi-thread 的相關知識，才有這個機會再次使用
它可 parallel 處理 divide and conquer 的問題
適合可獨立拆分的問題，且拆出的子問題之間不要存在相依性
感覺很像 MapperReduce 的運作

ForkJoinPool:
與 ThreadPoolExecutor 一樣都是繼承自 AbstractExecutorService
fork(): 將分割的 task 放入 workQueue ，task 交由 ForkJoinPool 處理
join(): blocking 等待 task 完成
與 ThreadPoolExecutor 不同的是 ForkJoinPool 內的所有 workThread 都有自己的 workQueue
而 ThreadPoolExecutor 是大家共用一個 workQueue
這裡要注意的是 workThread 的 workQueue 是 Deque
workThread 會從 workQueue 頭部取 task
當 workThread 內的 workQueue 沒有 task 可執行，會從其他 workThread 的 workQueue 尾端取 task

目前看到比較常用的三種 ForkJoinTask
RecursiveTask: 有返回值
RecursiveAction: 無返回值
CountedCompleter: 完成 task 後將觸發其他 task

- - -

這裡練習使用 RecursiveTask 寫一個 merge sort
```java
public class MergeSort extends RecursiveAction {
    private final int THRESHOLD;
    private int[] arr;
    
    public MergeSort(final int[] arr, final int threshold){
        this.arr = arr;
        this.THRESHOLD = threshold;
    }
    
    @Override
    protected void compute() {
        if(arr.length <= THRESHOLD){
            Arrays.sort(arr);
            return;
        }
        
        int midIndex = arr.length / 2;
        int[] leftArr = Arrays.copyOfRange(arr, 0, midIndex);
        int[] rightArr = Arrays.copyOfRange(arr, midIndex, arr.length);
        
        MergeSort left = new MergeSort(leftArr, THRESHOLD);
        MergeSort right = new MergeSort(rightArr, THRESHOLD);
        
        left.fork();
        right.fork();
        
        left.join();
        right.join();
        
        System.out.println(Arrays.toString(left.getArr()));
        System.out.println(Arrays.toString(right.getArr()));
        
        arr = mergeArr(left.getArr(), right.getArr());
    }
    
    public int[] getArr(){
        return arr;
    }
    
    private int[] mergeArr(final int[] leftArr, final int[] rightArr){
        int[] resultArr = new int[leftArr.length + rightArr.length];
        
        int resultIndex = 0;
        int leftIndex = 0;
        int rightIndex = 0;
        
        while(leftIndex < leftArr.length && rightIndex < rightArr.length){
            if(leftArr[leftIndex] <= rightArr[rightIndex]){
                resultArr[resultIndex] = leftArr[leftIndex];
                leftIndex++;
            }else{
                resultArr[resultIndex] = rightArr[rightIndex];
                rightIndex++;
            }
            resultIndex++;
        }
        
        while(leftIndex < leftArr.length){
            resultArr[resultIndex] = leftArr[leftIndex];
            leftIndex++;
            resultIndex++;
        }
        
        while(rightIndex < rightArr.length){
            resultArr[resultIndex] = rightArr[rightIndex];
            rightIndex++;
            resultIndex++;
        }
        
        return resultArr;
    }
}
```

執行 merge sort
```java
public static void main(String[] args){
    int[] arr = new Random().ints(25, 1, 100).toArray();
    System.out.println("ori: " + Arrays.toString(arr) + "\n ---");
    
    ForkJoinPool threadPool = new ForkJoinPool(5);
    MergeSort mergeSort = new MergeSort(arr, 5);
    threadPool.invoke(mergeSort);
    System.out.println("---\nresult: " + Arrays.toString(mergeSort.getArr()));

}
```

執行結果:
<img src="/images/fork-join-001.png" width="50%" height="50%" alt="img1"/>

這篇聊得比較少，也只練習了 RecursiveTask
目前稍微熟悉一下就好，等未來有需要使用時再深入了解吧
