const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, getContentType } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const Groq = require('groq-sdk');

// ================== YOUR GROQ API KEY ==================
const GROQ_API_KEY = "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";

const groq = new Groq({
    apiKey: GROQ_API_KEY
});

// Conversation memory per user
const userHistory = new Map();

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
            console.log('\n🔹 Scan this QR code with WhatsApp:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('✅ Groq AI WhatsApp Bot is ONLINE! ⚡');
            console.log('Send any message - the bot will reply smartly.');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('🔄 Reconnecting...');
                setTimeout(startBot, 3000);
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

        const lower = text.toLowerCase().trim();

        // Fixed commands
        if (lower === "!help" || lower === "help") {
            reply = "I'm a smart AI WhatsApp bot powered by Groq ⚡\nJust chat normally!\n\nCommands:\n!clear → Reset memory\n!time → Show current time";
        } 
        else if (lower === "!time") {
            reply = `Current time: ${new Date().toLocaleString()}`;
        } 
        else if (lower === "!clear") {
            userHistory.delete(from);
            reply = "✅ Chat memory cleared. Let's start fresh!";
        } 
        else {
            // Groq AI Reply
            try {
                if (!userHistory.has(from)) userHistory.set(from, []);
                const history = userHistory.get(from);

                history.push({ role: "user", content: text });

                const chatCompletion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: "You are a friendly, helpful, and fun WhatsApp assistant. Keep replies short, natural, and engaging. Use emojis when it fits. Reply in a warm Ghanaian style."
                        },
                        ...history.slice(-12)
                    ],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.75,
                    max_tokens: 350,
                });

                reply = chatCompletion.choices[0]?.message?.content || "Sorry, I couldn't generate a reply 😅";

                history.push({ role: "assistant", content: reply });

            } catch (err) {
                console.error("Groq Error:", err.message);
                reply = "Sorry, I'm a bit busy right now. Please try again in a few seconds 😊";
            }
        }

        await sock.sendPresenceUpdate('paused', from);
        await sock.sendMessage(from, { text: reply });
    });
}

startBot().catch(err => console.error("Bot crashed:", err));
