const fs = require('fs');
const path = require('path');

const OWNER_NUMBER_FILE = path.join(__dirname, '..', 'data', 'ownernumber.json');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(OWNER_NUMBER_FILE)) {
    fs.writeFileSync(OWNER_NUMBER_FILE, JSON.stringify({ ownerNumber: '' }, null, 2));
}

function getOwnerNumber() {
    try {
        const data = JSON.parse(fs.readFileSync(OWNER_NUMBER_FILE, 'utf8'));
        return data.ownerNumber || '';
    } catch (error) {
        console.error('Error reading owner number file:', error);
        return '';
    }
}

function setOwnerNumber(number) {
    try {
        if (!number) return false;
        fs.writeFileSync(OWNER_NUMBER_FILE, JSON.stringify({ ownerNumber: number }, null, 2));
        return true;
    } catch (error) {
        console.error('Error setting owner number:', error);
        return false;
    }
}

async function handleSetOwnerNumberCommand(sock, chatId, senderId, message, userMessage, prefix) {
    if (!message.key.fromMe) {
        await sock.sendMessage(chatId, { text: '❌ Only bot owner can change the owner number!' });
        return;
    }

    const args = userMessage.split(' ').slice(1);
    const newNumber = args.join('').replace(/[^0-9]/g, '');

    if (!newNumber) {
        const current = getOwnerNumber();
        await sock.sendMessage(chatId, {
            text: `📱 Current Owner Number: *${current || 'Not set'}*\n\nUsage: ${prefix}setownernumber <number>\nExample: ${prefix}setownernumber 1234567890`
        });
        return;
    }

    const success = setOwnerNumber(newNumber);
    await sock.sendMessage(chatId, {
        text: success
            ? `✅ Owner number set to: *${newNumber}*`
            : '❌ Failed to set owner number!'
    });
}

module.exports = {
    getOwnerNumber,
    setOwnerNumber,
    handleSetOwnerNumberCommand
};
