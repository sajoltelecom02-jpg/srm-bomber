const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// Token ebong ID Setup
const friendBotToken = '8784762504:AAH4uP_glf7oKo52fiUiInsxOYheI0Mm-U8';
const mainBotToken = '8726832988:AAFA6Sle4iv6lAgCpyNmRPytPLt-gO1QqBo';
const myChatId = '7225943533'; 

const friendBot = new TelegramBot(friendBotToken, {polling: true});
const mainBot = new TelegramBot(mainBotToken, {polling: true});

console.log("Bot connection successful! bot.js is running...");

// Bondhur bot er Start Command
friendBot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '🚀 Start Bombing', callback_data: 'start_bomb' },
                    { text: '📢 Join Channel', url: 'https://t.me/your_channel' } // Apnar channel link din
                ],
                [
                    { text: '👨‍💻 Developer', url: 'https://t.me/sojol_bepari' } // Apnar link din
                ]
            ]
        }
    };
    friendBot.sendMessage(chatId, "👋 Swagotom! Bombing shuru korte niche click korun ba likhun: `/bomb [Number]`", { parse_mode: 'Markdown', ...opts });
});

// Button click handler
friendBot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    if (callbackQuery.data === 'start_bomb') {
        friendBot.sendMessage(msg.chat.id, "📱 Number ti ebhabe likhun:\n`/bomb 017XXXXXXXX`", { parse_mode: 'Markdown' });
    }
});

// Number receive kore apnar main bot e pathano
friendBot.onText(/\/bomb (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const number = match[1].trim();

    if (number.length < 11 || isNaN(number)) {
        return friendBot.sendMessage(chatId, "❌ Vul number! Sthik 11 digit er number din.");
    }

    try {
        await axios.post(`https://api.telegram.org/bot${mainBotToken}/sendMessage`, {
            chat_id: myChatId,
            text: `/start_process ${number}`
        });

        const successMessage = `🔥 **Bombing Request Successful!**\n\n🎯 Target: \`${number}\` \n⚡ Status: Processing shuru hoyeche...`;
        friendBot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });

    } catch (error) {
        friendBot.sendMessage(chatId, "⚠️ Server offline ache.");
    }
});

// Apnar Main Bot er loop logic (10 sec gap)
mainBot.onText(/\/start_process (.+)/, (msg, match) => {
    if (msg.chat.id.toString() !== myChatId) return;
    const number = match[1];
    mainBot.sendMessage(myChatId, `🚀 ${number} e kaj shuru holo...`);
    
    // Eikhane bombing loop logic thakbe
});

// Render Port Listen
http.createServer((req, res) => {
    res.write('Bot is Online');
    res.end();
}).listen(process.env.PORT || 3000);
