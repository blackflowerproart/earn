const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const app = express();

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://blackflowerproart_db_user:كلمة_مرور_القاعدة@membersinfo.tmqa7zr.mongodb.net/?appName=Membersinfo';

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 20.00 },
    xp: { type: Number, default: 25 },
    level: { type: Number, default: 15 }, // حقل الليفيل المباشر
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

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

// مسارات الـ API
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword, level: 1 });
        await newUser.save();

        res.status(201).json({ success: true, message: 'Account created successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

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
                email: user.email,
                balance: user.balance,
                xp: user.xp,
                level: user.level !== undefined ? user.level : user.__v || 1
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

app.get('/api/user', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) return res.status(400).json({ success: false, message: 'User ID is required.' });

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                balance: user.balance,
                xp: user.xp,
                level: user.level !== undefined ? user.level : user.__v || 1
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching user data.' });
    }
});

app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ success: true, message: 'Password updated successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find().sort({ created_at: -1 });
        res.json({ success: true, tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching tasks.' });
    }
});

app.post('/api/tasks', upload.single('media'), async (req, res) => {
    try {
        const { user_id, title, details, target_url, price, duration_days } = req.body;
        let mediaUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const newTask = new Task({
            user_id, title, details, target_url,
            price: parseFloat(price),
            duration_days: parseInt(duration_days),
            media_url: mediaUrl
        });

        await newTask.save();
        res.status(201).json({ success: true, message: 'Task created successfully!', task: newTask });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating task.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
