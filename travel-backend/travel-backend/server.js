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
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // Allow inline styles and Google Fonts
            fontSrc: ["'self'", "https://fonts.gstatic.com"], // Allow Google Fonts
            imgSrc: ["'self'", "data:", "https:"], // Allow images
            connectSrc: ["'self'"] // Allow API calls to same origin
        }
    }
}));

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
// 4. API Endpoint for Trip Submission (Email Sending)
app.post('/api/plan-trip', async (req, res) => {
    const formData = req.body;
    console.log('Received Trip Plan Request:', formData);

    // Initialize Resend with API key from environment
    const resend = new Resend(process.env.RESEND_API_KEY);

    // 1. Email to AGENCY (The Lead)
    const agencyEmail = {
        from: 'Greater & Better Travel <onboarding@resend.dev>',
        to: 'dogbeynathan7@gmail.com',
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
        from: 'Greater & Better Travel <onboarding@resend.dev>',
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

    try {
        // 1. Save trip request to database
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

        // 2. Send agency email via Resend (non-blocking)
        resend.emails.send(agencyEmail)
            .then(() => console.log('✅ Agency email sent via Resend'))
            .catch(err => console.error('❌ Agency email failed:', err.message));

        // 3. Send customer email via Resend (non-blocking)
        if (formData.email && formData.email.includes('@')) {
            resend.emails.send(customerEmail)
                .then(() => console.log('✅ Customer email sent via Resend'))
                .catch(err => console.error('❌ Customer email failed:', err.message));
        }

        // 4. Respond immediately
        res.status(200).json({
            success: true,
            message: 'Trip request received! Check your email.',
            requestId: tripRequest._id
        });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, message: 'Failed to process request.' });
    }
});


// 5. Start the Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});