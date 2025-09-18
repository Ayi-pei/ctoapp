const axios = require('axios');

// 测试完整的认证和签到流程
async function testCheckInFull() {
    try {
        console.log('Testing full authentication and check-in flow...');

        // 创建一个axios实例
        const client = axios.create({
            baseURL: 'http://localhost:3000',
            withCredentials: true
        });

        // 存储cookie
        let cookies = '';

        // 拦截响应以提取cookie
        client.interceptors.response.use(response => {
            if (response.headers['set-cookie']) {
                cookies = response.headers['set-cookie'].join('; ');
                console.log('Cookies updated:', cookies.substring(0, 50) + '...');
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

        // 1. 首先登录管理员账户
        console.log('1. Testing admin login...');
        const loginResponse = await client.post('/api/auth/login', {
            username: 'adminsrf',
            password: 'admin8888'
        });

        console.log('Login response:', loginResponse.data);

        if (loginResponse.data.success) {
            console.log('✅ Admin login successful!');

            // 2. 验证会话
            console.log('2. Testing session validation...');
            const meResponse = await client.get('/api/auth/me');

            console.log('User info response:', meResponse.data);

            if (meResponse.data.authenticated) {
                console.log('✅ Session validation successful!');
                console.log('User:', meResponse.data.user);

                // 3. 执行签到
                console.log('3. Testing check-in...');
                const checkInResponse = await client.post('/api/rewards/check-in');

                console.log('Check-in response:', checkInResponse.data);

                if (checkInResponse.status === 200 && checkInResponse.data.success) {
                    console.log('✅ Check-in successful!');
                    console.log(`Reward: ${checkInResponse.data.reward} USDT`);
                    console.log(`Streak day: ${checkInResponse.data.streak_day}`);
                } else if (checkInResponse.status === 200 && !checkInResponse.data.success) {
                    // 签到本身成功，但奖励发放失败
                    console.log('⚠️ Check-in completed but reward failed:', checkInResponse.data.message);
                    console.log(`Reward: ${checkInResponse.data.reward} USDT`);
                    console.log(`Streak day: ${checkInResponse.data.streak_day}`);
                    if (checkInResponse.data.debug) {
                        console.log('Debug info:', checkInResponse.data.debug);
                    }
                } else {
                    console.log('❌ Check-in failed:', checkInResponse.data.error);
                    if (checkInResponse.data.debug) {
                        console.log('Debug info:', checkInResponse.data.debug);
                    }
                }
            } else {
                console.log('❌ Session validation failed:', meResponse.data.message);
            }
        } else {
            console.log('❌ Admin login failed:', loginResponse.data.error);
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
testCheckInFull();