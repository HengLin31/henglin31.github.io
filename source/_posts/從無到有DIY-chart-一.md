---
title: 從無到有DIY chart (一)
date: 2018-04-01 21:32:41
tags:
- js
---

目前工作中的前端開發因規範只能使用jQuery，要使用比較新的js語法只能透過underscore.js來實現
但最近看了許多關於es6的資料，想要來練習一下
若單純練習語法就太無聊了，所以決定使用es6的語法來DIY一個chart

首先使用`class`定義Chart的Object
在使用es6之前，只能透過擴展prototype達成method共用

```js
    var Chart = function(){
        this._canvas;
    )
    
    Chart.prototype = {
        _init: function(){
            this._canvas = document.getElementById(this._id);
        }
    }


```

現在有了`class`就不需要再分開寫了，看起來直覺多了

```js
    class Chart{
        constructor(params){
            this._canvas;
        }
        
        _init(){
            this._canvas = document.getElementById(this._id);
        }
    }
```
<!-- more -->

首先初始化canvas，canvas可以想像成是一個畫布，我們必須設定畫布的大小和透過`getContext('2d')`取得渲染環境

```js
    constructor(params){
        this._id = params.id;
        this._canvas;
        this._canvasWidth;
        this._canvasHeight;
        this._ctx;

        this._init();
    }

    _init(){
        this._canvas = document.getElementById(this._id);
        if(!this._canvas.getContext){
            throw "can't get canvas context!";
        }
        this._canvasWidth = this._canvas.width;
        this._canvasHeight = this._canvas.height;
        this._ctx = this._canvas.getContext('2d');
    }


```
接著將chart的資料設置到canvas上，因為對於canvas而言原點是從左上角`(0,0)`的座標開始，所以使用原始資料直接打出點的話，會發現會上下相反，所以需要將y軸進行反轉

因為還沒有想到chart要使用哪種顏色，就先使用亂數產生吧...
```js
    _initDataSet(){
        for(const [index, point] of this._matrix.entries()){
            var reverseY = this._canvasHeight - point[1];
            this._dataSet.push({
                index: index,
                x: point[0],
                y: reverseY,
                color: this._randomColor()
            });
        }
    }

    _randomColor(){
        return '#' + (Math.random() * 0xFFFFFF << 0).toString(16);
    }

```

我們的chart需要有畫布的外框且資料兩點需要使用直線串連起來
```js
    constructor(params){
        this._LINE_TENSION = 0.2
        this._LINE_WIDTH_ORI = 2;
        this._LINE_WIDTH_FOCUS = 5;
        this._COLOR_GRAY = 'gray';
        this._COLOR_WHITE = 'white';
    }

    _initFrame(){
        this._drawRect({
            x: 0,
            y: 0,
            width: this._canvasWidth,
            height: this._canvasHeight,
            lineWidth: this._LINE_WIDTH_ORI,
            color: this._COLOR_GRAY
        });
    }

    _initLines(){
        let prePoint;
        for(const [index, point] of this._dataSet.entries()){
            if(index == 0){
                prePoint = point;
                continue;
            }
            this._drawLine(prePoint, point);
            prePoint = point;
        }
    }

    draw(){
        this._initFrame();
        this._initLines();
    }
```

執行一下看看效果
![chart](/images/chart-diy-001.png)


有了簡單的雛形後，接著可以慢慢慢慢進行優化，增加新功能

像現在我想凸顯每個資料點，將點放大，所以需要增加繪製圓形的function

```js
    _drawCircle(point){
        this._ctx.lineWidth = point.lineWidth;
        this._ctx.beginPath();
        this._ctx.arc(point.x, point.y, point.radius, 0, 2 * Math.PI);
        this._ctx.strokeStyle = point.color;
        this._ctx.fillStyle  = point.color;
        this._ctx.fill();
        this._ctx.stroke();
    }

    draw(){
        this._initFrame();
        this._initLines();
        this._initCircles();
    }

```
執行一下看看效果
![chart](/images/chart-diy-002.png)

市面上大部份cahrt都可以透過滑鼠去取得最近資料點，所以我們的chart也來要增加此功能

首先在canvas增加mousemove事件，用於取得目前滑鼠的座標，接著算出每個資料點與目前滑鼠之間的距離 (這次參考Flot Charts的做法)
```js
    _bindMouseEvent(){
        const _self = this;
        this._canvas.addEventListener("mousemove", (event) => {
            const rect = _self._canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            _self._findNearPointByMouse({x: x, y: y});
        });
    }

    _drawFocusPoint(point){
        this._drawCircle({x: point.x, y: point.y, radius: this._radius, lineWidth: this._LINE_WIDTH_FOCUS, color: point.color});
    }
    
    _findNearPointByMouse(mousePos){
        let minDistancePoint;
        let minDistance = Number.MAX_VALUE;
        for(var index=0, size= this._dataSet.length; index<size; index++){
            const currentPos = this._dataSet[index];
            const distanceBetweenTwoPoints = this._distance(currentPos, mousePos);
            
            if(minDistance > distanceBetweenTwoPoints){
                minDistancePoint = currentPos;
                minDistance = Math.min(minDistance, distanceBetweenTwoPoints);
            }
        }
        if(!this._preFocusPoint){
            this._drawFocusPoint(minDistancePoint);
            this._preFocusPoint = minDistancePoint;
            return;
        }
        /*
        if pre point isn't self, it's need to render
        */
        if(this._preFocusPoint.index !== minDistancePoint.index){
            this.render();
            this._drawFocusPoint(minDistancePoint);
        }
        this._preFocusPoint = minDistancePoint;
    }
    
    _distance(point1, point2){
        return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
    }
```
執行一下看一下效果 (這裡為了顯示實際效果， 所以就直接執行js而不是使用貼圖，瀏覽器必須支援es6才能看見，畢竟沒有透過babel進行轉換)
{% raw %}
<html>
    <head>

    </head>
    <body>
        <div align="center">
            <h2>Chart</h2>
            <div>
                <canvas id="chart" width="300" height="150"></canvas>
            </div>
        </div>
    </body>
</html>
<script language="javascript">
    class Chart{
        constructor(params){
            this._LINE_TENSION = 0.2
            this._LINE_WIDTH_ORI = 2;
            this._LINE_WIDTH_FOCUS = 5;
            this._COLOR_GRAY = 'gray';
            this._COLOR_WHITE = 'white';
            
            this._id = params.id;
            this._matrix = params.matrix;
            this._radius = params.radius;
            this._dataSet = [];
            this._curveDataSet = [];

            this._canvas;
            this._canvasWidth;
            this._canvasHeight;
            this._ctx;
            this._preFocusPoint;
            
            this._init();
        }

        _init(){
            this._canvas = document.getElementById(this._id);
            if(!this._canvas.getContext){
                throw "can't get canvas context!";
            }
            this._canvasWidth = this._canvas.width;
            this._canvasHeight = this._canvas.height;
            this._ctx = this._canvas.getContext('2d');
            
            this._initDataSet();
            this._bindMouseEvent();
            this.draw();
        }
        
        _initDataSet(){
            for(const [index, point] of this._matrix.entries()){
                var reverseY = this._canvasHeight - point[1];
                this._dataSet.push({
                    index: index,
                    x: point[0],
                    y: reverseY,
                    color: this._randomColor()
                });
            }
        }
        
        _initFrame(){
            this._drawRect({
                x: 0,
                y: 0,
                width: this._canvasWidth,
                height: this._canvasHeight,
                lineWidth: this._LINE_WIDTH_ORI,
                color: this._COLOR_GRAY
            });
        }
        
        _initLines(){
            let prePoint;
            for(const [index, point] of this._dataSet.entries()){
                if(index == 0){
                    prePoint = point;
                    continue;
                }
                this._drawLine(prePoint, point);
                prePoint = point;
            }
        }
        
        _initCircles(){
            const _self = this;
            this._dataSet.forEach((point) => {
                _self._drawCircle({
                    x: point.x, 
                    y: point.y, 
                    radius: _self._radius, 
                    lineWidth: _self._LINE_WIDTH_ORI,
                    color: point.color
                });
            });
        }
        
        _bindMouseEvent(){
            const _self = this;
            this._canvas.addEventListener("mousemove", (event) => {
                const rect = _self._canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                _self._findNearPointByMouse({x: x, y: y});
            });
        }
        
        _randomColor(){
            return '#' + (Math.random() * 0xFFFFFF << 0).toString(16);
        }
        
        _drawRect(params){
            this._ctx.lineWidth = params.lineWidth;
            this._ctx.strokeStyle = params.color;
            this._ctx.beginPath();
            this._ctx.rect(params.x, params.y, params.width, params.height);
            this._ctx.stroke();
        }
        
        _drawLine(point1, point2){
            this._ctx.lineWidth = point2.lineWidth;
            this._ctx.strokeStyle = point2.color;
            this._ctx.beginPath();
            this._ctx.moveTo(point1.x, point1.y);
            this._ctx.lineTo(point2.x, point2.y);
            this._ctx.stroke();
        }
        
        _drawCircle(point){
            this._ctx.lineWidth = point.lineWidth;
            this._ctx.beginPath();
            this._ctx.arc(point.x, point.y, point.radius, 0, 2 * Math.PI);
            this._ctx.strokeStyle = point.color;
            this._ctx.fillStyle  = point.color;
            this._ctx.fill();
            this._ctx.stroke();
        }
        
        _drawFocusPoint(point){
            this._drawCircle({x: point.x, y: point.y, radius: this._radius, lineWidth: this._LINE_WIDTH_FOCUS, color: point.color});
        }
        
        _findNearPointByMouse(mousePos){
            let minDistancePoint;
            let minDistance = Number.MAX_VALUE;
            for(var index=0, size= this._dataSet.length; index<size; index++){
                const currentPos = this._dataSet[index];
                const distanceBetweenTwoPoints = this._distance(currentPos, mousePos);
                
                if(minDistance > distanceBetweenTwoPoints){
                    minDistancePoint = currentPos;
                    minDistance = Math.min(minDistance, distanceBetweenTwoPoints);
                }
            }
            if(!this._preFocusPoint){
                this._drawFocusPoint(minDistancePoint);
                this._preFocusPoint = minDistancePoint;
                return;
            }
            /*
            if pre point isn't self, it need to render
            */
            if(this._preFocusPoint.index !== minDistancePoint.index){
                this.render();
                this._drawFocusPoint(minDistancePoint);
            }
            this._preFocusPoint = minDistancePoint;
        }
        
        _distance(point1, point2){
            return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
        }
        
        _clear(){
            this._ctx.clearRect(0, 0, this._canvasWidth, this._canvasHeight);
        }
        
        /* public */
        draw(){
            this._initFrame();
            this._initLines();
            this._initCircles();
        }
        
        render(){
            this._clear();
            this.draw();
            console.log('render');
        }
    }
    
    (function(global){
        const canvasId = 'chart';
        const matrix = [[10, 90], [30, 40], [70, 80], [90, 40], [120, 120], [150, 10], [190, 70]];
        const radius = 4;
        const chart = new Chart({
            id: canvasId, 
            matrix: matrix,
            radius: radius
        });
        chart.draw();
        chart.printDataSet();
        console.log('chart', chart);
        console.log(chart._id);
    })(this);
</script>
{% endraw %}

以下是完整的程式碼，看起來與java有點像...
也可以到我[github](https://github.com/HengLin31/chart)上去下載完整的程式碼，今天的練習就到此結束了
```js
    class Chart{
        constructor(params){
            this._LINE_TENSION = 0.2
            this._LINE_WIDTH_ORI = 2;
            this._LINE_WIDTH_FOCUS = 5;
            this._COLOR_GRAY = 'gray';
            this._COLOR_WHITE = 'white';
            
            this._id = params.id;
            this._matrix = params.matrix;
            this._radius = params.radius;
            this._dataSet = [];
            this._curveDataSet = [];
            
            this._canvas;
            this._canvasWidth;
            this._canvasHeight;
            this._ctx;
            this._preFocusPoint;

            this._init();
        }

        _init(){
            this._canvas = document.getElementById(this._id);
            if(!this._canvas.getContext){
                throw "can't get canvas context!";
            }
            this._canvasWidth = this._canvas.width;
            this._canvasHeight = this._canvas.height;
            this._ctx = this._canvas.getContext('2d');
            
            this._initDataSet();
            this._bindMouseEvent();
            this.draw();
        }

        _initDataSet(){
            for(const [index, point] of this._matrix.entries()){
                var reverseY = this._canvasHeight - point[1];
                this._dataSet.push({
                    index: index,
                    x: point[0],
                    y: reverseY,
                    color: this._randomColor()
                });
            }
        }
    
        _initFrame(){
            this._drawRect({
                x: 0,
                y: 0,
                width: this._canvasWidth,
                height: this._canvasHeight,
                lineWidth: this._LINE_WIDTH_ORI,
                color: this._COLOR_GRAY
            });
        }
        
        _initLines(){
            let prePoint;
            for(const [index, point] of this._dataSet.entries()){
                if(index == 0){
                    prePoint = point;
                    continue;
                }
                this._drawLine(prePoint, point);
                prePoint = point;
            }
        }
        
        _initCircles(){
            const _self = this;
            this._dataSet.forEach((point) => {
                _self._drawCircle({
                    x: point.x, 
                    y: point.y, 
                    radius: _self._radius, 
                    lineWidth: _self._LINE_WIDTH_ORI,
                    color: point.color
                });
            });
        }
        
        _bindMouseEvent(){
            const _self = this;
            this._canvas.addEventListener("mousemove", (event) => {
                const rect = _self._canvas.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                _self._findNearPointByMouse({x: x, y: y});
            });
        }
        
        _randomColor(){
            return '#' + (Math.random() * 0xFFFFFF << 0).toString(16);
        }
        
        _drawRect(params){
            this._ctx.lineWidth = params.lineWidth;
            this._ctx.strokeStyle = params.color;
            this._ctx.beginPath();
            this._ctx.rect(params.x, params.y, params.width, params.height);
            this._ctx.stroke();
        }
        
        _drawLine(point1, point2){
            this._ctx.lineWidth = point2.lineWidth;
            this._ctx.strokeStyle = point2.color;
            this._ctx.beginPath();
            this._ctx.moveTo(point1.x, point1.y);
            this._ctx.lineTo(point2.x, point2.y);
            this._ctx.stroke();
        }
        
        _drawCircle(point){
            this._ctx.lineWidth = point.lineWidth;
            this._ctx.beginPath();
            this._ctx.arc(point.x, point.y, point.radius, 0, 2 * Math.PI);
            this._ctx.strokeStyle = point.color;
            this._ctx.fillStyle  = point.color;
            this._ctx.fill();
            this._ctx.stroke();
        }
        
        _drawFocusPoint(point){
            this._drawCircle({x: point.x, y: point.y, radius: this._radius, lineWidth: this._LINE_WIDTH_FOCUS, color: point.color});
        }
        
        _findNearPointByMouse(mousePos){
            let minDistancePoint;
            let minDistance = Number.MAX_VALUE;
            for(var index=0, size= this._dataSet.length; index<size; index++){
                const currentPos = this._dataSet[index];
                const distanceBetweenTwoPoints = this._distance(currentPos, mousePos);
                
                if(minDistance > distanceBetweenTwoPoints){
                    minDistancePoint = currentPos;
                    minDistance = Math.min(minDistance, distanceBetweenTwoPoints);
                }
            }
            if(!this._preFocusPoint){
                this._drawFocusPoint(minDistancePoint);
                this._preFocusPoint = minDistancePoint;
                return;
            }
            /*
            if pre point isn't self, it's need to render
            */
            if(this._preFocusPoint.index !== minDistancePoint.index){
                this.render();
                this._drawFocusPoint(minDistancePoint);
            }
            this._preFocusPoint = minDistancePoint;
        }
        
        _distance(point1, point2){
            return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
        }
        
        _clear(){
            this._ctx.clearRect(0, 0, this._canvasWidth, this._canvasHeight);
        }
        
        /* public */
        draw(){
            this._initFrame();
            this._initLines();
            this._initCircles();
        }
        
        render(){
            this._clear();
            this.draw();
            console.log('render');
        }
    } 
```

