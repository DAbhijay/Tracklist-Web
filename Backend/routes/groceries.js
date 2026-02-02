const express = require("express");
const groceriesStore = require("../data/groceries.store");
const { authenticateToken, isDemoUser } = require("../middleware/auth");

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET all groceries for authenticated user
router.get("/", async (req, res) => {
  try {
    const groceries = await groceriesStore.getAll(req.user.username);
    res.json(groceries);
  } catch (err) {
    console.error("GET /api/groceries failed:", err);
    res.status(500).json({ error: "Failed to fetch groceries" });
  }
});

// ADD grocery (demo users have read-only restrictions)
router.post("/", async (req, res) => {
  try {
    if (isDemoUser(req)) {
      // Demo users can add, but data will be cleared periodically
      console.log('Demo user adding grocery (temporary)');
    }

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const item = await groceriesStore.add(req.user.username, name);

    if (!item) {
      return res.status(409).json({ error: "Item already exists" });
    }

    res.status(201).json(item);
  } catch (err) {
    console.error("POST /api/groceries failed:", err);
    res.status(500).json({ error: "Failed to add grocery" });
  }
});

// RECORD purchase
router.post("/:name/purchase", async (req, res) => {
  try {
    const item = await groceriesStore.recordPurchase(
      req.user.username, 
      req.params.name
    );

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item);
  } catch (err) {
    console.error("POST /api/groceries/:name/purchase failed:", err);
    res.status(500).json({ error: "Failed to record purchase" });
  }
});

// UPDATE grocery (for expanded state, name, etc.)
router.put("/:name", async (req, res) => {
  try {
    const item = await groceriesStore.update(
      req.user.username,
      req.params.name,
      req.body
    );

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item);
  } catch (err) {
    console.error("PUT /api/groceries/:name failed:", err);
    res.status(500).json({ error: "Failed to update grocery" });
  }
});

// UPDATE all groceries (for bulk updates/imports)
router.put("/", async (req, res) => {
  try {
    // This is typically used by the import feature
    let newGroceries = req.body;
    
    // Handle both array directly and {groceries: [...]} format
    if (!Array.isArray(newGroceries)) {
      newGroceries = req.body.groceries;
    }
    
    if (!Array.isArray(newGroceries)) {
      return res.status(400).json({ error: "Groceries must be an array" });
    }

    await groceriesStore.replaceAll(req.user.username, newGroceries);
    res.json(newGroceries);
  } catch (err) {
    console.error("PUT /api/groceries failed:", err);
    res.status(500).json({ error: "Failed to replace groceries" });
  }
});

// DELETE single grocery
router.delete("/:name", async (req, res) => {
  try {
    const success = await groceriesStore.remove(
      req.user.username,
      req.params.name
    );
    
    if (!success) {
      return res.status(404).json({ error: "Item not found" });
    }
    
    const remaining = await groceriesStore.getAll(req.user.username);
    res.json(remaining);
  } catch (err) {
    console.error("DELETE /api/groceries/:name failed:", err);
    res.status(500).json({ error: "Failed to delete grocery" });
  }
});

// RESET all groceries for user
router.delete("/", async (req, res) => {
  try {
    await groceriesStore.reset(req.user.username);
    res.json({ message: "Groceries reset" });
  } catch (err) {
    console.error("DELETE /api/groceries failed:", err);
    res.status(500).json({ error: "Failed to reset groceries" });
  }
});

module.exports = router;