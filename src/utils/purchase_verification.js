const axios = require('axios');
const { google } = require('googleapis');

async function getAccessToken() {
    const keyFilePath = __dirname + '/../../google_service_account_key.json';

    const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });

    const authClient = await auth.getClient();
    const accessToken = await authClient.getAccessToken();
    return accessToken.token;
}

async function verifyAndroidPurchase(purchaseToken, productId) {
    const packageName = process.env.PACKAGE_NAME; // Uygulamanızın paket adı

    // Access token'ı servis hesabınızı kullanarak alın
    const accessToken = await getAccessToken();

    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`;

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        // Satın alma durumunu kontrol edin (0: Satın alındı, 1: İptal edildi, 2: Beklemede)
        return response.data.purchaseState === 0;
    } catch (error) {
        console.error('Google Play doğrulama hatası:', error.response ? error.response.data : error.message);
        return false;
    }
}


async function verifyIOSPurchase(purchaseToken, productId) {
    const sharedSecret = process.env.APPLE_SHARED_SECRET;

    const requestBody = {
        'receipt-data': purchaseToken,
        'password': sharedSecret,
        'exclude-old-transactions': true,
    };

    let url = 'https://buy.itunes.apple.com/verifyReceipt';

    try {
        let response = await axios.post(url, requestBody, {
            timeout: 5000,
        });

        // If the receipt is from the sandbox environment, Apple returns status 21007
        if (response.data.status === 21007) {
            url = 'https://sandbox.itunes.apple.com/verifyReceipt';
            response = await axios.post(url, requestBody, {
                timeout: 5000,
            });
        }

        // Log the response for debugging
        console.log('Apple verifyReceipt response:', response.data);

        // Check for successful verification
        if (response.data.status !== 0) {
            console.error('Apple receipt verification failed with status:', response.data.status);
            return false;
        }

        // Verify that the product ID matches
        const inAppReceipts = response.data.receipt.in_app || [];
        const isValidProduct = inAppReceipts.some((item) => item.product_id === productId);

        if (!isValidProduct) {
            console.error('Product ID does not match any in-app purchases in the receipt.');
            return false;
        }

        return true; // Purchase is valid
    } catch (error) {
        console.error('Apple Store verification error:', error.response ? error.response.data : error.message);
        return false;
    }
}


module.exports = {
    verifyAndroidPurchase,
    verifyIOSPurchase,
};
