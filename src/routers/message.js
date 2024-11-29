const express = require("express");
const router = new express.Router();
const auth = require("../middleware/auth");
const Message = require("../models/message");
const OpenAI = require("openai");
const { successResponse, errorResponse } = require("../utils/response");

// OpenAI client configuration
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Generate a message
router.post("/message/generate", auth, async (req, res) => {
    const { message, mode, category, tone } = req.body;
    let language = req.language;

    if (language === "unk") {
        language = "en";
    }

    if (!mode) {
        return res
            .status(400)
            .send({ error: "Mode is required to generate a message." });
    }

    try {
        let instruction;
        switch (mode) {
            case "copilot random-message":
                instruction = `Generate a random thoughtful message. Only provide the message content without any additional explanation, context, or subject.`;
                break;

            case "copilot message-by-category":
                if (!category) {
                    return res.status(400).send(
                        errorResponse(
                            "Category is required for message-by-category mode.",
                            400
                        )
                    );
                }
                instruction = `Generate a message suitable for the '${category}' category. Only provide the message content without any additional explanation, context, or subject.`;
                break;

            case "copilot short-message":
                if (!message) {
                    return res.status(400).send(
                        errorResponse(
                            "Message input is required for short-message mode.",
                            400
                        )
                    );
                }
                instruction = `Rewrite the following message in a shorter form: "${message}". Only provide the shortened message content without any additional explanation, context, or subject.`;
                break;

            case "copilot complete-message":
                if (!message) {
                    return res.status(400).send(
                        errorResponse(
                            "Message input is required for complete-message mode.",
                            400
                        )
                    );
                }
                instruction = `Complete the following unfinished message: "${message}". Only provide the completed message content without any additional explanation, context, or subject.`;
                break;

            case "copilot change-tone":
                if (!message || !tone) {
                    return res.status(400).send(
                        errorResponse(
                            "Message and tone are required for change-tone mode.",
                            400
                        )
                    );
                }
                instruction = `Change the tone of the following message to be more ${tone}: "${message}". Only provide the rewritten message content without any additional explanation, context, or subject.`;
                break;

            case "copilot input-message":
                if (!message) {
                    return res.status(400).send(
                        errorResponse(
                            "Message input is required for input-message mode.",
                            400
                        )
                    );
                }
                instruction = `Write a response to the following input message: "${message}". Only provide the response message content without any additional explanation, context, or subject.`;
                break;

            default:
                return res.status(400).send({ error: "Invalid mode specified." });
        }

        const response = await client.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content:
                        "You are a helpful assistant for generating personalized messages.",
                },
                { role: "user", content: instruction },
            ],
            max_tokens: 100,
            temperature: 0.7,
        });

        // Extract the generated message
        const generatedMessage = response.choices[0].message.content.trim();

        // Save the message to the database
        const savedMessage = await new Message({
            prompt: instruction,
            generatedMessage,
            userId: req.user._id,
        }).save();

        res.status(200).send(
            successResponse(
                "Message generated successfully.",
                {
                    id: savedMessage._id,
                    generated: savedMessage.generatedMessage,
                },
                200
            )
        );
    } catch (error) {
        res
            .status(500)
            .send(errorResponse("Failed to generate a message.", 500));
    }
});


// Retrieve message history
router.get("/messages", auth, async (req, res) => {
    try {
        const messages = await Message.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.status(200).send(successResponse("Messages retrieved successfully.", messages, 200));
    } catch (error) {
        res.status(500).send(errorResponse(error.toString(), 500));
    }
});

// Retrieve messages by category
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

// Generate a random message
router.post("/message/random", auth, async (req, res) => {
    try {
        const instruction = `Generate a random message. Only provide the rewritten message content without any additional explanation, context, or subject.`;
        const response = await client.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [{ role: "user", content: instruction }],
            max_tokens: 100,
            temperature: 0.7,
        });

        const generatedMessage = response.choices[0].message.content.trim();

        // Save the generated message to the database
        const savedMessage = await new Message({
            prompt: instruction,
            generatedMessage,
            userId: req.user._id,
        }).save();

        res.status(200).send(
            successResponse("Random message generated successfully.", {
                id: savedMessage._id,
                generated: savedMessage.generatedMessage,
            }, 200)
        );
    } catch (error) {
        res.status(500).send(errorResponse("Failed to generate a random message.", 500));
    }
});

module.exports = router;
