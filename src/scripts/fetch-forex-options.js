const axios = require('axios');
require('dotenv').config();

// 外汇和商品交易对
const FOREX_COMMODITY_PAIRS = ["XAU/USD", "EUR/USD", "GBP/USD"];
// 期权交易对
const OPTIONS_SYMBOLS = ["IBM", "AAPL", "TSLA", "MSFT"];

async function fetchForexData() {
    console.log("正在获取外汇和商品数据...");

    for (const pair of FOREX_COMMODITY_PAIRS) {
        try {
            const [from, to] = pair.split("/");
            const fromCurrency = from === "XAU" ? "GOLD" : from;
            const toCurrency = to === "XAU" ? "USD" : to;

            const response = await axios.get("https://www.alphavantage.co/query", {
                params: {
                    function: "CURRENCY_EXCHANGE_RATE",
                    from_currency: fromCurrency,
                    to_currency: toCurrency,
                    apikey: process.env.ALPHA_VANTAGE_API_KEY,
                },
            });

            const data = response.data["Realtime Currency Exchange Rate"];
            if (data) {
                console.log(`${pair}:`);
                console.log(`  价格: ${data["5. Exchange Rate"]}`);
                console.log(`  最后更新: ${data["6. Last Refreshed"]}`);
                console.log("---");
            } else {
                console.log(`${pair}: 无数据返回`);
                console.log("响应数据:", response.data);
                console.log("---");
            }
        } catch (error) {
            console.error(`获取 ${pair} 数据时出错:`, error.message);
        }
    }
}

async function fetchOptionsData() {
    console.log("正在获取期权数据...");

    for (const symbol of OPTIONS_SYMBOLS) {
        try {
            const response = await axios.get("https://www.alphavantage.co/query", {
                params: {
                    function: "GLOBAL_QUOTE",
                    symbol: symbol,
                    apikey: process.env.ALPHA_VANTAGE_API_KEY,
                },
            });

            const data = response.data["Global Quote"];
            if (data) {
                console.log(`${symbol}:`);
                console.log(`  价格: ${data["05. price"]}`);
                console.log(`  最后更新: ${data["07. latest trading day"]}`);
                console.log("---");
            } else {
                console.log(`${symbol}: 无数据返回`);
                console.log("响应数据:", response.data);
                console.log("---");
            }
        } catch (error) {
            console.error(`获取 ${symbol} 数据时出错:`, error.message);
        }
    }
}

async function main() {
    console.log("Alpha Vantage API Key:", process.env.ALPHA_VANTAGE_API_KEY ? "已设置" : "未设置");

    if (!process.env.ALPHA_VANTAGE_API_KEY) {
        console.error("请在 .env 文件中设置 ALPHA_VANTAGE_API_KEY");
        return;
    }

    await fetchForexData();
    await fetchOptionsData();
}

main();