---
title: Java Unit Test 使用 Mockito + Powermock (3)
date: 2020-08-29 14:37:28
tags:
- unit test
---
離上一篇文已經間隔兩個月，今天終於有些動力來補充 Unit Test
今天要聊的是 ArgumentCaptor

在許多的情況下，我們只 assert 最終的結果 (Output)
但在整個測試的過程中有參數經過不同 method 傳遞，一不小心或粗心可能在某一層變更到數值
導致錯誤的輸入 (Input) 往下傳遞，而這個錯誤有可能不會影響最終的結果
就像一顆未爆彈潛伏在程式內，很難在短時間內發現...但未來可能在某個版本上爆發

所以我們要避免掉這個問題，會在比較重要的節點上
先驗證此時傳入到 method 的參數與我們預期的相符合

ArgumentCaptor 可以幫助我們取得執行過程中所傳遞的參數
它的用法很簡單，只需要定義與輸入參數相同類型
之後在 `verify(...).callMethod(captor.capture())` 的時候，放入目標 method 中
就可以取得當下傳入的參數值，接下來就可以針對輸入內容進行 assert 

```java
ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);

...

Mockito.verify(...).callMethod(captor.capture());
Argument actual = captor.getValue();
assertThat(expected, actual)
```
---
在此使用之前做的 WebController 進行修改
先在 WebDao 增加 `updateData` 的 method 傳入 Data

```java
public class WebDao {
    
    ...
    
    public Optional<Data> updateData(Data data) throws DatabaseException {
        throw new DatabaseException();
    }
}
```
之後我們就可以在測試期間，使用 ArgumentCaptor 來取得當時傳入的資料

---
WebController 也要增加一個 `update()` 讓我們進行更新資料的操作

```java
public class WebController {

    ...
    
    public String update(HttpServletRequest request){
        int id = Integer.parseInt(request.getParameter("id"));
        String col1 = request.getParameter("col1");
        String col2 = request.getParameter("col2");
        Optional<Data> data;
        try {
            data = webDao.updateData(new Data(id, col1, col2));
        } catch (DatabaseException e) {
            return e.getMessage();
        }
        return GSON.toJson(data.get());
    }
}
```
---
最後在 WebControllerTest 新增一個測試，用於測試資料的更新結果
```java
public class WebControllerTest {
    @Test
    public void Should_GetChangeData_When_UpdateDataValue() throws DatabaseException {
        final int ID = 1;
        final String ORI_COL1 = "col1";
        final String ORI_COL2 = "col2";
        
        final String NEW_COL1 = "new col1";
        final String NEW_COL2 = "new col2";
        
        // given
        Optional<Data> newData = Optional.of(new Data(ID, NEW_COL1, NEW_COL2));
        ArgumentCaptor<Data> dataCaptor = ArgumentCaptor.forClass(Data.class);
        
        when(this.request.getParameter("id")).thenReturn(String.valueOf(ID));
        when(this.request.getParameter("col1")).thenReturn(ORI_COL1);
        when(this.request.getParameter("col2")).thenReturn(ORI_COL2);
        when(this.webDao.updateData(any())).thenReturn(newData);
        
        // when
        String response = this.webController.update(this.request);
        
        // then
        try{
            Data result = this.GSON.fromJson(response, Data.class);
            
            verify(this.webDao, times(1)).updateData(dataCaptor.capture());
            
            Data inputData = dataCaptor.getValue();
            assertThat(ID, is(inputData.getId()));
            assertThat(ORI_COL1, is(inputData.getCol1()));
            assertThat(ORI_COL2, is(inputData.getCol2()));
            
            assertThat(result.getId(), is(ID));
            assertThat(result.getCol1(), is(NEW_COL1));
            assertThat(result.getCol2(), is(NEW_COL2));
        } catch (JsonSyntaxException e){
            fail("parser response data fail.");
        }
    }
}
```
第 13 行，我們定義了 ArgumentCaptor 用來裝 Data 類型的資料
第 27 行， verify updateData 的時候，使用 `dataCaptor.capture()` 取得輸入的 Data
第 29~32 行，驗證輸入的參數與我們預期的相同

---
後話

隨著時間推移，程式開發到一個階段，程式碼也逐漸積累量到一定的規模
有時候修改一個小地方，可能會導致其他地方也受到影響
此時如果沒有強健的測試預防開發者手殘，等到 release 後...
真的不敢想像... 

最近工作上常常有機會寫到許多測試
瞭解到測試的重要性，這也是我這幾個月寫測試的感悟...
