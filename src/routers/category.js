const express = require('express');
const router = new express.Router();
const Category = require('../models/category');
const auth = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

// Create a new category
router.post('/categories', auth, async (req, res) => {
    try {
        const { name, description, parentCategory, isGlobal, icon, lang } = req.body;

        // Ensure required fields are provided
        if (!name) {
            return res.status(400).send(errorResponse('Category name is required.', 400));
        }

        if (!lang) {
            return res.status(400).send(errorResponse('Language (lang) is required.', 400));
        }

        const category = new Category({
            name,
            description,
            parentCategory: parentCategory || null,
            isGlobal: isGlobal ?? true,
            icon,
            lang,
            createdBy: req.user._id,
        });

        await category.save();
        res.status(201).send(successResponse('Category created successfully.', category, 201));
    } catch (error) {
        res.status(400).send(errorResponse(error.toString(), 400));
    }
});

// Create multiple categories in bulk
router.post('/categories/bulk', auth, async (req, res) => {
    try {
        const categories = req.body.categories;
        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            return res.status(400).send(errorResponse('Categories array is required and must not be empty.', 400));
        }

        const validCategories = [];

        for (const category of categories) {
            // Slug oluşturma işlemi
            let baseSlug = category.name
                .toLowerCase() // Küçük harfe çevir
                .replace(/ /g, '-') // Boşlukları tire ile değiştir
                .replace(/[^a-zA-Z0-9\u00C0-\u00FF-\u0100-\u017F]/g, ''); // Geçerli karakterleri koru

            if (category.parentCategory) {
                const parent = await Category.findById(category.parentCategory);
                if (parent) {
                    baseSlug = `${parent.slug}-${baseSlug}`;
                }
            }

            let slug = baseSlug;
            let count = 0;

            // Eğer aynı slug varsa bir sayı ekleyerek benzersiz hale getir
            while (await Category.findOne({ slug }) && count === 0) {
                count++;
                slug = `${baseSlug}`;
            }

            validCategories.push({
                ...category,
                slug, // Benzersiz slug
                createdBy: req.user._id,
            });
        }

        const createdCategories = await Category.insertMany(validCategories);

        res.status(201).send(successResponse('Categories created successfully.', createdCategories, 201));
    } catch (error) {
        res.status(400).send(errorResponse(error.message, 400));
    }
});

// Get all categories
router.get('/categories', auth, async (req, res) => {
    try {
        const lang = req.body.lang || 'en'; // Filter by language
        const categories = await Category.find({ lang });
        res.status(200).send(successResponse('Categories retrieved successfully.', categories, 200));
    } catch (error) {
        res.status(500).send(errorResponse(error.toString(), 500));
    }
});

// Get a single category by ID
router.get('/categories/:id', auth, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).send(errorResponse('Category not found.', 404));
        }

        res.status(200).send(successResponse('Category retrieved successfully.', category, 200));
    } catch (error) {
        res.status(500).send(errorResponse(error.toString(), 500));
    }
});

// Update a category
router.patch('/categories/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'description', 'parentCategory', 'isGlobal', 'icon', 'lang'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send(errorResponse('Invalid updates: Only specific fields are allowed.', 400));
    }

    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).send(errorResponse('Category not found.', 404));
        }

        updates.forEach((update) => (category[update] = req.body[update]));
        await category.save();

        res.status(200).send(successResponse('Category updated successfully.', category, 200));
    } catch (error) {
        res.status(400).send(errorResponse(error.toString(), 400));
    }
});

// Delete a category
router.delete('/categories/:id', auth, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).send(errorResponse('Category not found.', 404));
        }

        // Update parentCategory of subcategories to null
        await Category.updateMany({ parentCategory: req.params.id }, { parentCategory: null });

        await category.remove();
        res.status(200).send(successResponse('Category deleted successfully.', category, 200));
    } catch (error) {
        res.status(400).send(errorResponse(error.toString(), 400));
    }
});

// Get subcategories of a category
router.get('/categories/:id/subcategories', auth, async (req, res) => {
    try {
        const lang = req.body.lang || 'en'; // Filter by language
        const subcategories = await Category.find({ parentCategory: req.params.id, lang });

        if (subcategories.length === 0) {
            return res.status(404).send(errorResponse('No subcategories found for this category.', 404));
        }

        res.status(200).send(successResponse('Subcategories retrieved successfully.', subcategories, 200));
    } catch (error) {
        res.status(400).send(errorResponse(error.toString(), 400));
    }
});

module.exports = router;
