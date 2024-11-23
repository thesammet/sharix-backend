const mongoose = require('mongoose');

const SuccessfulTransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    purchaseToken: { type: String, required: true, unique: true },
    productId: { type: String, required: true },
    creditAmount: { type: Number, required: true },
    platform: { type: String, required: false },
    date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SuccessfulTransaction', SuccessfulTransactionSchema);