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

// Verify token endpoint (optional - for frontend to check if token is still valid)
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

// Import routes
const groceriesRouter = require("./routes/groceries");
const tasksRouter = require("./routes/tasks");

// Use routes (these now have authentication middleware inside them)
app.use("/api/groceries", groceriesRouter);
app.use("/api/tasks", tasksRouter);

// ===== FRONTEND ROUTES =====

// Root route - serve login page or main app
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/tracklist.html"));
});

// Catch-all for SPA routing
app.get("*", (req, res) => {
  // Serve static files if they exist, otherwise serve the main HTML
  const filePath = path.join(__dirname, "../Frontend", req.path);
  if (require("fs").existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.sendFile(path.join(__dirname, "../Frontend/tracklist.html"));
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  console.error("Error:", err);
  res.status(status).json({ error: message });
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📱 Open your app at: http://localhost:${PORT}`);
  console.log(`🔐 Authentication enabled`);
  console.log(`👤 Demo login: username=demo, password=demo123`);
});