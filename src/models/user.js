const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        validate(username) {
            if (username.length < 4 || username.length > 19) {
                throw new Error({ error: 'Username must be between 4 and 19 characters!' });
            }
        },
        trim: true
    },
    deviceId: {
        type: String,
        required: true
    },
    firToken: {
        type: String,
        default: ""
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    platform: {
        type: String,
        enum: ['android', 'ios'],
        default: 'android'
    },
    language: {
        type: String,
        default: 'unk',
    },
    region: {
        type: String,
        default: 'UNK',
    },
    // Yeni alanlar
    selectedGroups: {
        type: [String],
        default: []
    },
    selectedMessageTypes: {
        type: [String],
        default: []
    },
    selectedPreferences: {
        type: [String],
        default: []
    },
}, {
    timestamps: true
});

userSchema.methods.toJSON = function () {
    const user = this;
    const userObject = user.toObject();

    delete userObject.__v;
    delete userObject.tokens;

    return userObject;
}

userSchema.methods.generateAuthToken = async function () {
    const user = this;
    const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);

    user.tokens = user.tokens.concat({ token });
    await user.save();

    return token;
}

userSchema.statics.findByCredentials = async function (deviceId) {
    const user = await User.findOne({ deviceId });
    if (!user) {
        throw new Error('Unable to login user');
    }
    return user;
}

userSchema.pre('save', async function (next) {
    const user = this;
    next();
})

userSchema.pre('remove', async function (next) {
    const user = this;
    next();
})

const User = mongoose.model('User', userSchema);

module.exports = User;
