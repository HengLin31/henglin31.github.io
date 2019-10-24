(function(){
    class Progress {
        constructor(data){
            this.contents = data.contents
        }

        buildHtml () {
            const contentLen = this.contents.length
            let progressActive = `<div class="progress active"></div>`
            return this.contents.map((item, index) => {
                const detail = item.content.map((content) =>{
                    return `<li>${content}</li>`
                }).join('')
                if(contentLen === (index + 1)){
                    progressActive = ``
                }
                return `
                <div class="progress-bar">
                    <div class="ball active"></div>
                    <div class="detail">
                        <div class="flow-detail title">${item.title}</div>
                        <ul class="flow-detail">${detail}</ul>
                    </div>
                    ${progressActive}
                </div>
                `
            }).join('')
        }
    }
    fetch('data.json').then((res) => {
        return res.json()
    }).then((data) => {
        const content = new Progress(data).buildHtml()
        document.getElementById('content').innerHTML = content
    })
    
})()