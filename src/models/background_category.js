const mongoose = require('mongoose');

const backgroundCategorySchema = new mongoose.Schema({
    name: {
        type: Map,
        of: String, // Her dil için isimler string olacak
        required: true,
    },
    description: {
        type: Map,
        of: String, // Her dil için açıklamalar string olacak
        default: {},
    },
    isPremium: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true, // createdAt ve updatedAt otomatik yönetilir
});

const BackgroundCategory = mongoose.model('BackgroundCategory', backgroundCategorySchema);

module.exports = BackgroundCategory;
