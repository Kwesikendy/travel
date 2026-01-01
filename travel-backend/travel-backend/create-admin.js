// Quick script to create admin user
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin exists
        const existing = await User.findOne({ email: 'admin@greaterandbetter.com' });
        if (existing) {
            console.log('⚠️  Admin already exists');
            process.exit(0);
        }

        // Create admin
        const admin = new User({
            name: 'Admin',
            email: 'admin@greaterandbetter.com',
            password: 'Admin@123456',
            role: 'admin'
        });

        await admin.save();
        console.log('✅ Admin created!');
        console.log('📧 Email: admin@greaterandbetter.com');
        console.log('🔑 Password: Admin@123456');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createAdmin();
