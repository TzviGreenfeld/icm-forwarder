const express = require('express');
const { sendMessageToChat, client } = require('./whatsapp-client'); // Adjust path as needed
require('dotenv').config();

const app = express();
const PORT = process.env.SERVER_PORT || 8000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    const isReady = client && client.info;
    res.status(isReady ? 200 : 503).json({
        status: isReady ? 'ready' : 'not ready',
        timestamp: new Date().toISOString()
    });
});

// Main endpoint to send WhatsApp messages
app.post('/send', async (req, res) => {
    try {
        // Extract message from request body
        const { message, text, content } = req.body;
        
        // Use message, text, or content field (whichever is provided)
        const messageToSend = message || text || content || JSON.stringify(req.body);
        
        if (!messageToSend || messageToSend.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'No message content provided'
            });
        }

        // Check if client is ready
        if (!client || !client.info) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp client is not ready. Please authenticate first.'
            });
        }

        // Send message using the default destination chat
        await sendMessageToChat(messageToSend);
        
        console.log(`Message sent via API: ${messageToSend.substring(0, 100)}${messageToSend.length > 100 ? '...' : ''}`);
        
        res.status(200).json({
            success: true,
            message: 'Message sent successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error sending message via API:', error);
        
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send message'
        });
    }
});

// Advanced endpoint with custom chat destination
app.post('/send-to', async (req, res) => {
    try {
        const { message, chatName, chatId } = req.body;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'No message content provided'
            });
        }

        if (!chatName && !chatId) {
            return res.status(400).json({
                success: false,
                error: 'Either chatName or chatId must be provided'
            });
        }

        // Check if client is ready
        if (!client || !client.info) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp client is not ready. Please authenticate first.'
            });
        }

        // Prepare chat object
        const chat = {
            name: chatName || '',
            id: chatId || ''
        };

        // Send message to specified chat
        await sendMessageToChat(message, chat);
        
        console.log(`Message sent to ${chatName || chatId}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
        
        res.status(200).json({
            success: true,
            message: 'Message sent successfully',
            destination: chatName || chatId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error sending message to custom chat:', error);
        
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send message'
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        availableEndpoints: [
            'GET /health - Check server and WhatsApp client status',
            'POST /send - Send message to default chat',
            'POST /send-to - Send message to specific chat'
        ]
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Express server listening on port ${PORT}`);
    console.log(`Send POST requests to http://localhost:${PORT}/send`);
    console.log('Request body should contain: { "message": "Your text here" }');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

module.exports = app;