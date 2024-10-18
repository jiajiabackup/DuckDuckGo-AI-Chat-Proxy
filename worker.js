export default {
    async fetch(request, env, ctx) {
        const response = await handleRequest(request, env);
        return response;
    },
};

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function CORS() {
    const headers = new Headers();
    headers.append('Access-Control-Allow-Origin', '*');
    headers.append('Access-Control-Allow-Methods', '*');
    headers.append('Access-Control-Allow-Headers', '*');
    headers.append('Content-Type', 'application/json');
    return headers;
}
async function handleRequest(request, env) {
    let front_website = 'next'; // using 'next' or 'better' 可以代理两套前端页面 各有特点
    let password = ''; // 空为不设置, 随意提交 auth 即可
    if (request.method === 'OPTIONS') { //处理跨域预检 OPTIONS
        return new Response(null, {
            status: 204,
            headers: CORS()
        });
    }
    const url = new URL(request.url);
    if (url.pathname === '/v1/chat/completions' || url.pathname === '/api/openai/v1/chat/completions') { // 处理 Api 请求, 后者来自next
        if (password) {
            let auth = request.headers.get('Authorization');
            if (auth) {
                auth = auth.replace('Bearer nk-', '')
                    .replace('Bearer sk-', '')
                    .replace('Bearer ', '')
                    .trim();
            } else {
                return new Response('🔑 [请输入密码]', {
                    status: 401,
                    headers: CORS()
                });
            }
            if (password === auth) {
                return await processChatCompletions(request, env);
            } else {
                return new Response('🔑 [密码错误]', {
                    status: 401,
                    headers: CORS()
                });
            }
        } else {
            return await processChatCompletions(request, env);
        }
    } else if (front_website === 'next') {
        const targetUrl = 'https://app.nextchat.dev' + request.url.substring(request.url.indexOf('/', 8));
        const forwardRequest = new Request(targetUrl, {
            method: request.method,
            headers: request.headers,
            body: request.method === 'POST' ? request.body : null,
            redirect: 'follow'
        });
        if (request.url.includes('/api/config')) {
            let customResponseData = {
                "needCode": true,
                "hideUserApiKey": false,
                "disableGPT4": false,
                "hideBalanceQuery": true,
                "disableFastLink": false,
                "customModels": "",
                "defaultModel": "gpt-4o-mini"
            };
            const responseText = JSON.stringify(customResponseData);
            return new Response(responseText, {
                status: 200,
                statusText: 'OK',
                headers: CORS()
            });
        }
        const response = await fetch(forwardRequest);
        return response;
    } else if (front_website === 'better') {
        const targetUrl = 'https://bettergpt.chat' + request.url.substring(request.url.indexOf('/', 8));
        const forwardRequest = new Request(targetUrl, {
            method: request.method,
            headers: request.headers,
            body: request.method === 'POST' ? request.body : null,
            redirect: 'follow'
        });
        const response = await fetch(forwardRequest);
        if (request.url.includes('/assets/index-5d535dfc.js')) {
            const responseText = await response.text();
            let modifiedResponseText = responseText
                .replace('https://api.openai.com/', '/')
                .replace('Setup your API key', '输入密码');
            return new Response(modifiedResponseText, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            });
        } else if (request.url.includes('/api.json')) {
            const customResponseData = {
                "securityMessage": "",
                "apiEndpoint": {
                    "inputLabel": "API 地址",
                    "description": "选用非官方 API 端点时，它会作为代理运作。代理作用是在您的设备和目标服务器（在本例中为 OpenAI API）之间充当中介。通过这样做，您能够在被限制的地区访问 OpenAI API。",
                    "warn": ""
                },
                "apiKey": {
                    "howTo": "",
                    "inputLabel": "密码"
                },
                "customEndpoint": "使用自定义 API 地址",
                "advancedConfig": "在<0>此处</0>查看进阶 API 设置",
                "noApiKeyWarning": "缺少 API key，请检查 API 设置。"
            };
            const responseText = JSON.stringify(customResponseData);
            return new Response(responseText, {
                status: 200,
                statusText: 'OK',
                headers: CORS()
            });
        }
        return response;
    } else {
        return new Response('Frontend not set up yet', {
            status: 500,
            headers: CORS()
        });
    }
}
async function processChatCompletions(request, env) {
    let isStream = false

    const models = ['gpt-4o-mini', 'claude-3-haiku-20240307', 'meta-llama/Llama-3-70b-chat-hf', 'mistralai/Mixtral-8x7B-Instruct-v0.1']; //懒得支持多模型了，默认gpt4omini
    const requestBody = await request.text();
    if (!requestBody) return new Response('Request body is empty', {
        status: 400,
        headers: CORS()
    });
    let message
    let messageData;
    try {
        message = JSON.parse(requestBody);
        messageData = message.messages;
    } catch (error) {
        return new Response('Invalid JSON format', {
            status: 400,
            headers: CORS()
        });
    }
    const messages = {
        model: "gpt-4o-mini",
        messages: [{
            role: "user",
            content: JSON.stringify(messageData)
        }]
    };
    isStream = message.stream
    console.log("request:", messages);
    let vqd = await requestNewVQD();

    console.log('request VQD:', vqd);
    const apiHeader = new Headers();
    apiHeader.append("accept", "text/event-stream");
    apiHeader.append("accept-language", "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6,zh-HK;q=0.5");
    apiHeader.append("content-type", "application/json");
    apiHeader.append("referer", "https://test.com");
    apiHeader.append("x-vqd-4", vqd);
    const requestOptions = {
        method: "POST",
        headers: apiHeader,
        body: JSON.stringify(messages),
        redirect: "follow"
    };
    return fetchData(requestOptions, messageData, isStream, env);
}
async function fetchData(requestOptions, messageData, isStream, env) {
    const targetUrl = "https://duckduckgo.com/duckchat/v1/chat";
    const response = await fetch(targetUrl, requestOptions);

    // Check if the response status is OK (200)
    if (!response.ok) {
        // If not, read the response body to get the error message
        const errorBody = await response.text();
        console.error('Fetch error:', response.status, errorBody);

        if (response.status == 429) {
            if (errorBody.includes("429 Too Many Requests")) {
                return new Response(`${errorBody}`, {
                    status: response.status,
                    headers: CORS(),
                });
            }
            const errorJson = JSON.parse(errorBody)
            if (errorJson.type === 'ERR_INPUT_LIMIT') {
                console.error('输入超限')
                let newrequestOptions = requestOptions
                let newMessageData = messageData
                if (newMessageData.length > 1) {
                    newMessageData.splice(1, 1); // 移除第二项
                } else {
                    return new Response(`${errorBody}`, {
                        status: response.status,
                        headers: CORS(),
                    });
                }
                const messages = {
                    model: "gpt-4o-mini",
                    messages: [{
                        role: "user",
                        content: JSON.stringify(newMessageData)
                    }]
                };
                newrequestOptions.body = JSON.stringify(messages)
                await delay(300);
                return fetchData(newrequestOptions, newMessageData, isStream, env)

            }

        }
        // Return a response with the error details
        return new Response(`${errorBody}`, {
            status: response.status,
            headers: CORS(),

        });
    }

    const responseVQD = response.headers.get("x-vqd-4");
    console.log('response VQD:', responseVQD);

    if (responseVQD == null) {
        console.error('response VQD header is null, retrying...');
        await delay(300);
        return fetchData(requestOptions, messageData, isStream, env); // Recursive call to retry the request
    }



    const newHeader = new Headers();
    newHeader.append("Cache-Control", "no-cache");
    newHeader.append("Connection", "keep-alive");
    newHeader.append('Access-Control-Allow-Origin', '*');
    if (isStream) {
        newHeader.append("Content-Type", "text/event-stream");
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let accumulatedData = '';
                let newMessage = '';
                while (true) {
                    const {
                        done,
                        value
                    } = await reader.read();
                    if (done) break;
                    accumulatedData += decoder.decode(value, {
                        stream: true
                    });
                    let messages = accumulatedData.split('\n');
                    for (let i = 0; i < messages.length - 1; i++) {
                        if (messages[i].startsWith('[DONE]')) {
                            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
                            controller.close();
                        } else if (messages[i].startsWith('data:')) {
                            const clearMessage = messages[i].substring(5).trim();
                            try {
                                const jsonMessage = JSON.parse(clearMessage);
                                if (jsonMessage.message) {
                                    newMessage += jsonMessage.message;
                                }
                            } catch (error) {}
                            const processedMessage = processChunk(clearMessage);
                            controller.enqueue(new TextEncoder().encode('data: ' + processedMessage + '\n\n'));
                        }
                    }
                    accumulatedData = messages[messages.length - 1];
                }
                if (accumulatedData && accumulatedData.startsWith('data:')) {
                    const processedMessage = `data: ${processChunk(accumulatedData.substring(5).trim())}\n`;
                    console.log('Incomplete processed result:', processedMessage);
                    controller.enqueue(new TextEncoder().encode('data: ' + processedMessage + '\n\n'));
                }
                console.log("answer: ", newMessage);
                controller.close();
            }
        });
        return new Response(stream, {
            status: response.status,
            headers: newHeader
        });
    } else {
        newHeader.append("Content-Type", "application/json");
        let inputData = await response.text()
        const messages = [];
        const regex = /data: ({.*?})/g;
        let match;

        // 用于存储最后的 id、created 和 model
        let finalId = '';
        let finalCreated = 0;
        let finalModel = '';

        while ((match = regex.exec(inputData)) !== null) {
            const jsonData = JSON.parse(match[1]);
            if (jsonData.message) {
                messages.push(jsonData.message);
            }
            
            if (jsonData.id) {
                finalId = jsonData.id;
            }
            if (jsonData.created) {
                finalCreated = jsonData.created;
            }
            if (jsonData.model) {
                finalModel = jsonData.model; 
            }
        }

        const outputJson = {
            id: finalId,
            object: "chat.completion",
            created: finalCreated,
            model: finalModel,
            choices: [{
                message: {
                    role: "assistant",
                    content: messages.join('')
                },
                finish_reason: "stop",
                index: 0
            }]
        };

        return new Response(JSON.stringify(outputJson), {
            status: response.status,
            headers: newHeader
        });
    }

}

function processChunk(chunk) {
    let originalMessage;
    try {
        originalMessage = JSON.parse(chunk);
    } catch (e) {
        return `${chunk}`;
    }
    const openAiResponse = {
        id: originalMessage.id,
        object: "chat.completion",
        created: originalMessage.created,
        model: originalMessage.model,
        choices: [{
            index: 0,
            delta: {
                content: originalMessage.message
            },
            finish_reason: null,
            content_filter_results: null
        }]
    };
    return `${JSON.stringify(openAiResponse)}`;
}
async function requestNewVQD() {
    const myHeaders = new Headers();
    myHeaders.append("x-vqd-accept", "1");
    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };
    try {
        const response = await fetch("https://duckduckgo.com/duckchat/v1/status", requestOptions);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const vqd = response.headers.get("x-vqd-4");
        return vqd;
    } catch (error) {
        console.error(error);
        return null;
    }
}
