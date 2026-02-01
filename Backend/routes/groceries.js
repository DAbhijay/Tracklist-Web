const express = require("express");
const groceriesStore = require("../data/groceries.store");
const { authenticateToken, isDemoUser } = require("../middleware/auth");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET all groceries for authenticated user
router.get("/", (req, res) => {
  const groceries = groceriesStore.getAll(req.user.username);
  res.json(groceries);
});

// ADD grocery (demo users have read-only restrictions)
router.post("/", (req, res) => {
  if (isDemoUser(req)) {
    // Demo users can add, but data will be cleared periodically
    console.log('Demo user adding grocery (temporary)');
  }

  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const item = groceriesStore.add(req.user.username, name);

  if (!item) {
    return res.status(409).json({ error: "Item already exists" });
  }

  res.status(201).json(item);
});

// RECORD purchase
router.post("/:name/purchase", (req, res) => {
  const item = groceriesStore.recordPurchase(
    req.user.username, 
    req.params.name
  );

  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  res.json(item);
});

// UPDATE grocery (for expanded state, name, etc.)
router.put("/:name", (req, res) => {
  const item = groceriesStore.update(
    req.user.username,
    req.params.name,
    req.body
  );

  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  res.json(item);
});

// UPDATE all groceries (for bulk updates/imports)
router.put("/", (req, res) => {
  // This is typically used by the import feature
  let newGroceries = req.body;
  
  // Handle both array directly and {groceries: [...]} format
  if (!Array.isArray(newGroceries)) {
    newGroceries = req.body.groceries;
  }
  
  if (!Array.isArray(newGroceries)) {
    return res.status(400).json({ error: "Groceries must be an array" });
  }

  groceriesStore.replaceAll(req.user.username, newGroceries);
  res.json(newGroceries);
});

// DELETE single grocery
router.delete("/:name", (req, res) => {
  const success = groceriesStore.remove(
    req.user.username,
    req.params.name
  );
  
  if (!success) {
    return res.status(404).json({ error: "Item not found" });
  }
  
  const remaining = groceriesStore.getAll(req.user.username);
  res.json(remaining);
});

// RESET all groceries for user
router.delete("/", (req, res) => {
  groceriesStore.reset(req.user.username);
  res.json({ message: "Groceries reset" });
});

module.exports = router;