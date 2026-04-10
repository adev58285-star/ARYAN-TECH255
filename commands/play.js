const fs = require("fs");
const axios = require("axios");
const yts = require("yt-search");
const path = require("path");

async function playCommand(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, {
            react: { text: "🎼", key: message.key }
        });

        const tempDir = path.join(__dirname, "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        const text =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            "";

        const parts = text.split(" ");
        const query = parts.slice(1).join(" ").trim();

        if (!query)
            return sock.sendMessage(
                chatId,
                { text: "🎵 Provide a song name!\nExample: .play Not Like Us" },
                { quoted: message }
            );

        if (query.length > 100)
            return sock.sendMessage(
                chatId,
                { text: "📝 Song name too long! Max 100 chars." },
                { quoted: message }
            );

        const search = await yts(`${query} official`);
        const video = search.videos[0];

        if (!video)
            return sock.sendMessage(
                chatId,
                { text: "😕 Couldn't find that song. Try another one!" },
                { quoted: message }
            );

        /* =========================
           KEITH APIs (PRIMARY + FALLBACK)
        ========================== */
        const apis = [
            `https://apiskeith.top/download/audio?url=${encodeURIComponent(video.url)}`,
            `https://apiskeith.vercel.app/download/audio?url=${encodeURIComponent(video.url)}`
        ];

        let apiData;
        for (const api of apis) {
            try {
                const res = await axios.get(api, { timeout: 60000 });
                if (res?.data?.status && res?.data?.result) {
                    apiData = res.data;
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!apiData) throw new Error("All audio APIs failed!");

        const timestamp = Date.now();
        const fileName = `audio_${timestamp}.mp3`;
        const filePath = path.join(tempDir, fileName);

        // Download MP3
        const audioStream = await axios({
            method: "get",
            url: apiData.result.url || apiData.result,
            responseType: "stream",
            timeout: 600000
        });

        const writer = fs.createWriteStream(filePath);
        audioStream.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0)
            throw new Error("Download failed or empty file!");

        await sock.sendMessage(chatId, {
            text: `Playing: \n ${apiData.result.title || video.title}`
        });

        await sock.sendMessage(
            chatId,
            {
                document: { url: filePath },
                mimetype: "audio/mpeg",
                fileName: `${(apiData.result.title || video.title).substring(0, 100)}.mp3`
            },
            { quoted: message }
        );

        // Cleanup
        fs.unlinkSync(filePath);

    } catch (error) {
        console.error("Play command error:", error);
        await sock.sendMessage(
            chatId,
            { text: `🚫 Error: ${error.message}` },
            { quoted: message }
        );
    }
}

module.exports = playCommand;
