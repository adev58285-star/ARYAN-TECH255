// ===============================
// ANTILEFT ULTRA SYSTEM
// ===============================

const fs = require('fs')

const dbFile = './antileft.json'

// create file kama haipo
if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify({}))
}

// load data
let antileft = JSON.parse(fs.readFileSync(dbFile))

// save function
const saveDB = () => {
    fs.writeFileSync(dbFile, JSON.stringify(antileft, null, 2))
}

// ===============================
// COMMAND
// ===============================
module.exports = async (conn, m, { text, isGroup, isAdmins, reply }) => {

    const from = m.chat

    if (!isGroup) return reply("❌ This command is for groups only")
    if (!isAdmins) return reply("❌ Admin only command")

    if (!text) return reply("Usage: .antileft on / off")

    if (text === 'on') {
        antileft[from] = true
        saveDB()
        reply("✅ ANTILEFT ACTIVATED")
    } 
    
    else if (text === 'off') {
        antileft[from] = false
        saveDB()
        reply("❌ ANTILEFT DEACTIVATED")
    } 
    
    else {
        reply("Usage: .antileft on / off")
    }
}

// ===============================
// EVENT LISTENER
// ===============================
module.exports.onGroupUpdate = async (conn, anu) => {
    try {
        const from = anu.id

        if (!antileft[from]) return

        if (anu.action === 'remove') {
            await conn.groupParticipantsUpdate(from, anu.participants, 'add')
        }

    } catch (err) {
        console.log("Antileft error:", err)
    }
}
