const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://blackflowerproart_db_user:En123456789@membersinfo.tmqa7zr.mongodb.net/blackflower_art?retryWrites=true&w=majority&appName=Membersinfo';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB successfully.'))
  .catch(err => console.error('MongoDB error:', err));

// Schema المستخدم
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  dashboardData: {
    balance: { type: Number, default: 0.00 },
    level: { type: Number, default: 1 },
    tasksDone: { type: Number, default: 0 },
    adsViewed: { type: Number, default: 0 },
    isBanned: { type: Boolean, default: false },
    country: { type: String, default: 'Jordan' }
  },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// --- المسارات API ---

// 1. تسجيل جديد
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'البريد مستخدم مسبقاً' });

    const newUser = new User({ username, email, password });
    await newUser.save();
    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. تسجيل الدخول
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
    if (user.dashboardData.isBanned) return res.status(403).json({ success: false, message: 'تم حظر هذا الحساب' });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. جلب جميع المستخدمين (للأدمن)
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. تحديث بيانات المستخدم (تعديل الرصيد، الحظر، كلمة السر) بواسطة الأدمن
app.put('/api/admin/update-user/:id', async (req, res) => {
  try {
    const { balance, isBanned, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

    if (balance !== undefined) user.dashboardData.balance = balance;
    if (isBanned !== undefined) user.dashboardData.isBanned = isBanned;
    if (password) user.password = password;

    await user.save();
    res.json({ success: true, message: 'تم التحديث بنجاح', user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. إضافة رصيد عند مشاهدة الإعلان
app.post('/api/user/watch-ad', async (req, res) => {
  try {
    const { userId, reward } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

    user.dashboardData.balance += reward;
    user.dashboardData.adsViewed += 1;
    await user.save();

    res.json({ success: true, newBalance: user.dashboardData.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
