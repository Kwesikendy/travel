const mongoose = require('mongoose');

const tripRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Allow anonymous requests (for now)
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    phone: {
        type: String,
        trim: true
    },
    destination: {
        type: String,
        required: [true, 'Destination is required'],
        trim: true
    },
    departureCity: {
        type: String,
        required: [true, 'Departure city is required'],
        trim: true
    },
    takeOffDay: {
        type: Date,
        required: [true, 'Take-off date is required']
    },
    returnDate: {
        type: Date
    },
    people: {
        type: Number,
        required: [true, 'Number of people is required'],
        min: [1, 'At least 1 person required']
    },
    visaType: {
        type: String,
        required: [true, 'Visa type is required'],
        trim: true
    },
    preferences: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'contacted', 'completed', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update 'updatedAt' on save
tripRequestSchema.pre('save', function () {
    this.updatedAt = Date.now();

});

module.exports = mongoose.model('TripRequest', tripRequestSchema);
