# DuckDuckGo-AI-Chat-Proxy 🌐

[Cloudflare Worker] DuckDuckGo AI API 代理，使用 Cloudflare Worker 部署，提供 API 和前端页面。🚀

## 特点 ✨
- 访问根路径为前端页面。🏠
- 前端页面支持 NextChat 或 BetterChat，代理其官方 DEMO 页面，并做出必要的动态修改。🔄
- Post 请求 `/v1/chat/completions` 则是响应 API。📬

## 部署步骤 🛠️
1. 复制 `worker.js` 的代码。📋
2. 新建一个 Worker。🆕
3. 粘贴代码进去。📥
4. (可选) 为你的 Worker 绑定一个域名。🌍

## 变量配置 ⚙️
(写在了 `worker.js` 的最前端，在粘贴代码的时候改改就好)
```javascript
let front_website = 'next'; // using 'next' or 'better' 可以代理两套前端页面
let password = ''; // 空为不设置，不加密，前端页面随意输入访问密码即可
```
## 问题 ❓
参数写死了 gpt-4o-mini，想用其他的可以自己改改。🔧
请求时，除了对话记录外，不支持任何参数。🚫
