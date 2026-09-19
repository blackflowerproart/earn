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

// تعريف نموذج المستخدم (User Schema)
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

// --- مسارات الـ API ---

// جلب جميع المستخدمين (للوحة المدير التنفيذي)
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// تعديل بيانات المستخدم واستبدالها في MongoDB (بواسطة المدير التنفيذي)
app.put('/api/admin/user/:id', async (req, res) => {
    try {
        const { username, email, password, balance, level } = req.body;
        const updateData = { username, email, balance, level };
        
        if (password && password.trim() !== '') {
            updateData.password = password; // يُفضل تشفير كلمة المرور في الإنتاج
        }

        const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User updated successfully', user: updatedUser });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// إرسال النقود أو الرصيد للمستخدم مع إنشاء إشعار فوري تلقائي في واجهته
app.post('/api/user/send-funds', async (req, res) => {
    try {
        const { userId, amount, reason } = req.body;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        user.balance += parseFloat(amount);
        await user.save();

        // إنشاء إشعار فوري يظهر في واجهة المستخدم
        const notifMessage = `تم إضافة مبلغ ${amount} BFP إلى رصيدك. السبب: ${reason || 'تحويل مباشر من الإدارة'}`;
        await Notification.create({
            userId: user._id,
            message: notifMessage
        });

        res.json({ success: true, message: 'Funds sent and notification created successfully', newBalance: user.balance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// جلب إشعارات المستخدم الخاصة
app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json({ success: true, notifications });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// بث إشعار عام
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
