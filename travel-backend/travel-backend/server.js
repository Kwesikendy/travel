// server.js

// Load environment variables
require('dotenv').config();

// 1. Import Dependencies
const express = require('express');
const bodyParser = require('body-parser');
const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const cors = require('cors'); // Added CORS
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For user authentication tokens
const connectDB = require('./config/database'); // Database connection
const TripRequest = require('./models/TripRequest'); // Trip Request model
const helmet = require('helmet'); // Security headers
const rateLimit = require('express-rate-limit'); // Rate limiting

// Import routes
const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trips');

const app = express();
const PORT = 3000;

// Connect to MongoDB
connectDB();

// --- Security Middleware ---
// Configure Helmet with relaxed CSP for inline scripts/styles
// Configure Helmet with strict CSP
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
            imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
            connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    })
);

// Rate limiting for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many login attempts. Please try again in 15 minutes.'
});

// General API rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many requests. Please try again later.'
});

// Enable CORS for all routes (allows frontend at a different port/file to communicate)
app.use(cors());

// Serve static files from 'public' folder (Frontend)
app.use(express.static('public'));

// 2. Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- API Routes ---
// Mount routes first
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);

// 3. Test Route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend is running!' });
});

// 4. API Endpoint for Trip Submission (Email Sending)
app.post('/api/plan-trip', async (req, res) => {
    const formData = req.body;
    console.log('📝 Received Trip Plan Request:', formData);

    try {
        // 1. Save trip request to database FIRST (most important)
        const tripRequest = new TripRequest({
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            destination: formData.destination,
            departureCity: formData.departureCity,
            takeOffDay: formData.takeOffDay,
            returnDate: formData.returnDate,
            people: formData.people,
            visaType: formData.visaType,
            preferences: formData.preferences
        });

        await tripRequest.save();
        console.log('✅ Trip request saved to database:', tripRequest._id);

        // 2. Try to send emails (non-critical, won't block response)
        // Run in background - do NOT await
        sendTripEmails(formData).then(results => {
            console.log('📧 Email sending results:', results);
        }).catch(err => {
            console.error('❌ Background email sending failed:', err);
        });

        // 3. Respond to user IMMEDIATELY
        res.status(200).json({
            success: true,
            message: 'Trip request received! We will contact you shortly.',
            requestId: tripRequest._id
        });
    } catch (error) {
        console.error('❌ Error processing trip request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process request. Please try again.'
        });
    }
});

// Helper function to create transporter
const createTransporter = () => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // Use SSL
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    return transporter;
};

// Verify SMTP connection on startup
const transporter = createTransporter();
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ SMTP Connection Error:', error);
    } else {
        console.log('✅ SMTP Server Connection Established');
    }
});

// Helper function to send emails
async function sendTripEmails(formData) {
    const results = {
        agencyEmail: { sent: false, error: null },
        customerEmail: { sent: false, error: null }
    };

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        const error = 'Gmail credentials not configured';
        console.error('❌ Email Error:', error);
        results.agencyEmail.error = error;
        results.customerEmail.error = error;
        return results;
    }

    const transporter = createTransporter();

    try {
        // 1. Email to AGENCY (The Lead)
        const agencyMailOptions = {
            from: `"Greater & Better Travel" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL || 'greaterandbettertravelagency@gmail.com',
            subject: `✈️ NEW TRIP LEAD: ${formData.destination || 'Unspecified'} (${formData.fullName})`,
            html: `
                <h2>New Trip Request!</h2>
                <p><strong>Traveler:</strong> ${formData.fullName}</p>
                <p><strong>Email:</strong> ${formData.email}</p>
                <p><strong>Phone:</strong> ${formData.phone}</p>
                <p><strong>Destination:</strong> ${formData.destination}</p>
                <p><strong>Departure City:</strong> ${formData.departureCity}</p>
                <p><strong>Dates:</strong> ${formData.takeOffDay} to ${formData.returnDate}</p>
                <p><strong>People:</strong> ${formData.people}</p>
                <p><strong>Visa Type:</strong> ${formData.visaType}</p>
                <p><strong>Preferences:</strong><br>${formData.preferences}</p>
            `
        };

        await transporter.sendMail(agencyMailOptions);
        console.log('✅ Agency Notification Sent');
        results.agencyEmail.sent = true;

        // 2. Email to CUSTOMER (The Confirmation)
        const customerMailOptions = {
            from: `"Greater & Better Travel" <${process.env.EMAIL_USER}>`,
            to: formData.email,
            subject: 'Trip Request Received! 🌍',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h1 style="color: #d1a340;">We've received your request!</h1>
                    <p>Hi ${formData.fullName},</p>
                    <p>Thanks for choosing <strong>Greater & Better Travel</strong>. We are excited to help you plan your trip to <strong>${formData.destination}</strong>.</p>
                    <p>Our team is reviewing your details and will get back to you shortly with a custom itinerary.</p>
                    <hr>
                    <p><small>If you have urgent questions, reply to this email.</small></p>
                </div>
            `
        };

        if (formData.email && formData.email.includes('@')) {
            await transporter.sendMail(customerMailOptions);
            console.log('✅ Customer Confirmation Sent');
            results.customerEmail.sent = true;
        } else {
            results.customerEmail.error = 'Invalid email address for customer';
        }

    } catch (error) {
        console.error('❌ Email Sending Failed:', error);
        results.agencyEmail.error = error.message;
        results.customerEmail.error = error.message;
    }

    return results;
}

// Validate email configuration on startup
if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️  WARNING: RESEND_API_KEY not found in environment variables!');
    console.warn('⚠️  Emails will NOT be sent. Please add RESEND_API_KEY to your .env file.');
    console.warn('⚠️  Get your API key from: https://resend.com/api-keys');
}



// 6. API Endpoint for Contact Form
app.post('/api/contact', async (req, res) => {
    const formData = req.body;
    console.log('📩 Received Contact Form Submission:', formData);

    try {
        const emailResult = await sendContactEmail(formData);

        if (emailResult.success) {
            res.status(200).json({
                success: true,
                message: 'Message sent successfully!'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send message. Please try again later.'
            });
        }
    } catch (error) {
        console.error('❌ Error processing contact form:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred. Please try again later.'
        });
    }
});

// Helper function to send contact emails
// Helper function to send contact emails
async function sendContactEmail(formData) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ Email Error: Gmail credentials not configured');
        return false;
    }

    const transporter = createTransporter();

    try {
        const mailOptions = {
            from: `"Contact Form" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL || 'greaterandbettertravelagency@gmail.com',
            replyTo: formData.email,
            subject: `📩 New Contact Message from ${formData.firstName} ${formData.lastName}`,
            html: `
                <h3>New Contact Message</h3>
                <p><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</p>
                <p><strong>Email:</strong> ${formData.email}</p>
                <p><strong>Phone:</strong> ${formData.phone}</p>
                <p><strong>Message:</strong><br>${formData.message}</p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Contact Email Sent');
        return { success: true };
    } catch (error) {
        console.error('❌ Contact Email Failed:', error);
        return { success: false, error: error };
    }
}

// 5. Start the Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});