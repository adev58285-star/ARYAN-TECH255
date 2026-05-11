const {
    downloadContentFromMessage,
    generateWAMessageContent,
    generateWAMessageFromContent
} = require('@whiskeysockets/baileys');

const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');

async function setGroupStatusCommand(sock, chatId, msg) {
    try {

        // OWNER CHECK
        if (!msg.key.fromMe) {
            await sock.sendMessage(chatId, {
                text: '❌ Only owner can use this command!'
            });
            return;
        }

        const messageText =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            '';

        const quotedMessage =
            msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        const commandRegex = /^[.!#/]?(togstatus|swgc|groupstatus)\s*/i;

        // REMOVE COMMAND
        const fullText = messageText.replace(commandRegex, '').trim();

        let caption = '';

        // CAPTION SUPPORT
        if (fullText.includes('|')) {
            const parts = fullText.split('|');
            parts.shift();
            caption = parts.join('|').trim();
        } else {
            caption = fullText.trim();
        }

        caption = caption.replace(commandRegex, '').trim();

        let payload = {};

        // =========================
        // IMAGE
        // =========================
        if (quotedMessage?.imageMessage) {

            const stream = await downloadContentFromMessage(
                quotedMessage.imageMessage,
                'image'
            );

            let buffer = Buffer.from([]);

            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            console.log('IMAGE BUFFER:', buffer.length);

            payload = {
                image: buffer,
                caption: caption || '',
                mimetype: 'image/jpeg'
            };

        }

        // =========================
        // VIDEO
        // =========================
        else if (quotedMessage?.videoMessage) {

            const stream = await downloadContentFromMessage(
                quotedMessage.videoMessage,
                'video'
            );

            let buffer = Buffer.from([]);

            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            payload = {
                video: buffer,
                caption: caption || '',
                mimetype: 'video/mp4'
            };

        }

        // =========================
        // AUDIO
        // =========================
        else if (quotedMessage?.audioMessage) {

            const stream = await downloadContentFromMessage(
                quotedMessage.audioMessage,
                'audio'
            );

            let buffer = Buffer.from([]);

            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const audioVn = await toVN(buffer);

            payload = {
                audio: audioVn,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true
            };

        }

        // =========================
        // STICKER
        // =========================
        else if (quotedMessage?.stickerMessage) {

            const stream = await downloadContentFromMessage(
                quotedMessage.stickerMessage,
                'sticker'
            );

            let buffer = Buffer.from([]);

            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            payload = {
                sticker: buffer
            };

        }

        // =========================
        // TEXT
        // =========================
        else {

            payload = {
                text: caption || '‎'
            };

        }

        // SEND STATUS
        await sendGroupStatus(sock, chatId, payload);

        // SUCCESS MESSAGE
        let mediaType = 'Text';

        if (quotedMessage?.imageMessage) mediaType = 'Image';
        else if (quotedMessage?.videoMessage) mediaType = 'Video';
        else if (quotedMessage?.audioMessage) mediaType = 'Audio';
        else if (quotedMessage?.stickerMessage) mediaType = 'Sticker';

        await sock.sendMessage(chatId, {
            text:
                `✅ ${mediaType} status sent successfully!` +
                (caption ? `\n📝 Caption: ${caption}` : '')
        });

    } catch (err) {

        console.error('GROUP STATUS ERROR:', err);

        await sock.sendMessage(chatId, {
            text: `❌ Error:\n${err.message}`
        });

    }
}

// ========================================
// SEND GROUP STATUS
// ========================================

async function sendGroupStatus(conn, jid, content) {

    const messageSecret = crypto.randomBytes(32);

    const waMessage = await generateWAMessageContent(
        content,
        {
            upload: conn.waUploadToServer
        }
    );

    const m = generateWAMessageFromContent(
        jid,
        {
            groupStatusMessageV2: {
                message: waMessage
            },
            messageContextInfo: {
                messageSecret
            }
        },
        {}
    );

    await conn.relayMessage(
        jid,
        m.message,
        {
            messageId: m.key.id
        }
    );

    return m;
}

// ========================================
// AUDIO TO VOICE NOTE
// ========================================

async function toVN(inputBuffer) {

    return new Promise((resolve, reject) => {

        const inStream = new PassThrough();
        inStream.end(inputBuffer);

        const outStream = new PassThrough();

        const chunks = [];

        ffmpeg(inStream)
            .noVideo()
            .audioCodec('libopus')
            .format('ogg')
            .audioBitrate('48k')
            .audioChannels(1)
            .audioFrequency(48000)

            .on('error', reject)

            .on('end', () => {
                resolve(Buffer.concat(chunks));
            })

            .pipe(outStream, { end: true });

        outStream.on('data', chunk => {
            chunks.push(chunk);
        });

    });

}

module.exports = setGroupStatusCommand;
