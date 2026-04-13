const fs = require('fs');
const path = require('path');

// ===== ADMIN CHECK =====
async function isAdmin(sock, chatId, userId) {
    try {
        const meta = await sock.groupMetadata(chatId);
        const admins = meta.participants.filter(v => v.admin);
        return { isSenderAdmin: admins.some(v => v.id === userId) };
    } catch {
        return { isSenderAdmin: false };
    }
}

// ===== PATH =====
const filePath = path.join(__dirname, '../data/welcome.json');

if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

// ===== LOAD/SAVE =====
function loadData() {
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath));
    }
    return {};
}

function saveData(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ===== FORMAT =====
function format(msg, user, group, count) {
    return msg
        .replace(/{user}/g, `@${user.split('@')[0]}`)
        .replace(/{group}/g, group)
        .replace(/{count}/g, count);
}

// ===== COMMAND: .welcome on/off =====
async function welcomeCommand(sock, chatId, message, text) {
    try {
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { text: '❌ Group only' });
        }

        const sender = message.key.participant || message.key.remoteJid;
        const { isSenderAdmin } = await isAdmin(sock, chatId, sender);

        if (!isSenderAdmin && !message.key.fromMe) {
            return sock.sendMessage(chatId, { text: '❌ Admin only' });
        }

        let data = loadData();
        if (!data[chatId]) data[chatId] = { enabled: false, message: null };

        if (text.includes('on')) data[chatId].enabled = true;
        else if (text.includes('off')) data[chatId].enabled = false;
        else data[chatId].enabled = !data[chatId].enabled;

        saveData(data);

        await sock.sendMessage(chatId, {
            text: `✅ Welcome ${data[chatId].enabled ? 'ENABLED 🎉' : 'DISABLED ❌'}`
        });

    } catch (e) {
        console.log(e);
    }
}

// ===== COMMAND: .setwelcome =====
async function setwelcomeCommand(sock, chatId, message, text) {
    try {
        const sender = message.key.participant || message.key.remoteJid;
        const { isSenderAdmin } = await isAdmin(sock, chatId, sender);

        if (!isSenderAdmin && !message.key.fromMe) {
            return sock.sendMessage(chatId, { text: '❌ Admin only' });
        }

        let msg = text.replace('.setwelcome', '').trim();

        if (!msg) {
            return sock.sendMessage(chatId, {
                text: '❌ Example:\n.setwelcome Welcome {user} to {group} 🎉'
            });
        }

        let data = loadData();
        if (!data[chatId]) data[chatId] = {};

        data[chatId].message = msg;
        data[chatId].enabled = true;

        saveData(data);

        await sock.sendMessage(chatId, {
            text: '✅ Welcome message saved!'
        });

    } catch (e) {
        console.log(e);
    }
}

// ===== COMMAND: .resetwelcome =====
async function resetwelcomeCommand(sock, chatId) {
    let data = loadData();
    if (data[chatId]) {
        data[chatId].message = null;
        saveData(data);
    }

    await sock.sendMessage(chatId, {
        text: '✅ Welcome reset to default'
    });
}

// ===== EVENT JOIN =====
async function handleJoinEvent(sock, groupId, users) {
    try {
        let data = loadData();
        if (!data[groupId] || !data[groupId].enabled) return;

        const meta = await sock.groupMetadata(groupId);
        const group = meta.subject;
        const count = meta.participants.length;

        for (let user of users) {
            let msg = data[groupId].message || '👋 Welcome {user} to {group} 🎉';
            msg = format(msg, user, group, count);

            await sock.sendMessage(groupId, {
                image: { url: 'https://files.catbox.moe/6v6n9f.jpg' }, // unaweza badilisha picha
                caption: msg,
                mentions: [user]
            });
        }

    } catch (e) {
        console.log(e);
    }
}

module.exports = {
    welcomeCommand,
    setwelcomeCommand,
    resetwelcomeCommand,
    handleJoinEvent
};
