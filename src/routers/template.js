const express = require('express');
const router = new express.Router();
const Template = require('../models/template');
const Category = require('../models/category');
const auth = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

const paginate = async (model, query, page, limit) => {
    const skip = (page - 1) * limit;
    const totalItems = await model.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    return {
        data: await model.find(query).skip(skip).limit(limit).populate('category', 'name'),
        pagination: {
            page,
            limit,
            totalPages,
            totalItems,
        },
    };
};

// **Şablon Oluşturma**
router.post('/templates', auth, async (req, res) => {
    const { content, category, backgroundImage, fontStyle, fontName, fontSize, textAlign, verticalAlign, textColor, isGlobal, lang } = req.body;

    try {
        if (category) {
            const categoryExists = await Category.findById(category);
            if (!categoryExists) {
                return res.status(404).send(errorResponse('Category not found.', 404));
            }
        }

        const template = new Template({
            content,
            category,
            createdBy: req.user._id, // Oturum açan kullanıcıyı ekle
            backgroundImage,
            fontStyle,
            fontName,
            fontSize,
            textAlign,
            verticalAlign,
            textColor,
            isGlobal,
            isCustom: false, /* req.user.role !== 'admin', // Admin değilse isCustom true */
            lang,
        });

        await template.save();
        res.status(201).send(successResponse('Template created successfully.', template, 201));
    } catch (error) {
        res.status(400).send(errorResponse(error.message, 400));
    }
});

router.get('/templates/admin', auth, async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    try {
        const { data, pagination } = await paginate(
            Template,
            { isCustom: false, isGlobal: true },
            parseInt(page),
            parseInt(limit)
        );
        res.status(200).send(successResponse('Admin templates retrieved successfully.', { templates: data, pagination }, 200));
    } catch (error) {
        res.status(500).send(errorResponse(error.message, 500));
    }
});

// **Kullanıcı Şablonları Listeleme**
router.get('/templates/user', auth, async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    try {
        const { data, pagination } = await paginate(
            Template,
            { createdBy: req.user._id, isCustom: true },
            parseInt(page),
            parseInt(limit)
        );
        res.status(200).send(successResponse('User templates retrieved successfully.', { templates: data, pagination }, 200));
    } catch (error) {
        res.status(500).send(errorResponse(error.message, 500));
    }
});

// **Şablon Güncelleme**
router.patch('/templates/:templateId', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['content', 'icon', 'isGlobal', 'lang', 'backgroundImage', 'fontStyle', 'fontName', 'fontSize', 'textAlign', 'verticalAlign', 'textColor'];
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
router.get('/templates', auth, async (req, res) => {
    const { page = 1, limit = 10, lang = 'en' } = req.query;

    try {
        const { data, pagination } = await paginate(
            Template,
            { isGlobal: true, lang },
            parseInt(page),
            parseInt(limit)
        );
        res.status(200).send(successResponse('Templates retrieved successfully.', { templates: data, pagination }, 200));
    } catch (error) {
        res.status(500).send(errorResponse(error.message, 500));
    }
});

// **Kategoriye Göre Şablonları Listeleme**
router.get('/templates/category/:categoryId', auth, async (req, res) => {
    const { categoryId } = req.params;
    const { page = 1, limit = 10, lang = 'en' } = req.query;

    try {
        const { data, pagination } = await paginate(
            Template,
            { category: categoryId, lang },
            parseInt(page),
            parseInt(limit)
        );

        if (!data || data.length === 0) {
            return res.status(404).send(errorResponse('No templates found for this category.', 404));
        }
        res.status(200).send(successResponse('Templates retrieved successfully.', { templates: data, pagination }, 200));
    } catch (error) {
        res.status(500).send(errorResponse(error.message, 500));
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
            const { content, category, icon, isGlobal, lang, backgroundImage, fontStyle, fontName, fontSize, textAlign, verticalAlign, textColor } = templateData;

            if (!lang) {
                return res.status(400).send(errorResponse('Language (lang) is required for all templates.', 400));
            }

            if (!content || content.length < 5) {
                return res.status(400).send(errorResponse('Content must be at least 5 characters long.', 400));
            }

            const categoryExists = await Category.findById(category);
            if (!categoryExists) {
                return res.status(404).send(errorResponse(`Category with ID ${category} not found.`, 404));
            }

            const template = new Template({
                content,
                category,
                createdBy: req.user._id,
                icon,
                isGlobal,
                lang,
                backgroundImage,
                fontStyle,
                fontName,
                fontSize,
                textAlign,
                verticalAlign,
                textColor,
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
