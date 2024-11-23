const mongoose = require('mongoose');

// Template Schema
const templateSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate(title) {
            if (title.length < 1 || title.length > 100) {
                throw new Error('Template title must be between 3 and 100 characters!');
            }
        },
    },
    content: {
        type: String,
        required: true,
        trim: true,
        validate(content) {
            if (content.length < 5 || content.length > 1000) {
                throw new Error('Template content must be between 10 and 1000 characters!');
            }
        },
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category', // Şablonun bağlı olduğu kategori
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Şablonu oluşturan kullanıcı
        required: true,
    },
    icon: {
        type: String,
        default: "", // Şablon için bir simge (URL veya Base64 formatında)
    },
    isGlobal: {
        type: Boolean,
        default: true, // Şablon tüm kullanıcılara açık mı?
    },
    shareCount: {
        type: Number,
        default: 0, // Şablonun kaç kez paylaşıldığını takip eder
    },
}, {
    timestamps: true, // Oluşturulma ve güncellenme tarihlerini otomatik ekler
});

// **Instance Methods**
templateSchema.methods.toJSON = function () {
    const template = this;
    const templateObject = template.toObject();

    delete templateObject.__v; // Mongoose versiyon bilgisini kaldır
    return templateObject;
};

// **Static Methods**
templateSchema.statics.findByCategory = async function (categoryId) {
    const templates = await this.find({ category: categoryId });
    return templates;
};

templateSchema.statics.incrementShareCount = async function (templateId) {
    const template = await this.findById(templateId);
    if (!template) {
        throw new Error('Template not found!');
    }
    template.shareCount += 1;
    await template.save();
    return template;
};

// **Middleware**
templateSchema.pre('save', async function (next) {
    const template = this;
    if (template.isModified('title')) {
        console.log(`Template title changed: ${template.title}`);
    }
    next();
});

templateSchema.post('remove', async function (template) {
    console.log(`Template with ID ${template._id} has been removed.`);
});

// **Model Oluşturma**
const Template = mongoose.model('Template', templateSchema);

module.exports = Template;