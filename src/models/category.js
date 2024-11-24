const mongoose = require('mongoose');

// Kategori Şeması
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        validate(name) {
            if (name.length < 1 || name.length > 50) {
                throw new Error('Category name must be between 3 and 50 characters!');
            }
        },
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
    },
    description: {
        type: String,
        default: "",
        trim: true,
    },
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null, // Ana kategori yoksa null
    },
    isGlobal: {
        type: Boolean,
        default: true, // Varsayılan olarak herkese açık
    },
    color: {
        type: String,
        default: "#000000", // Varsayılan rengi siyah
    },
    lang: {
        type: String,
        required: true,
        trim: true,
        enum: ['en', 'tr', 'es', 'de', 'fr'], // Geçerli diller
        default: 'en', // Varsayılan dil
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    icon: {
        type: String,
        default: "", // Kategoriye özel bir simge (URL veya Base64)
    },
}, {
    timestamps: true, // Oluşturma ve güncelleme zamanlarını otomatik olarak ekler
});

// **Metotlar ve Middleware**
categorySchema.methods.toJSON = function () {
    const category = this;
    const categoryObject = category.toObject();
    delete categoryObject.__v; // Mongoose versiyonunu kaldır
    return categoryObject;
};

categorySchema.methods.generateSlug = function () {
    const category = this;
    category.slug = category.name
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, ''); // İsme göre slug oluştur
};

categorySchema.statics.findBySlugOrId = async function (identifier) {
    const category = await this.findOne({
        $or: [{ slug: identifier }, { _id: identifier }],
    });
    if (!category) {
        throw new Error('Category not found!');
    }
    return category;
};

categorySchema.statics.getSubcategories = async function (parentId) {
    const subcategories = await this.find({ parentCategory: parentId });
    return subcategories;
};

categorySchema.pre('save', async function (next) {
    const category = this;

    if (!category.slug || category.isModified('name')) {
        // İngilizce olmayan karakterleri koruyan slug oluşturma
        let baseSlug = category.name
            .toLowerCase()
            .trim()
            .replace(/ /g, '-') // Boşlukları tire ile değiştir
            .replace(/[^a-zA-Z0-9\u00C0-\u00FF-]/g, ''); // İngilizce dışı Unicode karakterlere izin ver

        // Üst kategori varsa, slug'ın önüne ekle
        if (category.parentCategory) {
            const parent = await mongoose.model('Category').findById(category.parentCategory);
            if (parent) {
                baseSlug = `${parent.slug}-${baseSlug}`;
            }
        }

        let slug = baseSlug;
        let count = 0;

        // Aynı slug'a sahip başka bir kategori var mı kontrol et
        while (await mongoose.model('Category').findOne({ slug, parentCategory: category.parentCategory })) {
            count++;
            slug = `${baseSlug}-${count}`;
        }

        category.slug = slug;
    }

    next();
});

categorySchema.post('remove', async function (category) {
    await Category.updateMany({ parentCategory: category._id }, { parentCategory: null });
});

// **Model Oluşturma**
const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
