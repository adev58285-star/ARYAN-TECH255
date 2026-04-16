const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

// MEMORY SYSTEM
const chatMemory = {
    messages: new Map(),
    userInfo: new Map(),
    lastInteraction: new Map()
};

const MAX_HISTORY = 10;

// LOAD DATA
function loadUserGroupData() {
    try {
        return JSON.parse(fs.readFileSync(USER_GROUP_DATA));
    } catch {
        return { groups: [], chatbot: {} };
    }
}

function saveUserGroupData(data) {
    fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
}

// DELAY
function getRandomDelay() {
    return Math.floor(Math.random() * 2000) + 1000;
}

async function showTyping(sock, chatId) {
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(r => setTimeout(r, getRandomDelay()));
    } catch {}
}

// USER INFO EXTRACTOR (IMPROVED)
function extractUserInfo(message) {
    const info = {};

    const nameMatch = message.match(/my name is (\w+)/i);
    if (nameMatch) info.name = nameMatch[1];

    const ageMatch = message.match(/(\d+)\s*years/i);
    if (ageMatch) info.age = ageMatch[1];

    const locMatch = message.match(/(?:live in|from) ([\w\s]+)/i);
    if (locMatch) info.location = locMatch[1];

    return info;
}

// COMMAND HANDLER (UNCHANGED CORE)
async function handleChatbotCommand(sock, chatId, message, match) {
    const data = loadUserGroupData();

    if (match === 'on') {
        data.chatbot[chatId] = true;
        saveUserGroupData(data);
        return sock.sendMessage(chatId, { text: '✅ Chatbot enabled' }, { quoted: message });
    }

    if (match === 'off') {
        delete data.chatbot[chatId];
        saveUserGroupData(data);
        return sock.sendMessage(chatId, { text: '❌ Chatbot disabled' }, { quoted: message });
    }
}

// MAIN RESPONSE
async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {
    const data = loadUserGroupData();
    if (!data.chatbot[chatId]) return;

    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const isPrivateChat = !chatId.endsWith('@g.us');

    let isMention = userMessage.includes(`@${botNumber.split('@')[0]}`);

    if (!isPrivateChat && !isMention) return;

    let cleanedMessage = userMessage.replace(`@${botNumber.split('@')[0]}`, '').trim();

    // INIT MEMORY
    if (!chatMemory.messages.has(senderId)) {
        chatMemory.messages.set(senderId, []);
        chatMemory.userInfo.set(senderId, {});
    }

    // UPDATE USER INFO
    const info = extractUserInfo(cleanedMessage);
    if (Object.keys(info).length > 0) {
        chatMemory.userInfo.set(senderId, {
            ...chatMemory.userInfo.get(senderId),
            ...info
        });
    }

    // SAVE MESSAGE HISTORY
    let history = chatMemory.messages.get(senderId);
    history.push(cleanedMessage);

    if (history.length > MAX_HISTORY) history.shift();

    chatMemory.messages.set(senderId, history);
    chatMemory.lastInteraction.set(senderId, Date.now());

    await showTyping(sock, chatId);

    const reply = await getAIResponse(cleanedMessage, {
        history,
        userInfo: chatMemory.userInfo.get(senderId)
    });

    if (!reply) {
        return sock.sendMessage(chatId, {
            text: "Sijaelewa vizuri 🤔 unaweza kufafanua kidogo?"
        }, { quoted: message });
    }

    await sock.sendMessage(chatId, { text: reply }, { quoted: message });
}

// AI RESPONSE (SMART MEMORY)
async function getAIResponse(userMessage, context) {
    try {
        const prompt = `
You are a smart WhatsApp chatbot.

RULES:
- Answer clearly based on the question
- Use Swahili or English depending on user
- Be short but helpful
- Use previous messages for context
- If unclear, ask

Chat history:
${context.history.join('\n')}

User info:
${JSON.stringify(context.userInfo)}

User:
${userMessage}

Reply:
        `.trim();

        const res = await fetch("https://api.dreaded.site/api/chatgpt?text=" + encodeURIComponent(prompt));
        const data = await res.json();

        if (!data.success || !data.result) return null;

        return data.result.trim();

    } catch (e) {
        console.log("AI ERROR:", e);
        return null;
    }
}

// CLEAN OLD MEMORY (AUTO)
setInterval(() => {
    const now = Date.now();

    for (let [user, time] of chatMemory.lastInteraction.entries()) {
        if (now - time > 1000 * 60 * 30) { // 30 min
            chatMemory.messages.delete(user);
            chatMemory.userInfo.delete(user);
            chatMemory.lastInteraction.delete(user);
        }
    }
}, 600000);

// EXPORT
module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};
