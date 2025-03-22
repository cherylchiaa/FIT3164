const express = require('express');
const path = require('path');
const mongoose = require("mongoose");

require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Import Weather Model
const Weather = require("./models/Weather");

// ✅ Serve static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Serve an HTML file for `/`
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "server.html"));
});

// ✅ MongoDB Connection
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
        });
        console.log("✅ Connected to MongoDB Atlas");

        // ✅ Fetch and Print First Weather Record
        const firstDoc = await Weather.findOne();
        if (firstDoc) {
            console.log("🌍 First Weather Data:", firstDoc);
        } else {
            console.log("⚠️ No weather data found.");
        }

    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error.message);
        process.exit(1);
    }
}
connectDB();

// ✅ Start Express Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
