const express = require('express');
const router = express.Router();
const Background = require('../models/background');
const auth = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

// Create a new background
router.post('/backgrounds', auth, async (req, res) => {
    try {
        const { name, imageUrl, category, isPremium } = req.body;

        if (!name || !imageUrl || !category) {
            return res.status(400).json(errorResponse('All fields are required.', 400));
        }

        const background = new Background({
            name,
            imageUrl,
            category,
            isPremium: isPremium || false,
            createdBy: req.user._id
        });

        await background.save();
        res.status(201).json(successResponse('Background created successfully.', background, 201));
    } catch (error) {
        res.status(400).json(errorResponse(error.message, 400));
    }
});

// Fetch backgrounds with body-based filtering
router.post('/backgrounds/filter', async (req, res) => {
    try {
        const { category, isPremium } = req.body;

        const filters = {};
        if (category) filters.category = category;
        if (typeof isPremium === 'boolean') filters.isPremium = isPremium;

        const backgrounds = await Background.find(filters);
        res.status(200).json(successResponse('Backgrounds retrieved successfully.', backgrounds, 200));
    } catch (error) {
        res.status(400).json(errorResponse(error.message, 400));
    }
});

// Delete a background
router.delete('/backgrounds/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        const background = await Background.findById(id);
        if (!background) {
            return res.status(404).json(errorResponse('Background not found.', 404));
        }

        if (background.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json(errorResponse('Unauthorized to delete this background.', 403));
        }

        await background.remove();
        res.status(200).json(successResponse('Background deleted successfully.', background, 200));
    } catch (error) {
        res.status(400).json(errorResponse(error.message, 400));
    }
});

// Update a background (e.g., change category or premium status)
router.patch('/backgrounds/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { category, isPremium } = req.body;

        const updates = {};
        if (category) updates.category = category;
        if (typeof isPremium === 'boolean') updates.isPremium = isPremium;

        const background = await Background.findById(id);
        if (!background) {
            return res.status(404).json(errorResponse('Background not found.', 404));
        }

        if (background.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json(errorResponse('Unauthorized to update this background.', 403));
        }

        Object.assign(background, updates);
        await background.save();

        res.status(200).json(successResponse('Background updated successfully.', background, 200));
    } catch (error) {
        res.status(400).json(errorResponse(error.message, 400));
    }
});

// Fetch all backgrounds or by ID
router.get('/backgrounds/:id?', async (req, res) => {
    try {
        const { id } = req.params;

        if (id) {
            // Fetch background by ID
            const background = await Background.findById(id);
            if (!background) {
                return res.status(404).json(errorResponse('Background not found.', 404));
            }
            return res.status(200).json(successResponse('Background retrieved successfully.', background, 200));
        }

        // Fetch all backgrounds
        const backgrounds = await Background.find();
        res.status(200).json(successResponse('Backgrounds retrieved successfully.', backgrounds, 200));
    } catch (error) {
        res.status(400).json(errorResponse(error.message, 400));
    }
});


module.exports = router;
