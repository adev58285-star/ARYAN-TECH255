
const fetch = require('node-fetch');

let chatbotEnabled = {};

module.exports = {
    command: 'chatbot',
    aliases: ['bot', 'ai'],
    category: 'group',
    description: 'Enable or disable chatbot',
    usage: '.chatbot on/off',

    async handler(sock, message, args, context) {
        const chatId = message.key.remoteJid;
        const input = args.join(' ').toLowerCase();

        if (!input) {
            return sock.sendMessage(chatId, {
                text: `🤖 *CHATBOT MENU*

.chatbot on  → Enable bot
.chatbot off → Disable bot

💬 Bot replies when you tag it`
            }, { quoted: message });
        }

        if (input === 'on') {
            chatbotEnabled[chatId] = true;
            return sock.sendMessage(chatId, {
                text: '✅ Chatbot enabled'
            }, { quoted: message });
        }

        if (input === 'off') {
            chatbotEnabled[chatId] = false;
            return sock.sendMessage(chatId, {
                text: '❌ Chatbot disabled'
            }, { quoted: message });
        }
    },

    // AUTO REPLY FUNCTION
    async handle(sock, message) {
        try {
            const chatId = message.key.remoteJid;
            if (!chatbotEnabled[chatId]) return;

            if (!message.message) return;

            const text =
                message.message.conversation ||
                message.message.extendedTextMessage?.text;

            if (!text) return;

            // avoid bot replying itself
            if (message.key.fromMe) return;

            // simple AI API
            const res = await fetch(
                `https://api.simsimi.vn/v2/simtalk?text=${encodeURIComponent(text)}&lc=en`
            );

            const data = await res.json();
            const reply = data.success || "I don't understand 😅";

            await sock.sendMessage(chatId, {
                text: reply
            }, { quoted: message });

        } catch (err) {
            console.log('Chatbot error:', err.message);
        }
    }
};
