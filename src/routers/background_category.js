const express = require('express');
const BackgroundCategory = require('../models/background_category');
const router = express.Router();
const { successResponse, errorResponse } = require('../utils/response');

// Kategori oluştur
router.post('/background-categories', async (req, res) => {
    try {
        const { name, description, isPremium } = req.body;

        if (!name || typeof name !== 'object') {
            return res.status(400).json(errorResponse('Name must be an object with localized keys.', 400));
        }

        const backgroundCategory = new BackgroundCategory({
            name,
            description,
            isPremium,
        });

        await backgroundCategory.save();
        res.status(201).json(successResponse('Background category created successfully.', backgroundCategory, 201));
    } catch (error) {
        res.status(400).json(errorResponse(error.message, 400));
    }
});

// Bulk kategori ekleme
router.post('/background-categories/bulk', async (req, res) => {
    try {
        const categories = req.body.categories;

        if (!Array.isArray(categories) || categories.length === 0) {
            return res.status(400).json(errorResponse('Categories must be a non-empty array.', 400));
        }

        for (const category of categories) {
            if (!category.name || typeof category.name !== 'object') {
                return res.status(400).json(errorResponse('Each category must have a localized name.', 400));
            }
        }

        const createdCategories = await BackgroundCategory.insertMany(categories);
        res.status(201).json(successResponse('Bulk categories created successfully.', createdCategories, 201));
    } catch (error) {
        res.status(400).json(errorResponse(error.message, 400));
    }
});

// Tüm kategorileri getir
router.get('/background-categories', async (req, res) => {
    try {
        const categories = await BackgroundCategory.find();
        res.status(200).json(successResponse('Background categories retrieved successfully.', categories, 200));
    } catch (error) {
        res.status(400).json(errorResponse(error.message, 400));
    }
});

// Belirli bir kategoriyi getir
router.get('/background-categories/:id', async (req, res) => {
    try {
        const category = await BackgroundCategory.findById(req.params.id);
        if (!category) {
            return res.status(404).json(errorResponse('Category not found.', 404));
        }
        res.status(200).json(successResponse('Background category retrieved successfully.', category, 200));
    } catch (error) {
        res.status(400).json(errorResponse(error.message, 400));
    }
});

// Kategoriyi güncelle
router.patch('/background-categories/:id', async (req, res) => {
    try {
        const updates = Object.keys(req.body);
        const allowedUpdates = ['name', 'description', 'isPremium'];
        const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json(errorResponse('Invalid updates.', 400));
        }

        const category = await BackgroundCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

        if (!category) {
            return res.status(404).json(errorResponse('Category not found.', 404));
        }

        res.status(200).json(successResponse('Background category updated successfully.', category, 200));
    } catch (error) {
        res.status(400).json(errorResponse(error.message, 400));
    }
});

// Kategoriyi sil
router.delete('/background-categories/:id', async (req, res) => {
    try {
        const category = await BackgroundCategory.findByIdAndDelete(req.params.id);

        if (!category) {
            return res.status(404).json(errorResponse('Category not found.', 404));
        }

        res.status(200).json(successResponse('Background category deleted successfully.', category, 200));
    } catch (error) {
        res.status(400).json(errorResponse(error.message, 400));
    }
});

module.exports = router;
