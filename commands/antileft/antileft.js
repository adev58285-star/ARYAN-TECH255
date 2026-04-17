const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/antileft.json');

// Load data
function loadData() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE));
    } catch {
        return {};
    }
}

// Save data
function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// COMMAND HANDLER
async function handleAntiLeftCommand(sock, chatId, message, match, senderId) {
    const data = loadData();

    if (!data[chatId]) data[chatId] = false;

    if (match === 'on') {
        data[chatId] = true;
        saveData(data);

        return sock.sendMessage(chatId, {
            text: '✅ Anti-Left imewashwa. Hakuna kutoka 😈'
        }, { quoted: message });
    }

    if (match === 'off') {
        data[chatId] = false;
        saveData(data);

        return sock.sendMessage(chatId, {
            text: '❌ Anti-Left imezimwa.'
        }, { quoted: message });
    }
}

// GROUP UPDATE HANDLER
async function handleAntiLeft(sock, update) {
    const data = loadData();

    const { id, participants, action } = update;

    if (!data[id]) return;

    // Detect leave
    if (action === 'remove') {
        for (let user of participants) {
            try {
                // Rudisha user
                await sock.groupParticipantsUpdate(id, [user], 'add');

                // Tuma message
                await sock.sendMessage(id, {
                    text: `🚫 @${user.split('@')[0]} huruhusiwi kutoka kwenye group 😏`,
                    mentions: [user]
                });

            } catch (e) {
                console.log('Failed to re-add:', user);
            }
        }
    }
}

module.exports = {
    handleAntiLeftCommand,
    handleAntiLeft
};
