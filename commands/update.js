/**
 * Ultra Base Update Script
 * Provides a simple, reusable way to update chat/module configs
 */

const updateFeature = async (sock, chatId, featureName, sub, options = {}) => {
  const { botName, fake, isBotAdmin, isSenderAdmin, senderIsSudo } = options;

  // Load current config
  let config = getChatData(chatId, featureName, null) || { enabled: false };

  // Handle help/status
  if (!sub || sub === 'help') {
    return sock.sendMessage(chatId, {
      text: `┏✧ *${botName}* \n┃ *${featureName.toUpperCase()}*\n┃ *Status:* ${config.enabled ? 'ON' : 'OFF'}\n┃ *Mode:* ${config.action || 'NONE'}\n┗✧`
    }, { quoted: fake });
  }

  if (sub === 'status') {
    return sock.sendMessage(chatId, {
      text: `┏✧ *${botName}* \n┃ *${featureName} Status:*\n┃ ${config.enabled ? 'ACTIVE' : 'INACTIVE'}\n┃ ${config.enabled ? '*Mode*: ' + (config.action || 'default').toUpperCase() : ''}\n┗✧`
    }, { quoted: fake });
  }

  // Permission checks
  if (!isBotAdmin) {
    return sock.sendMessage(chatId, { text: `┏✧ *${botName}* \n┃ Bot needs admin!\n┗✧` }, { quoted: fake });
  }
  if (!isSenderAdmin && !senderIsSudo) {
    return sock.sendMessage(chatId, { text: `┏✧ *${botName}* \n┃ Admin only command!\n┗✧` }, { quoted: fake });
  }

  // Handle OFF
  if (sub === 'off') {
    updateChatData(chatId, featureName, { enabled: false });
    return sock.sendMessage(chatId, { text: `┏✧ *${botName}* \n┃ *${featureName} Disabled*\n┗✧` }, { quoted: fake });
  }

  // Valid actions
  const validActions = ['on', 'delete', 'kick'];
  if (!validActions.includes(sub)) {
    return sock.sendMessage(chatId, {
      text: `┏✧ *${botName}* \n┃ *Invalid option!*\n┃ *Use:* on, off, delete, kick, status\n┗✧`
    }, { quoted: fake });
  }

  // Normalize action
  const action = sub === 'on' ? (config.action || 'delete') : sub;
  updateChatData(chatId, featureName, { enabled: true, action });

  return sock.sendMessage(chatId, {
    text: `┏✧ *${botName}* \n┃ *${featureName} Enabled*\n┃ Mode: ${action.toUpperCase()}\n┗✧`
  }, { quoted: fake });
};

module.exports = { updateFeature };
