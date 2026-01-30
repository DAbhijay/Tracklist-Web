const db = require('../db/database');

console.log('Groceries store initialized (using SQLite)');

// ----- Queries -----

const selectAllStmt = db.prepare(`
    SELECT 
        g.id,
        g.name,
        g.expanded,
        GROUP_CONCAT(gp.purchased_at) as purchases
    FROM groceries g
    LEFT JOIN grocery_purchases gp ON g.id = gp.grocery_id
    GROUP BY g.id, g.name, g.expanded
    ORDER BY g.name ASC
`);

const insertGroceryStmt = db.prepare(`
    INSERT INTO groceries (name, expanded)
    VALUES (@name, @expanded)
`);

const insertPurchaseStmt = db.prepare(`
    INSERT INTO grocery_purchases (grocery_id, purchased_at)
    VALUES (@grocery_id, @purchased_at)
`);

const findByNameStmt = db.prepare(`
    SELECT 
        g.id,
        g.name,
        g.expanded,
        GROUP_CONCAT(gp.purchased_at) as purchases
    FROM groceries g
    LEFT JOIN grocery_purchases gp ON g.id = gp.grocery_id
    WHERE LOWER(g.name) = LOWER(@name)
    GROUP BY g.id, g.name, g.expanded
`);

const updateGroceryStmt = db.prepare(`
    UPDATE groceries
    SET 
        name = COALESCE(@name, name),
        expanded = COALESCE(@expanded, expanded)
    WHERE id = @id
`);

const deleteGroceryStmt = db.prepare(`
    DELETE FROM groceries WHERE id = @id
`);

const deletePurchasesStmt = db.prepare(`
    DELETE FROM grocery_purchases WHERE grocery_id = @grocery_id
`);

const deleteAllGroceriesStmt = db.prepare(`
    DELETE FROM groceries
`);

const deleteAllPurchasesStmt = db.prepare(`
    DELETE FROM grocery_purchases
`);

// ----- Helper Functions -----

function parseGroceryRow(row) {
    if (!row) return null;
    
    return {
        id: row.id,
        name: row.name,
        expanded: Boolean(row.expanded),
        purchases: row.purchases ? row.purchases.split(',') : []
    };
}

// ----- Public API -----

function getAll() {
    const rows = selectAllStmt.all();
    const groceries = rows.map(parseGroceryRow);
    console.log(`Retrieved ${groceries.length} groceries from database`);
    return groceries;
}

function add(name) {
    // Check if already exists
    const existing = findByNameStmt.get({ name });
    if (existing) {
        console.log(`Grocery "${name}" already exists`);
        return null;
    }

    const result = insertGroceryStmt.run({
        name,
        expanded: 0
    });

    const newGrocery = {
        id: result.lastInsertRowid,
        name,
        expanded: false,
        purchases: []
    };

    console.log(`Added grocery: ${name}`);
    return newGrocery;
}

function recordPurchase(name) {
    const grocery = findByNameStmt.get({ name });
    
    if (!grocery) {
        console.log(`Grocery "${name}" not found`);
        return null;
    }

    const now = new Date().toISOString();
    
    insertPurchaseStmt.run({
        grocery_id: grocery.id,
        purchased_at: now
    });

    console.log(`Recorded purchase for: ${name}`);
    
    // Return updated grocery
    const updated = findByNameStmt.get({ name });
    return parseGroceryRow(updated);
}

function update(name, updates) {
    const grocery = findByNameStmt.get({ name });
    
    if (!grocery) {
        console.log(`Grocery "${name}" not found for update`);
        return null;
    }

    // Handle purchase updates
    if (updates.purchases !== undefined) {
        // Delete all existing purchases for this grocery
        deletePurchasesStmt.run({ grocery_id: grocery.id });
        
        // Re-insert all purchases
        if (Array.isArray(updates.purchases) && updates.purchases.length > 0) {
            const insertMany = db.transaction((purchases) => {
                for (const purchaseDate of purchases) {
                    insertPurchaseStmt.run({
                        grocery_id: grocery.id,
                        purchased_at: purchaseDate
                    });
                }
            });
            insertMany(updates.purchases);
        }
    }

    // Update other fields
    updateGroceryStmt.run({
        id: grocery.id,
        name: updates.name !== undefined ? updates.name : null,
        expanded: updates.expanded !== undefined ? (updates.expanded ? 1 : 0) : null
    });

    console.log(`Updated grocery: ${name}`);
    
    // Return updated grocery
    const updated = findByNameStmt.get({ name: updates.name || name });
    return parseGroceryRow(updated);
}

function replaceAll(newGroceries) {
    const transaction = db.transaction(() => {
        // Clear existing data
        deleteAllPurchasesStmt.run();
        deleteAllGroceriesStmt.run();
        
        // Insert new data
        for (const grocery of newGroceries) {
            const result = insertGroceryStmt.run({
                name: grocery.name,
                expanded: grocery.expanded ? 1 : 0
            });
            
            const groceryId = result.lastInsertRowid;
            
            // Insert purchases
            if (Array.isArray(grocery.purchases) && grocery.purchases.length > 0) {
                for (const purchaseDate of grocery.purchases) {
                    insertPurchaseStmt.run({
                        grocery_id: groceryId,
                        purchased_at: purchaseDate
                    });
                }
            }
        }
    });
    
    transaction();
    console.log(`Replaced all groceries with ${newGroceries.length} items`);
    return newGroceries;
}

function reset() {
    const transaction = db.transaction(() => {
        deleteAllPurchasesStmt.run();
        deleteAllGroceriesStmt.run();
    });
    
    transaction();
    console.log('Reset all groceries');
    return true;
}

function remove(name) {
    const grocery = findByNameStmt.get({ name });
    
    if (!grocery) {
        console.log(`Grocery "${name}" not found for deletion`);
        return false;
    }

    deleteGroceryStmt.run({ id: grocery.id });
    console.log(`Deleted grocery: ${name}`);
    return true;
}

// Log initial state
const initialCount = getAll().length;
console.log(`Groceries store ready with ${initialCount} items`);

module.exports = {
    getAll,
    add,
    recordPurchase,
    update,
    replaceAll,
    reset,
    remove
};