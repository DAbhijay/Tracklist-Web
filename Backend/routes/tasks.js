const express = require("express");
const tasksStore = require("../data/tasks.store");
const { authenticateToken, isDemoUser } = require("../middleware/auth");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET tasks for authenticated user
router.get("/", async (req, res) => {
  try {
    const tasks = await tasksStore.getAll(req.user.username);
    res.json(tasks);
  } catch (err) {
    console.error("GET /api/tasks failed:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// ADD task
router.post("/", async (req, res) => {
  try {
    if (isDemoUser(req)) {
      console.log('Demo user adding task (temporary)');
    }

    const { name, dueDate = null } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Task name required" });
    }

    await tasksStore.add(req.user.username, { name, dueDate });
    const tasks = await tasksStore.getAll(req.user.username);
    res.status(201).json(tasks);
  } catch (err) {
    console.error("POST /api/tasks failed:", err);
    res.status(500).json({ error: "Failed to add task" });
  }
});

// UPDATE task (for completed status, name, dueDate)
router.put("/:id", async (req, res) => {
  try {
    const updated = await tasksStore.update(
      req.user.username,
      req.params.id, 
      req.body
    );

    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }

    const tasks = await tasksStore.getAll(req.user.username);
    res.json(tasks);
  } catch (err) {
    console.error("PUT /api/tasks/:id failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE all tasks (for bulk updates/imports)
router.put("/", async (req, res) => {
  try {
    // This is typically used by the import feature
    let newTasks = req.body;
    
    // Handle both array directly and {tasks: [...]} format
    if (!Array.isArray(newTasks)) {
      newTasks = req.body.tasks;
    }
    
    if (!Array.isArray(newTasks)) {
      return res.status(400).json({ error: "Tasks must be an array" });
    }

    await tasksStore.replaceAll(req.user.username, newTasks);
    const tasks = await tasksStore.getAll(req.user.username);
    res.json(newTasks);
  } catch (err) {
    console.error("PUT /api/tasks failed:", err);
    res.status(500).json({ error: "Failed to replace tasks" });
  }
});

// DELETE task
router.delete("/:id", async (req, res) => {
  try {
    console.log(`Deleting task ${req.params.id} for user: ${req.user.username}`);

    await tasksStore.remove(req.user.username, req.params.id);

    const tasks = await tasksStore.getAll(req.user.username);
    res.json(tasks);
  } catch (err) {
    console.error("DELETE /api/tasks/:id failed:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;