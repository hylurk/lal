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

// 该库主要用来判断浏览器的缓存是否失效，是否需要重新请求最新的内容
// 源码地址：https://github.com/jshttp/fresh
const fresh = require('fresh')

// 该库主要用来创建和解析 http 请求中的 headers 里面的 content-type 字段
// 源码地址：https://github.com/jshttp/content-type
const contentType = require('content-type')

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
    const str = this.querystring
    const c = this._querycache = this._querycache || {}
    return c[str] || (c[str] = qs.parse(str))
  },
  // 设置 query，其实复用了设置 querystring 的方法
  set query (obj) {
    this.querystring = qs.stringify(obj)
  },
  get querystring () {
    // 如果没有 req，直接返回空字符串
    if (!this.req) return ''
    // 有可能会有 query 不存在的情况
    return parse(this.req).query || ''
  },
  set querystring (str) {
    const url = parse(this.req)
    // 如果设置的值与当前的值相同，则不作任何操作
    if (url.search === `?${str}`) return
    url.search = str
    url.path = null
    // 重新设置 url 的值
    this.url = stringify(url)
  },
  get search () {
    // 如果 querystring 都不存在，那肯定不存在 search，直接返回空字符串
    if (!this.querystring) return ''
    return `?${this.querystring}`
  },
  set search (str) {
    this.querystring = str
  },
  // 获取 url，返回的是一个对象
  get URL () {
    // TODO >>>>>>>  这地方做了个缓存，为啥呢？我还没弄懂
    if (!this.memoizedURL) {
      const originalUrl = this.originalUrl || ''
      try {
        this.memoizedURL = new URL(`${this.origin}${originalUrl}`)
      } catch (err) {
        this.memoizedURL = Object.create(null)
      }
    }
    return this.memoizedURL
  },
  // 判断是否是新鲜的，也就是说内容是不是最新的
  get fresh () {
    const method = this.method
    const s = this.ctx.status
    // 如果不是 get 请求，也不是 head 请求，则一定不是刷新
    if ('GET' !== method && 'HEAD' !== method) return false
    // 如果是 2xx 的请求，或者是 304，则一定是刷新
    if ((s >= 200 && s < 300) || 304 === s) {
      // 使用 fresh 库，该库 fresh 方法接受两个参数：reqHeaders 和 resHeaders，返回 Boolean 类型
      return fresh(this.header, this.response.header)
    }
    return false
  },
  // 获取内容是不是不新鲜的，也就是是缓存的东西
  get stale () {
    return !this.fresh
  },
  // TODO >>>>>>>>> 幂等的？？？不懂
  get idempotent () {
    const methods = ['GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS', 'TRACE']
    return !!~methods.indexOf(this.method)
  },
  // 获取请求 headers 中的 charset 字段信息
  get charset () {
    try {
      const { parameters } = contentType.parse(this.req)
      return parameters.charset || ''
    } catch (err) {
      return ''
    }
  }
}