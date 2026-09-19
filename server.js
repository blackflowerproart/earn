const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

const app = express();

// إعدادات الـ Middleware
app.use(cors()); // السماح بالاتصالات الخارجية من موقعك
app.use(express.json()); // قراءة البيانات بصيغة JSON

// إعداد رفع الملفات (Multer) لتخزين الصور مؤقتاً أو حفظها
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // تأكد من وجود مجلد uploads أو سيتم التعامل معه
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// الاتصال بقاعدة بيانات MongoDB (استبدل الرابط برابط MongoDB Atlas الخاص بك)
const MONGO_URI = process.env.MONGO_URI || 'YOUR_MONGODB_CONNECTION_STRING_HERE';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// 1. نموذج المستخدم (User Schema)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// 2. نموذج المهام (Task Schema)
const taskSchema = new mongoose.Schema({
    user_id: { type: String, required: true },
    title: { type: String, required: true },
    details: { type: String, required: true },
    target_url: { type: String, required: true },
    price: { type: Number, required: true },
    duration_days: { type: Number, required: true },
    media_url: { type: String },
    created_at: { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', taskSchema);


// ==================== مسارات الـ API ====================

// أ. مسار التسجيل (Register)
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // التحقق مما إذا كان المستخدم موجوداً مسبقاً
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered.' });
        }

        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ success: true, message: 'Account created successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

// ب. مسار تسجيل الدخول (Login)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }

        res.json({
            success: true,
            message: 'Logged in successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// ج. مسار إعادة تعيين كلمة المرور (Reset Password)
app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// د. مسار جلب المهام الخاصة بالمستخدم (Get Tasks)
app.get('/api/tasks', async (req, res) => {
    try {
        const { user_id } = req.query;
        if (!user_id) {
            return res.status(400).json({ success: false, message: 'User ID is required.' });
        }

        const tasks = await Task.find({ user_id }).sort({ created_at: -1 });
        res.json({ success: true, tasks });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error fetching tasks.' });
    }
});

// هـ. مسار إنشاء ونشر مهمة جديدة (Create Task)
app.post('/api/tasks', upload.single('media'), async (req, res) => {
    try {
        const { user_id, title, details, target_url, price, duration_days } = req.body;
        
        let mediaUrl = null;
        if (req.file) {
            // يمكنك رفع الرابط على خدمة تخزين سحابي مثل Cloudinary أو حفظ مساره المحلي
            mediaUrl = `/uploads/${req.file.filename}`;
        }

        const newTask = new Task({
            user_id,
            title,
            details,
            target_url,
            price: parseFloat(price),
            duration_days: parseInt(duration_days),
            media_url: mediaUrl
        });

        await newTask.save();
        res.status(201).json({ success: true, message: 'Task created successfully!', task: newTask });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error creating task.' });
    }
});

// تشغيل السيرفر على البورت المحدد من المنصة السحابية أو بورت افتراضي
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
