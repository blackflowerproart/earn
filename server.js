const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// الاتصال بقاعدة بيانات MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/blackflower_db';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB successfully.');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// نموذج المستخدم (User Schema)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    tasksDone: { type: Number, default: 0 },
    adsViewed: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

// نموذج الإشعارات أو التنبيهات (Notification Schema)
const notificationSchema = new mongoose.Schema({
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// نموذج عمليات السحب (Withdrawal Schema)
const withdrawalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountBfp: { type: Number, required: true },
    amountUsd: { type: Number, required: true },
    method: { type: String, required: true },
    account: { type: String, required: true },
    status: { type: String, default: 'Completed' },
    createdAt: { type: Date, default: Date.now }
});

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

// ================= API Routes =================

// 1. مسار تسجيل الدخول
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ $or: [{ email: email }, { username: email }] });
        
        if (!user) {
            return.status(400).json({ success: false, message: 'Invalid email or username.' });
        }

        if (user.password !== password) {
            return.status(400).json({ success: false, message: 'Incorrect password.' });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                balance: user.balance,
                level: user.level,
                tasksDone: user.tasksDone,
                adsViewed: user.adsViewed
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// 2. مسار جلب الإشعارات العامة
app.get('/api/notifications', async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 }).limit(5);
        res.json({ success: true, notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// 3. مسار معالجة الدفع عبر FaucetPay Merchant
app.post('/api/payment/faucetpay', async (req, res) => {
    try {
        const { userId, bfpAmount, usdAmount, packageName } = req.body;

        if (!userId || !usdAmount) {
            return.status(400).json({ success: false, message: 'Invalid data provided.' });
        }

        const merchantUsername = 'mohabramzi'; 
        const callbackUrl = 'https://earn-uq8k.onrender.com/api/payment/faucetpay-ipn';
        const customData = JSON.stringify({ userId, bfpAmount });

        const faucetPayUrl = `https://faucetpay.io/merchant/to?merchant=${encodeURIComponent(merchantUsername)}&amount=${usdAmount}&currency=USD&item_description=${encodeURIComponent(packageName)}&custom=${encodeURIComponent(customData)}&callback_url=${encodeURIComponent(callbackUrl)}`;

        res.json({
            success: true,
            redirectUrl: faucetPayUrl
        });

    } catch (error) {
        console.error('FaucetPay payment error:', error);
        res.status(500).json({ success: false, message: 'Server error processing payment.' });
    }
});

// 4. مسار استقبال التأكيد التلقائي IPN من FaucetPay لتحديث MongoDB
app.post('/api/payment/faucetpay-ipn', async (req, res) => {
    try {
        const ipnData = req.body;

        if (ipnData && ipnData.valid === true) {
            const customInfo = JSON.parse(ipnData.custom || '{}');
            const { userId, bfpAmount } = customInfo;

            if (userId && bfpAmount) {
                const user = await User.findById(userId);
                if (user) {
                    user.balance = (user.balance || 0) + Number(bfpAmount);
                    user.level = Math.floor(user.balance / 10) + 1;
                    await user.save();
                }
            }
        }

        res.status(200).send('IPN OK');
    } catch (error) {
        console.error('IPN processing error:', error);
        res.status(500).send('IPN Error');
    }
});

// 5. مسار طلب سحب الأرباح الفوري وحفظه في MongoDB (مع احتساب رسوم FaucetPay و PayPal)
app.post('/api/withdraw', async (req, res) => {
    try {
        const { userId, amountBfp, method, account } = req.body;

        if (!userId || !amountBfp || !method || !account) {
            return.status(400).json({ success: false, message: 'Missing required withdrawal fields.' });
        }

        if (amountBfp < 1000) {
            return.status(400).json({ success: false, message: 'Minimum withdrawal amount is 1,000 BFP ($1.00 USD).' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user.balance < amountBfp) {
            return.status(400).json({ success: false, message: 'Insufficient balance.' });
        }

        // حساب الرسوم (0.50 دولار لباي بال، 0.10 دولار لفوسيت باي)
        const grossUsd = amountBfp * 0.001;
        const feeUsd = method === 'paypal' ? 0.50 : 0.10;

        if (grossUsd <= feeUsd) {
            return.status(400).json({ success: false, message: 'Withdrawal amount is too low to cover transaction fees.' });
        }

        const netUsd = grossUsd - feeUsd;

        // خصم المبلغ كاملاً من رصيد المستخدم
        user.balance -= Number(amountBfp);
        await user.save();

        // حفظ سجل عملية السحب في قاعدة البيانات
        const newWithdrawal = new Withdrawal({
            userId: user._id,
            amountBfp,
            amountUsd: netUsd,
            method,
            account,
            status: 'Completed'
        });

        await newWithdrawal.save();

        res.json({
            success: true,
            message: `Withdrawal of $${netUsd.toFixed(2)} USD processed successfully via ${method.toUpperCase()} (Fee: $${feeUsd.toFixed(2)})!`,
            newBalance: user.balance
        });

    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({ success: false, message: 'Server error during withdrawal processing.' });
    }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
