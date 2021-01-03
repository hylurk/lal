'use strict'
/**
 * request 主要是自己又在 Node 的 http 模块的 req 上自己做了一层封装。
 * 其本质就是返回一个自己封装的对象
 */

// 该库主要用来对 req.url 进行转换，传入 req，返回一个对象，并且将 url 对应的字段分别转化成对象的属性
// 源码地址：https://github.com/pillarjs/parseurl/blob/master/index.js
const parse = require('parseurl')

// 使用 Node 的 url 模块中的 format 方法，功能是会将 url 按照传入的配置（options）进行格式化
// 如果不了解，可查看：http://nodejs.cn/api/url.html#url_url_format_url_options
const stringify = require('url').format

// 使用 Node 的 querystring 模块，主要功能就是提供用于解析和格式化 url 查询字符串
// 如果不了解，可查看：http://nodejs.cn/api/querystring.html
const qs = require('querystring')

// 本质导出的就是一个对象
module.exports = {
  // 定义 header 和 headers 的属性访问器和设置器
  // 实际操作的是原生上的 headers 属性
  // 兼容了 header 和 headers 两种写法
  get header () {
    return this.req.headers
  },
  get headers () {
    return this.req.headers
  },
  set header (val) {
    this.req.headers = val
  },
  set headers (val) {
    this.req.headers = val
  },
  // 定义 url 的属性访问器和设置器
  // 实际操作的是原生上的 url 属性
  get url () {
    return this.req.url
  },
  set url (val) {
    this.req.url = val
  },
  // 获取 url 上的 origin
  // 其实就是分别获取 request 上面的 protocol 和 host 的属性访问器
  get origin () {
    return `${this.protocol}://${this.host}`
  },
  get protocol () {
    // TODO >>>>>>>>> 此处需要去看原生的 http 请求头和响应头
    // 如果 req.socket 开启了 encrypted 模式，返回 https
    if (this.socket.encrypted) return 'https'
    if (!this.app.proxy) return 'http'
    const proto = this.get('X-Forwarded-Photo')
    return proto ? proto.split(/\s*,\s*/, 1)[0] : 'http'
  },
  /**
   * Parse the "Host" header field host
   * and support X-Forwarded-Host when a
   * proxy is enabled.
   *
   * @return {String} hostname:port
   * @api public
   */
  get host () {
    const proxy = this.app.proxy
    let host = proxy && this.get('X-Forwarded-Host')
    if (!host) {
      if (this.req.httpVersionMajor >= 2) host = this.get(':authority')
      if (!host) host = this.get('Host')
    }
    if (!host) return ''
    return host.split(/\s*,\s*/, 1)[0]
  },
  // 获取主机名，主机名不包括端口号
  get hostname () {
    const host = this.host
    if (!host) return ''
    if ('[' === host[0]) return this.URL.hostname || '' // 支持 IPv6
    return host.split(':', 1)[0] // split 第二个参数表示限制返回的分割片数，1 就代表只返回第一个分割片，但是返回格式仍然是数组
  },
  // 获取原生 req 上面的 socket 属性
  get socket () {
    return this.req.socket
  },
  // 获取完整的请求 url
  get href () {
    // 如果 this.originalUrl 里面携带了协议，则直接返回，否则加上协议
    if (/^https?:\/\//i.test(this.originalUrl)) return this.originalUrl;
    return this.origin + this.originalUrl;
  },
  // 获取请求的方法
  get method () {
    return this.req.method
  },
  // 设置请求的方法
  set method (val) {
    this.req.method = val
  },
  // 获取 path，即除了协议、主机名、端口外，url 中后面的部分
  get path () {
    return parse(this.req).pathname
  },
  // 设置 path
  set path (path) {
    const url = parse(this.req)
    // 如果设置的值跟当前的是一样的，则直接返回
    if (url.pathname === path) return
    // 如果不一样，则进行设置
    url.pathname = path
    url.path = null
    this.url = stringify(url)
  },
  // 获取 query
  get query () {
    //
  },
  // 设置 query
  set query (obj) {
    //
  }
}