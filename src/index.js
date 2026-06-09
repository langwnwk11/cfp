export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    const url = new URL(request.url);
    
    // 1. 强行重写 Host
    url.host = 'generativelanguage.googleapis.com';

    // 2. 建立一个全新的 Headers 对象，只复制必要的，扔掉带有隐私和地域信息的 Headers
    const newHeaders = new Headers();
    
    // 允许通过的白名单 Header 核心字段
    const headerWhitelist = ['accept', 'accept-encoding', 'content-type', 'authorization', 'user-agent', 'x-goog-api-client', 'x-goog-api-key'];

    for (const [key, value] of request.headers.entries()) {
      const lowerKey = key.toLowerCase();
      // 过滤掉所有 cloudflare 注入的头 (cf-*)、转发头 (x-forwarded-*) 以及非白名单头
      if (
        !lowerKey.startsWith('cf-') && 
        !lowerKey.startsWith('x-forwarded-') && 
        (headerWhitelist.includes(lowerKey) || lowerKey.startsWith('x-goog-'))
      ) {
        newHeaders.set(key, value);
      }
    }

    // 显式地将 Host 设置为 Google 官方域名
    newHeaders.set('Host', url.host);

    // 3. 构建全新的请求
    const modifiedRequest = new Request(url.toString(), {
      headers: newHeaders,
      method: request.method,
      body: request.body,
      redirect: 'follow'
    });

    try {
      // 4. 发送请求（此时 Google 只能看到 Cloudflare 节点的海外纯净 IP）
      const response = await fetch(modifiedRequest);

      // 5. 保持跨域头输出
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Headers', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (error) {
      return new Response('Worker Proxy Error: ' + error.message, { status: 500 });
    }
  }
};