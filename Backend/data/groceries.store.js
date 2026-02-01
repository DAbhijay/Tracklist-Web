const db = require('../db/database');

console.log('Groceries store initialized (using SQLite with user isolation)');

// ----- Queries -----

const selectAllStmt = db.prepare(`
    SELECT 
        g.id,
        g.name,
        g.expanded,
        GROUP_CONCAT(gp.purchased_at) as purchases
    FROM groceries g
    LEFT JOIN grocery_purchases gp ON g.id = gp.grocery_id
    WHERE g.username = ?
    GROUP BY g.id, g.name, g.expanded
    ORDER BY g.name ASC
`);

const insertGroceryStmt = db.prepare(`
    INSERT INTO groceries (username, name, expanded)
    VALUES (@username, @name, @expanded)
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
    WHERE LOWER(g.name) = LOWER(@name) AND g.username = @username
    GROUP BY g.id, g.name, g.expanded
`);

const updateGroceryStmt = db.prepare(`
    UPDATE groceries
    SET 
        name = COALESCE(@name, name),
        expanded = COALESCE(@expanded, expanded)
    WHERE id = @id AND username = @username
`);

const deleteGroceryStmt = db.prepare(`
    DELETE FROM groceries WHERE id = @id AND username = @username
`);

const deletePurchasesStmt = db.prepare(`
    DELETE FROM grocery_purchases WHERE grocery_id = @grocery_id
`);

const deleteAllGroceriesStmt = db.prepare(`
    DELETE FROM groceries WHERE username = ?
`);

const deleteAllPurchasesForUserStmt = db.prepare(`
    DELETE FROM grocery_purchases 
    WHERE grocery_id IN (SELECT id FROM groceries WHERE username = ?)
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

// ----- Public API (now requires username) -----

function getAll(username) {
    const rows = selectAllStmt.all(username);
    const groceries = rows.map(parseGroceryRow);
    console.log(`Retrieved ${groceries.length} groceries for user: ${username}`);
    return groceries;
}

function add(username, name) {
    // Check if already exists for this user
    const existing = findByNameStmt.get({ name, username });
    if (existing) {
        console.log(`Grocery "${name}" already exists for user: ${username}`);
        return null;
    }

    const result = insertGroceryStmt.run({
        username,
        name,
        expanded: 0
    });

    const newGrocery = {
        id: result.lastInsertRowid,
        name,
        expanded: false,
        purchases: []
    };

    console.log(`Added grocery: ${name} for user: ${username}`);
    return newGrocery;
}

function recordPurchase(username, name) {
    const grocery = findByNameStmt.get({ name, username });
    
    if (!grocery) {
        console.log(`Grocery "${name}" not found for user: ${username}`);
        return null;
    }

    const now = new Date().toISOString();
    
    insertPurchaseStmt.run({
        grocery_id: grocery.id,
        purchased_at: now
    });

    console.log(`Recorded purchase for: ${name} (user: ${username})`);
    
    // Return updated grocery
    const updated = findByNameStmt.get({ name, username });
    return parseGroceryRow(updated);
}

function update(username, name, updates) {
    const grocery = findByNameStmt.get({ name, username });
    
    if (!grocery) {
        console.log(`Grocery "${name}" not found for user: ${username}`);
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
        username,
        name: updates.name !== undefined ? updates.name : null,
        expanded: updates.expanded !== undefined ? (updates.expanded ? 1 : 0) : null
    });

    console.log(`Updated grocery: ${name} for user: ${username}`);
    
    // Return updated grocery
    const updated = findByNameStmt.get({ 
        name: updates.name || name, 
        username 
    });
    return parseGroceryRow(updated);
}

function replaceAll(username, newGroceries) {
    const transaction = db.transaction(() => {
        // Clear existing data for this user
        deleteAllPurchasesForUserStmt.run(username);
        deleteAllGroceriesStmt.run(username);
        
        // Insert new data
        for (const grocery of newGroceries) {
            const result = insertGroceryStmt.run({
                username,
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
    console.log(`Replaced all groceries for user ${username} with ${newGroceries.length} items`);
    return newGroceries;
}

function reset(username) {
    const transaction = db.transaction(() => {
        deleteAllPurchasesForUserStmt.run(username);
        deleteAllGroceriesStmt.run(username);
    });
    
    transaction();
    console.log(`Reset all groceries for user: ${username}`);
    return true;
}

function remove(username, name) {
    const grocery = findByNameStmt.get({ name, username });
    
    if (!grocery) {
        console.log(`Grocery "${name}" not found for user: ${username}`);
        return false;
    }

    deleteGroceryStmt.run({ id: grocery.id, username });
    console.log(`Deleted grocery: ${name} for user: ${username}`);
    return true;
}

module.exports = {
    getAll,
    add,
    recordPurchase,
    update,
    replaceAll,
    reset,
    remove
};