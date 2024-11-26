const mongoose = require('mongoose');

const backgroundSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    imageUrl: {
        type: String,
        required: true,
        validate: {
            validator: function (value) {
                return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(value);
            },
            message: 'Invalid URL format.'
        }
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BackgroundCategory',
        required: true
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Background = mongoose.model('Background', backgroundSchema);

module.exports = Background;
