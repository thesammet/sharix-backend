const mongoose = require('mongoose');

const backgroundCategorySchema = new mongoose.Schema({
    name: {
        type: Map,
        of: String, // Localized strings for names
        required: true,
    },
    description: {
        type: Map,
        of: String, // Localized strings for descriptions
        default: {},
    },
    imageUrl: {
        type: String, // Image URL for the category
        required: true,
        validate: {
            validator: function (value) {
                return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(value);
            },
            message: 'Invalid image URL format.',
        },
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
    timestamps: true, // Automatically manage createdAt and updatedAt
});

const BackgroundCategory = mongoose.model('BackgroundCategory', backgroundCategorySchema);

module.exports = BackgroundCategory;
