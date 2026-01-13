const express = require("express");
const tasksStore = require("../data/tasks.store");

const router = express.Router();

// GET tasks
router.get("/", (req, res) => {
  const tasks = tasksStore.getAll();
  res.json(tasks);
});

// ADD task
router.post("/", (req, res) => {
  const { name, dueDate = null } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Task name required "});
  }

  tasksStore.add({ name,dueDate });
  const tasks = tasksStore.getAll();
  res.status(201).json(tasks);
});


// UPDATE task (for completed status, name, dueDate)
router.put("/:id", (req, res) => {
  const updated = tasksStore.update(req.params.id, req.body);

  if (!updated) {
    return res.status(404).json({ error: "Task not found" });
  }

  const tasks = tasksStore.getAll();
  res.json(tasks);
});

// TOGGLE task
router.put("/:id", (req, res) => {
  try {
    const updated = tasksStore.update(req.params.id, req.body);

    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }

    const tasks = tasksStore.getAll();
    res.json(tasks);
  } catch (err) {
    console.error("PUT /api/tasks/:id failed:", err);
    res.status(500).json({ error: err.message });
  }
});


// UPDATE all tasks (for bulk updates)
router.put("/", (req, res) => {
  const { tasks: newTasks } = req.body;
  
  if (!Array.isArray(newTasks)) {
    return res.status(400).json({ error: "Tasks must be an array" });
  }

  tasksStore.replaceAll(newTasks);
  const tasks = tasksStore.getAll();
  res.json(newTasks);
});

// DELETE task
router.delete("/:id", (req, res) => {
  try {
    console.log("Deleting task with id:", req.params.id);

    tasksStore.remove(req.params.id);

    const tasks = tasksStore.getAll();
    res.json(tasks);
  } catch (err) {
    console.error("DELETE /api/tasks/:id failed:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
