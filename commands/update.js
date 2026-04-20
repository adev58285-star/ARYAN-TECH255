{
    name: 'restart',
    category: 'owner',
    description: 'Restart the bot',
    ownerOnly: true,
    execute: async (sock, message, args, context) => {
      const { chatId, senderId, senderIsSudo } = context;
      const botName = getBotName();
      const fake = createFakeContact(message);

      if (!senderIsSudo) return sock.sendMessage(chatId, { text: `┏✧ *${botName}*\n┃ Owner only!\n┗✧` }, { quoted: fake });

      await sock.sendMessage(chatId, { text: `┏✧ *${botName}*\n┃ 🔄 Restarting system...\n┃ Please wait a moment.\n┗✧`, ...channelInfo }, { quoted: fake });
      setTimeout(() => process.exit(0), 1000);
    }
  },
