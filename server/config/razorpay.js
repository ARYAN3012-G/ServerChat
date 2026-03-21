const Razorpay = require('razorpay');

let _razorpay = null;

const getRazorpay = () => {
    if (_razorpay) return _razorpay;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || keyId === 'your_razorpay_key_id' || !keySecret || keySecret === 'your_razorpay_key_secret') {
        console.warn('⚠️  Razorpay keys not configured. Payment features will be disabled until keys are added.');
        return null;
    }

    _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    return _razorpay;
};

// Legacy export for backward compat — lazily resolved
module.exports = { razorpay: new Proxy({}, {
    get(_, prop) {
        const instance = getRazorpay();
        if (!instance) throw new Error('Razorpay not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your environment.');
        return instance[prop];
    }
}), getRazorpay };
