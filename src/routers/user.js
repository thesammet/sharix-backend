const express = require('express');
const router = new express.Router();
const User = require('../models/user');
const FailedTransaction = require('../models/failed_transaction');
const SuccessfulTransaction = require('../models/successfull_transaction');
const auth = require('../middleware/auth');
const _ = require('lodash');
const { generateRandomUsername } = require('../utils/generate_random_username');
const { successResponse, errorResponse } = require('../utils/response');
const rateLimit = require('express-rate-limit');
const {
    verifyAndroidPurchase,
    verifyIOSPurchase,
} = require('../utils/purchase_verification');

router.post('/user/register', async (req, res) => {
    try {
        const existingUser = await User.findOne({ deviceId: req.body.deviceId });
        if (existingUser) {
            return res.status(400).send(errorResponse('Device ID already exists. User registration failed.', 400));
        }

        const platform = req.body.platform || 'android';
        const firToken = req.body.firToken || "";
        const language = req.body.language || "unk";
        const region = req.body.region || "UNK";
        const generatedUsername = generateRandomUsername();

        const user = new User({
            deviceId: req.body.deviceId,
            username: generatedUsername,
            platform,
            firToken,
            language,
            region,
        });

        const token = await user.generateAuthToken();
        await user.save();

        const userModelFiltered = _.omit(user.toObject(), ["__v", "tokens"]);

        res.status(201).send(successResponse('User registered successfully.', { user: userModelFiltered, token }, 201));
    } catch (error) {
        res.status(400).send(errorResponse(error.toString(), 400));
    }
});

router.post('/user/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.deviceId);
        const token = await user.generateAuthToken();
        res.status(200).send(successResponse('Login successful.', { user, token }, 200));
    } catch (error) {
        res.status(400).send(errorResponse(error.toString(), 400));
    }
});


router.patch('/user/me', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['username'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send(errorResponse('Invalid updates: Fields can only be username.', 400));
    }

    try {
        updates.forEach((update) => req.user[update] = req.body[update]);
        await req.user.save();
        res.status(200).send(successResponse('User updated successfully.', req.user, 200));
    } catch (error) {
        res.status(400).send(errorResponse(error.toString(), 400));
    }
});

router.get('/user/me', auth, async (req, res) => {
    try {
        res.status(200).send(successResponse('User retrieved successfully.', { user: req.user }, 200));
    } catch (error) {
        res.status(404).send(errorResponse(error.toString(), 404));
    }
});

router.delete('/user/me', auth, async (req, res) => {
    try {
        const user = req.user;
        await user.remove();
        res.status(200).send(successResponse('User deleted successfully.', { user }, 200));
    } catch (error) {
        res.status(404).send(errorResponse(error.toString(), 404));
    }
});

router.delete('/user', auth, async (req, res) => {
    try {
        const username = req.query.username;

        // Veritabanında kullanıcıyı bul
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).send(errorResponse('User not found.', 404));
        }

        // Kullanıcıyı sil
        await user.remove();
        res.status(200).send(successResponse('User deleted successfully.', { user }, 200));
    } catch (error) {
        res.status(500).send(errorResponse(error.toString(), 500));
    }
});



router.post('/user/purchase-credits-v3', auth, async (req, res) => {
    try {
        console.log('POST /user/purchase-credits-v3 called');
        console.log('Request body:', req.body);

        const { purchaseToken, productId, platform } = req.body;

        // Validate platform
        if (!['android', 'ios'].includes(platform)) {
            console.log('Invalid platform specified:', platform);
            return res.status(400).json(errorResponse('Invalid platform specified.', 400));
        }
        console.log('Platform validated:', platform);

        // Verify the purchase with the app store
        let isValidPurchase = false;

        if (platform === 'android') {
            console.log('Verifying Android purchase for productId:', productId);
            isValidPurchase = await verifyAndroidPurchase(purchaseToken, productId);
            console.log('Android purchase verification result:', isValidPurchase);
        } else if (platform === 'ios') {
            console.log('Verifying iOS purchase for productId:', productId);
            isValidPurchase = await verifyIOSPurchase(purchaseToken, productId);
            console.log('iOS purchase verification result:', isValidPurchase);
        }

        if (!isValidPurchase) {
            console.log('Invalid purchase token:', purchaseToken);
            return res.status(400).json(errorResponse('Invalid purchase token.', 400));
        }
        console.log('Purchase verified successfully.');

        // Map product ID to credit amount
        console.log('Mapping product ID to credit amount:', productId);
        const creditAmount = productCreditMapping[productId];
        if (!creditAmount) {
            console.log('Invalid product ID:', productId);
            return res.status(400).json(errorResponse('Invalid product ID.', 400));
        }
        console.log('Credit amount determined:', creditAmount);

        // Prevent replay attacks by checking if the purchaseToken has been used
        console.log('Checking for existing transaction with purchaseToken:', purchaseToken);
        const existingTransaction = await SuccessfulTransaction.findOne({ purchaseToken });
        if (existingTransaction) {
            console.log('Purchase token has already been used:', purchaseToken);
            return res.status(400).json(errorResponse('Purchase token has already been used.', 400));
        }
        console.log('No existing transaction found with purchaseToken.');

        // Update user credits
        const user = req.user;
        /*   console.log('Current user credits:', user.generateCredits);
          user.generateCredits += creditAmount; */
        await user.save();
        /*   console.log('Updated user credits:', user.generateCredits); */

        // Log the successful transaction
        console.log('Logging successful transaction.');
        await SuccessfulTransaction.create({
            userId: user._id,
            purchaseToken,
            productId,
            creditAmount,
            platform: req.body.platform
        });
        console.log('Successful transaction logged.');

        res.status(200).json(successResponse('Credits purchased successfully.', { generateCredits: user.generateCredits }, 200));
        console.log('Response sent: Credits purchased successfully.');
    } catch (error) {
        console.error('Error in /user/purchase-credits-v3:', error);

        // Log the failed transaction
        console.log('Logging failed transaction.');
        await FailedTransaction.create({
            userId: req.user._id,
            purchaseToken: req.body.purchaseToken,
            errorMessage: error.message,
        });
        console.log('Failed transaction logged.');

        res.status(400).json(errorResponse(error.toString(), 400));
    }
});

router.patch('/user/preferences', auth, async (req, res) => {
    try {
        const { selectedGroups, selectedMessageTypes, selectedPreferences } = req.body;

        if (!selectedGroups || !selectedMessageTypes || !selectedPreferences) {
            return res.status(400).send(errorResponse('All preferences must be provided.', 400));
        }

        req.user.selectedGroups = selectedGroups;
        req.user.selectedMessageTypes = selectedMessageTypes;
        req.user.selectedPreferences = selectedPreferences;

        await req.user.save();

        res.status(200).send(successResponse('Preferences updated successfully.', req.user, 200));
    } catch (error) {
        res.status(400).send(errorResponse(error.toString(), 400));
    }
});

module.exports = router;