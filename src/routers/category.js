// lib/routes/categories.js

const express = require('express');
const router = new express.Router();
const Category = require('../models/category');
const auth = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');

// Pagination Utility Function
const paginate = async (model, query, page, limit, sort = { updatedAt: -1 }) => {
    const skip = (page - 1) * limit;
    const totalItems = await model.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    return {
        data: await model
            .find(query)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate('parentCategory', 'name'), // 'parentCategory' alanını populate ediyoruz
        pagination: {
            page,
            limit,
            totalPages,
            totalItems,
        },
    };
};

// **Kategori Oluşturma**
router.post('/categories', auth, async (req, res) => {
    try {
        const { name, description, parentCategory, isGlobal, icon, lang, color } = req.body;

        // Zorunlu alanların kontrolü
        if (!name) {
            return res.status(400).send(errorResponse('Category name is required.', 400));
        }

        if (!lang) {
            return res.status(400).send(errorResponse('Language (lang) is required.', 400));
        }

        // Eğer parentCategory belirtilmişse, mevcut olup olmadığını kontrol et
        if (parentCategory) {
            const parent = await Category.findById(parentCategory);
            if (!parent) {
                return res.status(404).send(errorResponse('Parent category not found.', 404));
            }
        }

        const category = new Category({
            name,
            description,
            parentCategory: parentCategory || null,
            isGlobal: isGlobal ?? true,
            icon,
            lang,
            color,
            createdBy: req.user._id,
        });

        await category.save();
        res.status(201).send(successResponse('Category created successfully.', category, 201));
    } catch (error) {
        res.status(400).send(errorResponse(error.toString(), 400));
    }
});

// **Toplu Kategori Oluşturma**
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

        if (validCategories.length === 0) {
            return res.status(400).send(errorResponse('No valid categories to create.', 400));
        }

        const createdCategories = await Category.insertMany(validCategories);

        res.status(201).send(successResponse('Categories created successfully.', createdCategories, 201));
    } catch (error) {
        res.status(400).send(errorResponse(error.message, 400));
    }
});

// **Kategorileri Listeleme (Ana veya Alt Kategoriler - Sayfalı)**
router.get('/categories', auth, async (req, res) => {
    try {
        const lang = req.query.lang || 'en'; // Dil filtresi
        const page = parseInt(req.query.page) || 1; // Varsayılan sayfa 1
        const limit = parseInt(req.query.limit) || 10; // Varsayılan limit 10
        const isMainCategory = req.query.mainCategory === 'true'; // Ana kategori olup olmadığını kontrol et

        // Ana veya alt kategoriler için filtreyi ayarla
        const filter = isMainCategory ? { lang, parentCategory: null } : { lang, parentCategory: { $ne: null } };

        const { data, pagination } = await paginate(
            Category,
            filter,
            page,
            limit,
            { createdAt: 1 } // Oluşturulma tarihine göre sırala
        );

        const message = isMainCategory
            ? 'Main categories retrieved successfully.'
            : 'Subcategories retrieved successfully.';

        res.status(200).send(successResponse(message, { categories: data, pagination }, 200));
    } catch (error) {
        res.status(500).send(errorResponse(error.toString(), 500));
    }
});

// **Tek Bir Kategoriyi Getirme**
router.get('/categories/:id', auth, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id).populate('parentCategory', 'name');

        if (!category) {
            return res.status(404).send(errorResponse('Category not found.', 404));
        }

        res.status(200).send(successResponse('Category retrieved successfully.', category, 200));
    } catch (error) {
        res.status(500).send(errorResponse(error.toString(), 500));
    }
});

// **Kategori Güncelleme**
router.patch('/categories/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'description', 'parentCategory', 'isGlobal', 'icon', 'lang', 'color'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send(errorResponse('Invalid updates: Only specific fields are allowed.', 400));
    }

    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).send(errorResponse('Category not found.', 404));
        }

        // Eğer parentCategory güncellenmişse, mevcut olup olmadığını kontrol et
        if (updates.includes('parentCategory') && req.body.parentCategory) {
            const parent = await Category.findById(req.body.parentCategory);
            if (!parent) {
                return res.status(404).send(errorResponse('Parent category not found.', 404));
            }
        }

        updates.forEach((update) => (category[update] = req.body[update]));
        await category.save();

        res.status(200).send(successResponse('Category updated successfully.', category, 200));
    } catch (error) {
        res.status(400).send(errorResponse(error.toString(), 400));
    }
});

// **Kategori Silme**
router.delete('/categories/:id', auth, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).send(errorResponse('Category not found.', 404));
        }

        // Alt kategorileri sil
        await Category.deleteMany({ parentCategory: req.params.id });

        // Kategoriyi sil
        await category.remove();

        res.status(200).send(successResponse('Category and its subcategories deleted successfully.', category, 200));
    } catch (error) {
        res.status(400).send(errorResponse(error.toString(), 400));
    }
});


// **Belirli Bir Kategorinin Alt Kategorilerini Listeleme (Sayfalı)**
router.get('/categories/:id/subcategories', auth, async (req, res) => {
    try {
        const lang = req.query.lang || 'en'; // Dil filtresi
        const page = parseInt(req.query.page) || 1; // Varsayılan sayfa 1
        const limit = parseInt(req.query.limit) || 10; // Varsayılan limit 10

        const { data, pagination } = await paginate(
            Category,
            { parentCategory: req.params.id, lang },
            page,
            limit,
            { createdAt: 1 } // Son güncellenenler önce gelsin
        );

        if (data.length === 0) {
            return res.status(404).send(errorResponse('No subcategories found for this category.', 404));
        }

        res.status(200).send(successResponse('Subcategories retrieved successfully.', { subcategories: data, pagination }, 200));
    } catch (error) {
        res.status(400).send(errorResponse(error.toString(), 400));
    }
});

module.exports = router;
