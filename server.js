const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// الاتصال بقاعدة بيانات MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://blackflower:cluster0@cluster0.mongodb.net/blackflower_art?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB successfully.');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// تعريف نموذج المستخدم وهيكل بيانات الداشبورد (JSON)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    dashboardData: {
        balance: { type: Number, default: 0.00 },
        level: { type: Number, default: 1 },
        tasksDone: { type: Number, default: 0 },
        adsViewed: { type: Number, default: 0 },
        depositsCount: { type: Number, default: 0 },
        withdrawalsCount: { type: Number, default: 0 },
        adsPosted: { type: Number, default: 0 },
        tasksCreated: { type: Number, default: 0 },
        isOnline: { type: Boolean, default: false },
        isBanned: { type: Boolean, default: false },
        country: { type: String, default: 'Jordan (Amman)' },
        ipChanges: { type: Number, default: 0 },
        loginCount: { type: Number, default: 0 }
    },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// تعريف نموذج الإشعارات الفورية
const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', notificationSchema);

// --- مسارات النظام ---

// 1. مسار تسجيل الدخول (للمستخدمين المسجلين مسبقاً)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        // تحديث حالة الاتصال وعدد مرات الدخول في ملف الـ JSON الخاص بالداشبورد
        user.dashboardData.isOnline = true;
        user.dashboardData.loginCount = (user.dashboardData.loginCount || 0) + 1;
        await user.save();

        res.json({ success: true, message: 'تم تسجيل الدخول بنجاح', user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. مسار إنشاء الحساب وإصدار ملف الداشبورد في MongoDB (يُدار ويُنفذ عبر مدير النظام)
app.post('/api/admin/create-user', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني مستخدم مسبقاً' });
        }

        const newUser = new User({
            username,
            email,
            password,
            dashboardData: {
                balance: 0.00,
                level: 1,
                tasksDone: 0,
                adsViewed: 0,
                depositsCount: 0,
                withdrawalsCount: 0,
                adsPosted: 0,
                tasksCreated: 0,
                isOnline: false,
                isBanned: false,
                country: 'Jordan (Amman)',
                ipChanges: 0,
                loginCount: 0
            }
        });

        await newUser.save();

        res.status(201).json({ 
            success: true, 
            message: 'Registration feature is managed by the system administrator. User and dashboard JSON created successfully.', 
            user: newUser 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. جلب كافة المستخدمين للوحة الإدارة
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 4. إرسال الأموال وتوليد الإشعار الفوري للمستخدم
app.post('/api/user/send-funds', async (req, res) => {
    try {
        const { userId, amount, reason } = req.body;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        user.dashboardData.balance += parseFloat(amount);
        await user.save();

        const notifMessage = `تم إضافة مبلغ ${amount} BFP إلى رصيدك. السبب: ${reason || 'تحويل مباشر من الإدارة'}`;
        await Notification.create({
            userId: user._id,
            message: notifMessage
        });

        res.json({ success: true, message: 'تم إرسال الأموال وإنشاء الإشعار بنجاح', newBalance: user.dashboardData.balance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
