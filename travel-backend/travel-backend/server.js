// server.js

// 1. Import Dependencies
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors'); // Added CORS
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For user authentication tokens

const app = express();
const PORT = 3000;

// Enable CORS for all routes (allows frontend at a different port/file to communicate)
app.use(cors());

// Serve static files from 'public' folder (Frontend)
app.use(express.static('public'));

// --- Security and Configuration ---
const SECRET_KEY = 'YOUR_SUPER_SECRET_KEY'; // **CRITICAL: REPLACE THIS WITH A LONG, COMPLEX, RANDOM STRING**

// NOTE: For development, we are simulating email sending by logging to console.
// In production, configure this with real credentials.
// const transporter = nodemailer.createTransport({
//     service: 'gmail', 
//     auth: {
//         user: 'YOUR_AGENCY_EMAIL@gmail.com',
//         pass: 'YOUR_APP_PASSWORD'
//     }
// });

// --- Simulated Database (Replace with a real database like MongoDB/PostgreSQL later) ---
const users = [
    {
        email: 'test@example.com',
        // Hashed password for 'password123' (created using bcrypt.hashSync('password123', 10))
        passwordHash: '$2a$10$S4L.8/wzE8jXp4x2K/b/d.jP4.q.1s.c.o.e.b.l.O.z.R.W.l.p.H.B.c.M.',
        name: 'Test User'
    }
];

// 2. Setup Middleware
// Middleware to parse incoming JSON data (like form submissions)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// NOTE: If you are serving your HTML file from this server, uncomment the line below 
// and ensure your HTML, CSS, and JS files are in a folder named 'public'.
// app.use(express.static('public')); 

// Basic Test Route
app.get('/', (req, res) => {
    res.send('Greater & Better Travel Agency Back-end Server is running!');
});

// 3. API Endpoint for Login (Validation)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);

    // Check if user exists
    if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Generate a JWT token
    const token = jwt.sign({ userId: user.email, name: user.name }, SECRET_KEY, { expiresIn: '1h' });

    // Send token back to the client
    res.status(200).json({ success: true, message: 'Login successful!', token });
});


// 4. API Endpoint for Trip Submission (Email Sending)
// 4. API Endpoint for Trip Submission (Email Sending)
app.post('/api/plan-trip', async (req, res) => {
    const formData = req.body;
    console.log('Received Trip Plan Request:', formData);

    // Prepare Nodemailer Transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'dogbeynathan7@gmail.com', // Your Gmail
            pass: 'tbot jkok veym tkjs'     // Your App Password
        }
    });

    // 1. Email to AGENCY (The Lead)
    const agencyMailOptions = {
        from: '"Greater & Better Travel" <dogbeynathan7@gmail.com>',
        to: 'dogbeynathan7@gmail.com', // Admin Email
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
    const customerMailOptions = {
        from: '"Greater & Better Travel" <dogbeynathan7@gmail.com>',
        to: formData.email, // The customer's email
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
        // Send emails in background (non-blocking with 10s timeout)
        const sendWithTimeout = (mailOptions) => {
            return Promise.race([
                transporter.sendMail(mailOptions),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
            ]);
        };

        // Fire and forget - don't wait for emails
        sendWithTimeout(agencyMailOptions)
            .then(() => console.log('✅ Agency email sent'))
            .catch(err => console.error('❌ Agency email failed:', err.message));

        if (formData.email && formData.email.includes('@')) {
            sendWithTimeout(customerMailOptions)
                .then(() => console.log('✅ Customer email sent'))
                .catch(err => console.error('❌ Customer email failed:', err.message));
        }

        // Respond immediately (don't wait for emails)
        res.status(200).json({ success: true, message: 'Trip request received! We\'ll contact you soon.' });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, message: 'Failed to process request.' });
    }
});


// 5. Start the Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});