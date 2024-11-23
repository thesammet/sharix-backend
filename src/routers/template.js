const express = require('express');
const router = new express.Router();
const Template = require('../models/template');
const Category = require('../models/category');
const auth = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

// **Şablon Oluşturma**
router.post('/templates', auth, async (req, res) => {
    const { title, content, category, icon, isGlobal } = req.body;

    try {
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(404).send(errorResponse('Category not found.', 404));
        }

        const template = new Template({
            title,
            content,
            category,
            createdBy: req.user._id, // Oturum açan kullanıcıyı ekle
            icon,
            isGlobal,
        });

        await template.save();
        res.status(201).send(successResponse('Template created successfully.', template, 201));
    } catch (error) {
        res.status(400).send(errorResponse(error.message, 400));
    }
});

// **Tüm Şablonları Listeleme**
router.get('/templates', async (req, res) => {
    try {
        const templates = await Template.find({ isGlobal: true }).populate('category', 'name');
        res.status(200).send(successResponse('Templates retrieved successfully.', templates, 200));
    } catch (error) {
        res.status(500).send(errorResponse(error.message, 500));
    }
});

// **Kategoriye Göre Şablonları Listeleme**
router.get('/templates/category/:categoryId', async (req, res) => {
    const { categoryId } = req.params;

    try {
        const templates = await Template.find({ category: categoryId }).populate('category', 'name');
        if (!templates || templates.length === 0) {
            return res.status(404).send(errorResponse('No templates found for this category.', 404));
        }
        res.status(200).send(successResponse('Templates retrieved successfully.', templates, 200));
    } catch (error) {
        res.status(500).send(errorResponse(error.message, 500));
    }
});

// **Şablon Güncelleme**
router.patch('/templates/:templateId', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['title', 'content', 'icon', 'isGlobal'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send(errorResponse('Invalid updates.', 400));
    }

    try {
        const template = await Template.findOne({
            _id: req.params.templateId,
            createdBy: req.user._id,
        });

        if (!template) {
            return res.status(404).send(errorResponse('Template not found.', 404));
        }

        updates.forEach((update) => (template[update] = req.body[update]));
        await template.save();
        res.status(200).send(successResponse('Template updated successfully.', template, 200));
    } catch (error) {
        res.status(400).send(errorResponse(error.message, 400));
    }
});

// **Şablon Silme**
router.delete('/templates/:templateId', auth, async (req, res) => {
    try {
        const template = await Template.findOneAndDelete({
            _id: req.params.templateId,
            createdBy: req.user._id,
        });

        if (!template) {
            return res.status(404).send(errorResponse('Template not found.', 404));
        }

        res.status(200).send(successResponse('Template deleted successfully.', template, 200));
    } catch (error) {
        res.status(400).send(errorResponse(error.message, 400));
    }
});

// **Paylaşım Sayısını Artırma**
router.patch('/templates/:templateId/share', async (req, res) => {
    try {
        const template = await Template.findById(req.params.templateId);
        if (!template) {
            return res.status(404).send(errorResponse('Template not found.', 404));
        }

        template.shareCount += 1;
        await template.save();
        res.status(200).send(successResponse('Share count updated successfully.', template, 200));
    } catch (error) {
        res.status(400).send(errorResponse(error.message, 400));
    }
});

router.post('/templates/bulk-upload', auth, async (req, res) => {
    try {
        // Admin kontrolü
        if (!req.user.isAdmin) {
            return res.status(403).send(errorResponse('Access denied. Only admins can perform this action.', 403));
        }

        // Gelen şablonları al
        const templates = req.body.templates;

        if (!Array.isArray(templates) || templates.length === 0) {
            return res.status(400).send(errorResponse('Templates array is required and cannot be empty.', 400));
        }

        // Şablonların her birini kontrol et ve oluştur
        const createdTemplates = [];
        for (const templateData of templates) {
            const { title, content, category, icon, isGlobal } = templateData;

            const categoryExists = await Category.findById(category);
            if (!categoryExists) {
                return res.status(404).send(errorResponse(`Category with ID ${category} not found.`, 404));
            }

            const template = new Template({
                title,
                content,
                category,
                createdBy: req.user._id, // Admin ID'si
                icon,
                isGlobal,
            });

            await template.save();
            createdTemplates.push(template);
        }

        res.status(201).send(successResponse('Templates uploaded successfully.', createdTemplates, 201));
    } catch (error) {
        res.status(400).send(errorResponse(error.message, 400));
    }
});

module.exports = router;
