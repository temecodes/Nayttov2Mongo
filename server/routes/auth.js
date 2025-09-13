const express = require("express");
const bcrypt = require("bcrypt");
const { getDB } = require("../../model/connectionMongo");
const router = express.Router();


router.post("/login", async (req, res) => {
  const { user_name, user_pass } = req.body;

  if (!user_name || !user_pass) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const db = getDB();
  const user = await db.collection("users").findOne({ user_name });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const match = await bcrypt.compare(user_pass, user.user_pass);
  if (match) {
    req.session.user = {
      id: user._id,
      name: user.user_name,
    };
    return res.redirect("/dashboard");
  } else {
    return res.status(401).json({ error: "Invalid credentials" });
  }
});


router.post("/register", async (req, res) => {
  const { user_name, user_pass } = req.body;

  if (!user_name || !user_pass) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const db = getDB();
  const existingUser = await db.collection("users").findOne({ user_name });

  if (existingUser) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const hashedPass = await bcrypt.hash(user_pass, 10);

  const result = await db.collection("users").insertOne({
    user_name,
    user_pass: hashedPass,
    created_at: new Date(),
    user_mode: "user",
  });

  req.session.user = {
    id: result.insertedId,
    name: user_name,
  };

  res.redirect("/dashboard");
});

module.exports = router;
