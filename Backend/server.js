const express = require("express");
const cors = require("cors");
const path = require("path");
const { login } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../Frontend')));

// ===== AUTH ROUTES (Public - no token required) =====

// Login endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: "Username and password required" 
      });
    }

    const result = await login(username, password);

    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Server error during login" 
    });
  }
});

// Verify token endpoint
app.get("/api/auth/verify", (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ valid: false });
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ valid: false });
    }
    res.json({ valid: true, user });
  });
});

// ===== PROTECTED API ROUTES (Require authentication) =====

const groceriesRouter = require("./routes/groceries");
const tasksRouter = require("./routes/tasks");

app.use("/api/groceries", groceriesRouter);
app.use("/api/tasks", tasksRouter);

// ===== FRONTEND ROUTES =====

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/login.html"));
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/login.html"));
});

app.get("/tracklist.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/tracklist.html"));
});

// Global Error Handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  console.error("Error:", err);
  res.status(status).json({ error: message });
});

// ===== RESET AND SEED DEMO DATA ON STARTUP =====
const groceriesStore = require("./data/groceries.store");
const tasksStore = require("./data/tasks.store");

async function seedDemoData() {
  try {
    // Small delay to make sure database schema is ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Clear old demo data
    await groceriesStore.reset('demo');
    await tasksStore.replaceAll('demo', []);

    // Seed fresh grocery items
    await groceriesStore.add('demo', 'Milk');
    await groceriesStore.add('demo', 'Eggs');
    await groceriesStore.add('demo', 'Bread');
    await groceriesStore.add('demo', 'Bananas');
    await groceriesStore.add('demo', 'Chicken');

    // Record some purchases so history shows up
    await groceriesStore.recordPurchase('demo', 'Milk');
    await groceriesStore.recordPurchase('demo', 'Eggs');

    // Seed fresh tasks
    const now = Date.now();
    await tasksStore.replaceAll('demo', [
      { id: now, name: 'Buy groceries', completed: false, dueDate: new Date(now + 86400000).toISOString().split('T')[0] },
      { id: now + 1, name: 'Clean the house', completed: true, dueDate: null },
      { id: now + 2, name: 'Walk the dog', completed: false, dueDate: new Date(now + 172800000).toISOString().split('T')[0] }
    ]);

    console.log('✅ Demo data seeded on startup');
  } catch (err) {
    console.error('Error seeding demo data:', err.message);
  }
}

// ===== START SERVER =====
app.listen(PORT, async () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📱 Open your app at: http://localhost:${PORT}`);
  console.log(`🔐 Authentication enabled`);
  console.log(`👤 Demo login: username=demo, password=demo123`);

  // Seed demo data after server starts
  await seedDemoData();
});