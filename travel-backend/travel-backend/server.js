// server.js

// Load environment variables
require('dotenv').config();

// 1. Import Dependencies
const express = require('express');
const bodyParser = require('body-parser');
const { Resend } = require('resend');
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
        const emailResults = await sendTripEmails(formData);

        // 3. Respond to user
        res.status(200).json({
            success: true,
            message: 'Trip request received! Check your email for confirmation.',
            requestId: tripRequest._id,
            emailStatus: emailResults
        });
    } catch (error) {
        console.error('❌ Error processing trip request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process request. Please try again.'
        });
    }
});

// Helper function to send emails
async function sendTripEmails(formData) {
    const results = {
        agencyEmail: { sent: false, error: null },
        customerEmail: { sent: false, error: null }
    };

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
        const error = 'Resend API key not configured';
        console.error('❌ Email Error:', error);
        results.agencyEmail.error = error;
        results.customerEmail.error = error;
        return results;
    }

    try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        // 1. Email to AGENCY (The Lead)
        const agencyEmail = {
            from: process.env.EMAIL_FROM || 'Greater & Better Travel <onboarding@resend.dev>',
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

        // 2. Email to CUSTOMER (The Confirmation)
        const customerEmail = {
            from: process.env.EMAIL_FROM || 'Greater & Better Travel <onboarding@resend.dev>',
            to: formData.email,
            subject: `Trip Request Received: ${formData.destination}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h1 style="color: #d1a340;">Thank you for choosing Greater & Better!</h1>
                    <p>Hi ${formData.fullName},</p>
                    <p>We have received your request to plan a trip to <strong>${formData.destination}</strong>.</p>
                    <p>Our travel specialists are reviewing your details and will get back to you shortly with a personalized itinerary.</p>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <h3>Your Request Details:</h3>
                    <ul>
                        <li><strong>Destination:</strong> ${formData.destination}</li>
                        <li><strong>Dates:</strong> ${formData.takeOffDay} to ${formData.returnDate}</li>
                        <li><strong>Travelers:</strong> ${formData.people}</li>
                        <li><strong>Preferences:</strong> ${formData.preferences || 'None'}</li>
                    </ul>
                    <p>Warm regards,<br>The Greater & Better Team</p>
                </div>
            `
        };

        // Send agency email
        try {
            const agencyResult = await resend.emails.send(agencyEmail);
            console.log('✅ Agency email sent successfully:', agencyResult);
            results.agencyEmail.sent = true;
        } catch (error) {
            console.error('❌ Agency email failed:', error.message);
            console.error('Full error:', error);
            results.agencyEmail.error = error.message;
        }

        // Send customer email
        if (formData.email && formData.email.includes('@')) {
            try {
                const customerResult = await resend.emails.send(customerEmail);
                console.log('✅ Customer email sent successfully:', customerResult);
                results.customerEmail.sent = true;
            } catch (error) {
                console.error('❌ Customer email failed:', error.message);
                console.error('Full error:', error);
                results.customerEmail.error = error.message;
            }
        } else {
            results.customerEmail.error = 'Invalid email address';
        }
    } catch (error) {
        console.error('❌ Email system error:', error.message);
        console.error('Full error:', error);
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
async function sendContactEmail(formData) {
    if (!process.env.RESEND_API_KEY) {
        console.error('❌ Resend API Key missing');
        return { success: false, error: 'Configuration error' };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Greater & Better Travel <onboarding@resend.dev>',
            to: 'greaterandbettertravelagency@gmail.com',
            subject: `📩 New Contact Message from ${formData.firstName} ${formData.lastName}`,
            html: `
                <h2>New Contact Message</h2>
                <p><strong>Name:</strong> ${formData.firstName} ${formData.lastName}</p>
                <p><strong>Email:</strong> ${formData.email}</p>
                <p><strong>Phone:</strong> ${formData.phone}</p>
                <p><strong>Message:</strong></p>
                <p>${formData.message}</p>
            `
        });

        if (error) {
            console.error('❌ Resend Error:', error);
            return { success: false, error: error };
        }

        console.log('✅ Contact email sent:', data);
        return { success: true, data };
    } catch (err) {
        console.error('❌ Unexpected Email Error:', err);
        return { success: false, error: err };
    }
}

// 5. Start the Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});