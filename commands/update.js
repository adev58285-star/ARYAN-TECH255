
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
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
try { await run('git --version'); return true; } catch { return false; }
}

async function updateViaGit() {
const oldRev = String(await run('git rev-parse HEAD').catch(() => 'unknown')).trim();
await run('git fetch --all --prune');
const newRev = String(await run('git rev-parse origin/main')).trim();
const alreadyUpToDate = oldRev === newRev;
const commits = alreadyUpToDate ? '' : await run(git log --pretty=format:"%h %s (%an)" ${oldRev}..${newRev}).catch(() => '');
const files = alreadyUpToDate ? '' : await run(git diff --name-status ${oldRev} ${newRev}).catch(() => '');
await run(git reset --hard ${newRev});
await run('git clean -fd');
return { oldRev, newRev, alreadyUpToDate, commits, files };
}

function downloadFile(url, dest, visited = new Set()) {
return new Promise((resolve, reject) => {
try {
if (visited.has(url) || visited.size > 5) return reject(new Error('Too many redirects'));
visited.add(url);
const client = url.startsWith('https://') ? https : http;
const req = client.get(url, { headers: { 'User-Agent': 'Bot-Updater/1.0', 'Accept': '/' } }, (res) => {
if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
const location = res.headers.location;
if (!location) return reject(new Error(HTTP ${res.statusCode} without Location));
const nextUrl = new URL(location, url).toString();
res.resume();
return downloadFile(nextUrl, dest, visited).then(resolve).catch(reject);
}
if (res.statusCode !== 200) return reject(new Error(HTTP ${res.statusCode}));
const file = fs.createWriteStream(dest);
res.pipe(file);
file.on('finish', () => file.close(resolve));
file.on('error', (err) => {
try { file.close(() => {}); } catch {}
fs.unlink(dest, () => reject(err));
});
});
req.on('error', (err) => { fs.unlink(dest, () => reject(err)); });
} catch (e) { reject(e); }
});
}

async function extractZip(zipPath, outDir) {
try { await run(unzip -o "${zipPath}" -d "${outDir}"); return; } catch {}
try { await run(7z x -y "${zipPath}" -o"${outDir}"); return; } catch {}
try { await run(busybox unzip -o "${zipPath}" -d "${outDir}"); return; } catch {}
throw new Error('No unzip tool found. Install unzip or use git.');
}

function copyRecursive(src, dest, ignore = [], relative = '', outList = []) {
if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
for (const entry of fs.readdirSync(src)) {
if (ignore.includes(entry)) continue;
const s = path.join(src, entry);
const d = path.join(dest, entry);
const stat = fs.lstatSync(s);
if (stat.isDirectory()) {
copyRecursive(s, d, ignore, path.join(relative, entry), outList);
} else {
fs.copyFileSync(s, d);
if (outList) outList.push(path.join(relative, entry).replace(/\/g, '/'));
}
}
}

async function updateViaZip(zipArg) {
const zipUrl = (zipArg || settings.updateZipUrl || process.env.UPDATE_ZIP_URL || '').trim();
if (!zipUrl) throw new Error('No ZIP URL configured. Set updateZipUrl in settings.js or UPDATE_ZIP_URL env var.');
const tmpDir = path.join(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
const zipPath = path.join(tmpDir, 'update.zip');
await downloadFile(zipUrl, zipPath);
const extractTo = path.join(tmpDir, 'update_extract');
if (fs.existsSync(extractTo)) fs.rmSync(extractTo, { recursive: true, force: true });
await extractZip(zipPath, extractTo);
const entries = fs.readdirSync(extractTo).map(n => path.join(extractTo, n));
const srcRoot = entries.length === 1 && fs.lstatSync(entries[0]).isDirectory() ? entries[0] : extractTo;
const ignore = ['node_modules', '.git', 'session', 'tmp', 'temp', 'data', 'baileys_store.json'];
const copied = [];
copyRecursive(srcRoot, process.cwd(), ignore, '', copied);
try { fs.rmSync(extractTo, { recursive: true, force: true }); } catch {}
try { fs.rmSync(zipPath, { force: true }); } catch {}
return { copiedFiles: copied };
}

async function restartProcess() {
try {
const child = spawn(process.execPath, process.argv.slice(1), {
detached: true, stdio: 'ignore', cwd: process.cwd(), env: process.env
});
child.unref();
setTimeout(() => process.exit(0), 1500);
} catch {
setTimeout(() => process.exit(0), 500);
}
}

async function updateCommand(sock, chatId, message, senderIsSudo, zipArg) {
if (!message.key.fromMe && !senderIsSudo) {
return sock.sendMessage(chatId, { text: '❌ This command is for the owner only!' }, { quoted: message });
}
try {
await sock.sendMessage(chatId, { text: '🔄 Checking for updates, please wait…' }, { quoted: message });
let summary = '';

if (await hasGitRepo()) {  
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
                if (String(files).split('\n').length > 8) summary += `\n... and more`;  
            }  
        }  
        try { await run('npm install --no-audit --no-fund'); } catch {}  
    } else {  
        const { copiedFiles } = await updateViaZip(zipArg);  
        summary = `✅ Updated from ZIP!\n📁 Files updated: ${copiedFiles.length}`;  
        if (copiedFiles.length > 0) {  
            const shown = copiedFiles.slice(0, 8);  
            summary += `\n\n${shown.map(f => `• ${f}`).join('\n')}`;  
            if (copiedFiles.length > 8) summary += `\n... and ${copiedFiles.length - 8} more`;  
        }  
    }  

    summary += `\n\n🔖 Version: ${settings.version || 'unknown'}`;  
    await sock.sendMessage(chatId, { text: `${summary}\n\n♻️ Restarting bot...` }, { quoted: message });  
    await new Promise(r => setTimeout(r, 1000));  
    await restartProcess();  
} catch (err) {  
    console.error('Update failed:', err);  
    await sock.sendMessage(chatId, { text: `❌ Update failed:\n${String(err.message || err)}` }, { quoted: message });  
}

}

module.exports = updateCommand;
