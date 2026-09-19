const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// تجاهل طلب أيقونة المتصفح لمنع أخطاء 404
app.get('/favicon.ico', (req, res) => res.status(204).end());

// الاتصال بقاعدة بيانات MongoDB (استبدل الرابط برابط الاتصال الخاص بك أو المتغيرات البيئية)
const MONGO_URI = process.env.MONGO_URI || 'YOUR_MONGODB_CONNECTION_STRING_HERE';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB successfully.');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// تعريف مخطط المستخدم (User Schema) الشامل
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    isOnline: { type: Boolean, default: false },
    country: { type: String, default: 'Jordan' },
    ipChanges: { type: Number, default: 0 },
    lastIp: { type: String, default: '' },
    loginCount: { type: Number, default: 0 },
    adsViewed: { type: Number, default: 0 },
    tasksDone: { type: Number, default: 0 },
    depositsCount: { type: Number, default: 0 },
    withdrawalsCount: { type: Number, default: 0 },
    adsPosted: { type: Number, default: 0 },
    tasksCreated: { type: Number, default: 0 },
    isBanned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// ==========================================
// مسارات المصادقة وتسجيل الدخول (Authentication APIs)
// ==========================================

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // البحث عن المستخدم بواسطة البريد أو اسم المستخدم
        const user = await User.findOne({ 
            $or: [{ email: email }, { username: email }] 
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }

        // التحقق مما إذا كان الحساب محظوراً
        if (user.isBanned) {
            return res.status(403).json({ success: false, message: 'This account has been suspended by the executive admin.' });
        }

        // التحقق من صحة كلمة المرور
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }

        // تحديث حالة الأونلاين وعداد الدخول
        user.isOnline = true;
        user.loginCount = (user.loginCount || 0) + 1;
        await user.save();

        res.json({
            success: true,
            message: 'Logged in successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                balance: user.balance,
                level: user.level
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// ==========================================
// مسارات لوحة تحكم المدير التنفيذي (Executive Admin APIs)
// ==========================================

// 1. جلب كافة المستخدمين
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password'); // جلب المستخدمين باستثناء كلمة المرور للأمان
        res.json({ success: true, users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Error fetching users from database.' });
    }
});

// 2. تحديث واستبدال بيانات المستخدم مباشرة في MongoDB
app.put('/api/admin/user/:id', async (req, res) => {
    try {
        const { username, email, password, balance, level } = req.body;
        
        const updateData = { 
            username, 
            email, 
            balance: parseFloat(balance), 
            level: parseInt(level) 
        };

        // إذا أدخل المدير كلمة مرور جديدة، يتم تشفيرها واستبدال القديمة
        if (password && password.trim() !== "") {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found in database.' });
        }

        res.json({ 
            success: true, 
            message: 'User data successfully updated and replaced in MongoDB!', 
            user: updatedUser 
        });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, message: 'Error updating user in MongoDB.' });
    }
});

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
