// Welcome commands
case userMessage.startsWith(`${prefix}welcome`):
    await welcomeCommand(sock, chatId, message);
    commandExecuted = true;
    break;

case userMessage.startsWith(`${prefix}setwelcome`):
    await setwelcomeCommand(sock, chatId, senderId, message, userMessage);
    commandExecuted = true;
    break;

case userMessage === `${prefix}showwelcome`:
    await showsettingsCommand(sock, chatId, message, 'welcome');
    commandExecuted = true;
    break;

case userMessage === `${prefix}resetwelcome`:
    await resetCommand(sock, chatId, senderId, message, 'welcome');
    commandExecuted = true;
    break;

// Goodbye commands
case userMessage.startsWith(`${prefix}goodbye`):
    await goodbyeCommand(sock, chatId, message);
    commandExecuted = true;
    break;

case userMessage.startsWith(`${prefix}setgoodbye`):
    await setgoodbyeCommand(sock, chatId, senderId, message, userMessage);
    commandExecuted = true;
    break;

case userMessage === `${prefix}showgoodbye`:
    await showsettingsCommand(sock, chatId, message, 'goodbye');
    commandExecuted = true;
    break;

case userMessage === `${prefix}resetgoodbye`:
    await resetCommand(sock, chatId, senderId, message, 'goodbye');
    commandExecuted = true;
    break;