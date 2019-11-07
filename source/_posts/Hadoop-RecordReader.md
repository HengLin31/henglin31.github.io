---
title: Hadoop RecordReader
date: 2019-11-06 13:03:25
tags:
- hadoop
- big data
---

很多時候我們會自定義一些讀取資料的格式，而hadoop默認的RecordReader是LineRecordReader
會一行一行的讀取資料，key為偏移量，value為整行內容

現在嘗試客製化一個新的RecordReader，在此使用LineRecrodReader為基礎
並使用上一篇BuyPhoneJob的運算結果封裝成BuyPhoneBean，實現RecordReader後，可自定義資料格式傳給map

第一步建立BuyPhoneBean，一樣implements Writable，做序列化和反序列化
customerIds雖然為多個值組成，但在這裡當整個字串處理

| procuctName   | productPrice | customerIds         |
| ------------- | ------------ | ------------------- |
| iPhone 8 Plus | 449.97       | 001,026,022,015,007 |
| iPhone 7      | 207.0        | 004,029,024,018,010 |
| ...           | ...          | ...                 |

```java 
public class BuyPhoneBean implements Writable {
    private String productName;
    private double productPrice;
    private String customerIds;

    public BuyPhoneBean(){
        super();
    }

    @Override
    public void write(DataOutput out) throws IOException {
        out.writeUTF(this.productName);
        out.writeDouble(this.productPrice);
        out.writeUTF(this.customerIds);
    }

    @Override
    public void readFields(DataInput in) throws IOException {
        this.productName = in.readUTF();
        this.productPrice = in.readDouble();
        this.customerIds = in.readUTF();
    }
    
    ...

}

```

第二步自定義RecordReader，讀取依舊是使用LineRecordReader，只是將結果改為key是productName，而value是BuyPhoneBean
在繼承RecordReader後需要Override一些methods，運作方式會在之後做說明
這裡需要注意的是LineRecordReader使用完後在close method上進行關閉

```java 
public class BuyPhoneRecordReader extends RecordReader<Text, BuyPhoneBean> {
    private static Logger logger = LoggerFactory.getLogger(BuyPhoneRecordReader.class);

    private LineRecordReader lineRecordReader;

    private Text key = new Text();
    private BuyPhoneBean value = new BuyPhoneBean();

    private Text lineValue;

    @Override
    public void initialize(InputSplit split, TaskAttemptContext context) throws IOException {
        this.lineRecordReader = new LineRecordReader();
        this.lineRecordReader.initialize(split, context);
    }

    @Override
    public boolean nextKeyValue() throws IOException, InterruptedException {
        if(lineRecordReader.nextKeyValue()){
            lineValue = lineRecordReader.getCurrentValue();
            byte[] line = lineValue.getBytes();
            int lineLen = lineValue.getLength();
            String data = new String(line, 0, lineLen);
            setKeyValue(this.key, this.value, data.split(REGEX_COLS_SPLIT_SYMBOL));
        }else{
            return false;
        }
        return true;
    }

    private void setKeyValue(Text key, BuyPhoneBean value, String[] cols){
        if(cols.length < 3){
            logger.warn("this cols[] length < 3");
            return;
        }
        String productName = cols[0];
        double productPrice = Double.parseDouble(cols[1]);
        String customerIds = cols[2];

        key.set(new Text(productName));

        value.setProductName(productName);
        value.setProductPrice(productPrice);
        value.setCustomerIds(customerIds);
    }

    @Override
    public Text getCurrentKey() throws IOException, InterruptedException {
        return this.key;
    }

    @Override
    public BuyPhoneBean getCurrentValue() throws IOException, InterruptedException {
        return this.value;
    }

    @Override
    public float getProgress() throws IOException, InterruptedException {
        return this.lineRecordReader.getProgress();
    }

    @Override
    public void close() throws IOException {
        this.lineRecordReader.close();
    }
}

```

運作方式可看hadoop Mapper的source code (org.apache.hadoop.mapreduce.Mapper)
這裡擷取裡面136~151行的code，這裡可以看到 while(context.netKeyValue) 就是執行RecordReader的nextKeyValue method
而 map(context.getCurrentKey(), context.getCurrentValue(), context) 就是執行RecordReader的getCurrentKey()和getCurrentValue() method
在每次執行context.nextKeyValue()時判斷是否有下筆資料，因為我是借用LineRecordReader讀資料，所以直接使用它的nextKeyValue
只是將資料重新封裝成key是productName，value是BuyPhoneBean

```java 
  /**
   * Expert users can override this method for more complete control over the
   * execution of the Mapper.
   * @param context
   * @throws IOException
   */
  public void run(Context context) throws IOException, InterruptedException {
    setup(context);
    try {
      while (context.nextKeyValue()) {
        map(context.getCurrentKey(), context.getCurrentValue(), context);
      }
    } finally {
      cleanup(context);
    }
  }

```

第三步將客製化的RecordReader覆寫到InputFormat，才可以讓hadoop使用自己做的RecordReader

```java 
public class BuyPhoneInputFormat extends FileInputFormat<Text, BuyPhoneBean> {
    @Override
    public RecordReader<Text, BuyPhoneBean> createRecordReader(InputSplit split, TaskAttemptContext context) throws IOException, InterruptedException {
        BuyPhoneRecordReader recordReader = new BuyPhoneRecordReader();
        recordReader.initialize(split, context);
        return recordReader;
    }
}

```

執行job前需要指定setInputFormatClass為我們上一步建立的BuyPhoneInputFormat

```java 
public static void main(String[] args) throws IOException, ClassNotFoundException, InterruptedException {
    Configuration conf = new Configuration();
    String[] otherArgs = new GenericOptionsParser(conf, args).getRemainingArgs();

    if(otherArgs.length < 2){
        System.err.println("Usage: " + JOB_NAME + " <in> <out>");
        System.exit(2);
    }

    Job job = new HadoopJob(conf, JOB_NAME)
            .mapReduce(TestRecordReaderJob.class, SequenceMapper.class, SequenceReducer.class)
            .mapKeyValue(Text.class, BuyPhoneBean.class)
            .reducerKeyValue(Text.class, BuyPhoneBean.class)
            .getJob();

    job.setInputFormatClass(BuyPhoneInputFormat.class);
    job.setOutputFormatClass(SequenceFileOutputFormat.class);

    FileInputFormat.setInputPaths(job, new Path(otherArgs[0]));
    FileOutputFormat.setOutputPath(job, new Path(otherArgs[1]));

    System.exit(job.waitForCompletion(true) ? 0 : 1);
}
```

這裡mapper與reducer沒做特別處理，只是單純的輸出，主要還是測試自己寫的RecordReader
<img src="/images/hadoop-recordreader-001.png" width="300px" height="15%" alt="img1"/>
