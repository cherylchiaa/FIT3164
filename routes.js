const express = require("express");
const router  = express.Router();
const User    = require("./model/User");
const bcrypt  = require("bcrypt");   

router.post("/signup", async (req, res) => {
  try {
    console.log("🛎️  [SIGNUP] body:", req.body);
    const { username, email, password, homeLocation } = req.body;
    if (!username || !email || !password || !homeLocation) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = new User({
        username,
        email,
        password: hashed,       
        homeLocation
      });
      
    await user.save();
    return res.status(201).json({ message: "Signup successful" });
  } catch (err) {
    console.error("❌ [SIGNUP ERROR]", err);
    if (err.code === 8000) {
        return res.status(503).json({ message: "Database storage quota exceeded" });
      }
      if (err.code === 11000) {
        return res.status(409).json({ message: "Email or username already exists" });
      }
      return res.status(500).json({ message: err.message });
    }
  });


router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🛎️ [LOGIN] body:", req.body);
    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password" });
    }

    const user = await User.findOne({ email });
    console.log("🔍 [LOGIN] user from DB:", user);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("🔑 [LOGIN] stored hash:", user.password);
    const ok = await bcrypt.compare(password, user.password);
    console.log("✅ [LOGIN] bcrypt.compare result:", ok);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      message: "Login successful",
      user: {
        username:    user.username,
        email:       user.email,
        homeLocation:user.homeLocation
      }
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/update", async (req, res) => {
  try {
    const { username, email, homeLocation, oldPassword, newPassword } = req.body;

    if (!username || !email || !homeLocation) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // If user wants to change password
    if (oldPassword && newPassword) {
      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) return res.status(401).json({ message: "Old password is incorrect" });

      const hashed = await bcrypt.hash(newPassword, 12);
      user.password = hashed;
    }

    // Update profile fields
    user.username = username;
    user.email = email;
    user.homeLocation = homeLocation;

    await user.save();

    return res.json({ message: "Profile updated successfully" });

  } catch (err) {
    console.error("❌ [PROFILE UPDATE ERROR]", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
