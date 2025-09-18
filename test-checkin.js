const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testCheckIn() {
    console.log('开始测试签到功能...');

    // 首先登录获取cookie
    try {
        console.log('\n1. 登录获取认证信息...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: 'adminsrf',
            password: 'admin8888'
        });

        console.log('登录响应:', loginResponse.data);

        if (loginResponse.data.success) {
            console.log('✓ 登录成功');

            // 获取设置的cookie
            const cookies = loginResponse.headers['set-cookie'];
            console.log('设置的cookie:', cookies);

            // 使用cookie进行签到
            console.log('\n2. 测试签到功能...');
            const checkInResponse = await axios.post(`${BASE_URL}/api/rewards/check-in`, {}, {
                headers: {
                    'Cookie': cookies
                }
            });

            console.log('签到响应:', checkInResponse.data);

            if (checkInResponse.status === 200 && checkInResponse.data.success) {
                console.log('✓ 签到成功');
                console.log('奖励:', checkInResponse.data.reward);
                console.log('连续签到天数:', checkInResponse.data.streak_day);
            } else {
                console.log('✗ 签到失败:', checkInResponse.data.error);
            }
        } else {
            console.log('✗ 登录失败:', loginResponse.data.error);
        }
    } catch (error) {
        console.log('✗ 请求失败:', error.response?.data || error.message);

        // 如果是401错误，尝试使用testuser1
        if (error.response?.status === 401) {
            console.log('\n尝试使用testuser1登录...');
            try {
                const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
                    username: 'testuser1',
                    password: 'testpassword1'
                });

                if (loginResponse.data.success) {
                    console.log('✓ testuser1登录成功');

                    // 获取设置的cookie
                    const cookies = loginResponse.headers['set-cookie'];

                    // 使用cookie进行签到
                    const checkInResponse = await axios.post(`${BASE_URL}/api/rewards/check-in`, {}, {
                        headers: {
                            'Cookie': cookies
                        }
                    });

                    console.log('签到响应:', checkInResponse.data);

                    if (checkInResponse.status === 200 && checkInResponse.data.success) {
                        console.log('✓ 签到成功');
                    } else {
                        console.log('✗ 签到失败:', checkInResponse.data.error);
                    }
                }
            } catch (testUserError) {
                console.log('✗ testuser1登录也失败:', testUserError.response?.data || testUserError.message);
            }
        }
    }
}

testCheckIn().catch(console.error);