/**
 * Koa2 的主入口，本质是一个类，我们使用的时候需要 new 一个单独的实例。
 */

// 该库主要是用来判断一个 function 是不是 generator 函数
// 源码地址：https://github.com/inspect-js/is-generator-function/blob/main/index.js
const isGeneratorFunction = require('is-generator-function')

// 该库主要用来在 debug 模式下显示一些调试的信息，是封装在 Node 模块 debugger 之上的
// 源码地址：https://github.com/visionmedia/debug
const debug = require('debug')('koa:application')

// 该库主要创建一个侦听器，用来侦听响应结束后的状态，如果报错，则会把错误放在第一个参数，该侦听回调函数只会被执行一次
// 源码地址：https://github.com/jshttp/on-finished
const onFinished = require('on-finished')

// 该库主要用来向用户更好的提示将要被弃用的信息，允许提供一个命名空间并返回一个输出弃用信息的函数 deprecate
// 源码地址：https://github.com/dougwilson/nodejs-depd
const deprecate = require('depd')('koa')

// 该库主要用来将 Generator 函数与 Promise 函数进行转换，也可以逆转，实现 koa2 对 koa1 的向下兼容
// 其本质也是调用了 TJ 大神的 co 库
// 源码地址：https://github.com/koajs/convert/blob/master/index.js
const convert = require('koa-convert')

// 该库主要用来控制 next 执行机制的，可以说是很核心的一个方法
// 源码地址：https://github.com/koajs/compose/blob/master/index.js
const compose = require('koa-compose')

// 使用 Node 的 http 模块来启动 http 服务
const http = require('http')

// 继承 Node 的 events 模块的一些方法和属性
const Emitter = require('events')

// 使用 Node 的 util 模块
const util = require('util')

// 本身继承了 Node Events 模块的一些属性和方法
module.exports = class Application extends Emitter {
  constructor (options = {}) {
    super() // 执行父类的 constructor
    // options = options || {} // 源码有这么一句，但是我感觉默认值 {} 完全可以写到参数传递上
    this.middleware = [] // 用来存放中间件的数组
  }
  // 最核心的方法 use
  use (fn) {
    // 如果用户传入的不是一个方法，则直接抛出错误，告诉用户中间件必须是一个函数
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!')
    // 如果用户传入的是一个 Generator 函数，则发出警告，告诉用户在 v3 版本将会移除对 Generator 函数的支持
    // 此处使用了外部库 is-generator-function
    if (isGeneratorFunction(fn)) {
      deprecate('Support for generators will be removed in v3. ' +
        'See the documentation for examples of how to convert old middleware ' +
        'https://github.com/koajs/koa/blob/master/docs/migration.md')
      fn = convert(fn) // 利用 koa-convert 库，将 Generator 函数转换成 Promise 函数
    }
    debug('use %s', fn._name || fn.name || '-')
    this.middleware.push(fn) // 将中间件函数存放到 middleware 数组中
    return this // 用来实现链式调用
  }
  // 返回一个 request 的回调函数，用来后面传给 http.createServer() 函数
  callback () {
    // 使用 koa-compose 库，递归执行中间件函数，最终返回一个 Promise
    const fn = compose(this.middleware)
    // 此处是用的继承的 Node Events 模块的方法
    // this.listenCount 其作用就是正在监听的名为 eventName 的事件的监听器的数量
    // 如果不了解，可以查看：http://nodejs.cn/api/events.html#events_emitter_listenercount_eventname
    // this.on 其作用就是监听指定名为 eventName 的事件，并将回调函数放入监听器中
    // 但不会去判断是否已经监听过，如果多次监听，那么就会多次添加
    // 如果不了解，可以查看：http://nodejs.cn/api/events.html#events_emitter_off_eventname_listener
    if (!this.listenCount('error')) this.on('error', this.onerror) // 如果没有监听过 error ，则调用 this.on 方法去监听
    // 声明传递给 http.createServer 的回调函数
    // 回调函数里，会被自动塞入两个参数，一个是 req 请求信息，一个是 res 响应信息
    const handleRequest = (req, res) => {
      // 调用自己的函数，封装出来一个上下文 ctx
      // 此处是 koa 的精华，将 http 的 req 和 res 都代理到了自己的 ctx 上
      const ctx = this.createContent(req, res)
      // TODO >>>
      return this.handleRequest(ctx, fn)
    }
    return handleRequest
  }
  // TOTO >>>>>>>>>>>>>>> 这块不太懂，为啥搞个 404 状态
  // 处理请求
  handleRequest(ctx, fnMiddleware) {
    // 注意，这个时候，ctx 已经完成了各种挂载
    const res = ctx.res
    res.statusCode = 404
    const onerror = err => ctx.onerror(err)
    const handleResponse = () => respond(ctx)
    onFinished(res, onerror)
    return fnMiddleware(ctx).then(handleResponse).catch(onerror)
  }
  // 创建 koa 独特的上下文
  createContent (req, res) {
    // 为什么要用 Object.create 包一层，主要目的就是为了防止用户修改 koa 自己对象上的一些属性
    // 同时为了用户无论在哪都能拿到原生的 req、res 和自己的 request、response，进行了多个的挂载
    // 主要，全写的都是 koa 封装的：ctx、context、resquest、response，原生的都是缩写：req、res
    const context = Object.create(this.context)
    const request = context.request = Object.create(this.request)
    const response = context.response = Object.create(this.response)
    // 无论在 context 还是 request 和 response 上，都能拿到当前实例
    context.app = request.app = response.app = this
    // req 是原生的
    context.req = request.req = response.req = req
    // res 是原生的
    context.res = request.res = response.res = res
    // 又在自己的 request 和 response 存放了自己的 context
    request.ctx = response.ctx = context
    // request 和 response 也可以相互拿对方
    request.response = response
    response.request = request
    // 又在 context 和 request 存放了原生的 url
    context.originalUrl = request.originalUrl = req.url
    // 又挂载了一个 state 属性
    context.state = {}
    return context
  }
  // 监听指定端口
  listen (...args) {
    debug('listen')
    // 因为 koa 只是做了一层封装，内部还是使用的 Node 的 http 模块
    // 如果不了解 http.createServer 方法，可以查看：http://nodejs.cn/api/http.html#http_http_createserver_options_requestlistener
    // 该方法会返回一个 http.Server 实例
    const server = http.createServer(this.callback())
    // 启动一个 TCP 服务，并监听指定的端口，执行传入的回调函数
    // 如果不了解，可以查看：http://nodejs.cn/api/net.html#net_server_listen
    return server.listen(...args)
  }
  // 自定义处理错误的方法
  onerror (err) {
    // 判断是不是原生的错误
    const isNativeError = Object.prototype.toString.call(err) === '[object error]' || err instanceof Error
    // 如果不是原生的错误，则抛出异常
    // 此处用到了 Node 的 util 模块 中的 format 方法
    // 如果不了解，可以查看：http://nodejs.cn/api/util.html#util_util_format_format_args
    // %j 意思为格式化为 json 字符串
    if (!isNativeError) throw new TypeError(util.format('non-error thrown: %j', err))
    // TODO 如果状态码为 404 或者>>>>>>
    if (404 === err.status || err.expose) return
    // TODO 如果是静默模式，则不打印错误>>>>>>
    if (this.silent) return
    // 拿到错误信息，Node 中的错误信息都是实例化或继承自原生 Error 类
    // err.stack 表示被调用的 new Error() 在代码中的位置
    // 如果 err 是一个对象，则调用其 toString 方法
    const msg = err.stack || err.toString()
    // 打印错误
    console.error(`\n${msg.replace(/^/gm, '  ')}\n`)
  }
}
// 响应处理函数
function respond (ctx) {
  // 如果 ctx.respond 为 false，直接返回
  if (false === ctx.respond) return
  // 如果 ctx 是不可写的，直接返回
  if (!ctx.writable) return
  const res = ctx.res
  let body = ctx.body
  const code = ctx.status
  // TODO >>>>>>>>
}