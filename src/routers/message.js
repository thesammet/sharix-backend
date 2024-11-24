const express = require("express");
const router = new express.Router();
const auth = require("../middleware/auth");
const Message = require("../models/message");
const { Configuration, OpenAIApi } = require("openai");
const { successResponse, errorResponse } = require("../utils/response");

// OpenAI yapılandırması
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Mesaj oluşturma
router.post("/message/generate", auth, async (req, res) => {
    const { message, mode, category } = req.body;
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
                instruction = `Generate a random thoughtful message in ${language}.`;
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
                instruction = `Change the tone of the following message to be more formal in ${language}: "${message}".`;
                break;

            default:
                return res.status(400).send({ error: "Invalid mode specified." });
        }

        const response = await openai.createChatCompletion({
            model: "gpt-4-turbo",
            messages: [
                { role: "system", content: "You are a helpful assistant for generating personalized messages." },
                { role: "user", content: instruction },
            ],
            max_tokens: 100,
            temperature: 0.7,
        });


        res.status(200).send({
            message: "Message generated successfully.",
            data: {
                original: message || "",
                generated: response.data.choices[0].text.trim(),
                mode,
                category: category || null,
                language,
            },
        });
    } catch (error) {
        res.status(500).send({ error: error.toString() });
    }
});

router.get("/messages", auth, async (req, res) => {
    try {
        const messages = await Message.find({ userId: req.user._id }).sort({
            createdAt: -1,
        });
        res
            .status(200)
            .send(successResponse("Messages retrieved successfully.", messages, 200));
    } catch (error) {
        res.status(500).send(errorResponse(error.toString(), 500));
    }
});

module.exports = router;
