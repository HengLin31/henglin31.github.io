---
title: 關於 Java CompletableFuture 的用法
date: 2020-04-19 14:07:24
tags:
- java
- thread
---
已經好久沒有進行更新
最近都在熟悉新工作，與過往不同的 domain knowledge ，融入貫通的過程中學習到滿多關於硬體的知識，目前已經進入狀況

剛好最近都在使用 CompleteableFuture 處理 thread 非同步的事件
來寫篇文章記錄一下用法，方便之後查詢使用

CompletableFuture 使用上很像 JS 的 Promise 和 Linux 的 pipeline ( commands )
CompletableFuture 用於串連不同的 thread ，某種程度將 thread 之間的相依性解耦
某個 thread 結果要串給另一個 thread 當作輸入條件，使用 CompletableFuture 可輕鬆綁定
所以在設計時只需定義好每個事件個自的 input 和 output ，不需要將關聯寫死

首先是最簡單的 `runAsync` 和 `supplyAsync` 的基礎用法，差別在於是否需要 return result
它們都可以搭配 thread pool 使用 ( 在實際應用場景都會根據實際需求自建 thread pool 使用，若沒設置則預設是使用 JVM 本身的 thread pool )
```java 
    // basic
    CompletableFuture<Void>  runAsync(Runnable runnable)
    CompletableFuture<T>     supplyAsync(Supplier<T> supplier)
    
    // use your own thread pool
    CompletableFuture<Void>  runAsync(Runnable runnable, Executor executor)
    CompletableFuture<T>     supplyAsync(Supplier<T> supplier, Executor executor)

```

提供自建的 thread pool 給 CompletableFuture 使用
```java 
    ExecutorService threadPool = Executors.newFixedThreadPool(10);
    CompletableFuture<Void> runAsync = CompletableFuture.runAsync(() -> System.out.println("runAsync"), threadPool);
    CompletableFuture<String> supplyAsync = CompletableFuture.supplyAsync(() -> "supplyAsync", threadPool);

```
---
CompletableFuture 也允許在事件執行完成時 callback 取得結果，方便進行下一步的處理，而且在執行過程中發生 exception ，也可以攔截 exception 後執行特定的 action
```java
    // basic
    CompletableFuture<T> whenComplete(BiConsumer<? super T, ? super Throwable> action)
    CompletableFuture<T> whenCompleteAsync(BiConsumer<? super T, ? super Throwable> action)
    // catch exception
    CompletableFuture<T> exceptionally(Function<Throwable, ? extends T> fn)
    
    // use your own thread pool
    CompletableFuture<T> whenCompleteAsync(BiConsumer<? super T, ? super Throwable> action, Executor executor)
```

將剛剛的 `supplyAsync` 例子改寫為強制拋出 exception ，可在 `completeAsync` 或 `exceptionally` 處理異常，非常的方便
```java
    ExecutorService threadPool = Executors.newFixedThreadPool(10);
    CompletableFuture<String> supplyAsync = CompletableFuture.supplyAsync(() -> {
        throw new CompletionException(new Exception("throw exception"));
    }, threadPool);
    
    supplyAsync.whenCompleteAsync((result, ex) -> {
        System.out.println("result: " + result);
        System.out.println("exception: " + ex);
    }, threadPool).exceptionally(ex -> {
        System.out.println("exceptionally: " + ex.getMessage());
        return ex.getMessage();
    }).join();
```
---
除此之外 CompletableFuture 也提供 `handle` 來處理 exception ，差別在於 `handle` 是允許有返回值，用於串接過程中處理 exception
`handle` 也用於做進一步的資料轉換

```java
    // basic
    CompletableFuture<U> handle(BiFunction<? super T, Throwable, ? extends U> fn)
    CompletableFuture<U> handleAsync(BiFunction<? super T, Throwable, ? extends U> fn)

    // use your own thread pool
    CompletableFuture<U> handleAsync(BiFunction<? super T, Throwable, ? extends U> fn, Executor executor)
```

再次改寫 `supplyAsync` ，改為使用 `handle` 處理 exception ，此例子將 exception 轉換成字串當作一般的結果往後傳遞
```java
ExecutorService threadPool = Executors.newFixedThreadPool(10);
CompletableFuture<String> supplyAsync = CompletableFuture.supplyAsync(() -> {
    throw new CompletionException(new Exception("throw exception"));
}, threadPool);

String ans = supplyAsync.handle((result, ex) -> (null != ex) ? ex.getMessage() : result).join();
System.out.println("ans: " + ans);
```
---

若是沒有處理 exception 的需求則可以使用 `thenApply` 進行資料的轉換，類似於 stream map 的效果
```java
    // basic
    CompletableFuture<U> thenApply(Function<? super T, ? extends U> fn)
    CompletableFuture<U> thenApplyAsync(Function<? super T, ? extends U> fn)
    
    // use your own thread pool
    CompletableFuture<U> thenApplyAsync(Function<? super T, ? extends U> fn, Executor executor)
```

還有對映 flatMap 的 `thenCompose`
```java
    CompletableFuture<U> thenCompose(Function<? super T, ? extends CompletionStage<U>> fn)
    CompletableFuture<U> thenComposeAsync(Function<? super T, ? extends CompletionStage<U>> fn)
    
    CompletableFuture<U> thenComposeAsync(Function<? super T, ? extends CompletionStage<U>> fn, Executor executor)
```

不需要返回值的 `thenAccept` 
```java
    // basic
    CompletableFuture<Void> thenAccept(Consumer<? super T> action)
    CompletableFuture<Void> thenAcceptAsync(Consumer<? super T> action)
    
    // use your own thread pool
    CompletableFuture<Void> thenAcceptAsync(Consumer<? super T> action, Executor executor)
```
---

使用 `thenCombine` 還可以將兩個獨立的 CompletableFuture 執行結果進行整合，非常的強大
```java
    // basic
    CompletableFuture<V> thenCombine(CompletionStage<? extends U> other, BiFunction<? super T, ? super U, ? extends V> fn)
    CompletableFuture<V> thenCombineAsync(CompletionStage<? extends U> other, BiFunction<? super T, ? super U, ? extends V> fn)
    
    // use your own thread pool
    CompletableFuture<V> thenCombineAsync(CompletionStage<? extends U> other, BiFunction<? super T, ? super U, ? extends V> fn, Executor executor)
```

現在將 supplyAsync1 和 supplyAsync2 結果整合
```java
    ExecutorService threadPool = Executors.newFixedThreadPool(10);
    CompletableFuture<String> supplyAsync1 = CompletableFuture.supplyAsync(() -> "supplyAsync 1", threadPool);
    CompletableFuture<String> supplyAsync2 = CompletableFuture.supplyAsync(() -> "supplyAsync 2", threadPool);
    
    String ans = supplyAsync1.thenCombine(supplyAsync2, (result1, result2) -> result1 + ", " + result2).join();
    System.out.println("and: " + ans);
```

不需要返回值的 `thenAcceptBoth`
```java
    // basic
    CompletableFuture<Void> thenAcceptBoth(CompletionStage<? extends U> other, BiConsumer<? super T, ? super U> action)
    CompletableFuture<Void> thenAcceptBothAsync(CompletionStage<? extends U> other, BiConsumer<? super T, ? super U> action)
    CompletableFuture<Void> runAfterBoth(CompletionStage<?> other,  Runnable action)
    
    // use your own thread pool
    CompletableFuture<Void> thenAcceptBothAsync(CompletionStage<? extends U> other, BiConsumer<? super T, ? super U> action, Executor executor)
```

使用方式與 `thenCombine` 相同
```java
    CompletableFuture<String> supplyAsync1 = CompletableFuture.supplyAsync(() -> "supplyAsync 1", threadPool);
    CompletableFuture<String> supplyAsync2 = CompletableFuture.supplyAsync(() -> "supplyAsync 2", threadPool);
    
    supplyAsync1.thenAcceptBothAsync(supplyAsync2, (result1, result2) -> System.out.println(result1 + ", " + result2), threadPool).join();
```


---

前面提到的都是兩個獨立 CompletableFuture 的例子，若大於兩個的時候會使用 `allOf`
`allOf` 可以等待全部的 CompletableFuture 執行完成後執行 

```java
    CompletableFuture<Void> allOf(CompletableFuture<?>... cfs)
```
等待 supplyAsync1, supplyAsync2, supplyAsync3 執行結束後取得最終結果
```java
    ExecutorService threadPool = Executors.newFixedThreadPool(10);
    CompletableFuture<String> supplyAsync1 = CompletableFuture.supplyAsync(() -> "supplyAsync 1", threadPool);
    CompletableFuture<String> supplyAsync2 = CompletableFuture.supplyAsync(() -> "supplyAsync 2", threadPool);
    CompletableFuture<String> supplyAsync3 = CompletableFuture.supplyAsync(() -> "supplyAsync 3", threadPool);
    
    CompletableFuture.allOf(supplyAsync1, supplyAsync2, supplyAsync3).thenRun(() -> {
        try {
            StringBuffer ans = new StringBuffer();
            ans.append(supplyAsync1.get()).append(", ")
                .append(supplyAsync2.get()).append(", ")
                .append(supplyAsync3.get());
            System.out.println("ans: " + ans.toString());
        } catch (InterruptedException e) {
            e.printStackTrace();
        } catch (ExecutionException e) {
            e.printStackTrace();
        }
    }).join();
```
在 `allOf` 後面串接一個 `thenRun`
它的用法很簡單，使用方式與 `thenAccept` 一樣，差別在於不需要傳入上一個 CompletableFuture 的執行結果
```java
    // basic
    CompletableFuture<Void> thenRun(Runnable action)
    CompletableFuture<Void> thenRunAsync(Runnable action)
    
    // use your own thread pool
    CompletableFuture<Void> thenRunAsync(Runnable action, Executor executor)
```
---

上述提到的都是全部完成的例子，反過來說我只想要其中一個有完成就往下執行
CompletableFuture 也可以做到這點
```java
    // basic
    CompletableFuture<U> applyToEither(CompletionStage<? extends T> other, Function<? super T,U> fn)
    CompletableFuture<U> applyToEitherAsync(CompletionStage<? extends T> other, Function<? super T,U> fn)
    
    // use your own thread pool
    CompletableFuture<U> applyToEitherAsync(CompletionStage<? extends T> other, Function<? super T,U> fn, Executor executor)
```

沒有返回值的 `acceptEither`
```java
    // basic
    CompletableFuture<Void>  acceptEither(CompletionStage<? extends T> other, Consumer<? super T> action)
    CompletableFuture<Void>  acceptEitherAsync(CompletionStage<? extends T> other, Consumer<? super T> action)

    // use your own thread pool
    CompletableFuture<Void>  acceptEitherAsync(CompletionStage<? extends T> other, Consumer<? super T> action, Executor executor)
```

用於多個 CompletableFuture 的 `anyOf` ，在眾多 CompletableFuture 只需一個完成就可往下執行
```java
    CompletableFuture<Object> anyOf(CompletableFuture<?>... cfs)
```
