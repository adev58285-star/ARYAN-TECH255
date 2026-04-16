const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const USER_GROUP_DATA = path.join(__dirname, '../data/userGroupData.json');

const chatMemory = {
    messages: new Map(),
    userInfo: new Map()
};

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

function getRandomDelay() {
    return Math.floor(Math.random() * 3000) + 2000;
}

async function showTyping(sock, chatId) {
    try {
        await sock.presenceSubscribe(chatId);
        await sock.sendPresenceUpdate('composing', chatId);
        await new Promise(r => setTimeout(r, getRandomDelay()));
    } catch {}
}

function extractUserInfo(message) {
    const info = {};

    if (message.toLowerCase().includes('my name is')) {
        info.name = message.split('my name is')[1].trim().split(' ')[0];
    }

    if (message.toLowerCase().includes('i am') && message.toLowerCase().includes('years old')) {
        info.age = message.match(/\d+/)?.[0];
    }

    if (message.toLowerCase().includes('i live in') || message.toLowerCase().includes('i am from')) {
        info.location = message.split(/(?:i live in|i am from)/i)[1].trim().split(/[.,!?]/)[0];
    }

    return info;
}

// 🔥 COMMAND (GROUP ONLY)
async function handleChatbotCommand(sock, chatId, message, match) {
    if (!chatId.endsWith('@g.us')) {
        return sock.sendMessage(chatId, {
            text: '❌ This command works in groups only',
            quoted: message
        });
    }

    const data = loadUserGroupData();

    if (match === 'on') {
        data.chatbot[chatId] = true;
        saveUserGroupData(data);
        return sock.sendMessage(chatId, {
            text: '✅ Chatbot enabled',
            quoted: message
        });
    }

    if (match === 'off') {
        delete data.chatbot[chatId];
        saveUserGroupData(data);
        return sock.sendMessage(chatId, {
            text: '❌ Chatbot disabled',
            quoted: message
        });
    }

    return sock.sendMessage(chatId, {
        text: '*.chatbot on / off*',
        quoted: message
    });
}

// 🔥 RESPONSE (INBOX + GROUP)
async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {
    const data = loadUserGroupData();
    const isPrivateChat = !chatId.endsWith('@g.us');

    // Inbox always works, group only if enabled
    if (!isPrivateChat && !data.chatbot[chatId]) return;

    try {
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        let isBotMentioned = false;
        let isReplyToBot = false;

        if (message.message?.extendedTextMessage) {
            const ctx = message.message.extendedTextMessage.contextInfo || {};
            isBotMentioned = (ctx.mentionedJid || []).includes(botNumber);
            isReplyToBot = ctx.participant === botNumber;
        } else if (message.message?.conversation) {
            isBotMentioned = userMessage.includes(`@${botNumber.split('@')[0]}`);
        }

        // 🔥 inbox no restriction
        if (!isPrivateChat && !isBotMentioned && !isReplyToBot) return;

        let cleanedMessage = userMessage;
        if (isBotMentioned) {
            cleanedMessage = cleanedMessage.replace(new RegExp(`@${botNumber.split('@')[0]}`, 'g'), '').trim();
        }

        if (!chatMemory.messages.has(senderId)) {
            chatMemory.messages.set(senderId, []);
            chatMemory.userInfo.set(senderId, {});
        }

        const messages = chatMemory.messages.get(senderId);
        messages.push(cleanedMessage);
        if (messages.length > 20) messages.shift();

        chatMemory.messages.set(senderId, messages);

        await showTyping(sock, chatId);

        const response = await getAIResponse(cleanedMessage);

        if (!response) {
            return sock.sendMessage(chatId, {
                text: "Nashindwa kujibu kwa sasa 🤔",
                quoted: message
            });
        }

        await sock.sendMessage(chatId, {
            text: response
        }, { quoted: message });

    } catch (e) {
        await sock.sendMessage(chatId, {
            text: "Error kidogo 😅",
            quoted: message
        });
    }
}

// 🔥 AI RESPONSE
async function getAIResponse(text) {
    try {
        const res = await fetch("https://api.dreaded.site/api/chatgpt?text=" + encodeURIComponent(text));
        const data = await res.json();
        return data.result?.prompt || "Sijui 😅";
    } catch {
        return null;
    }
}

module.exports = {
    handleChatbotCommand,
    handleChatbotResponse
};
