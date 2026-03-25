const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// টোকেন এবং আইডি সেটআপ
const friendBotToken = '8784762504:AAH4uP_glf7oKo52fiUiInsxOYheI0Mm-U8';
const mainBotToken = '8726832988:AAFA6Sle4iv6lAgCpyNmRPytPLt-gO1QqBo';
const myChatId = '7225943533'; 

const friendBot = new TelegramBot(friendBotToken, {polling: true});

// বন্ধুর বটের /start কমান্ড (সুন্দর ওয়েলকাম মেসেজ)
friendBot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🚀 Start Bombing', callback_data: 'start_bomb' },
                    { text: '📢 Join Channel', url: 'https://t.me/your_channel' }
                ],
                [
                    { text: '👨‍💻 Developer', url: 'https://t.me/sojol_bepari' }
                ]
            ]
        }
    };
    friendBot.sendMessage(chatId, "👋 স্বাগতম! বম্বিং শুরু করতে নিচের বাটনে ক্লিক করুন অথবা লিখুন: `/bomb [Number]`", { parse_mode: 'Markdown', ...opts });
});

// বাটন ক্লিক হ্যান্ডলার
friendBot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    if (callbackQuery.data === 'start_bomb') {
        friendBot.sendMessage(msg.chat.id, "📱 দয়া করে নম্বরটি এভাবে লিখুন:\n`/bomb 017XXXXXXXX`", { parse_mode: 'Markdown' });
    }
});

// নম্বর রিসিভ করে আপনার মেইন বটে পাঠানো
friendBot.onText(/\/bomb (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const number = match[1].trim();

    if (number.length < 11 || isNaN(number)) {
        return friendBot.sendMessage(chatId, "❌ ভুল নম্বর! সঠিক ১১ ডিজিটের নম্বর দিন।");
    }

    try {
        // আপনার মেইন বটে কমান্ড পাঠানো
        await axios.post(`https://api.telegram.org/bot${mainBotToken}/sendMessage`, {
            chat_id: myChatId,
            text: `/start_process ${number}`
        });

        // বন্ধুর বটে সুন্দর সাকসেস মেসেজ
        const successMessage = `🔥 **বম্বিং রিকোয়েস্ট সফল!**\n\n🎯 টার্গেট: \`${number}\` \n⚡ স্ট্যাটাস: প্রসেসিং শুরু হয়েছে...`;
        friendBot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });

    } catch (error) {
        friendBot.sendMessage(chatId, "⚠️ সার্ভার বর্তমানে অফলাইনে আছে।");
    }
});

// Render-এর জন্য Port Listen (Dummy Server)
http.createServer((req, res) => {
    res.write('Bot is Online');
    res.end();
}).listen(process.env.PORT || 3000);
