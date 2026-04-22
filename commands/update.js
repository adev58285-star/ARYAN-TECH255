const { exec } = require('child_process');

module.exports = {
    name: "update",
    alias: ["upd"],
    desc: "Update bot safely",
    category: "owner",
    owner: true,

    async start(m, { sock, chatId, senderId }) {
        try {
            await sock.sendMessage(chatId, { text: "🔄 Updating bot..." });

            exec("git reset --hard && git pull origin main", (err, stdout, stderr) => {

                if (err) {
                    console.log(err);
                    return sock.sendMessage(chatId, { text: "❌ Git pull failed\n" + err.message });
                }

                exec("npm install", (err2, stdout2, stderr2) => {

                    if (err2) {
                        console.log(err2);
                        return sock.sendMessage(chatId, { text: "❌ NPM install failed\n" + err2.message });
                    }

                    sock.sendMessage(chatId, {
                        text: "✅ Update complete!\n♻️ Restarting..."
                    });

                    setTimeout(() => {
                        process.exit(0);
                    }, 2000);
                });
            });

        } catch (e) {
            console.log(e);
            sock.sendMessage(chatId, { text: "❌ Update error:\n" + e.message });
        }
    }
};
