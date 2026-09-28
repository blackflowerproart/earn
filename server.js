const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://blackflowerproart_db_user:YOUR_PASSWORD_HERE@membersinfo.tmqa7zr.mongodb.net/blackflower_art?retryWrites=true&w=majority&appName=Membersinfo';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB.')).catch(err => console.error(err));

// --- Schemas ---
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    dashboardData: {
        balance: { type: Number, default: 0.00 },
        level: { type: Number, default: 1 },
        tasksDone: { type: Number, default: 0 },
        adsViewed: { type: Number, default: 0 },
        tasksAvailable: { type: Number, default: 5 },
        adsAvailable: { type: Number, default: 10 }
    },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// طلبات تعديل الحساب بانتظار موافقة الأدمن
const updateRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    oldUsername: String,
    newUsername: String,
    oldPassword: String,
    newPassword: String,
    status: { type: String, default: 'pending' }, // pending, approved, rejected
    createdAt: { type: Date, default: Date.now }
});
const UpdateRequest = mongoose.model('UpdateRequest', updateRequestSchema);

// الإعلانات
const adSchema = new mongoose.Schema({
    title: String,
    url: String,
    duration: Number,
    reward: Number,
    createdAt: { type: Date, default: Date.now }
});
const Ad = mongoose.model('Ad', adSchema);

// المهام
const taskSchema = new mongoose.Schema({
    title: String,
    description: String,
    reward: Number,
    createdAt: { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', taskSchema);

// الدعم الفني والرسائل
const messageSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: String,
    content: String,
    type: { type: String, default: 'support' }, // support or admin_notification
    createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// عمليات السحب والإيداع
const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    type: { type: String, enum: ['withdraw', 'deposit'] },
    amount: Number,
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', transactionSchema);

// --- Endpoints ---

// 1. Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
        }
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. Register
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return.status(400).json({ success: false, message: 'البريد مستخدم مسبقاً' });
        
        const user = await User.create({ username, email, password });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. إحصائيات عامة (عدد المستخدمين، آخر سحب)
app.post('/api/stats', async (req, res) => {
    try {
        const usersCount = await User.countDocuments();
        const recentTransactions = await Transaction.find().sort({ createdAt: -1 }).limit(5);
        res.json({ success: true, usersCount, recentTransactions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 4. طلب تعديل البيانات (اسم وكلمة مرور)
app.post('/api/user/request-update', async (req, res) => {
    try {
        const { userId, oldUsername, newUsername, oldPassword, newPassword } = req.body;
        await UpdateRequest.create({ userId, oldUsername, newUsername, oldPassword, newPassword });
        res.json({ success: true, message: 'تم إرسال طلب التعديل إلى الأدمن للموافقة' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 5. إرسال دعم فني
app.post('/api/support', async (req, res) => {
    try {
        const { userId, senderName, content } = req.body;
        await Message.create({ userId, senderName, content, type: 'support' });
        res.json({ success: true, message: 'تم إرسال رسالتك بنجاح للأدمن' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 6. إنشاء إعلان أو مهمة (أو جلبها)
app.get('/api/ads', async (req, res) => {
    const ads = await Ad.find();
    res.json({ success: true, ads });
});
app.post('/api/ads', async (req, res) => {
    const ad = await Ad.create(req.body);
    res.json({ success: true, ad });
});

app.get('/api/tasks', async (req, res) => {
    const tasks = await Task.find();
    res.json({ success: true, tasks });
});
app.post('/api/tasks', async (req, res) => {
    const task = await Task.create(req.body);
    res.json({ success: true, task });
});

// 7. سحب وإيداع
app.post('/api/transaction', async (req, res) => {
    try {
        const { userId, username, type, amount } = req.body;
        const tx = await Transaction.create({ userId, username, type, amount });
        res.json({ success: true, message: 'تم تسجيل الطلب بنجاح', tx });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 8. لوحة تحكم الأدمن (admin-control) - جلب الطلبات والرسائل
app.get('/api/admin/data', async (req, res) => {
    try {
        const updateRequests = await UpdateRequest.find({ status: 'pending' });
        const supportMessages = await Message.find({ type: 'support' });
        const transactions = await Transaction.find({ status: 'pending' });
        res.json({ success: true, updateRequests, supportMessages, transactions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// موافقة الأدمن على تعديل المستخدم
app.post('/api/admin/approve-update', async (req, res) => {
    try {
        const { requestId } = req.body;
        const reqDoc = await UpdateRequest.findById(requestId);
        if (!reqDoc) return.status(404).json({ success: false, message: 'الطلب غير موجود' });

        await User.findByIdAndUpdate(reqDoc.userId, {
            username: reqDoc.newUsername,
            password: reqDoc.newPassword
        });

        reqDoc.status = 'approved';
        await reqDoc.save();
        res.json({ success: true, message: 'تمت الموافقة وتحديث البيانات بنجاح' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
