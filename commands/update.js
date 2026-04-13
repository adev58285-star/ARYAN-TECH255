const { exec } = require('child_process');
const fs = require('fs');

function run(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (err) return reject(stderr || err.message);
            resolve(stdout.toString());
        });
    });
}

// CHECK UPDATE
async function checkForUpdates() {
    try {
        await run('git fetch');
        
        let local = await run('git rev-parse HEAD');
        let remote;

        try {
            remote = await run('git rev-parse origin/main');
        } catch {
            remote = await run('git rev-parse origin/master');
        }

        return local.trim() !== remote.trim();
    } catch {
        return false;
    }
}

// BACKUP
function backupBot() {
    try {
        if (!fs.existsSync('./backup')) {
            fs.mkdirSync('./backup');
        }

        const name = `backup-${Date.now()}.zip`;

        exec(`zip -r backup/${name} . -x "node_modules/*"`, () => {});
    } catch {}
}

// UPDATE
async function autoUpdate(sock) {
    try {
        const hasUpdate = await checkForUpdates();

        if (!hasUpdate) return;

        console.log('🔥 NEW UPDATE DETECTED');

        backupBot();

        await run('git reset --hard');
        await run('git pull');
        await run('npm install --omit=dev');

        console.log('✅ UPDATED! Restarting...');

        if (sock?.ws) sock.ws.close();

        setTimeout(() => process.exit(0), 2000);

    } catch (e) {
        console.log('AUTO UPDATE ERROR:', e);
    }
}

module.exports = { autoUpdate };
