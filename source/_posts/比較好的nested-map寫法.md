---
title: 比較好的nested map寫法
date: 2018-03-03 23:02:41
tags:
- java
- clean code
---

最近在幫離職同事修正Android的bug時，看到了一段複雜if else的code
仔細的看了一下，才知道是使用一個三層的nested map結構來幫資料做group

輸入資料為n*m的matrix
```java
String[][] dataMatrix = {{"level 1", "level 2", "level 3", "data 1"},
                         {"level 1", "level 2", "level 3", "data 2"}};
```

但是原始的code寫的滿複雜的，為了方便說明就簡化一下，寫成程式碼 1

```java 程式碼 1:
    //Map<level 1, Map<level 2, Map<level 3, List<data>>>>
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
<!-- more -->

程式碼 1 的寫法用了三層的巢狀，也包含許多重複的判斷邏輯，不但不容易閱讀，也不利於後續的維護和修改...
看到這段程式碼時，當下真的有種想幫他重構的衝動
但想一想此段code沒有bug，只是醜了點，若重構既花時間也沒有實質效益
最終只在程式碼 1 的上方增加註解，寫了個比較好的作法，就是下方的程式碼 2

```java 程式碼 2:
    //Map<level 1, Map<level 2, Map<level 3, List<data>>>>
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
因為第7~9行就可以將level 1為null的可以性完全排除，在第7行後level 1就不可能是null
以此類推第10行和第13行都可以自動幫level 2和level 3做初始化，所以後面只需專注於放資料即可
不管之後增加幾層map都不需要寫成複雜的巢狀判斷式

隔天想了一下，如果沒有什麼特殊需求，其實只需要將三層的key組合成一個唯一的字串即可...
就如同下方的程式碼 3

```java 程式碼 3:
    //Map<level 1 + level 2 + level 3, List<data>>
    Map<String, List<String>> map = new HashMap<>();
    
    String level1 = "level 1";
    String level2 = "level 2";
    String level3 = "level 3";
    
    String combinKey = level1 + level2 + level3;
    
    if(!map.put(combinKey)) {
        map,put(combinKey, new LinkedList<>());
    }

    map.get(combinKey).add("data 1");
    map.get(combinKey).add("data 2");
    
    System.out.println(map.get(combinKey).get(0));
    System.out.println(map.get(combinKey).get(1));
```


若是能夠使用 java 8 的 stream 的話就更簡單了，如同下方的程式碼 4

```java 程式碼 4:
Map<String, List<String>> map = Arrays.stream(dataMatrix).collect(
                Collectors.toMap(
                    kv -> kv[0] + kv[1] + kv[2],
                    kv -> Lists.newArrayList(kv[3]),
                    (newVal, oldVal) -> {
                        newVal.addAll(oldVal);
                        return newVal;
                    }
                )
            );
```

結論： 
我一直認為寫出簡潔易讀且好維護的程式碼是身為一個軟體開發者該有的素養
不是只求程式會跑就好，這樣只會累積一些不必要的技術債...
所以我覺得每個開發者，都應該買本“clean code 無瑕的程式碼 + 番外篇”來讀一讀
時時提醒自己不要埋地雷給別人踩，顯現自己的專業

此時想起我放在辦公室的clean code一書被同事們借來借去，現在也不知道流浪到哪位同事的辦公桌上...
