const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        prompt: {
            type: String,
            required: true,
        },
        generatedMessage: {
            type: String,
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
