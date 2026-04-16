const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

async function gitcloneCommand(sock, chatId, message) {
    const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const repoUrl = text.split(/\s+/).slice(1).join('').trim();

    if (!repoUrl) {
        return sock.sendMessage(chatId, {
            text: '*❌ Please provide a Git repository URL.*\n\n_Usage:_ `.gitclone https://github.com/user/repo`'
        }, { quoted: message });
    }

    // Extract repo name from URL with or without .git suffix
    const repoNameMatch = repoUrl.match(/\/([^\/]+?)(\.git)?$/);
    if (!repoNameMatch) {
        return sock.sendMessage(chatId, {
            text: '❌ Invalid Git repository URL.'
        }, { quoted: message });
    }

    const repoName = repoNameMatch[1];
    const reposDir = path.resolve(__dirname, '../repos');
    const targetPath = path.join(reposDir, repoName);

    if (!fs.existsSync(reposDir)) {
        fs.mkdirSync(reposDir, { recursive: true });
    }

    await sock.sendMessage(chatId, {
        text: `⏳ Cloning *${repoName}*...\n${repoUrl}`
    }, { quoted: message });

    // Use array args to prevent shell injection
    exec(`git clone "${repoUrl}" "${targetPath}"`, { timeout: 60000 }, async (error, stdout, stderr) => {
        if (error) {
            const reason = stderr?.trim() || error.message;
            return sock.sendMessage(chatId, {
                text: `❌ Clone failed:\n\`\`\`${reason}\`\`\``
            }, { quoted: message });
        }

        let reply = `✅ Successfully cloned *${repoName}*`;
        if (stderr?.trim()) reply += `\n\n⚠️ Notes:\n\`\`\`${stderr.trim()}\`\`\``;
        if (stdout?.trim()) reply += `\n\n📄 Output:\n\`\`\`${stdout.trim()}\`\`\``;

        await sock.sendMessage(chatId, { text: reply }, { quoted: message });
    });
}

module.exports = gitcloneCommand;
