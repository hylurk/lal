// 引入我们自己写的 koa
const Koa = require('../src/application')
// const Koa = require('koa')

// new 一个实例
const app = new Koa()

// 传入一些中间件
// app.use(function* () {
//   console.log('dddd')
// })
app.use(() => {
  console.log('dddddd')
})

// 监听特定端口，你也可以不指定端口，不会报错，但是你不太好找运行在了哪个端口
app.listen(3000)

// 之后在浏览器输入：http://localhost:3000/ 即可查看效果