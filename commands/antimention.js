name: 'antigroupmention',
    aliases: ['antgm', 'antigm'],
    category: 'group',
    description: 'Prevent group mention/status sharing',
    usage: '.antigroupmention <on|off|delete|kick|status>',
    groupOnly: true,
    execute: async (sock, message, args, context) => {
      const { chatId, senderId, senderIsSudo, isSenderAdmin, isBotAdmin } = context;
      const botName = getBotName();
      const fake = createFakeContact(message);
      const sub = (args[0] || '').toLowerCase();
      const prefix = getSetting('prefix', '.');

      if (!sub || sub === 'help') {
        const config = getChatData(chatId, 'antigroupmention', null) || { enabled: false };
        return sock.sendMessage(chatId, {
          text: `┏✧ *${botName}* \n┃ *Anti-Group Mention*\n┃ *Status:* ${config.enabled ? 'ON' : 'OFF'}\n┃ *Commands:*\n┃ ${prefix}antigroupmention on\n┃ ${prefix}antigroupmention off\n┃ ${prefix}antigroupmention delete\n┃ ${prefix}antigroupmention kick\n┃ ${prefix}antigroupmention status\n┗✧`
        }, { quoted: fake });
      }

      if (sub === 'status') {
        const config = getChatData(chatId, 'antigroupmention', null) || { enabled: false };
        return sock.sendMessage(chatId, {
          text: `┏✧ *${botName}* \n┃ *Anti-Group Mention:*\n┃ ${config.enabled ? 'ACTIVE' : 'INACTIVE'}\n┃ ${config.enabled ? '*Mode*: ' + (config.action || 'delete').toUpperCase() : ''}\n┗✧`
        }, { quoted: fake });
      }

      if (!isBotAdmin) {
        return sock.sendMessage(chatId, {
          text: `┏✧ *${botName}* \n┃ Bot needs admin!\n┗✧`
        }, { quoted: fake });
      }

      if (!isSenderAdmin && !senderIsSudo) {
        return sock.sendMessage(chatId, {
          text: `┏✧ *${botName}* \n┃ Admin only command!\n┗✧`
        }, { quoted: fake });
      }

      if (sub === 'off') {
        updateChatData(chatId, 'antigroupmention', { enabled: false });
        return sock.sendMessage(chatId, {
          text: `┏✧ *${botName}* \n┃ *Anti-Group Mention Disabled*\n┗✧`
        }, { quoted: fake });
      }

      const validActions = ['on', 'delete', 'kick', 'remove'];
      if (!validActions.includes(sub)) {
        return sock.sendMessage(chatId, {
          text: `┏✧ *${botName}* \n┃ *Invalid option!*\n┃ *Use:* on, off, delete, kick\n┗✧`
        }, { quoted: fake });
      }

      const action = sub === 'on' ? 'delete' : sub;
      updateChatData(chatId, 'antigroupmention', { enabled: true, action });
      return sock.sendMessage(chatId, {
        text: `┏✧ *${botName}* \n┃ *Anti-Group Mention Enabled*\n┃ Mode: ${action.toUpperCase()}\n┗✧`
      }, { quoted: fake });
    }
  },
