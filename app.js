require("dotenv").config();
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const MongoStore = require("connect-mongo");
const { connectDB, getDB } = require("./model/connectionMongo");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const https = require('https');
const fs = require('fs');

const authRoutes = require("./server/routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;

//const httpsOptions = {
//    key: fs.readFileSync('./server.key'),
//   cert: fs.readFileSync('./server.cert'),
//};

connectDB();

app.use(express.static("public"));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || "mongodb://127.0.0.1:27017",
      dbName: "Tätäeioleolemassa",
    }),
    cookie: { 
      secure: false, 
      httpOnly: true,
      sameSite: "lax"
    },
  })
);

app.listen(PORT, () => {
  console.log(`HTTP server running on http://localhost:${PORT}`);
});

//https.createServer(httpsOptions, app).listen(PORT, () => {
//  console.log(`Server running on https://localhost:${PORT}`);
//});

app.set("view engine", "ejs"); // EJS will server side render the HTML files

function requireLogin(req, res, next) { //If you are not logged in this will redirect to login page
  if (!req.session.user) {
    return res.redirect("/");
  }
  next();
}

app.use("/", authRoutes);

app.get("", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/dashboard", requireLogin, (req, res) => {
  res.render("dashboard", { user: req.session.user });
});

app.get("/change-password", requireLogin, (req, res) => {
  res.render("change-password");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});


app.get('/privacy', (req, res) => {
  res.render('privacy');
});

app.get("/request-data", requireLogin, async (req, res) => {
  const db = getDB();

  try {
    
    const user = await db.collection("users").findOne({ _id: new ObjectId(req.session.user.id) }); //this fetches from collection called users to find the user with the correct session id

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.render("account-data", { // It gives this user data to account-data.ejs
      user: {
        user_id: user._id,
        user_name: user.user_name,
        created_at: user.created_at,
        user_mode: user.user_mode,
      },
    });
  } catch (err) {
    console.error("Error fetching user data:", err); 
    res.status(500).send("Internal server error");
  }
});

app.get("/todo", requireLogin, async (req, res) => {
  const db = getDB();
  const todos = await db.collection("todos").find({ user_id: req.session.user.id }).toArray(); 
  res.render("todo", { user: req.session.user, todos, page: "todo" });
});

app.get("/todo/edit/:id", requireLogin, async (req, res) => { 
  const { id } = req.params;
  const db = getDB();

  try {
    const todo = await db.collection("todos").findOne({ _id: new ObjectId(id), user_id: req.session.user.id });

    if (!todo) {
      return res.status(404).send("Todo not found");
    }

    res.render("edit-todo", { todo });
  } catch (err) {
    console.error("Error fetching todo for edit:", err);
    res.status(500).send("Failed to load edit form");
  }
});

app.post("/change-password", requireLogin, async (req, res) => { 
  const { old_password, new_password } = req.body;

  if (!old_password || !new_password) {
    return res.status(400).json({ error: "Both old and new passwords are required" });
  }

  const db = getDB();

  try {

    const userId = new ObjectId(req.session.user.id);
    const user = await db.collection("users").findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }


    const isMatch = await bcrypt.compare(old_password, user.user_pass);
    if (!isMatch) {
      return res.status(401).json({ error: "Old password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10); 

    await db.collection("users").updateOne(
      { _id: userId },
      { $set: { user_pass: hashedPassword } }
    );

    req.session.destroy(() => {
      res.redirect("/");
    });
  } catch (err) {
    console.error("Error changing password:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/delete-account", requireLogin, async (req, res) => {
  const db = getDB();

  try {
    const userId = new ObjectId(req.session.user.id);

    await db.collection("users").deleteOne({ _id: userId });

    await db.collection("todos").deleteMany({ user_id: req.session.user.id });

    req.session.destroy(() => {
      res.redirect("/");
    });
  } catch (err) {
    console.error("Error deleting user and todos:", err);
    res.status(500).send("Failed to delete account");
  }
});

app.post("/todo/add", requireLogin, async (req, res) => {
  const { task } = req.body;
  const db = getDB();
  await db.collection("todos").insertOne({
    user_id: req.session.user.id,
    task,
    created_at: new Date(),
  });
  res.redirect("/todo");
});

app.post("/todo/delete/:id", requireLogin, async (req, res) => {
  const { id } = req.params;
  const db = getDB();

  try {
    
    await db.collection("todos").deleteOne({
      _id: new ObjectId(id), 
      user_id: req.session.user.id,
    });
    res.redirect("/todo");
  } catch (err) {
    console.error("Error deleting todo:", err);
    res.status(500).send("Failed to delete todo");
  }
});

app.post("/todo/edit/:id", requireLogin, async (req, res) => {
  const { id } = req.params;
  const { task } = req.body;
  const db = getDB();

  try {
    
    await db.collection("todos").updateOne(
      { _id: new ObjectId(id), user_id: req.session.user.id },
      { $set: { task } }
    );

    res.redirect("/todo");
  } catch (err) {
    console.error("Error updating todo:", err);
    res.status(500).send("Failed to update todo");
  }
});


