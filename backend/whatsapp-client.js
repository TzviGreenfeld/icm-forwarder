const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const { sendEmail } = require('./email-sender');
require('dotenv').config();

const DEBUG = process.env.DEBUG === 'true';

const DESTINATION_CHAT = {
    name: process.env.DESTINATION_CHAT_NAME || "",
    id: process.env.DESTINATION_CHAT_ID || ""
};


let client = new Client({
    authStrategy: new LocalAuth()
});

function setupClientEvents(clientInstance) {
    clientInstance.on('qr', async (qr) => {
        console.log('QR Code received, scan it with your phone:');
        qrcode.generate(qr, { small: true });
        
        // Send QR code via email
        if (process.env.QR_EMAIL_TO) {
            try {
                // Generate QR code as buffer
                const qrBuffer = await QRCode.toBuffer(qr, { 
                    width: 400,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
                
                const htmlContent = `
                    <h2>WhatsApp QR Code</h2>
                    <p>Scan the attached QR code with your WhatsApp mobile app to authenticate:</p>
                    <p>This QR code will expire shortly, so scan it as soon as possible.</p>
                    <p>If you can't see the attachment, please check your spam folder or contact support.</p>
                `;
                
                const textContent = `WhatsApp QR Code for authentication has been generated. Please check the attached QR code image and scan it with your WhatsApp mobile app. This QR code will expire shortly.`;
                
                // Create attachment
                const attachments = [{
                    filename: 'whatsapp-qr-code.png',
                    content: qrBuffer.toString('base64'),
                    type: 'image/png',
                    disposition: 'attachment'
                }];
                
                const result = await sendEmail(
                    process.env.QR_EMAIL_TO,
                    'WhatsApp Bot - QR Code Authentication Required',
                    textContent,
                    htmlContent,
                    attachments
                );
                
                if (result.success) {
                    console.log(`QR code sent via email to ${process.env.QR_EMAIL_TO}`);
                } else {
                    console.error('Failed to send QR code email:', result.error);
                }
            } catch (error) {
                console.error('Error sending QR code email:', error);
            }
        }
    });

    clientInstance.on('authenticated', () => {
        console.log('WhatsApp authenticated successfully');
    });


chatsCache = new Map();

function getChatByName(chats, name) {
    return chats.find(chat => chat.name === name || chat.pushname === name);
}

function getChatById(chats, id) {
    // more robust chat retrieval, use this for hebrew names
    return chats.find(chat => chat.id._serialized === id);
}

async function getChat(chat, clientInstance = client) {

    let cachedChat = chatsCache.get(chat.id) || chatsCache.get(chat.name);
    if (cachedChat) {
        return cachedChat;
    }

    let res;
    const chats = await clientInstance.getChats()
    if (chat.id) {
        res = getChatById(chats, chat.id);
    }
    else if (chat.name && chat.name.trim() !== "") {
        res = getChatByName(chats, chat.name);
    }

    if (res) {
        chatsCache.set(chat.id, res);
        chatsCache.set(chat.name, res);
        return res;
    }

    console.log(`Warning: Could not find chat "${chat.name || chat.id}"`);
    if (DEBUG) {
        console.log('Available chats:');
        chats.forEach(chat => {
            console.log(`- ${chat.name} ID: ${chat.id._serialized}`);
        });
    }

    throw new Error(`Chat "${chat.name || chat.id}" not found`);
}

    clientInstance.on('ready', async () => {
        console.log('WhatsApp client is ready!');

        if (DEBUG) {
            debug(clientInstance);
        }

        try {
            const destinationChat = await getChat(DESTINATION_CHAT, clientInstance);

            if (destinationChat) {
                console.log(`Found destination chat: ${destinationChat.name}, ${destinationChat.id._serialized}`);
            }

        } catch (error) {
            console.error('Error getting chat:', error);
        }
    });


    clientInstance.on('auth_failure', (msg) => {
        console.error('Authentication failed - QR scan required:', msg);
    });

    clientInstance.on('disconnected', (reason) => {
        console.log('Client was logged out:', reason);
        
        // Clear chat cache on disconnect
        chatsCache.clear();
        console.log('Chat cache cleared');
        
        if (reason === 'LOGOUT' || reason === 'NAVIGATION') {
            console.log('Re-authentication required. Please scan the QR code when it appears.');
            console.log('Restarting client in 3 seconds...');
            setTimeout(() => {
                try {
                    clientInstance.destroy();
                } catch (error) {
                    console.log('Error destroying client:', error.message);
                }
                
                // Recreate client instance
                const { Client, LocalAuth } = require('whatsapp-web.js');
                client = new Client({
                    authStrategy: new LocalAuth(),
                    puppeteer: {
                   args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
                });
                
                // Re-attach all event listeners
                setupClientEvents(client);
                
                // Initialize with error handling
                initializeClient();
            }, 3000);
        }
    });
}

// Setup initial client events
setupClientEvents(client);

async function initializeClient() {
    try {
        await client.initialize();
    } catch (error) {
        if (error.message && error.message.includes('Execution context was destroyed')) {
            console.log('Client initialization failed due to destroyed context. Retrying in 5 seconds...');
            setTimeout(initializeClient, 5000);
            return;
        }
        console.error('Failed to initialize client:', error);
        setTimeout(initializeClient, 10000);
    }
}

console.log('Starting WhatsApp bot...');

process.on('unhandledRejection', (reason, promise) => {
    if (reason && reason.message && reason.message.includes('Execution context was destroyed')) {
        console.log('Caught unhandled rejection: Execution context destroyed. This is expected during logout/reconnection.');
        return;
    }
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    if (error.message && error.message.includes('Execution context was destroyed')) {
        console.log('Caught uncaught exception: Execution context destroyed. This is expected during logout/reconnection.');
        return;
    }
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

initializeClient();

function debug(clientInstance = client) {
    // show all available chats
    clientInstance.getChats().then(chats => {
        console.log('Available chats:');
        chats.forEach(chat => {
            console.log(`- ${chat.name} ID: ${chat.id._serialized}`);
        });
    });
}

async function sendMessageToChat(message, chat = DESTINATION_CHAT, clientInstance = client) {
    const chatObj = await getChat(chat, clientInstance);
    if (chatObj) {
        return chatObj.sendMessage(message);
    }
    throw new Error(`Chat "${chat.name || chat.id}" not found`);
}
module.exports = {
    sendMessageToChat,
    client
};


