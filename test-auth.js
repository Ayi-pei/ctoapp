const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAuth() {
    console.log('开始测试认证系统...');

    // 测试1: 使用管理员邀请码注册新用户
    try {
        console.log('\n1. 测试使用管理员邀请码注册新用户...');
        const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
            username: 'testuser1',
            password: 'testpassword1',
            invitationCode: '8R8R8R'  // 管理员邀请码
        });

        console.log('注册响应:', registerResponse.data);

        if (registerResponse.data.success) {
            console.log('✓ 用户注册成功');
        } else {
            console.log('✗ 用户注册失败:', registerResponse.data.error);
        }
    } catch (error) {
        console.log('✗ 注册请求失败:', error.response?.data || error.message);
    }

    // 测试2: 使用错误的邀请码注册
    try {
        console.log('\n2. 测试使用错误邀请码注册...');
        const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
            username: 'testuser2',
            password: 'testpassword2',
            invitationCode: 'INVALID'
        });

        console.log('注册响应:', registerResponse.data);

        if (!registerResponse.data.success) {
            console.log('✓ 使用无效邀请码注册被正确拒绝');
        } else {
            console.log('✗ 使用无效邀请码注册应该失败但成功了');
        }
    } catch (error) {
        console.log('注册请求失败:', error.response?.data || error.message);
    }

    // 测试3: 管理员登录
    try {
        console.log('\n3. 测试管理员登录...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: 'adminsrf',
            password: 'admin8888'
        });

        console.log('登录响应:', loginResponse.data);

        if (loginResponse.data.success) {
            console.log('✓ 管理员登录成功');
        } else {
            console.log('✗ 管理员登录失败:', loginResponse.data.error);
        }
    } catch (error) {
        console.log('✗ 管理员登录请求失败:', error.response?.data || error.message);
    }

    // 测试4: 普通用户登录
    try {
        console.log('\n4. 测试普通用户登录...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: 'testuser1',
            password: 'testpassword1'
        });

        console.log('登录响应:', loginResponse.data);

        if (loginResponse.data.success) {
            console.log('✓ 普通用户登录成功');
        } else {
            console.log('✗ 普通用户登录失败:', loginResponse.data.error);
        }
    } catch (error) {
        console.log('✗ 普通用户登录请求失败:', error.response?.data || error.message);
    }

    // 测试5: 获取当前用户信息
    try {
        console.log('\n5. 测试获取当前用户信息...');
        // 首先登录获取cookie
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: 'testuser1',
            password: 'testpassword1'
        });

        if (loginResponse.data.success) {
            // 使用登录返回的cookie获取用户信息
            const cookies = loginResponse.headers['set-cookie'];
            const meResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
                headers: {
                    'Cookie': cookies
                }
            });

            console.log('获取用户信息响应:', meResponse.data);

            if (meResponse.data.authenticated) {
                console.log('✓ 获取用户信息成功');
                console.log('用户名:', meResponse.data.user.username);
                console.log('邀请码:', meResponse.data.user.invitation_code);
            } else {
                console.log('✗ 获取用户信息失败:', meResponse.data.message);
            }
        } else {
            console.log('✗ 无法登录以获取用户信息');
        }
    } catch (error) {
        console.log('✗ 获取用户信息请求失败:', error.response?.data || error.message);
    }
}

testAuth().catch(console.error);