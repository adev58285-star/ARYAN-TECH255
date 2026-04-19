const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const settings = require('../settings');

function run(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
            if (err) return reject(new Error((stderr || stdout || err.message || '').toString()));
            resolve((stdout || '').toString());
        });
    });
}

async function hasGitRepo() {
    const gitDir = path.join(process.cwd(), '.git');
    if (!fs.existsSync(gitDir)) return false;
    try { 
        await run('git --version'); 
        return true; 
    } catch { 
        return false; 
    }
}

async function updateViaGit() {
    const oldRev = String(await run('git rev-parse HEAD').catch(() => 'unknown')).trim();

    await run('git fetch --all --prune');

    const newRev = String(await run('git rev-parse origin/main')).trim();

    const alreadyUpToDate = oldRev === newRev;

    const commits = alreadyUpToDate ? '' : await run(`git log --pretty=format:"%h %s (%an)" ${oldRev}..${newRev}`).catch(() => '');
    const files = alreadyUpToDate ? '' : await run(`git diff --name-status ${oldRev} ${newRev}`).catch(() => '');

    await run(`git reset --hard ${newRev}`);
    await run('git clean -fd');

    return { oldRev, newRev, alreadyUpToDate, commits, files };
}

async function restartProcess() {
    try {
        const child = spawn(process.execPath, process.argv.slice(1), {
            detached: true,
            stdio: 'ignore',
            cwd: process.cwd(),
            env: process.env
        });
        child.unref();
        setTimeout(() => process.exit(0), 1500);
    } catch {
        setTimeout(() => process.exit(0), 500);
    }
}

async function updateCommand(sock, chatId, message, senderIsSudo) {
    if (!message.key.fromMe && !senderIsSudo) {
        return sock.sendMessage(chatId, { 
            text: '❌ This command is for the owner only!' 
        }, { quoted: message });
    }

    try {
        await sock.sendMessage(chatId, { 
            text: '🔄 Checking for updates, please wait…' 
        }, { quoted: message });

        // 🔴 Heroku requires Git
        if (!(await hasGitRepo())) {
            throw new Error('Git repo not found. Please deploy via GitHub on Heroku.');
        }

        let summary = '';

        const { oldRev, newRev, alreadyUpToDate, commits, files } = await updateViaGit();

        if (alreadyUpToDate) {
            summary = `✅ Already up to date!\nCurrent: ${newRev.substring(0, 7)}`;
        } else {
            summary = `✅ Updated successfully!\n\n📌 Old: ${oldRev.substring(0, 7)}\n📌 New: ${newRev.substring(0, 7)}\n\n`;

            if (commits) {
                const lines = String(commits).split('\n').slice(0, 5);
                summary += `📝 Commits:\n${lines.map(c => `• ${c}`).join('\n')}\n\n`;
            }

            if (files) {
                const lines = String(files).split('\n').slice(0, 8);
                summary += `📁 Changed files:\n${lines.map(f => `• ${f}`).join('\n')}`;
                if (String(files).split('\n').length > 8) {
                    summary += `\n... and more`;
                }
            }
        }

        // install dependencies (safe)
        try { 
            await run('npm install --no-audit --no-fund'); 
        } catch {}

        summary += `\n\n🔖 Version: ${settings.version || 'unknown'}`;

        await sock.sendMessage(chatId, { 
            text: `${summary}\n\n♻️ Restarting bot...` 
        }, { quoted: message });

        await new Promise(r => setTimeout(r, 1000));

        await restartProcess();

    } catch (err) {
        console.error('Update failed:', err);

        await sock.sendMessage(chatId, { 
            text: `❌ Update failed:\n${String(err.message || err)}` 
        }, { quoted: message });
    }
}

module.exports = updateCommand;
