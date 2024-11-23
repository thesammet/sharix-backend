const mongoose = require('mongoose');

// Kategori Şeması
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate(name) {
            if (name.length < 3 || name.length > 50) {
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

// **Örnek Metotlar**
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

// **Statik Metotlar**
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

// **Middleware (save ve remove işlemleri)**
categorySchema.pre('save', async function (next) {
    const category = this;
    if (!category.slug || category.isModified('name')) {
        category.generateSlug();
    }

    next();
});

categorySchema.post('remove', async function (category) {
    // Bu kategorinin altındaki kategorilerin parentCategory'sini null yap
    await Category.updateMany({ parentCategory: category._id }, { parentCategory: null });
});

// **Model Oluşturma**
const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
