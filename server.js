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

// تعريف نموذج المستخدم وهيكل بيانات الـ JSON الخاص بالداشبورد
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
        isOnline: { type: Boolean, default: true },
        isBanned: { type: Boolean, default: false },
        country: { type: String, default: 'Global' },
        ipChanges: { type: Number, default: 0 },
        loginCount: { type: Number, default: 1 }
    },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// تعريف نموذج الإشعارات
const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', notificationSchema);

// --- مسارات الـ API ---

// 1. مسار التسجيل المفتوح (يسمح لأي شخص بالتسجيل وإنشاء ملف الداشبورد تلقائياً)
app.post('/api/register', async (req, res) => {
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
                isOnline: true,
                isBanned: false,
                country: 'Global',
                ipChanges: 0,
                loginCount: 1
            }
        });

        await newUser.save();

        res.status(201).json({ 
            success: true, 
            message: 'تم إنشاء الحساب وحفظ البيانات بنجاح', 
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

        user.dashboardData.isOnline = true;
        user.dashboardData.loginCount = (user.dashboardData.loginCount || 0) + 1;
        await user.save();

        res.json({ success: true, message: 'تم تسجيل الدخول بنجاح', user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. جلب جميع المستخدمين (للوحة المدير)
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
