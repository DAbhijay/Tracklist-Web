const db = require('../db/database');

console.log('Groceries store initialized (using SQLite with user isolation)');

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

// ----- Public API (async with username) -----

async function getAll(username) {
    const query = `
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
    `;
    
    const rows = await db.allAsync(query, [username]);
    const groceries = rows.map(parseGroceryRow);
    console.log(`Retrieved ${groceries.length} groceries for user: ${username}`);
    return groceries;
}

async function add(username, name) {
    // Check if already exists for this user
    const findQuery = `
        SELECT 
            g.id,
            g.name,
            g.expanded,
            GROUP_CONCAT(gp.purchased_at) as purchases
        FROM groceries g
        LEFT JOIN grocery_purchases gp ON g.id = gp.grocery_id
        WHERE LOWER(g.name) = LOWER(?) AND g.username = ?
        GROUP BY g.id, g.name, g.expanded
    `;
    
    const existing = await db.getAsync(findQuery, [name, username]);
    if (existing) {
        console.log(`Grocery "${name}" already exists for user: ${username}`);
        return null;
    }

    const insertQuery = `
        INSERT INTO groceries (username, name, expanded)
        VALUES (?, ?, 0)
    `;
    
    const result = await db.runAsync(insertQuery, [username, name]);

    const newGrocery = {
        id: result.lastID,
        name,
        expanded: false,
        purchases: []
    };

    console.log(`Added grocery: ${name} for user: ${username}`);
    return newGrocery;
}

async function recordPurchase(username, name) {
    const findQuery = `
        SELECT 
            g.id,
            g.name,
            g.expanded,
            GROUP_CONCAT(gp.purchased_at) as purchases
        FROM groceries g
        LEFT JOIN grocery_purchases gp ON g.id = gp.grocery_id
        WHERE LOWER(g.name) = LOWER(?) AND g.username = ?
        GROUP BY g.id, g.name, g.expanded
    `;
    
    const grocery = await db.getAsync(findQuery, [name, username]);
    
    if (!grocery) {
        console.log(`Grocery "${name}" not found for user: ${username}`);
        return null;
    }

    const now = new Date().toISOString();
    
    const insertQuery = `
        INSERT INTO grocery_purchases (grocery_id, purchased_at)
        VALUES (?, ?)
    `;
    
    await db.runAsync(insertQuery, [grocery.id, now]);

    console.log(`Recorded purchase for: ${name} (user: ${username})`);
    
    // Return updated grocery
    const updated = await db.getAsync(findQuery, [name, username]);
    return parseGroceryRow(updated);
}

async function update(username, name, updates) {
    const findQuery = `
        SELECT 
            g.id,
            g.name,
            g.expanded,
            GROUP_CONCAT(gp.purchased_at) as purchases
        FROM groceries g
        LEFT JOIN grocery_purchases gp ON g.id = gp.grocery_id
        WHERE LOWER(g.name) = LOWER(?) AND g.username = ?
        GROUP BY g.id, g.name, g.expanded
    `;
    
    const grocery = await db.getAsync(findQuery, [name, username]);
    
    if (!grocery) {
        console.log(`Grocery "${name}" not found for user: ${username}`);
        return null;
    }

    // Handle purchase updates
    if (updates.purchases !== undefined) {
        // Delete all existing purchases for this grocery
        await db.runAsync('DELETE FROM grocery_purchases WHERE grocery_id = ?', [grocery.id]);
        
        // Re-insert all purchases
        if (Array.isArray(updates.purchases) && updates.purchases.length > 0) {
            const insertPurchaseQuery = `
                INSERT INTO grocery_purchases (grocery_id, purchased_at)
                VALUES (?, ?)
            `;
            
            for (const purchaseDate of updates.purchases) {
                await db.runAsync(insertPurchaseQuery, [grocery.id, purchaseDate]);
            }
        }
    }

    // Update other fields
    const updateQuery = `
        UPDATE groceries
        SET 
            name = COALESCE(?, name),
            expanded = COALESCE(?, expanded)
        WHERE id = ? AND username = ?
    `;
    
    await db.runAsync(updateQuery, [
        updates.name !== undefined ? updates.name : null,
        updates.expanded !== undefined ? (updates.expanded ? 1 : 0) : null,
        grocery.id,
        username
    ]);

    console.log(`Updated grocery: ${name} for user: ${username}`);
    
    // Return updated grocery
    const updated = await db.getAsync(findQuery, [updates.name || name, username]);
    return parseGroceryRow(updated);
}

async function replaceAll(username, newGroceries) {
    // Clear existing data for this user
    await db.runAsync(`
        DELETE FROM grocery_purchases 
        WHERE grocery_id IN (SELECT id FROM groceries WHERE username = ?)
    `, [username]);
    
    await db.runAsync('DELETE FROM groceries WHERE username = ?', [username]);
    
    // Insert new data
    for (const grocery of newGroceries) {
        const result = await db.runAsync(`
            INSERT INTO groceries (username, name, expanded)
            VALUES (?, ?, ?)
        `, [username, grocery.name, grocery.expanded ? 1 : 0]);
        
        const groceryId = result.lastID;
        
        // Insert purchases
        if (Array.isArray(grocery.purchases) && grocery.purchases.length > 0) {
            for (const purchaseDate of grocery.purchases) {
                await db.runAsync(`
                    INSERT INTO grocery_purchases (grocery_id, purchased_at)
                    VALUES (?, ?)
                `, [groceryId, purchaseDate]);
            }
        }
    }
    
    console.log(`Replaced all groceries for user ${username} with ${newGroceries.length} items`);
    return newGroceries;
}

async function reset(username) {
    await db.runAsync(`
        DELETE FROM grocery_purchases 
        WHERE grocery_id IN (SELECT id FROM groceries WHERE username = ?)
    `, [username]);
    
    await db.runAsync('DELETE FROM groceries WHERE username = ?', [username]);
    
    console.log(`Reset all groceries for user: ${username}`);
    return true;
}

async function remove(username, name) {
    const findQuery = `
        SELECT id FROM groceries
        WHERE LOWER(name) = LOWER(?) AND username = ?
    `;
    
    const grocery = await db.getAsync(findQuery, [name, username]);
    
    if (!grocery) {
        console.log(`Grocery "${name}" not found for user: ${username}`);
        return false;
    }

    await db.runAsync('DELETE FROM groceries WHERE id = ? AND username = ?', [grocery.id, username]);
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