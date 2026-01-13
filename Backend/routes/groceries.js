const express = require("express");
const groceriesStore = require("../data/groceries.store");

const router = express.Router();

// GET all groceries
router.get("/", (req, res) => {
  const groceries = groceriesStore.getAll();
  res.json(groceries);
});

// ADD grocery
router.post("/", (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const item = groceriesStore.add(name);

  if (!item) {
    return res.status(409).json({ error: "Item already exists" });
  }

  res.status(201).json(item);
});

// RECORD purchase
router.post("/:name/purchase", (req, res) => {
  const groceries = groceriesStore.getAll();
  const item = groceries.find(
    g => g.name.toLowerCase() === req.params.name.toLowerCase()
  );

  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  item.purchases.push(new Date().toISOString());
  groceriesStore.replaceAll(groceries);

  res.json(item);
});

// UPDATE grocery (for expanded state, name, etc.)
router.put("/:name", (req, res) => {
  const groceries = groceriesStore.getAll();
  const item = groceries.find(
    g => g.name.toLowerCase() === req.params.name.toLowerCase()
  );

  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  // Update allowed fields
  if (req.body.expanded !== undefined) {
    item.expanded = req.body.expanded;
  }
  if (req.body.name !== undefined) {
    item.name = req.body.name;
  }
  if (req.body.purchases !== undefined) {
    item.purchases = req.body.purchases;
  }

  groceriesStore.replaceAll(groceries);
  res.json(item);
});

// UPDATE all groceries (for bulk updates)
router.put("/", (req, res) => {
  const { groceries: newGroceries } = req.body;
  
  if (!Array.isArray(newGroceries)) {
    return res.status(400).json({ error: "Groceries must be an array" });
  }

  groceriesStore.replaceAll(newGroceries);
  res.json(newGroceries);
});

// DELETE single grocery
router.delete("/:name", (req, res) => {
  const groceries = groceriesStore.getAll();
  const filtered = groceries.filter(
    g => g.name.toLowerCase() !== req.params.name.toLowerCase()
  );
  
  if (filtered.length === groceries.length) {
    return res.status(404).json({ error: "Item not found" });
  }
  
  groceriesStore.replaceAll(filtered);
  res.json(filtered);
});

// RESET all groceries
router.delete("/", (req, res) => {
  groceriesStore.replaceAll([]);
  res.json({ message: "Groceries reset" });
});

module.exports = router;