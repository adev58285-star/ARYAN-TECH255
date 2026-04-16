const { isJidGroup } = require('@whiskeysockets/baileys');
const { getAntilink, incrementWarningCount, resetWarningCount, isSudo } = require('../lib/index');
const config = require('../config');

const WARN_COUNT = config.WARN_COUNT || 3;

/**
 * Checks if a string contains a URL.
 *
 * @param {string} str - The string to check.
 * @returns {boolean} - True if the string contains a URL, otherwise false.
 */
function containsURL(str) {
        // Require protocol or www prefix to avoid false positives on normal text
        const urlRegex = /(https?:\/\/|www\.)[^\s]+/i;
        // Also catch bare WhatsApp / Telegram invite links without a protocol
        const knownLinks = /(chat\.whatsapp\.com|wa\.me|t\.me|telegram\.me)\/[^\s]+/i;
        return urlRegex.test(str) || knownLinks.test(str);
}

/**
 * Handles the Antilink functionality for group chats.
 *
 * @param {object} msg - The message object to process.
 * @param {object} sock - The socket object to use for sending messages.
 */
async function Antilink(msg, sock) {
        const jid = msg.key.remoteJid;
        if (!isJidGroup(jid)) return;

        const SenderMessage = msg.message?.conversation || 
                                                 msg.message?.extendedTextMessage?.text || '';
        if (!SenderMessage || typeof SenderMessage !== 'string') return;

        const sender = msg.key.participant;
        if (!sender) return;

        // Skip if sender is owner/sudo
        const senderIsSudo = await isSudo(sender);
        if (senderIsSudo) return;

        // Skip if sender is a group admin
        try {
            const meta = await sock.groupMetadata(jid);
            const adminJids = meta.participants
                .filter(p => p.admin)
                .map(p => p.id);
            if (adminJids.includes(sender)) return;
        } catch {}

        if (!containsURL(SenderMessage.trim())) return;
        
        const antilinkConfig = await getAntilink(jid, 'on');
        if (!antilinkConfig) return;

        const action = antilinkConfig.action;
        
        try {
                // Delete message first
                await sock.sendMessage(jid, { delete: msg.key });

                switch (action) {
                        case 'delete':
                                await sock.sendMessage(jid, { 
                                        text: `\`\`\`@${sender.split('@')[0]} link are not allowed here\`\`\``,
                                        mentions: [sender] 
                                });
                                break;

                        case 'kick':
                                await sock.groupParticipantsUpdate(jid, [sender], 'remove');
                                await sock.sendMessage(jid, {
                                        text: `\`\`\`@${sender.split('@')[0]} has been kicked for sending links\`\`\``,
                                        mentions: [sender]
                                });
                                break;

                        case 'warn':
                                const warningCount = await incrementWarningCount(jid, sender);
                                if (warningCount >= WARN_COUNT) {
                                        await sock.groupParticipantsUpdate(jid, [sender], 'remove');
                                        await resetWarningCount(jid, sender);
                                        await sock.sendMessage(jid, {
                                                text: `\`\`\`@${sender.split('@')[0]} has been kicked after ${WARN_COUNT} warnings\`\`\``,
                                                mentions: [sender]
                                        });
                                } else {
                                        await sock.sendMessage(jid, {
                                                text: `\`\`\`@${sender.split('@')[0]} warning ${warningCount}/${WARN_COUNT} for sending links\`\`\``,
                                                mentions: [sender]
                                        });
                                }
                                break;
                }
        } catch (error) {
                console.error('Error in Antilink:', error);
        }
}

module.exports = { Antilink };