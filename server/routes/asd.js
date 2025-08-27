const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const DB = require("../../model/connectionSQL");


router.get("/login", (req, res) => {
  res.render("login"); 
});


router.post("/login", (req, res) => {
  const username = req.body.user_name;
  const password = req.body.user_pass;

  const query = `SELECT * FROM users WHERE user_name = ?`;
  DB.get(query, [username], async (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error");
    }

    if (!row) {
      return res.status(401).send("Invalid username or password");
    }

    const match = await bcrypt.compare(password, row.user_pass);
    if (!match) {
      return res.status(401).send("Invalid username or password");
    }

    req.session.user = { id: row.user_id, username: row.user_name };
    res.redirect("/dashboard");
  });
});


router.post("/register", async (req, res) => {
  const username = req.body.user_name;
  const password = req.body.user_pass;

  DB.get(`SELECT * FROM users WHERE user_name = ?`, [username], async (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Database error");
    }

    if (row) {
      return res.status(400).send("Username already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertQuery = `INSERT INTO users (user_name, user_pass) VALUES (?, ?)`;
    DB.run(insertQuery, [username, hashedPassword], function (err) {
      if (err) {
        console.error(err);
        return res.status(500).send("Registration failed");
      }

      req.session.user = { id: this.lastID, username };
      res.redirect("/dashboard");
    });
  });
});

module.exports = router;
