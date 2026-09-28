const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// استبدل الـ URI بكلمة المرور الخاصة بك أو اتركه كما هو لو كان جاهزاً في متغيرات البيئة
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://blackflowerproart_db_user:YOUR_PASSWORD_HERE@membersinfo.tmqa7zr.mongodb.net/blackflower_art?retryWrites=true&w=majority&appName=Membersinfo';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB successfully.');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// نموذج المستخدم والداشبورد
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    dashboardData: {
        balance: { type: Number, default: 0.00 },
        level: { type: Number, default: 1 },
        tasksDone: { type: Number, default: 0 },
        adsViewed: { type: Number, default: 0 },
        country: { type: String, default: 'Jordan (Amman)' },
        loginCount: { type: Number, default: 0 }
    },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// نموذج الإعلانات
const adSchema = new mongoose.Schema({
    title: String,
    url: String,
    duration: Number, // ثواني المشاهدة
    pricePerDay: Number, // سعر اليوم الواحد
    durationDays: { type: Number, default: 1 }, // 1 يوم، 7 أيام، 30 يوم
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date
});
const Ad = mongoose.model('Ad', adSchema);

// نموذج الرسائل والبريد الداخلي والدعم
const messageSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isAdmin: { type: Boolean, default: false },
    sender: String,
    subject: String,
    content: String,
    type: { type: String, enum: ['inbox', 'support'], default: 'inbox' },
    createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// --- المسارات (Endpoints) ---

// 1. تسجيل الدخول
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return.status(401).json({ success: false, message: 'البريد أو كلمة المرور غير صحيحة' });
        }
        user.dashboardData.loginCount = (user.dashboardData.loginCount || 0) + 1;
        await user.save();
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. إنشاء حساب جديد
app.post('/api/admin/create-user', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return.status(400).json({ success: false, message: 'البريد الإلكتروني مستخدم مسبقاً' });
        }
        
        const newUser = await User.create({
            username,
            email,
            password,
            dashboardData: {
                balance: 0.00,
                level: 1,
                tasksDone: 0,
                adsViewed: 0
            }
        });
        
        res.json({ success: true, user: newUser });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. تحديث بيانات المستخدم (اسم المستخدم وكلمة المرور)
app.post('/api/user/update-profile', async (req, res) => {
    try {
        const { userId, newUsername, newPassword } = req.body;
        const user = await User.findById(userId);
        if (!user) return.status(404).json({ success: false, message: 'المستخدم غير موجود' });

        if (newUsername) user.username = newUsername;
        if (newPassword) user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'تم التحديث بنجاح', user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 4. جلب الإعلانات النشطة
app.get('/api/ads', async (req, res) => {
    try {
        const now = new Date();
        // إذا لم تقم بإضافة إعلانات بعد، يمكنك جلب كل الإعلانات أو شرط انتهاء الوقت
        const ads = await Ad.find(); 
        res.json({ success: true, ads });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 5. إرسال رسالة (دعم فني أو بريد)
app.post('/api/messages', async (req, res) => {
    try {
        const { userId, sender, subject, content, type } = req.body;
        const msg = await Message.create({ userId, sender, subject, content, type });
        res.json({ success: true, message: 'تم الإرسال بنجاح', msg });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 6. جلب رسائل المستخدم
app.get('/api/messages/:userId', async (req, res) => {
    try {
        const messages = await Message.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json({ success: true, messages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
