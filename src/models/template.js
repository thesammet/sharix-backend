const mongoose = require('mongoose');

// Template Schema
const templateSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: true,
            trim: true,
            validate(content) {
                if (content.length > 1000) {
                    throw new Error('Template content must be between 10 and 1000 characters!');
                }
            },
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category', // Şablonun bağlı olduğu kategori
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Şablonu oluşturan kullanıcı
            required: true,
        },
        backgroundImage: {
            type: String, // Arka plan resmi için URL
            default: null,
        },
        fontStyle: {
            type: String, // Yazı tipi
            default: 'normal',
        },
        fontName: {
            type: String, // Yazı tipi
            default: 'Roboto',
        },
        fontSize: {
            type: Number, // Yazı boyutu
            default: 14,
        },
        textAlign: {
            type: String,
            enum: ['left', 'center', 'right', 'top', 'bottom'],
            default: 'center', // Metin hizalaması
        },
        verticalAlign: {
            type: String,
            enum: ['center', 'top', 'bottom'],
            default: 'center',
        },
        textColor: {
            type: String,
            default: "#000000",
        },
        isGlobal: {
            type: Boolean,
            default: true, // Şablon tüm kullanıcılara açık mı?
        },
        isCustom: {
            type: Boolean,
            default: false, // Admin tarafından mı oluşturulmuş, kullanıcı tarafından mı
        },
        lang: {
            type: String,
            required: true,
            trim: true,
            default: 'en',
        },
        shareCount: {
            type: Number,
            default: 0, // Şablonun kaç kez paylaşıldığını takip eder
        },
    },
    {
        timestamps: true, // Oluşturulma ve güncellenme tarihlerini otomatik ekler
    }
);

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
    if (template.isModified('content')) {
        console.log(`Template content changed: ${template.content}`);
    }
    next();
});

templateSchema.post('remove', async function (template) {
    console.log(`Template with ID ${template._id} has been removed.`);
});

// **Model Oluşturma**
const Template = mongoose.model('Template', templateSchema);

module.exports = Template;
