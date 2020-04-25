---
title: Java Unit Test 使用 Mockito + Powermock (1)
date: 2020-04-25 13:24:29
tags:
- unit test
---

目前開發的產品很重視 Unit Test ，需要根據使用情境和 source code 本身寫測試
且 Unit Test coverage 都可達到 95% ~ 100%

在寫一段時間的測試後，也有了紀錄一下測試心得的想法
當然測試的方式和組合也百百種，不可能一下子就講齊
這裡會使用簡單的測試案例來說明怎麼寫測試

第一個測試案例是 web controller
因為網路的興起，大部分寫 Java 都會使用 spring 搭配 MVC 架構來進行開發
對於測試來說，最麻煩的就是需要與資料庫或底層資料互動
依據資料庫回傳的結果進行不同的行為或流程
幸運的是，資料庫通常都會將其抽為 dao 層
在進行測試時，我們只需要針對 dao 的 input 和 output 進行 mock 做不同行為綁定

由於 mock 可以設定特定的行為，設定當 dao 輸入哪些參數時， dao 要回傳什麼資料
讓整個過程中不會使用到 dao 真實行為，而是使用 mock 設計好的行為
這樣可以隨意操控 dao ，讓它回傳或者拋出測試時所需的資料或異常
進而達成我們針對 web controller 不同情境下測試的目的

建立一個 web dao 來使用 id 取得資料，因為沒有真正實作細節，所以直接拋出自定義的 database exception
```java
public class WebDao {

    public Optional<Data> findDataById(int id) throws DatabaseException {
        throw new DatabaseException();
    }
}

```
exception 預設訊息為無法連線資料庫
```java
public class DatabaseException extends Exception {
    private static final String UNABLE_CONN_DB_EXCEPTION = "Unable to connect to database.";
    
    public DatabaseException() {
        super(UNABLE_CONN_DB_EXCEPTION);
    }
}
```
data bean 格式
```java
public class Data {
    private int id;
    private String col1;
    private String col2;
    ...
}

```
---
web controller 中定義 web dao ，因為沒有要真的使用 web dao
所以沒有引入 spring 針對 web dao 綁定 @autowired 做注入

當前只有一個 `read(...)` 根據 request 傳入 data id 後透過 dao 取得結果
```java
public class WebController {
    private final Gson GSON = new Gson();
    private WebDao webDao;
    
    public String read(HttpServletRequest request){
        int id = Integer.parseInt(request.getParameter("id"));
        Optional<Data> data;
        try {
            data = webDao.findDataById(id);
        } catch (DatabaseException e) {
            return e.getMessage();
        }
        if(data.isEmpty()){
            return "not find data by id: " + id;
        }
        return GSON.toJson(data.get());
    }
}
```
簡單分析這個 `read(...)` 可以知道執行過程中可能有 3 種情況發生
1. 正常從 dao 取得 data 後回傳結果 ( 執行到 16 行 )
2. 從 dao 取到的 data 結果為空，回傳錯誤訊息 ( 執行到 14 行 )
3. 資料庫拋出異常，回傳錯誤訊息 ( 執行到 11 行 )

而我們需要針對這 3 種不同的情境進行測試，確保每個情境最終結果與我們預測的一樣

---
開始寫測試
Mockito 有幾種掛載方式，如果只是簡單的測試，我個人是習慣直接使用 ＠RunWith 設定 runner
這裡需要注意的是 `setup()` 這裡指定要 mock 的對象主要有兩個， `request` 和 `webDao`
`request` 模擬 `read(...)` 的入參，因為我們不希望真的產生 `HttpServletRequest`
`webDao` 模擬實際的 dao ，因為我們不會實際對資料庫做連線
最後 instance `webController` 以便進行後續的測試操作

此時有一個問題， `webController` 要使用 `webDao` 需要將它注入到 `webController`
但是我們並沒有對外開放 set method 用於注入 `webDao`

這種情況在實際開發過程中常常會遇到，我們不可能為了測試方便特別修改 source code
此時需要一些特別的手段突破注入的次元壁，而 Powermock 可以透過侵入式的方式強行進行注入，進而解決我們的問題

這裡採用 Powermock 的 `Whitebox.setInternalState(Object object, Class<?> fieldType, Object value)`
第一個參數是注入目標對象，後面兩個參數是要注入的類型與其資料
```java
@RunWith(MockitoJUnitRunner.class)
public class WebControllerTest {
    private final Gson GSON = new Gson();

    private HttpServletRequest request;
    private WebDao webDao;
    private WebController webController;
    
    @Before
    public void setup() {
        this.request = mock(HttpServletRequest.class);
        this.webDao = mock(WebDao.class);
        
        this.webController = new WebController();
        // use powermock to mock private field
        Whitebox.setInternalState(this.webController, WebDao.class, this.webDao);
    }
    ...
}
```
關於 Powermock 的使用會在之後的文章慢慢補齊，此案例只用到 `Whitebox`
現階段主要還是會以情境搭需求使用，需要用到 Powermock 時才會說明

---

第一個測試案例
正常取得資料的情況

測試名稱採用 Should_ExpectedBehavior_When_StateUnderTest 的命名方式
這是網路上建議測試時採用的命名規則之一，有興趣的可以 google 一下其他測試命名規則

這個命名規則的好處是測試名稱即情境，在多人合作下可以清楚知道同事主要是針對哪個情況去測試，不用深入去看 source code
```java
@Test
public void Should_ReturnData_When_GetDataById() throws DatabaseException {
    final int ID = 1;
    final String COL1 = "col1";
    final String COL2 = "col2";
    
    // given
    Optional<Data> data = Optional.of(new Data(ID, COL1, COL2));
    
    // when
    when(this.request.getParameter("id")).thenReturn("1");
    when(this.webDao.findDataById(anyInt())).thenReturn(data);
    
    String response = this.webController.read(this.request);
    
    // then
    try{
        Data result = this.GSON.fromJson(response, Data.class);
        
        verify(this.webDao, times(1)).findDataById(anyInt());
        assertThat(result.getId(), is(ID));
        assertThat(result.getCol1(), is(COL1));
        assertThat(result.getCol2(), is(COL2));
    } catch (JsonSyntaxException e){
        fail("parser response data fail.");
    }
}

```
第 11 行和 12 行，針對 `read(...)` 執行過程中會用到行為做設置
這裡設定當觸發 `request.getParameter("id")` 這個行為需要回傳字串"1"
當觸發 `webDao.findDataById(anyInt())` 這個行為時回傳第 8 行我們設置的假資料
這裡可能會有疑問是為什麼 id 回傳是設置字串"1"而不是 anyString()
這是因為我們在執行 `read(...)` 過程中會針對 id 轉為 integer ，避免傳入非整數的字串造成問題
而 `webDao.findDataById(anyInt())` 則沒這個問題，我們不在意傳入當 id 的 int 數值是什麼
最終都會傳回我們自己設置的假資料

第 20 行驗證 `webDao.findDataById(...)` 有被呼叫過一次，確保目標 method 有正常執行到
第 21 ~ 23 行，檢查回傳的資料結構與數值與我們預計的相符合
第 25 行可以針對資料結構異常時，告知我們測試失敗，否則當轉換失敗會無法執行到 20 ~ 23 行做資料驗證，導致測試案例成功的異常問題

---
第二個測試案例
測試資料庫拋出異常時，回傳對映的異常訊息與我們預計的是否相符合
```java
@Test
public void Should_Fail_When_UnableConnDatabase() throws DatabaseException {
    final String EXPECT_EXCEPTION_MSG = "Unable to connect to database.";
    
    // given
    DatabaseException exception = new DatabaseException();
    
    // when
    when(this.request.getParameter("id")).thenReturn("1");
    when(this.webDao.findDataById(anyInt())).thenThrow(exception);
    
    String response = this.webController.read(this.request);
    
    // then
    verify(this.webDao, times(1)).findDataById(anyInt());
    assertThat(response, is(EXPECT_EXCEPTION_MSG));
}
```
第 10 行拋出我們第 6 行設置的異常
第 12 行 response 的資料會是異常訊息
第 16 行驗證錯誤訊息與我們預計的相符合

---
第三個測試案例
測試當使用 id 查詢沒有取得資料時，回傳對映的異常訊息與我們預計的是否相符合
```java
@Test
public void Should_Fail_When_NotFindData() throws DatabaseException {
    final String EXPECT_EXCEPTION_MSG = "not find data by id";
    
    // given
    Optional<Data> data = Optional.empty();
    
    // when
    when(this.request.getParameter("id")).thenReturn("1");
    when(this.webDao.findDataById(anyInt())).thenReturn(data);
    
    String response = this.webController.read(this.request);
    
    // then
    assertThat(response, anything(EXPECT_EXCEPTION_MSG));
}
```
第 10 行回傳資料提換為我們第 6 行設置的空資料
第 12 行 response 的資料會是找不到 data 的異常訊息
第 15 行驗證錯誤訊息與我們預計的相符合

---

執行結果
<img src="/images/java-unit-test-mockito-powermock-1-001.png" width="100%" height="100%" alt="img1"/>
3 個測試都通過，與預計的結果相符合

<img src="/images/java-unit-test-mockito-powermock-1-002.png" width="100%" height="100%" alt="img2"/>
web controller unit test coverage 100%

關於 Java Unit Test 的測試案例解說，暫時告一段落
有空再補齊其他測試案例

詳情可參考我的 github source code:
https://github.com/HengLin31/java-unit-test/blob/master/src/test/java/pers/henglin/test
