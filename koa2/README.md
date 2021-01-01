# 手撸 Koa2

Koa1 是基于 Generator 实现的，而 Koa2 则是完全基于 async/await 实现的。本质类似于 Express 的内核，封装基本的 Http 服务，自身不含中间件。

学习 Koa 需要有一些 Node 基础。

因为是运行在 Node 上的一个工具，所以采用的是 CommonJS 规范。

Koa2 的源码本身并不多，借用了很多外部的插件库以及 Node 的各种模块功能。