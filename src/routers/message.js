const express = require("express");
const router = new express.Router();
const auth = require("../middleware/auth");
const Message = require("../models/message");
const OpenAI = require("openai");
const { successResponse, errorResponse } = require("../utils/response");

// OpenAI istemcisi yapılandırması
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Mesaj oluşturma
router.post("/message/generate", auth, async (req, res) => {
    const { message, mode, category, tone } = req.body; // `tone` parametresini ekledik
    let language = req.language;

    if (language === "unk") {
        language = "en";
    }

    if (!mode) {
        return res.status(400).send({ error: "Mode is required to generate a message." });
    }

    try {
        let instruction;
        switch (mode) {
            case "copilot random-message":
                instruction = `Generate a random thoughtful message in ${language} without any additional explanation, context, or subject. Only message content is needed.`;
                break;

            case "copilot message-by-category":
                if (!category) {
                    return res
                        .status(400)
                        .send({ error: "Category is required for this mode." });
                }
                instruction = `Generate a message suitable for the '${category}' category in ${language}.`;
                break;

            case "copilot short-message":
                instruction = `Rewrite the following message in a shorter form in ${language}: "${message}".`;
                break;

            case "copilot complete-message":
                instruction = `Complete the following unfinished message in ${language}: "${message}".`;
                break;

            case "copilot change-tone":
                if (!tone) {
                    return res
                        .status(400)
                        .send({ error: "Tone is required for change-tone mode." });
                }
                instruction = `Change the tone of the following message to be more ${tone} in ${language}: "${message}".`;
                break;

            default:
                return res.status(400).send({ error: "Invalid mode specified." });
        }

        const response = await client.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                { role: "system", content: "You are a helpful assistant for generating personalized messages." },
                { role: "user", content: instruction },
            ],
            max_tokens: 100,
            temperature: 0.7,
        });

        // Sadece üretilen mesajı döndür
        const generatedMessage = response.choices[0].message.content.trim();
        res.status(200).send(successResponse("Message generated successfully.", generatedMessage, 200));
    } catch (error) {
        res.status(500).send({ error: error.toString() });
    }
});


// Mesaj geçmişi
router.get("/messages", auth, async (req, res) => {
    try {
        const messages = await Message.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.status(200).send(successResponse("Messages retrieved successfully.", messages, 200));
    } catch (error) {
        res.status(500).send(errorResponse(error.toString(), 500));
    }
});

// Yeni özellik: mesajları kategoriye göre listele
router.get("/messages/category/:category", auth, async (req, res) => {
    try {
        const { category } = req.params;
        const messages = await Message.find({
            userId: req.user._id,
            category,
        }).sort({ createdAt: -1 });

        if (!messages.length) {
            return res.status(404).send(errorResponse("No messages found for this category.", 404));
        }

        res.status(200).send(successResponse("Messages retrieved successfully by category.", messages, 200));
    } catch (error) {
        res.status(500).send(errorResponse(error.toString(), 500));
    }
});

// Mesaj oluşturma: rastgele
router.post("/message/random", auth, async (req, res) => {
    try {
        const instruction = `Generate a random message in ${req.language || "en"} without any additional explanation, context or subject. Only message content is needed.`;
        const response = await client.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [{ role: "user", content: instruction }],
            max_tokens: 100,
            temperature: 0.7,
        });

        res.status(200).send(successResponse("Random message generated successfully.", {
            generated: response.choices[0].message.content.trim(),
        }, 200));
    } catch (error) {
        res.status(500).send(errorResponse("Failed to generate a random message.", 500));
    }
});

module.exports = router;
