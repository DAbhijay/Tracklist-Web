const express = require("express");
const cors = require("cors");
const path = require("path");  // ← ADD THIS
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ← ADD THIS LINE: Serve static files
app.use(express.static(path.join(__dirname, '../Frontend')));

// Import routes
const groceriesRouter = require("./routes/groceries");
const tasksRouter = require("./routes/tasks");

// Use routes
app.use("/api/groceries", groceriesRouter);
app.use("/api/tasks", tasksRouter);

// Root route
app.get("/", (req, res) => {
  res.send("Tracklist backend is running 🚀");
});

// Global Error Handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  res.status(status).json({ error: message });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Open your app at: http://localhost:${PORT}/tracklist.html`);
});