const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const config = require("../config/config");
const logger = require("./logger");

const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: Number(config.smtp_port),
    secure: config.smtp_secure,
    auth: {
        user: config.smtp_user,
        pass: config.smtp_pass,
    },
});

// Connection check
transporter.verify((error, success) => {
    if (error) {
        logger.error("❌ Email server connection failed:", error.message);
    } else {
        logger.info("✅ Email server is ready to send messages");
    }
});

// Load email template
const loadEmailTemplate = () => {
    try {
        const templatePath = path.join(__dirname, '../templates/confirmation-email.html');
        return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
        logger.error('Error loading email template:', error);
        return null;
    }
};

// Email templates and functions
const emailTemplates = {
    confirmation: (data) => {
        const template = loadEmailTemplate();
        if (!template) {
            // Fallback to simple template
            return {
                subject: `Thank you for contacting Haria Investments - ${data.name}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #2c3e50;">Thank You for Your Interest!</h2>
                        <p style="color: #34495e;">Dear ${data.name},</p>
                        <p style="color: #34495e;">Thank you for reaching out to Haria Investments. We have received your inquiry regarding our <strong>${data.services}</strong> services.</p>
                        <p style="color: #34495e;">Our team will review your request and get back to you within 24 hours.</p>
                    </div>
                `
            };
        }

        // Replace template variables
        const html = template
            .replace(/\{\{name\}\}/g, data.name)
            .replace(/\{\{services\}\}/g, data.services);

        return {
            subject: `Thank you for contacting Haria Investments - ${data.name}`,
            html: html
        };
    },

    adminNotification: (data) => ({
        subject: `New Contact Form Submission - ${data.contact.fullName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #e74c3c; margin-bottom: 10px;">New Contact Submission</h1>
                    <p style="color: #7f8c8d; font-size: 14px;">Haria Investments Contact Management</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                    <h2 style="color: #2c3e50; margin-bottom: 20px;">Contact Details</h2>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold; color: #2c3e50;">Name:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; color: #34495e;">${data.contact.fullName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold; color: #2c3e50;">Email:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; color: #34495e;">${data.contact.email}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold; color: #2c3e50;">Services:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; color: #34495e;">${data.services}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold; color: #2c3e50;">Submitted:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; color: #34495e;">${new Date(data.contact.createdAt).toLocaleString()}</td>
                        </tr>
                    </table>
                    
                    ${data.contact.message ? `
                        <div style="margin-top: 20px;">
                            <h3 style="color: #2c3e50; margin-bottom: 10px;">Message:</h3>
                            <div style="background: #ffffff; padding: 15px; border-radius: 5px; border-left: 4px solid #3498db;">
                                <p style="color: #34495e; line-height: 1.6; margin: 0;">${data.contact.message}</p>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="color: #2c3e50; margin-bottom: 15px;">Action Required</h3>
                    <p style="color: #34495e; line-height: 1.6; margin-bottom: 10px;">
                        Please follow up with this potential client within 24 hours to maintain our service standards.
                    </p>
                    <p style="color: #34495e; line-height: 1.6;">
                        <strong>Contact ID:</strong> ${data.contact._id}
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ecf0f1;">
                    <p style="color: #7f8c8d; font-size: 14px;">
                        This notification was automatically generated by the Haria Investments contact management system.
                    </p>
                </div>
            </div>
        `
    })
};

// Email sending functions
const sendConfirmationEmail = async (data) => {
    try {
        const template = emailTemplates.confirmation(data);

        const mailOptions = {
            from: `"Haria Investments" <no-reply@hariainvestments.com>`,
            to: data.to,
            subject: template.subject,
            html: template.html
        };

        const result = await transporter.sendMail(mailOptions);
        logger.info(`Confirmation email sent successfully to ${data.to}`);
        return result;
    } catch (error) {
        logger.error('Error sending confirmation email:', error);
        throw error;
    }
};

const sendAdminNotification = async (data) => {
    try {
        const template = emailTemplates.adminNotification(data);

        const mailOptions = {
            from: `"Haria Investments" <no-reply@hariainvestments.com>`,
            to: config.admin_email || config.smtp_user,
            subject: template.subject,
            html: template.html
        };

        const result = await transporter.sendMail(mailOptions);
        logger.info(`Admin notification sent successfully`);
        return result;
    } catch (error) {
        logger.error('Error sending admin notification:', error);
        throw error;
    }
};

module.exports = {
    transporter,
    sendConfirmationEmail,
    sendAdminNotification
};