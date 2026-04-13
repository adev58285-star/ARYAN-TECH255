
const fetch = require('node-fetch');

async function handleChatbotResponse(sock, chatId, message, text) {
    if (!text) return;

    try {
        const res = await fetch(`https://api.affiliateplus.xyz/api/chatbot?message=${encodeURIComponent(text)}&botname=ARYAN&ownername=DEV`);
        const data = await res.json();

        await sock.sendMessage(chatId, {
            text: data.message || "😅 Sijaelewa vizuri..."
        }, { quoted: message });

    } catch (e) {
        console.log(e);
    }
}

module.exports = { handleChatbotResponse };
