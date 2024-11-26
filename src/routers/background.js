const express = require('express');
const router = express.Router();
const Background = require('../models/background');
const BackgroundCategory = require('../models/background_category');
const auth = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

// Create a new background
router.post('/backgrounds', auth, async (req, res) => {
    try {
        const { name, imageUrl, categoryId, isPremium } = req.body;

        if (!name || !imageUrl || !categoryId) {
            return res.status(400).json(errorResponse('Name, imageUrl, and categoryId are required.', 400));
        }

        const category = await BackgroundCategory.findById(categoryId);
        if (!category) {
            return res.status(404).json(errorResponse('Category not found.', 404));
        }

        const background = new Background({
            name,
            imageUrl,
            category: categoryId,
            isPremium: isPremium || false,
            createdBy: req.user._id,
        });

        await background.save();
        res.status(201).json(successResponse('Background created successfully.', background, 201));
    } catch (error) {
        res.status(400).json(errorResponse(error.message, 400));
    }
});

// Get all backgrounds or filter by category/premium status
router.post('/backgrounds/filter', async (req, res) => {
    try {
        const { categoryId, isPremium } = req.body;

        const filters = {};
        if (categoryId) filters.category = categoryId;
        if (typeof isPremium === 'boolean') filters.isPremium = isPremium;

        const backgrounds = await Background.find(filters).populate('category');
        res.status(200).json(successResponse('Backgrounds retrieved successfully.', backgrounds, 200));
    } catch (error) {
        res.status(400).json(errorResponse(error.message, 400));
    }
});

// Get a single background by ID
router.get('/backgrounds/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const background = await Background.findById(id).populate('category');
        if (!background) {
            return res.status(404).json(errorResponse('Background not found.', 404));
        }

        res.status(200).json(successResponse('Background retrieved successfully.', background, 200));
    } catch (error) {
        res.status(400).json(errorResponse(error.message, 400));
    }
});

// Update a background (change category, premium status, or name/image)
router.patch('/backgrounds/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { categoryId, isPremium, name, imageUrl } = req.body;

        const updates = {};
        if (categoryId) {
            const category = await BackgroundCategory.findById(categoryId);
            if (!category) {
                return res.status(404).json(errorResponse('Category not found.', 404));
            }
            updates.category = categoryId;
        }
        if (typeof isPremium === 'boolean') updates.isPremium = isPremium;
        if (name) updates.name = name;
        if (imageUrl) updates.imageUrl = imageUrl;

        const background = await Background.findById(id);
        if (!background) {
            return res.status(404).json(errorResponse('Background not found.', 404));
        }

        Object.assign(background, updates);
        await background.save();

        res.status(200).json(successResponse('Background updated successfully.', background, 200));
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

        await background.remove();
        res.status(200).json(successResponse('Background deleted successfully.', background, 200));
    } catch (error) {
        res.status(400).json(errorResponse(error.message, 400));
    }
});

//Random backgrounds
router.post('/backgrounds/random', async (req, res) => {
    try {
        const { count } = req.body; // Get the count from the request body
        const totalBackgrounds = await Background.countDocuments();
        const numToFetch = Math.min(count || 1, totalBackgrounds); // Ensure count doesn't exceed total

        if (totalBackgrounds === 0) {
            return res.status(404).json(errorResponse('No backgrounds found.', 404));
        }

        const randomBackgrounds = await Background.aggregate([
            { $sample: { size: numToFetch } }, // Fetch random documents
            {
                $lookup: {
                    from: 'backgroundcategories', // Match the collection name for categories
                    localField: 'category',
                    foreignField: '_id',
                    as: 'category',
                },
            },
            { $unwind: '$category' }, // Flatten category array
        ]);

        res.status(200).json(successResponse('Random backgrounds retrieved successfully.', randomBackgrounds, 200));
    } catch (error) {
        res.status(400).json(errorResponse(error.message, 400));
    }
});


module.exports = router;
