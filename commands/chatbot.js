import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { dataFile } from '../lib/paths.js';
import store from '../lib/lightweight_store.js';

const MONGO_URL = process.env.MONGO_URL;
const POSTGRES_URL = process.env.POSTGRES_URL;
const MYSQL_URL = process.env.MYSQL_URL;
const SQLITE_URL = process.env.DB_URL;
const HAS_DB = !!(MONGO_URL || POSTGRES_URL || MYSQL_URL || SQLITE_URL);

const USER_GROUP_DATA = dataFile('userGroupData.json');

// MEMORY
const chatMemory = {
    messages: new Map(),
    userInfo: new Map()
};

// APIs
const API_ENDPOINTS = [
    {
        name: 'ZellAPI',
        url: (text) => `https://zellapi.autos/ai/chatbot?text=${encodeURIComponent(text)}`,
        parse: (data) => data?.result
    },
    {
        name: 'Hercai',
        url: (text) => `https://hercai.onrender.com/gemini/hercai?question=${encodeURIComponent(text)}`,
        parse: (data) => data?.reply
    }
];

// LOAD DATA
async function loadUserGroupData() {
    try {
        if (HAS_DB) {
            const data = await store.getSetting('global', 'userGroupData');
            return data || { groups: [], chatbot: {} };
        } else {
            if (!fs.existsSync(USER_GROUP_DATA)) {
                return { groups: [], chatbot: {} };
            }
            return JSON.parse(fs.readFileSync(USER_GROUP_DATA, "utf-8"));
        }
    } catch {
        return { groups: [], chatbot: {} };
    }
}

// SAVE DATA
async function saveUserGroupData(data) {
    try {
        if (HAS_DB) {
            await store.saveSetting('global', 'userGroupData', data);
        } else {
            const dir = path.dirname(USER_GROUP_DATA);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(USER_GROUP_DATA, JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.log(e);
    }
}

// DELAY
function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

// TYPING
async function showTyping(sock, chatId) {
    try {
        await sock.sendPresenceUpdate('composing', chatId);
        await delay(2000);
    } catch {}
}

// MAIN CHATBOT
export async function handleChatbotResponse(sock, chatId, message, userMessage, senderId) {
    const data = await loadUserGroupData();

    // SAFE CHECK
    if (!data.chatbot || !data.chatbot[chatId]) return;

    try {
        // MEMORY INIT
        if (!chatMemory.messages.has(senderId)) {
            chatMemory.messages.set(senderId, []);
        }

        let messages = chatMemory.messages.get(senderId) || [];

        messages.push(userMessage);
        if (messages.length > 15) messages.shift();

        chatMemory.messages.set(senderId, messages);

        await showTyping(sock, chatId);

        const response = await getAIResponse(userMessage, messages);

        if (!response) {
            return sock.sendMessage(chatId, {
                text: "😅 Brain imefreeze kidogo... try tena!"
            }, { quoted: message });
        }

        await sock.sendMessage(chatId, {
            text: response
        }, { quoted: message });

    } catch (e) {
        console.log(e);
    }
}

// AI RESPONSE
async function getAIResponse(text, history) {

    const prompt = `
You are a funny WhatsApp friend.
Reply short (1-2 lines), casual, with emojis.

Chat history:
${history.join('\n')}

User: ${text}
Bot:
`;

    for (const api of API_ENDPOINTS) {
        try {
            const res = await fetch(api.url(prompt));
            const data = await res.json();
            const result = api.parse(data);

            if (result) {
                return result
                    .replace(/ai/gi, '')
                    .replace(/bot/gi, '')
                    .trim();
            }

        } catch {}
    }

    return "😂 Sijui hata niseme nini... ulisema nini tena?";
}

// COMMAND
export default {
    command: 'chatbot',
    aliases: ['ai'],
    category: 'admin',
    async handler(sock, message, args, { chatId }) {

        const text = args.join(' ').toLowerCase();
        let data = await loadUserGroupData();

        if (!data.chatbot) data.chatbot = {};

        if (text === 'on') {
            data.chatbot[chatId] = true;
            await saveUserGroupData(data);

            return sock.sendMessage(chatId, {
                text: '✅ Chatbot ON 😈 (auto reply enabled)'
            });
        }

        if (text === 'off') {
            delete data.chatbot[chatId];
            await saveUserGroupData(data);

            return sock.sendMessage(chatId, {
                text: '❌ Chatbot OFF'
            });
        }

        return sock.sendMessage(chatId, {
            text: 'Use: .chatbot on / off'
        });
    },

    handleChatbotResponse
};
