/**
 * Koa2 的主入口，本质是一个类，我们使用的时候需要 new 一个单独的实例。
 */

// 该库主要是用来判断一个 function 是不是 generator 函数
// 源码地址：https://github.com/inspect-js/is-generator-function/blob/main/index.js
const isGeneratorFunction = require('is-generator-function')

// 该库主要用来向用户更好的提示将要被弃用的信息，允许提供一个命名空间并返回一个输出弃用信息的函数 deprecate
// 源码地址：https://github.com/dougwilson/nodejs-depd
const deprecate = require('depd')('koa')

// 该库主要用来将 Generator 函数与 Promise 函数进行转换，也可以逆转，实现 koa2 对 koa1 的向下兼容
// 其本质也是调用了 TJ 大神的 co 库
// 源码地址：https://github.com/koajs/convert/blob/master/index.js
const convert = require('koa-convert')

// 使用 Node 的 http 模块来启动 http 服务
const http = require('http')

// 继承 Node 的 events 模块的一些方法和属性
const Emitter = require('events')

// 本身继承了 Node Events 模块的一些属性和方法
module.exports = class Application extends Emitter {
  constructor (options = {}) {
    super() // 执行父类的 constructor
    // options = options || {} // 源码有这么一句，但是我感觉默认值 {} 完全可以写到参数传递上

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
  }
  // 监听指定端口
  listen (...args) {
    // debug('listen')
    // 因为 koa 只是做了一层封装，内部还是使用的 Node 的 http 模块
    // 如果不了解 http.createServer 方法，可以查看：http://nodejs.cn/api/http.html#http_http_createserver_options_requestlistener
    // 该方法会返回一个 http.Server 实例
    const server = http.createServer((req,res) => {
      res.end('xxxx')
    })
    // 启动一个 TCP 服务，并监听指定的端口，执行传入的回调函数
    // 如果不了解，可以查看：http://nodejs.cn/api/net.html#net_server_listen
    return server.listen(...args)
  }
}