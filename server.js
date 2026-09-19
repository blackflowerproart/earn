const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// الاتصال بقاعدة بيانات MongoDB (يمكنك استبدال الرابط برابط الاتصال الخاص بك)
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

// ================= API Routes =================

// 1. مسار تسجيل الدخول
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // البحث عن المستخدم بالبريد الإلكتروني أو اسم المستخدم
        const user = await User.findOne({ $or: [{ email: email }, { username: email }] });
        
        if (!user) {
            return.status(400).json({ success: false, message: 'Invalid email or username.' });
        }

        // ملاحظة: يمكنك إضافة التحقق من كلمة المرور المشفرة هنا لاحقاً
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

// 2. مسار جلب الإشعارات العامة للبث
app.get('/api/notifications', async (req, res) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 }).limit(5);
        res.json({ success: true, notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// 3. مسار شراء وتعبئة رصيد BFP وتحديثه مباشرة في MongoDB
app.post('/api/user/buy-bfp', async (req, res) => {
    try {
        const { userId, bfpAmount, usdAmount, packageName } = req.body;

        if (!userId || !bfpAmount) {
            return.status(400).json({ success: false, message: 'User ID and BFP amount are required.' });
        }

        // البحث عن المستخدم وتحديث رصيده في قاعدة البيانات
        const user = await User.findById(userId);
        if (!user) {
            return.status(404).json({ success: false, message: 'User not found.' });
        }

        // زيادة الرصيد
        user.balance = (user.balance || 0) + bfpAmount;
        
        // حساب المستوى الجديد تلقائياً بناءً على الرصيد (كل 10 BFP = مستوى جديد)
        user.level = Math.floor(user.balance / 10) + 1;

        await user.save();

        res.json({
            success: true,
            message: `Successfully purchased ${bfpAmount} BFP via package: ${packageName}`,
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
        console.error('Error processing BFP purchase:', error);
        res.status(500).json({ success: false, message: 'Server error during BFP purchase.' });
    }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
