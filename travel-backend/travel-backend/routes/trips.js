const express = require('express');
const router = express.Router();
const TripRequest = require('../models/TripRequest');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// @route   GET /api/trips
// @desc    Get all trip requests (Admin only)
// @access  Private/Admin
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const trips = await TripRequest.find()
            .sort({ createdAt: -1 }) // Newest first
            .populate('userId', 'name email'); // Include user info if linked

        res.json({
            success: true,
            count: trips.length,
            trips
        });
    } catch (error) {
        console.error('Error fetching trips:', error);
        res.status(500).json({ error: 'Failed to fetch trip requests' });
    }
});

// @route   GET /api/trips/my
// @desc    Get current user's trip requests
// @access  Private
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const trips = await TripRequest.find({ userId: req.user._id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: trips.length,
            trips
        });
    } catch (error) {
        console.error('Error fetching user trips:', error);
        res.status(500).json({ error: 'Failed to fetch your trip requests' });
    }
});

// @route   GET /api/trips/:id
// @desc    Get single trip request
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const trip = await TripRequest.findById(req.params.id);

        if (!trip) {
            return res.status(404).json({ error: 'Trip request not found' });
        }

        // Check if user owns this trip or is admin
        if (trip.userId && trip.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({
            success: true,
            trip
        });
    } catch (error) {
        console.error('Error fetching trip:', error);
        res.status(500).json({ error: 'Failed to fetch trip request' });
    }
});

// @route   PUT /api/trips/:id
// @desc    Update trip request status (Admin only)
// @access  Private/Admin
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;

        // Validate status
        const validStatuses = ['pending', 'contacted', 'completed', 'cancelled'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const trip = await TripRequest.findByIdAndUpdate(
            req.params.id,
            { status, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );

        if (!trip) {
            return res.status(404).json({ error: 'Trip request not found' });
        }

        res.json({
            success: true,
            message: 'Trip request updated',
            trip
        });
    } catch (error) {
        console.error('Error updating trip:', error);
        res.status(500).json({ error: 'Failed to update trip request' });
    }
});

// @route   DELETE /api/trips/:id
// @desc    Delete trip request (Admin only)
// @access  Private/Admin
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const trip = await TripRequest.findByIdAndDelete(req.params.id);

        if (!trip) {
            return res.status(404).json({ error: 'Trip request not found' });
        }

        res.json({
            success: true,
            message: 'Trip request deleted'
        });
    } catch (error) {
        console.error('Error deleting trip:', error);
        res.status(500).json({ error: 'Failed to delete trip request' });
    }
});

module.exports = router;
