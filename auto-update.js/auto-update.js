const { exec } = require("child_process");

const repoUrl = "https://github.com/aryankingkilalu/ARYAN-MD";
const branch = "main"; // badilisha kama repo yako inatumia 'master'

function updateBot() {
    const updateScript = `
        git remote set-url origin ${repoUrl} &&
        git fetch origin ${branch} &&
        git reset --hard origin/${branch} &&
        git pull origin ${branch}
    `;

    exec(updateScript, (err, stdout, stderr) => {
        if (err) {
            console.error("❌ Update Failed:", err.message);
            return;
        }

        console.log(stdout || stderr);

        if (stdout.includes("Already up to date") || stderr.includes("Already up to date")) {
            console.log("✅ Bot is already up to date.");
            return;
        }

        console.log("📥 Update Downloaded Successfully!");

        // Install dependencies
        exec("npm install", { cwd: process.cwd() }, (installErr, installStdout, installStderr) => {
            if (installErr) {
                console.error("⚠️ Packages failed to install:", installErr.message);
                return;
            }

            console.log(installStdout || installStderr);
            console.log("🚀 Bot Updated! Restarting with PM2...");

            // Restart bot with PM2
            exec("pm2 restart ARYAN-MD || pm2 start index.js --name ARYAN-MD", { cwd: process.cwd() }, (pm2Err, pm2Stdout, pm2Stderr) => {
                if (pm2Err) {
                    console.error("⚠️ PM2 restart failed:", pm2Err.message);
                    return;
                }
                console.log(pm2Stdout || pm2Stderr);
                console.log("✅ Bot is running under PM2.");
            });
        });
    });
}

updateBot();
