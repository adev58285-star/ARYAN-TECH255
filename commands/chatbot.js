const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, getContentType } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// === PUT YOUR GEMINI API KEY HERE ===
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";   // ← Change this!

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // fast & good model

// Optional: Keep some fixed commands (higher priority)
const fixedCommands = {
    "!help": "I am now a smart AI chatbot! Just chat with me normally.\nYou can also use:\n!time - show current time",
    "!time": () => `Current time: ${new Date().toLocaleString()}`,
};

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        markReads: true,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('Scan this QR code:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('✅ AI WhatsApp Bot is ONLINE! 🚀');
            console.log('Send any message - I will reply smartly!');
        }

        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                setTimeout(startBot, 2000);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        let text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        if (!text) return;

        console.log(`📨 From ${from}: ${text}`);

        // Simulate typing
        await sock.sendPresenceUpdate('composing', from);
        await new Promise(r => setTimeout(r, 700));

        let reply = "";

        // 1. Check fixed commands first
        const lowerText = text.toLowerCase().trim();
        for (let cmd in fixedCommands) {
            if (lowerText === cmd || lowerText.startsWith(cmd + " ")) {
                const res = fixedCommands[cmd];
                reply = typeof res === 'function' ? res() : res;
                break;
            }
        }

        // 2. If no fixed command → use AI
        if (!reply) {
            try {
                const result = await model.generateContent(text);
                reply = result.response.text();
            } catch (err) {
                console.error("Gemini error:", err);
                reply = "Sorry, I'm having trouble thinking right now. Try again later 😅";
            }
        }

        await sock.sendPresenceUpdate('paused', from);
        await sock.sendMessage(from, { text: reply });
    });
}

startBot().catch(console.error);
