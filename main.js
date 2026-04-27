/*************************************
* Raw Output Suppression Code
*************************************/

const originalWrite = process.stdout.write;
process.stdout.write = function (chunk, encoding, callback) {
    const message = chunk.toString();
    if (message.includes('Closing session: SessionEntry') || message.includes('SessionEntry {')) {
        return;
    }
    return originalWrite.apply(this, arguments);
};

const originalWriteError = process.stderr.write;
process.stderr.write = function (chunk, encoding, callback) {
    const message = chunk.toString();
    if (message.includes('Closing session: SessionEntry')) {
        return;
    }
    return originalWriteError.apply(this, arguments);
};

const originalLog = console.log;
console.log = function (message,...optionalParams) {
    if (typeof message === 'string' && message.startsWith('Closing session: SessionEntry')) {
        return;
    }
    originalLog.apply(console, [message,...optionalParams]);
};

/*━━━━━━━━━━━━━━━━━━━━*/
// -----Core imports first-----
/*━━━━━━━━━━━━━━━━━━━━*/
const settings = require('./settings');
require('./config.js');
const { isBanned } = require('./lib/isBanned');
const yts = require('yt-search');
const { fetchBuffer } = require('./lib/myfunc');
const fs = require('fs');
const fetch = require('node-fetch');
const ytdl = require('ytdl-core');
const path = require('path');
const chalk = require('chalk');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const { jidDecode } = require('@whiskeysockets/baileys');
const { isSudo } = require('./lib/index');
const isOwnerOrSudo = require('./lib/isOwner');
const isAdmin = require('./lib/isAdmin');
const { tictactoeCommand, handleTicTacToeMove } = require('./commands/tictactoe');
const { normalizeJid, compareJids } = require('./lib/jid');
const { createFakeContact } = require('./lib/fakeContact');
const moment = require('moment-timezone');
const lolcatjs = require('lolcatjs');

const timezones = settings.timezone || 'Africa/Nairobi';

const _cache = {
    groupMeta: new Map(),
    groupMetaTTL: 120000,
    modeData: null,
    modeDataTime: 0,
    modeDataTTL: 5000
};

function getCachedGroupMeta(sock, chatId) {
    const cached = _cache.groupMeta.get(chatId);
    if (cached && Date.now() - cached.time < _cache.groupMetaTTL) {
        return Promise.resolve(cached.data);
    }
    return sock.groupMetadata(chatId).then(data => {
        _cache.groupMeta.set(chatId, { data, time: Date.now() });
        if (_cache.groupMeta.size > 200) {
            const oldest = _cache.groupMeta.keys().next().value;
            _cache.groupMeta.delete(oldest);
        }
        return data;
    }).catch(() => ({}));
}

function getCachedModeData() {
    const now = Date.now();
    if (_cache.modeData && now - _cache.modeDataTime < _cache.modeDataTTL) {
        return _cache.modeData;
    }
    try {
        _cache.modeData = JSON.parse(fs.readFileSync('./data/messageCount.json'));
        _cache.modeDataTime = now;
    } catch (e) {
        _cache.modeData = { isPublic: true, mode: 'public' };
        _cache.modeDataTime = now;
    }
    return _cache.modeData;
}

/*━━━━━━━━━━━━━━━━━━━━*/
// -----Command imports - Handlers-----
/*━━━━━━━━━━━━━━━━━━━━*/
const { autotypingCommand, isAutotypingEnabled, sendTyping, stopTyping } = require('./commands/autotyping');
const { autorecordingCommand, isAutorecordingEnabled, sendRecording, stopRecording } = require('./commands/autorecording');
const { autobothCommand, isAutobothEnabled, sendBothStart, sendBothBackground, stopBoth } = require('./commands/autoboth');
const { getPrefix, handleSetPrefixCommand } = require('./commands/setprefix');
const { getOwnerName, handleSetOwnerCommand } = require('./commands/setowner');
const { autoreadCommand, isAutoreadEnabled, handleAutoread } = require('./commands/autoread');
const { readReceiptsCommand } = require('./commands/autoReadReciepts');
const { alwaysonlineCommand, applyAlwaysOnlineOnStartup } = require('./commands/alwaysonline');
const { incrementMessageCount, topMembers } = require('./commands/topmembers');
const { setGroupDescription, setGroupName, setGroupPhoto, getGroupProfile, getGroupName, getGroupDescription, setDisappearingMessages } = require('./commands/groupmanage');
const { antibotCommand, handleAntibotJoin } = require('./commands/antibot');
const { antileftCommand, handleAntileftLeave } = require('./commands/antileft'); // ADDED
const { handleAntilinkCommand, handleLinkDetection } = require('./commands/antilink');
const { handleAntitagCommand, handleTagDetection } = require('./commands/antitag');
const { handleMentionDetection, mentionToggleCommand, setMentionCommand } = require('./commands/mention');
const { handleAntiBadwordCommand, handleBadwordDetection } = require('./lib/antibadword');
const { handleChatbotCommand, handleChatbotResponse } = require('./commands/chatbot');
const { welcomeCommand, handleJoinEvent } = require('./commands/welcome');
const { goodbyeCommand, handleLeaveEvent } = require('./commands/goodbye');
const { handleAntideleteCommand, handleMessageRevocation, storeMessage } = require('./commands/antidelete');
const { pmblockerCommand, readState: readPmBlockerState } = require('./commands/pmblocker');
const { addCommandReaction, addMessageReaction, handleAreactCommand } = require('./lib/reactions');
const { fancyCommand, replyHandlers: fancyReplyHandlers } = require('./commands/fancy');
const { autoStatusCommand, handleStatusUpdate } = require('./commands/autostatus');
const { getcmdCommand } = require('./commands/getcmd');
const { startHangman, guessLetter } = require('./commands/hangman');
const { startTrivia, answerTrivia } = require('./commands/trivia');
const { miscCommand, handleHeart } = require('./commands/misc');

/*━━━━━━━━━━━━━━━━━━━━*/
// -----Command imports-----
/*━━━━━━━━━━━━━━━━━━━━*/
const joinCommand = require('./commands/join');
const getppCommand = require('./commands/getpp');
const tagAllCommand = require('./commands/tagall');
const helpCommand = require('./commands/help');
const banCommand = require('./commands/ban');
const { promoteCommand } = require('./commands/promote');
const { demoteCommand } = require('./commands/demote');
const muteCommand = require('./commands/mute');
const unmuteCommand = require('./commands/unmute');
const stickerCommand = require('./commands/sticker');
const warnCommand = require('./commands/warn');
const warningsCommand = require('./commands/warnings');
const ttsCommand = require('./commands/tts');
const ownerCommand = require('./commands/owner');
const deleteCommand = require('./commands/delete');
const memeCommand = require('./commands/meme');
const tagCommand = require('./commands/tag');
const tagNotAdminCommand = require('./commands/tagnotadmin');
const hideTagCommand = require('./commands/hidetag');
const jokeCommand = require('./commands/joke');
const quoteCommand = require('./commands/quote');
const factCommand = require('./commands/fact');
const weatherCommand = require('./commands/weather');
const newsCommand = require('./commands/news');
const kickCommand = require('./commands/kick');
const simageCommand = require('./commands/simage');
const attpCommand = require('./commands/attp');
const { complimentCommand } = require('./commands/compliment');
const { insultCommand } = require('./commands/insult');
const { eightBallCommand } = require('./commands/eightball');
const { lyricsCommand } = require('./commands/lyrics');
const { dareCommand } = require('./commands/dare');
const { truthCommand } = require('./commands/truth');
const { clearCommand } = require('./commands/clear');
const pingCommand = require('./commands/ping');
const aliveCommand = require('./commands/alive');
const timeCommand = require('./commands/time');
const botInfoCommand = require('./commands/botinfo');
const setTimezoneCommand = require('./commands/settimezone');
const setOwnerNumberCommand = require('./commands/setownernumber');
const blurCommand = require('./commands/img-blur');
const githubCommand = require('./commands/github');
const antibadwordCommand = require('./commands/antibadword');
const takeCommand = require('./commands/take');
const { flirtCommand } = require('./commands/flirt');
const characterCommand = require('./commands/character');
const wastedCommand = require('./commands/wasted');
const shipCommand = require('./commands/ship');
const groupInfoCommand = require('./commands/groupinfo');
const { resetlinkCommand, linkCommand } = require('./commands/resetlink');
const staffCommand = require('./commands/staff');
const unbanCommand = require('./commands/unban');
const emojimixCommand = require('./commands/emojimix');
const { handlePromotionEvent } = require('./commands/promote');
const { handleDemotionEvent } = require('./commands/demote');
const viewonceCommand = require('./commands/viewonce');
const clearSessionCommand = require('./commands/clearsession');
const { simpCommand } = require('./commands/simp');
const { stupidCommand } = require('./commands/stupid');
const stickerTelegramCommand = require('./commands/stickertelegram');
const textmakerCommand = require('./commands/textmaker');
const clearTmpCommand = require('./commands/cleartmp');
const setProfilePicture = require('./commands/setpp');
const instagramCommand = require('./commands/instagram');
const facebookCommand = require('./commands/facebook');
const spotifyCommand = require('./commands/spotify');
const playCommand = require('./commands/play');
const tiktokCommand = require('./commands/tiktok');
const songCommand = require('./commands/song');
const ytdocvideoCommand = require('./commands/ytdocvideo');
const ytdocplayCommand = require('./commands/ytdocplay');
const aiCommand = require('./commands/ai');
const urlCommand = require('./commands/url');
const { handleTranslateCommand } = require('./commands/translate');
const { handleSsCommand } = require('./commands/ss');
const { goodnightCommand } = require('./commands/goodnight');
const { shayariCommand } = require('./commands/shayari');
const { rosedayCommand } = require('./commands/roseday');
const imagineCommand = require('./commands/imagine');
const videoCommand = require('./commands/video');
const sudoCommand = require('./commands/sudo');
const { animeCommand } = require('./commands/anime');
const { piesCommand, piesAlias } = require('./commands/pies');
const stickercropCommand = require('./commands/stickercrop');
const updateCommand = require('./commands/update');
const removebgCommand = require('./commands/removebg');
const { reminiCommand } = require('./commands/remini');
const { igsCommand } = require('./commands/igs');
const settingsCommand = require('./commands/settings');
const soraCommand = require('./commands/sora');
const apkCommand = require('./commands/apk');
const menuConfigCommand = require('./commands/menuConfig');
const shazamCommand = require('./commands/shazam');
const saveStatusCommand = require('./commands/saveStatus');
const toAudioCommand = require('./commands/toAudio');
const gitcloneCommand = require('./commands/gitclone');
const leaveGroupCommand = require('./commands/leave');
const kickAllCommand = require('./commands/kickAll');
const ytsCommand = require('./commands/yts');
const setGroupStatusCommand = require('./commands/setGroupStatus');
const handleDevReact = require('./commands/devReact');
const imageCommand = require('./commands/image');
const gpt4Command = require('./commands/aiGpt4');
const vcfCommand = require('./commands/vcf');
const fetchCommand = require('./commands/fetch');
const { ytplayCommand, ytsongCommand } = require('./commands/ytdl');
const { chaneljidCommand } = require('./commands/chanel');
const { connectFourCommand, handleConnectFourMove } = require('./commands/connect4');
const pairCommand = require('./commands/pair');
const addCommand = require('./commands/add');
const tostatusCommand = require('./commands/tostatus');
const mediafireCommand = require('./commands/mf');
const deepseekCommand = require('./commands/deepseek');
const copilotCommand = require('./commands/ai-copilot');
const xvdlCommand = require('./commands/xvdl');
const visionCommand = require('./commands/vision');
const metaiCommand = require('./commands/ai-meta');
const { anticallCommand, handleIncomingCall } = require('./commands/anticall');
const dispCommand = require('./commands/disp');
const { livescoreCommand, betTipsCommand, footballNewsCommand, playerSearchCommand, teamSearchCommand, venueSearchCommand, gameEventsCommand, sportsHelpCommand, leagueCommand } = require('./commands/sports');
const { antistickerCommand, handleStickerDetection } = require('./commands/antisticker');
const { antistatusmentionCommand, handleAntiStatusMention } = require('./commands/antimention');
const { startScramble, handleScrambleGuess, endScramble } = require('./commands/scramble');
const { antiimageCommand, handleImageDetection } = require('./commands/antiimage');
const { blockCommand, unblockCommand, unblockallCommand, blocklistCommand } = require('./commands/blockUnblock');
const { ligue1StandingsCommand, laligaStandingsCommand, matchesCommand } = require('./commands/sport1');
const approveCommand = require('./commands/approve');
const smemeCommand = require('./commands/smeme');
const wormgptCommand = require('./commands/wormgpt');
const grokCommand = require('./commands/grok');
const blackboxCommand = require('./commands/ai-blackbox');
const birdCommand = require('./commands/ai-bird');
const speechwriterCommand = require('./commands/ai-speechwriter');
const mistralCommand = require('./commands/ai-mistral');
const ilamaCommand = require('./commands/ai-ilama');
const locationCommand = require('./commands/location');
const perplexityCommand = require('./commands/ai-perplexity');
const movieCommand = require('./commands/movie');
const transcribeCommand = require('./commands/transcribe');
const onlineCommand = require('./commands/online');
const lastseenCommand = require('./commands/lastseen');
const { antidemoteCommand, handleAntidemote } = require('./commands/antidemote');
const { antipromoteCommand, handleAntipromote } = require('./commands/antipromote');
const { setbotconfigCommand, setmenuimageCommand } = require('./commands/menuimage');
const vv2Command = require('./commands/vv2');
const moviesCommand = require('./commands/movies');
const encryptCommand = require('./commands/encrypt');
const trimCommand = require('./commands/trim');
const teraboxCommand = require('./commands/terabox');
const magicstudioCommand = require('./commands/magicstudio');
const gpteditCommand = require('./commands/gptedit');
const pinterestCommand = require('./commands/pinterest');
const setBotNameCommand = require('./commands/setbotname');
const setBioCommand = require('./commands/setbio');
const { autofontCommand } = require('./commands/autofont');
const { applyFont } = require('./lib/autoFont');
const { createGroupCommand } = require('./commands/creategroup');

/*━━━━━━━━━━━━━━━━━━━━*/
// Global settings
/*━━━━━━━━━━━━━━━━━━━━*/
global.packname = settings?.packname || "∆RY∆N X";
global.author = settings?.author || "ARYAN";
global.channelLink = "https://whatsapp.com/channel/0029VbBk9IKAjPXIih13Q33d";
global.ytchanel = "";

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363420172397674@newsletter',
            newsletterName: 'Aryan Official',
            serverMessageId: -1
        }
    }
};

/*━━━━━━━━━━━━━━━━━━━━*/
// Main Message Handler
/*━━━━━━━━━━━━━━━━━━━━*/
async function handleMessages(sock, messageUpdate, printLog) {
    try {
        const { messages, type } = messageUpdate;
        if (type!== 'notify') return;
        const message = messages[0];
        if (!message?.message) return;

        await Promise.allSettled([
            handleAutoread(sock, message),
            handleDevReact(sock, message),
            handleAntiStatusMention(sock, message),
            addMessageReaction(sock, message)
        ]);

        if (!sock._callListenerBound) {
            sock.ev.on('call', async (callData) => {
                await handleIncomingCall(sock, callData);
            });
            sock._callListenerBound = true;
        }

        if (!sock._fontPatched) {
            const _origSend = sock.sendMessage.bind(sock);
            sock.sendMessage = async (jid, content, options) => {
                if (content && typeof content.text === 'string') {
                    content = {...content, text: applyFont(content.text) };
                }
                if (content && typeof content.caption === 'string') {
                    content = {...content, caption: applyFont(content.caption) };
                }
                return _origSend(jid, content, options);
            };
            sock._fontPatched = true;
        }

        if (message.message) {
            storeMessage(sock, message);
        }

        if (message.message?.protocolMessage?.type === 0) {
            await handleMessageRevocation(sock, message);
            return;
        }

        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;

        const prefix = getPrefix();
        const isPrefixless = prefix === '';
        const isGroup = chatId.endsWith('@g.us');
        const senderIsSudo = message.key.fromMe || await isOwnerOrSudo(senderId);

        const userMessage = (
            message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            ''
        ).toLowerCase().replace(/\.\s+/g, '.').trim();

        const rawText = message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            message.message?.imageMessage?.caption?.trim() ||
            message.message?.videoMessage?.caption?.trim() ||
            '';

        const fake = createFakeContact(message);

        if (userMessage === '> prefix') {
            const currentPrefix = prefix || '(none — prefixless mode)';
            await sock.sendMessage(chatId, { text: `${currentPrefix}` }, { quoted: fake });
            return;
        }

        if (userMessage) {
            if (!sock.decodeJid) {
                sock.decodeJid = (jid) => normalizeJid(jid);
            }

            const groupMetadata = isGroup? await getCachedGroupMeta(sock, chatId) : {};
            const pushname = message.pushName || "Unknown User";
            const chatType = chatId.endsWith('@g.us')? 'Group' : 'Private';

            const isCmd = userMessage.startsWith(prefix);
            if (isCmd) {
                const cmdText = userMessage.slice(prefix.length).trim();
                const cmdName = cmdText.split(' ')[0].toLowerCase();
                const args = rawText.slice(prefix.length + cmdName.length).trim().split(' ').filter(v => v);
                const q = args.join(' ');

                const isOwner = message.key.fromMe || await isOwnerOrSudo(senderId);
                const isAdminUser = isGroup? (await isAdmin(sock, chatId, senderId)).isSenderAdmin : false;

                // ANTIBOT
                if (cmdName === 'antibot') {
                    return await antibotCommand(sock, chatId, message, { args, isSenderAdmin: isAdminUser, isGroup });
                }

                // ANTILEFT - ADDED HERE
                if (cmdName === 'antileft' || cmdName === 'antileave') {
                    return await antileftCommand(sock, chatId, message, { args, isSenderAdmin: isAdminUser, isGroup });
                }

                // Add other commands here...
                if (cmdName === 'ping') return await pingCommand(sock, chatId, message);
                if (cmdName === 'alive') return await aliveCommand(sock, chatId, message);
                if (cmdName === 'help') return await helpCommand(sock, chatId, message, { prefix });
            }
        }

    } catch (e) {
        console.log('Error in handleMessages:', e);
    }
}

// Export for group-participants.update handler in index.js
async function handleGroupParticipantsUpdate(sock, update) {
    const { id, participants, action } = update;

    if (action === 'add') {
        await handleAntibotJoin(sock, id, participants);
        await handleJoinEvent(sock, id, participants);
    } else if (action === 'remove') {
        await handleAntileftLeave(sock, id, participants); // ADDED
        await handleLeaveEvent(sock, id, participants);
    } else if (action === 'promote') {
        await handlePromotionEvent(sock, id, participants);
    } else if (action === 'demote') {
        await handleDemotionEvent(sock, id, participants);
    }
}

module.exports = { handleMessages, handleGroupParticipantsUpdate };