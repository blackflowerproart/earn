const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// الاتصال بقاعدة بيانات MongoDB باستخدام متغير البيئة السري
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('تم الاتصال بنجاح بـ MongoDB Atlas'))
    .catch((err) => console.error('خطأ في الاتصال بقاعدة البيانات:', err));

// نموذج البيانات البسيط للمستخدمين
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

// مسار التسجيل (Register)
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني مستخدم مسبقاً' });
        }
        const newUser = new User({ username, email, password });
        await newUser.save();
        res.status(201).json({ success: true, message: 'تم التسجيل بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في السيرفر', error: error.message });
    }
});

// مسار تسجيل الدخول (Login)
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        if (!user) {
            return res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }
        res.status(200).json({ success: true, user: { username: user.username, email: user.email } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في السيرفر', error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`السيرفر يعمل على المنفذ ${PORT}`));
