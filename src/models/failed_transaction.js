const mongoose = require('mongoose');

const FailedTransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    purchaseToken: { type: String },
    errorMessage: { type: String, required: true },
    date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FailedTransaction', FailedTransactionSchema);