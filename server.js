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

// تعريف نموذج المستخدم (User Schema) مع دعم بيانات الداشبورد الأساسية
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
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
    loginCount: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// تعريف نموذج الإشعارات (Notification Schema)
const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// --- مسارات الـ API الأساسية ---

// 1. مسار تسجيل حساب جديد لأول مرة (يحفظ البيانات ويجهز معلومات الداشبورد تلقائياً)
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // التحقق مما إذا كان البريد مسجلاً مسبقاً
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني مستخدم مسبقاً' });
        }

        // إنشاء مستخدم جديد ببيانات الداشبورد الافتراضية
        const newUser = new User({
            username,
            email,
            password,
            balance: 0.00,
            level: 1,
            tasksDone: 0,
            adsViewed: 0,
            isOnline: true,
            loginCount: 1,
            country: 'Jordan (Amman)'
        });

        await newUser.save();

        res.status(201).json({ 
            success: true, 
            message: 'تم إنشاء الحساب بنجاح', 
            user: newUser 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. مسار تسجيل الدخول للمستخدمين المسجلين مسبقاً
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        // تحديث حالة الاتصال وعدد مرات الدخول
        user.isOnline = true;
        user.loginCount = (user.loginCount || 0) + 1;
        await user.save();

        res.json({ success: true, message: 'تم تسجيل الدخول بنجاح', user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. جلب جميع المستخدمين (للوحة المدير التنفيذي)
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 4. تعديل بيانات المستخدم في MongoDB (بواسطة المدير التنفيذي)
app.put('/api/admin/user/:id', async (req, res) => {
    try {
        const { username, email, password, balance, level } = req.body;
        const updateData = { username, email, balance, level };
        
        if (password && password.trim() !== '') {
            updateData.password = password;
        }

        const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        res.json({ success: true, message: 'تم تحديث بيانات المستخدم بنجاح', user: updatedUser });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 5. إرسال النقود أو الرصيد للمستخدم مع إنشاء إشعار فوري تلقائي في واجهته
app.post('/api/user/send-funds', async (req, res) => {
    try {
        const { userId, amount, reason } = req.body;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        user.balance += parseFloat(amount);
        await user.save();

        // إنشاء إشعار فوري يظهر في واجهة المستخدم فوراً
        const notifMessage = `تم إضافة مبلغ ${amount} BFP إلى رصيدك. السبب: ${reason || 'تحويل مباشر من الإدارة'}`;
        await Notification.create({
            userId: user._id,
            message: notifMessage
        });

        res.json({ success: true, message: 'تم إرسال الأموال وإنشاء الإشعار بنجاح', newBalance: user.balance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 6. جلب إشعارات المستخدم الخاصة بناءً على الـ ID
app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json({ success: true, notifications });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 7. جلب أحدث الإشعارات العامة
app.get('/api/notifications', async (req, res) => {
    try {
        const notifications = await Notification.find({}).sort({ createdAt: -1 }).limit(5);
        res.json({ success: true, notifications });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
