const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadJson(file) {
    const filePath = path.join(DATA_DIR, file);
    try {
        if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '{}');
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch { return {}; }
}
function saveJson(file, data) {
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

async function antileftCommand(sock, chatId, message, match) {
    const { isSenderAdmin, isGroup } = match;
    if (!isGroup) return await sock.sendMessage(chatId, { text: '❌ Groups only' }, { quoted: message });
    if (!isSenderAdmin) return await sock.sendMessage(chatId, { text: '❌ Admins only' }, { quoted: message });

    const config = loadJson('antileft.json');
    const groupCfg = config[chatId] || { enabled: false, mode: 'add' };
    const action = match.args[0]?.toLowerCase();

    const reply = async (text) => {
        await sock.sendMessage(chatId, { text }, { quoted: message });
    };

    if (!action) {
        const status = groupCfg.enabled? '✅ ON' : '❌ OFF';
        const mode = groupCfg.mode === 'add'? 'Add back' : 'Warn only';
        return reply(`🛡️ *Antileft*\n\nStatus: ${status}\nMode: ${mode}\n\n.antileft on\n.antileft warn\n.antileft off`);
    }

    if (action === 'on') {
        groupCfg.enabled = true;
        groupCfg.mode = 'add';
        config[chatId] = groupCfg;
        saveJson('antileft.json', config);
        return reply('✅ Antileft on. Users will be added back.');
    }

    if (action === 'warn') {
        groupCfg.enabled = true;
        groupCfg.mode = 'warn';
        config[chatId] = groupCfg;
        saveJson('antileft.json', config);
        return reply('⚠️ Antileft warn mode. Users will be warned.');
    }

    if (action === 'off') {
        groupCfg.enabled = false;
        config[chatId] = groupCfg;
        saveJson('antileft.json', config);
        return reply('✅ Antileft disabled.');
    }
}

async function handleAntileftLeave(sock, chatId, participants) {
    const config = loadJson('antileft.json');
    const groupCfg = config[chatId];
    if (!groupCfg?.enabled) return;

    for (const jid of participants) {
        const mention = `@${jid.split('@')[0]}`;
        if (groupCfg.mode === 'add') {
            await sock.sendMessage(chatId, { text: `🛡️ *ANTILEFT*\n${mention} can't leave.`, mentions: [jid] });
            setTimeout(async () => {
                try {
                    await sock.groupParticipantsUpdate(chatId, [jid], 'add');
                } catch {
                    await sock.sendMessage(chatId, { text: `❌ Failed to add back ${mention}` });
                }
            }, 2000);
        } else {
            await sock.sendMessage(chatId, { text: `⚠️ ${mention} left. Leaving not allowed.`, mentions: [jid] });
        }
    }
}

module.exports = { antileftCommand, handleAntileftLeave };