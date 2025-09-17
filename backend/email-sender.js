const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send a simple email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content (optional)
 * @param {Array} attachments - Email attachments (optional)
 */
async function sendEmail(to, subject, text, html = null, attachments = null) {
    try {
        const emailData = {
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: to,
            subject: subject,
            text: text,
            ...(html && { html: html }),
            ...(attachments && { attachments: attachments })
        };

        const result = await resend.emails.send(emailData);
        console.log('Email sent successfully:', result.data.id);
        return { success: true, messageId: result.data.id };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { sendEmail };
