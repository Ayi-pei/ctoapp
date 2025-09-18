const axios = require('axios');

// 测试修复后的认证功能
async function testFix() {
    try {
        console.log('Testing fixed authentication flow...');

        // 创建一个axios实例
        const client = axios.create({
            baseURL: 'http://localhost:3002',
            withCredentials: true
        });

        // 存储cookie
        let cookies = '';

        // 拦截响应以提取cookie
        client.interceptors.response.use(response => {
            if (response.headers['set-cookie']) {
                cookies = response.headers['set-cookie'].join('; ');
            }
            return response;
        });

        // 拦截请求以添加cookie
        client.interceptors.request.use(config => {
            if (cookies) {
                config.headers['Cookie'] = cookies;
            }
            return config;
        });

        // 1. 首先尝试注册一个新用户（使用管理员邀请码）
        console.log('1. Testing user registration with admin invitation code...');
        const registerResponse = await client.post('/api/auth/register', {
            username: 'testuser_' + Date.now(),
            password: 'testpassword123',
            invitationCode: '8R8R8R'  // 基于ADMIN_AUTH生成的管理员邀请码
        });

        console.log('Registration response:', registerResponse.data);

        if (registerResponse.data.success) {
            console.log('✅ User registration successful!');

            // 2. 获取用户信息
            console.log('2. Testing user info retrieval...');
            const meResponse = await client.get('/api/auth/me');

            console.log('User info response:', meResponse.data);

            if (meResponse.data.authenticated) {
                console.log('✅ User info retrieval successful!');
                console.log('User:', meResponse.data.user);
            } else {
                console.log('❌ User info retrieval failed:', meResponse.data.message);
            }
        } else {
            console.log('❌ User registration failed:', registerResponse.data.error);
        }
    } catch (error) {
        console.error('❌ Error during test:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// 执行测试
testFix();