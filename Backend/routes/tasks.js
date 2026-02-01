const express = require("express");
const tasksStore = require("../data/tasks.store");
const { authenticateToken, isDemoUser } = require("../middleware/auth");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET tasks for authenticated user
router.get("/", (req, res) => {
  const tasks = tasksStore.getAll(req.user.username);
  res.json(tasks);
});

// ADD task
router.post("/", (req, res) => {
  if (isDemoUser(req)) {
    console.log('Demo user adding task (temporary)');
  }

  const { name, dueDate = null } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Task name required" });
  }

  tasksStore.add(req.user.username, { name, dueDate });
  const tasks = tasksStore.getAll(req.user.username);
  res.status(201).json(tasks);
});

// UPDATE task (for completed status, name, dueDate)
router.put("/:id", (req, res) => {
  try {
    const updated = tasksStore.update(
      req.user.username,
      req.params.id, 
      req.body
    );

    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }

    const tasks = tasksStore.getAll(req.user.username);
    res.json(tasks);
  } catch (err) {
    console.error("PUT /api/tasks/:id failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE all tasks (for bulk updates/imports)
router.put("/", (req, res) => {
  // This is typically used by the import feature
  let newTasks = req.body;
  
  // Handle both array directly and {tasks: [...]} format
  if (!Array.isArray(newTasks)) {
    newTasks = req.body.tasks;
  }
  
  if (!Array.isArray(newTasks)) {
    return res.status(400).json({ error: "Tasks must be an array" });
  }

  tasksStore.replaceAll(req.user.username, newTasks);
  const tasks = tasksStore.getAll(req.user.username);
  res.json(newTasks);
});

// DELETE task
router.delete("/:id", (req, res) => {
  try {
    console.log(`Deleting task ${req.params.id} for user: ${req.user.username}`);

    tasksStore.remove(req.user.username, req.params.id);

    const tasks = tasksStore.getAll(req.user.username);
    res.json(tasks);
  } catch (err) {
    console.error("DELETE /api/tasks/:id failed:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;