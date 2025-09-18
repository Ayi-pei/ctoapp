const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testFixes() {
    console.log('开始测试修复后的功能...');

    // 测试1: 管理员登录
    try {
        console.log('\n1. 测试管理员登录...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: 'adminsrf',
            password: 'admin8888'
        }, { withCredentials: true });

        console.log('登录响应:', loginResponse.data);

        if (loginResponse.data.success) {
            console.log('✓ 管理员登录成功');

            // 获取设置的cookie
            const cookies = loginResponse.headers['set-cookie'];
            console.log('设置的cookie:', cookies);

            // 使用cookie获取用户信息
            const meResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
                headers: {
                    'Cookie': cookies
                }
            });

            console.log('获取用户信息响应:', meResponse.data);

            if (meResponse.data.authenticated) {
                console.log('✓ 获取管理员用户信息成功');
            } else {
                console.log('✗ 获取管理员用户信息失败:', meResponse.data.message);
            }
        } else {
            console.log('✗ 管理员登录失败:', loginResponse.data.error);
        }
    } catch (error) {
        console.log('✗ 管理员登录请求失败:', error.response?.data || error.message);
    }

    // 测试2: 普通用户登录
    try {
        console.log('\n2. 测试普通用户登录...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: 'testuser1',
            password: 'testpassword1'
        }, { withCredentials: true });

        console.log('登录响应:', loginResponse.data);

        if (loginResponse.data.success) {
            console.log('✓ 普通用户登录成功');

            // 获取设置的cookie
            const cookies = loginResponse.headers['set-cookie'];
            console.log('设置的cookie:', cookies);

            // 使用cookie获取用户信息
            const meResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
                headers: {
                    'Cookie': cookies
                }
            });

            console.log('获取用户信息响应:', meResponse.data);

            if (meResponse.data.authenticated) {
                console.log('✓ 获取普通用户信息成功');
            } else {
                console.log('✗ 获取普通用户信息失败:', meResponse.data.message);
            }
        } else {
            console.log('✗ 普通用户登录失败:', loginResponse.data.error);
        }
    } catch (error) {
        console.log('✗ 普通用户登录请求失败:', error.response?.data || error.message);
    }

    // 测试3: Alpha Vantage API 调用
    try {
        console.log('\n3. 测试Alpha Vantage API调用...');
        const today = new Date().toISOString().split('T')[0];
        const response = await axios.get(`${BASE_URL}/api/alpha-vantage?function=HISTORICAL_OPTIONS&symbol=IBM&date=${today}`);

        console.log('Alpha Vantage API响应状态:', response.status);

        if (response.status === 200) {
            console.log('✓ Alpha Vantage API调用成功');
        } else {
            console.log('✗ Alpha Vantage API调用失败，状态码:', response.status);
        }
    } catch (error) {
        if (error.response && error.response.status === 429) {
            console.log('✓ Alpha Vantage API返回429（频率限制），这是预期的行为');
        } else {
            console.log('✗ Alpha Vantage API调用失败:', error.response?.data || error.message);
        }
    }
}

testFixes().catch(console.error);