---
title: 比較好的nested map寫法
date: 2018-03-03 23:02:41
tags:
- java
- clean code
---

在幫離職同事修正Android的bug時，看到了一段令人匪夷所思的code
仔細的看了一下，才知道是使用一個三層的nested map來幫資料做group

資料為n*m的matrix
```javascript
[["level 1", "level 2", "level 3", "data 1"]
["level 1", "level 2", "level 3", "data 2"]]
```

因為原始的code寫的滿複雜的，為了方便說明就簡化一下，就寫成程式碼 1

程式碼 1:
```java
    //Map<level1, Map<level2, Map<level3, List<data>>>>
    Map<String, Map<String, Map<String, List<String>>>> map = new HashMap<>();
    String level1 = "level 1";
    String level2 = "level 2";
    String level3 = "level 3";
    
    if(map.containsKey(level1)){
        if(map.get(level1).containsKey(level2)){
            if(map.get(level1).get(level2).containsKey(level3)){
                map.get(level1).get(level2).get(level3).add("data 1");
                map.get(level1).get(level2).get(level3).add("data 2");
            }else{
                map.get(level1).get(level2).put(level3, new LinkedList<>());
                map.get(level1).get(level2).get(level3).add("data 1");
                map.get(level1).get(level2).get(level3).add("data 2");
            }
        }else{
            map.get(level1).put(level2, new HashMap<>());
            if(map.get(level1).get(level2).containsKey(level3)){
                map.get(level1).get(level2).get(level3).add("data 1");
                map.get(level1).get(level2).get(level3).add("data 2");
            }else{
                map.get(level1).get(level2).put(level3, new LinkedList<>());
                map.get(level1).get(level2).get(level3).add("data 1");
                map.get(level1).get(level2).get(level3).add("data 2");
            }
        }
    }else{
        map.put(level1, new HashMap<>());
        if(map.get(level1).containsKey(level2)){
            if(map.get(level1).get(level2).containsKey(level3)){
                map.get(level1).get(level2).get(level3).add("data 1");
                map.get(level1).get(level2).get(level3).add("data 2");
            }else{
                map.get(level1).get(level2).put(level3, new LinkedList<>());
                map.get(level1).get(level2).get(level3).add("data 1");
                map.get(level1).get(level2).get(level3).add("data 2");
            }
        }else{
            map.get(level1).put(level2, new HashMap<>());
            if(map.get(level1).get(level2).containsKey(level3)){
                map.get(level1).get(level2).get(level3).add("data 1");
                map.get(level1).get(level2).get(level3).add("data 2");
            }else{
                map.get(level1).get(level2).put(level3, new LinkedList<>());
                map.get(level1).get(level2).get(level3).add("data 1");
                map.get(level1).get(level2).get(level3).add("data 2");
            }
        }
    }

    System.out.println(map.get(level1).get(level2).get(level3).get(0));
    System.out.println(map.get(level1).get(level2).get(level3).get(1));
```

程式碼 1 的寫法用了三層的巢狀，也包含許多重複的判斷邏輯，不但不容易閱讀，也不利於後續的維護和修改...
看到這段程式碼時，當下真的有種想幫他重構的衝動
但想一想此段code沒有bug，只是醜了點，若重構既花時間也沒有實質效益
最終只程式碼 1 的上方增加註解，寫了個比較好的寫法，就是下方的程式碼 2

程式碼 2:
```java
    Map<String, Map<String, Map<String, List<String>>>> map = new HashMap<>();
    String level1 = "level 1";
    String level2 = "level 2";
    String level3 = "level 3";

    if(!map.containsKey(level1)) {
        map.put(level1, new HashMap<>());
    }
    if(!map.get(level1).containsKey(level2)) {
        map.get(level1).put(level2, new HashMap<>());
    }
    if(!map.get(level1).get(level2).containsKey(level3)) {
        map.get(level1).get(level2).put(level3, new LinkedList<>());
    }

    map.get(level1).get(level2).get(level3).add("data 1");
    map.get(level1).get(level2).get(level3).add("data 2");
    
    System.out.println(map.get(level1).get(level2).get(level3).get(0));
    System.out.println(map.get(level1).get(level2).get(level3).get(1));
```

程式碼 2 的寫法可以輕鬆地在執行過程中自動做初始化
因為第6行就可以將level 1為null的可以性完全排除，在第7行後level 1就不可能是null
以此類推第9行和第12行都可以自動幫level 2和level 3做初始化，所以後面只需專注於放資料即可
不管之後增加幾層map都不需要寫成複雜的巢狀樣式
