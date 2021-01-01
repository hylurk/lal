// 引入我们自己写的 koa
// const Koa = require('../src/application')
const Koa = require('koa')
// new 一个实例
const app = new Koa()

// 传入一些中间件
app.use(async ctx => {
  ctx.body = 'Hello World';
})

// 监听特定端口
app.listen(3000)