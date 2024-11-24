const express = require('express');
const router = new express.Router();
const Template = require('../models/template');
const Category = require('../models/category');
const auth = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

// **Şablon Oluşturma**
router.post('/templates', auth, async (req, res) => {
    const { title, content, category, icon, isGlobal, lang } = req.body;

    try {
        if (!lang) {
            return res.status(400).send(errorResponse('Language (lang) is required.', 400));
        }

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
            lang,
        });

        await template.save();
        res.status(201).send(successResponse('Template created successfully.', template, 201));
    } catch (error) {
        res.status(400).send(errorResponse(error.message, 400));
    }
});

// **Tüm Şablonları Listeleme**
router.get('/templates', auth, async (req, res) => {
    try {
        const lang = req.body.lang || 'en'; // Varsayılan dil 'en'
        const templates = await Template.find({ isGlobal: true, lang }).populate('category', 'name');
        res.status(200).send(successResponse('Templates retrieved successfully.', templates, 200));
    } catch (error) {
        res.status(500).send(errorResponse(error.message, 500));
    }
});

// **Kategoriye Göre Şablonları Listeleme**
router.get('/templates/category/:categoryId', auth, async (req, res) => {
    const { categoryId } = req.params;
    const lang = req.body.lang || 'en'; // Varsayılan dil 'en'

    try {
        const templates = await Template.find({ category: categoryId, lang }).populate('category', 'name');
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
    const allowedUpdates = ['title', 'content', 'icon', 'isGlobal', 'lang'];
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
router.patch('/templates/:templateId/share', auth, async (req, res) => {
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

// **Toplu Şablon Yükleme**
router.post('/templates/bulk-upload', auth, async (req, res) => {
    try {
        const templates = req.body.templates;

        if (!Array.isArray(templates) || templates.length === 0) {
            return res.status(400).send(errorResponse('Templates array is required and cannot be empty.', 400));
        }

        const createdTemplates = [];
        for (const templateData of templates) {
            const { title, content, category, icon, isGlobal, lang } = templateData;

            if (!lang) {
                return res.status(400).send(errorResponse('Language (lang) is required for all templates.', 400));
            }

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
                lang,
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
