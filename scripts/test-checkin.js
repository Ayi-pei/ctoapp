const axios = require('axios');

// 测试签到功能的脚本
async function testCheckIn() {
    try {
        console.log('Testing check-in functionality...');

        // 发送POST请求到签到API
        const response = await axios.post('http://localhost:3000/api/rewards/check-in', {}, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Check-in response:', response.data);

        if (response.data.success) {
            console.log('✅ Check-in successful!');
            console.log(`Reward: ${response.data.reward} USDT`);
            console.log(`Streak day: ${response.data.streak_day}`);
        } else {
            console.log('❌ Check-in failed:', response.data.error);
            if (response.data.debug) {
                console.log('Debug info:', response.data.debug);
            }
        }
    } catch (error) {
        console.error('❌ Error during check-in test:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// 执行测试
testCheckIn();