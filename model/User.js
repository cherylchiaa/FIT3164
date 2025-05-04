// model/User.js
const mongoose = require("mongoose");
require("dotenv").config();

const authUri = process.env.AUTH_MONGO_URI;
console.log("🔑 Auth DB URI:", authUri);

const UserSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true },
  homeLocation: { type: String, required: true, trim: true }
}, { timestamps: true });


const authConn = mongoose.createConnection(authUri);
authConn.once("open", () => console.log("✅ Connected to Auth DB"));
authConn.on("error", err => console.error("❌ Auth DB connection error:", err));

module.exports = authConn.model("User", UserSchema);
