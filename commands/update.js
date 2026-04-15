import config from '../config.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import AdmZip from 'adm-zip';

// download zip
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {

            // handle redirect (important)
            if ([301,302,303,307,308].includes(res.statusCode)) {
                return downloadFile(res.headers.location, dest)
                    .then(resolve)
                    .catch(reject);
            }

            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode}`));
            }

            const file = fs.createWriteStream(dest);
            res.pipe(file);

            file.on('finish', () => file.close(resolve));
            file.on('error', reject);
        }).on('error', reject);
    });
}

// unzip (heroku safe)
function extractZip(zipPath, outDir) {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(outDir, true);
}

// copy files
function copyRecursive(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    for (const file of fs.readdirSync(src)) {

        // ignore hizi
        if (['node_modules', '.git', 'session', 'temp'].includes(file)) continue;

        const s = path.join(src, file);
        const d = path.join(dest, file);

        if (fs.lstatSync(s).isDirectory()) {
            copyRecursive(s, d);
        } else {
            fs.copyFileSync(s, d);
        }
    }
}

export default {
    command: 'update',
    aliases: ['upgrade'],
    ownerOnly: true,

    async handler(sock, message, args) {
        const chatId = message.key.remoteJid;

        try {
            await sock.sendMessage(chatId, {
                text: '🔄 Updating bot kutoka GitHub...'
            });

            const zipUrl =
                args[0] ||
                config.updateZipUrl ||
                process.env.UPDATE_ZIP_URL ||
                'https://github.com/adev58285-star/ARYAN-TECH255/archive/refs/heads/main.zip';

            const tmpDir = './temp';
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

            const zipPath = path.join(tmpDir, 'update.zip');
            const extractPath = path.join(tmpDir, 'files');

            // download
            await downloadFile(zipUrl, zipPath);

            // clean old
            if (fs.existsSync(extractPath)) {
                fs.rmSync(extractPath, { recursive: true, force: true });
            }

            // unzip
            extractZip(zipPath, extractPath);

            // get folder
            const folders = fs.readdirSync(extractPath);
            if (!folders.length) throw new Error('ZIP haina files');

            const source = path.join(extractPath, folders[0]);

            // copy
            copyRecursive(source, process.cwd());

            await sock.sendMessage(chatId, {
                text: '✅ Update imekamilika!\n♻️ Bot ina-restart...'
            });

            // restart heroku
            setTimeout(() => process.exit(1), 2000);

        } catch (err) {
            await sock.sendMessage(chatId, {
                text: '❌ Update failed:\n' + err.message
            });
        }
    }
};
