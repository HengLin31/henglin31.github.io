---
title: Hadoop Writable
date: 2019-11-03 12:10:44
tags:
- hadoop
- big data
---

近幾天花了一些時間研究一下Hadoop，幾年前在使用HBase時有稍微玩一下
但沒有深入去瞭解，目前正在學習使用docker，看到docker hub上有人已經包好hadoop cluster
就建個cluster來測試一下

啟動hadoop cluster成功
<img src="/images/hadoop-writable-001.png" width="50%" height="50%" alt="img1"/>

<img src="/images/hadoop-writable-002.png" width="50%" height="50%" alt="img2"/>

<img src="/images/hadoop-writable-003.png" width="50%" height="50%" alt="img3"/>

這次主題為客製化Writable，將資料包裝為Serializable Object後傳輸
為了傳輸效能Hadoop有自己的序列化，而不直接使用Java自帶的序列化
同樣是序列化，但是Java序列化產生出的byte stream包了較多的物件資訊(重量)
Hadoop的序列化自帶的序列化資訊比較簡潔(輕量)

要使用Hadoop的序列化必須implements Writable
它會要求Override write和readFields作為序列化與反序列化資料轉化為byte stream

此次使用場景為統計各個產品被哪些顧客購買
資料分為三種：
顧客資料(customer.txt)

| customerId | productId |
| ---------- | --------- |
| 001        | 01        |
| 002        | 04        |
| ...        | ...       |


產品資料(product.txt)

| productId  | productName   |
| ---------- | ------------- |
| 01         | iPhone 8 Plus |
| 02         | iPhone 7      |
| ...        | ...           |

產品價格(price.txt)

| productId  | productPrice  |
| ---------- | ------------- |
| 01         | 449.97s       |
| 02         | 207.00        |
| ...        | ...           |

先建立一個CustomerBean將來資料從map傳給reducer時可用
這裡要注意write和readFields在做序列化和反序列化時“順序”需要保持順序一致
才不會解析錯誤

```java 
public class CustomerBean implements Writable {
    protected static final String CUSTOMER = "customer.txt";
    protected static final String PRODUCT = "product.txt";
    protected static final String PRICE = "price.txt";
    
    private String dataType;
    
    private String customerId;
    private String productId;
    private String productName;
    private double productPrice;
    
    public CustomerBean() {
        super();
    }

    @Override
    public void write(DataOutput out) throws IOException {
        out.writeUTF(this.dataType);
        out.writeUTF(this.customerId);
        out.writeUTF(this.productName);
        out.writeDouble(this.productPrice);
    }
    
    @Override
    public void readFields(DataInput in) throws IOException {
        this.dataType = in.readUTF();
        this.customerId = in.readUTF();
        this.productName = in.readUTF();
        this.productPrice = in.readDouble();
    }
    
    ...

}

```


接下來建立一個BuyPhoneMapper將資料封裝到CustomerBean後傳給reducer處理
因為資料源有三種，所以第一步需要在setup時預先判別資料源類型，這裡使用檔名做為區別
第二步根據資料類型封裝資料到CustomerBean此時也需要紀錄資料源類型，方便在reducer時判別
第三步將資料寫入context，分組key為productId(三種資料源共通使用)，value為CustomerBean

```java 
public class BuyPhoneMapper extends Mapper<LongWritable, Text, Text, CustomerBean> {
    private static Logger logger = LoggerFactory.getLogger(BuyPhoneMapper.class);
    
    private String dataType;
    private CustomerBean customerBean = new CustomerBean();
    private Text outputKey = new Text();
    
    @Override
    protected void setup(Context context) throws IOException, InterruptedException {
        FileSplit inputSplit = (FileSplit) context.getInputSplit();
        this.dataType = inputSplit.getPath().getName();
    }
    
    @Override
    protected void map(LongWritable key, Text value, Context context) throws IOException, InterruptedException {
        String record = value.toString();
        String[] cols = record.split(Constant.REGEX_COLS_SPLIT_SYMBOL);
        this.customerBean.setDataType(this.dataType);
        switch(this.dataType){
            case CUSTOMER:
                setCustomer(cols, this.outputKey, this.customerBean);
                break;
            case PRODUCT:
                setProduct(cols, this.outputKey, this.customerBean);
                break;
            case PRICE:
                setPrice(cols, this.outputKey, this.customerBean);
                break;
            default:
                logger.warn("It can't find this data type: {}", this.dataType);
                return;
        }
        context.write(this.outputKey, this.customerBean);
    }
    
    // record: customerId, productId
    private void setCustomer(String[] cols, Text key, CustomerBean customerBean){
        String customerId = cols[0];
        String productId = cols[1];
        customerBean.setCustomerId(customerId);
        customerBean.setProductId(productId);
        customerBean.setProductName(ENPTY_STRING);
        customerBean.setProductPrice(0d);
        key.set(productId);
    }
    
    // record: productId, productName
    private void setProduct(String[] cols, Text key, CustomerBean customerBean){
        String productId = cols[0];
        String productName = cols[1];
        customerBean.setCustomerId(ENPTY_STRING);
        customerBean.setProductId(productId);
        customerBean.setProductName(productName);
        customerBean.setProductPrice(0d);
        key.set(productId);
    }
    
    // record: productId, productPrice
    private void setPrice(String[] cols, Text key, CustomerBean customerBean){
        String productId = cols[0];
        double productPrice = Double.parseDouble(cols[1]);
        customerBean.setCustomerId(ENPTY_STRING);
        customerBean.setProductId(productId);
        customerBean.setProductName(ENPTY_STRING);
        customerBean.setProductPrice(productPrice);
        key.set(productId);
    }
}

```


BuyPhoneReducer統計手機產品被哪些顧客購買
第一步根據資料源類型取得顧客資料(customer)產品名稱(productName)和產品價格(productPrice)
第二步統計顧客使用的產品
第三步依據產品名稱(productId)與產品價格(productPrice)分群(key)，統計買該產品的顧客們(customerIds)輸出為value

```java 
public class BuyPhoneReducer extends Reducer<Text, CustomerBean, Text, Text> {
    private static Logger logger = LoggerFactory.getLogger(BuyPhoneReducer.class);
    
    private Text outputKey = new Text();
    private Text outputValue = new Text();
    
    @Override
    protected void reduce(Text key, Iterable<CustomerBean> values, Context context) throws IOException, InterruptedException {
        List<CustomerBean> customers = new ArrayList<>();
        String productName = ENPTY_STRING;
        double productPrice = 0d;
        for(CustomerBean customerBean:values){
            switch(customerBean.getDataType()){
                case CUSTOMER:
                    addCustomer(customers, customerBean);
                    break;
                case PRODUCT:
                    productName = customerBean.getProductName();
                    break;  
                case PRICE:
                    productPrice = customerBean.getProductPrice();
                    break;
                default:
                    logger.warn("It can't find this data type: {}", customerBean.getDataType());
                    return;
            }
        }
        writeResult(context, customers, productName, productPrice);
    }
    
    private void addCustomer(List<CustomerBean> customers, CustomerBean customer){
        CustomerBean temp = new CustomerBean();
        try {
            BeanUtils.copyProperties(temp, customer);
        } catch (IllegalAccessException | InvocationTargetException e) {
            e.printStackTrace();
        }
        customers.add(temp);
    }
    
    private void writeResult(Context context, List<CustomerBean> customers, String productName, double productPrice) throws IOException, InterruptedException {
        if(customers.isEmpty()){
            return;
        }
        List<String> customerIds = new ArrayList<>();
        for(CustomerBean customer:customers){
            customer.setProductName(productName);
            customer.setProductPrice(productPrice);
            customerIds.add(customer.getCustomerId());
        }
        this.outputKey.set(productName + REGEX_COLS_SPLIT_SYMBOL + productPrice);
        this.outputValue.set(Joiner.on(REGEX_DATA_JOIN_SPLIT_SYMBOL).join(customerIds));
        context.write(this.outputKey, this.outputValue);
    }
}

```

到最後一個步驟了，包裝成hadoop任務(job)，yarn可以根據此設定進行執行
當job送出時會也會包含Configuration的xml設定一起送出
這裡我將Job多包裝一層，比較方便閱讀和使用

```java 
public static void main(String[] args) throws IOException, ClassNotFoundException, InterruptedException {
    Configuration conf = new Configuration();
    String[] otherArgs = new GenericOptionsParser(conf, args).getRemainingArgs();
    
    if(otherArgs.length < 2){
        System.err.println("Usage: " + JOB_NAME + " <in> <out>");
        System.exit(2);
    }
    
    Job job = new HadoopJob(conf, JOB_NAME)
            .mapReduce(BuyPhoneJob.class, BuyPhoneMapper.class, BuyPhoneReducer.class)
            .mapKeyValue(Text.class, CustomerBean.class)
            .reducerKeyValue(Text.class, Text.class)
            .getJob();
    
    FileInputFormat.setInputPaths(job, new Path(otherArgs[0]));
    FileOutputFormat.setOutputPath(job, new Path(otherArgs[1]));
    
    System.exit(job.waitForCompletion(true) ? 0 : 1);
}
```
<img src="/images/hadoop-writable-004.png" width="300px" height="15%" alt="img4"/>


將產品資料寫入到hdfs
<img src="/images/hadoop-writable-005.png" width="50%" height="50%" alt="img5"/>

<img src="/images/hadoop-writable-006.png" width="50%" height="50%" alt="img6"/>

執行job

<img src="/images/hadoop-writable-007.png" width="50%" height="50%" alt="img7"/>

執行完成

<img src="/images/hadoop-writable-008.png" width="50%" height="50%" alt="img8"/>

查看結果

<img src="/images/hadoop-writable-009.png" width="50%" height="50%" alt="img9"/>
