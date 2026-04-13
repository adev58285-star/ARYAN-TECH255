const fetch = require('node-fetch');

let chatbotStatus = {}; // store ON/OFF per group

module.exports = {
    name: "chatbot",
    aliases: ["bot", "ai"],
    category: "group",
    description: "Enable or disable chatbot",

    async execute(sock, message, args) {
        const chatId = message.key.remoteJid;
        const text = args.join(" ").toLowerCase();

        if (!text) {
            return sock.sendMessage(chatId, {
                text: "*🤖 CHATBOT*\n\n.chatbot on\n.chatbot off"
            }, { quoted: message });
        }

        if (text === "on") {
            chatbotStatus[chatId] = true;
            return sock.sendMessage(chatId, {
                text: "✅ Chatbot enabled"
            }, { quoted: message });
        }

        if (text === "off") {
            chatbotStatus[chatId] = false;
            return sock.sendMessage(chatId, {
                text: "❌ Chatbot disabled"
            }, { quoted: message });
        }

        return sock.sendMessage(chatId, {
            text: "Use: .chatbot on/off"
        }, { quoted: message });
    },

    // ===== AUTO REPLY =====
    async onMessage(sock, message) {
        try {
            const chatId = message.key.remoteJid;

            if (!chatbotStatus[chatId]) return;
            if (!message.message) return;

            const text =
                message.message.conversation ||
                message.message.extendedTextMessage?.text ||
                '';

            if (!text || text.startsWith('.')) return;

            const res = await fetch(`https://api.affiliateplus.xyz/api/chatbot?message=${encodeURIComponent(text)}&botname=ARYAN&ownername=DEV`);
            const data = await res.json();

            const reply = data.message || "😅 Sijaelewa vizuri";

            await sock.sendMessage(chatId, {
                text: reply
            }, { quoted: message });

        } catch (e) {
            console.log("Chatbot error:", e.message);
        }
    }
};
