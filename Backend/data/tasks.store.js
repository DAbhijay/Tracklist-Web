const db = require('../db/database');

// ----- Public API (async with username) -----

async function getAll(username) {
    const query = `
        SELECT id, name, completed, dueDate
        FROM tasks
        WHERE username = ?
        ORDER BY id ASC
    `;
    
    const rows = await db.allAsync(query, [username]);
    console.log(`Retrieved ${rows.length} tasks for user: ${username}`);
    return rows.map(r => ({
        ...r,
        completed: Boolean(r.completed)
    }));
}

async function add(username, { name, dueDate = null }) {
    const newTask = {
        id: Date.now(),
        username,
        name,
        completed: 0,
        dueDate
    };

    const query = `
        INSERT INTO tasks (id, username, name, completed, dueDate)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    await db.runAsync(query, [newTask.id, username, name, 0, dueDate]);
    console.log(`Added task: ${name} for user: ${username}`);

    return {
        ...newTask,
        completed: false
    };
}

async function update(username, id, updates) {
    const findQuery = `
        SELECT id, name, completed, dueDate
        FROM tasks
        WHERE id = ? AND username = ?
    `;
    
    const existing = await db.getAsync(findQuery, [id, username]);
    if (!existing) {
        console.log(`Task ${id} not found for user: ${username}`);
        return null;
    }

    const updateQuery = `
        UPDATE tasks
        SET
            name = COALESCE(?, name),
            completed = COALESCE(?, completed),
            dueDate = COALESCE(?, dueDate)
        WHERE id = ? AND username = ?
    `;
    
    await db.runAsync(updateQuery, [
        updates.name ?? null,
        updates.completed !== undefined ? (updates.completed ? 1 : 0) : null,
        updates.dueDate ?? null,
        id,
        username
    ]);
    
    console.log(`Updated task ${id} for user: ${username}`);

    const updated = await db.getAsync(findQuery, [id, username]);
    return {
        ...updated,
        completed: Boolean(updated.completed)
    };
}

async function toggle(username, id) {
    const findQuery = `
        SELECT id, name, completed, dueDate
        FROM tasks
        WHERE id = ? AND username = ?
    `;
    
    const existing = await db.getAsync(findQuery, [id, username]);
    if (!existing) {
        console.log(`Task ${id} not found for user: ${username}`);
        return null;
    }

    const newValue = existing.completed ? 0 : 1;

    const updateQuery = `
        UPDATE tasks
        SET completed = ?
        WHERE id = ? AND username = ?
    `;
    
    await db.runAsync(updateQuery, [newValue, id, username]);

    console.log(`Toggled task ${id} for user: ${username}`);

    return {
        ...existing,
        completed: !existing.completed
    };
}

async function replaceAll(username, newTasks) {
    // Delete all existing tasks for user
    await db.runAsync('DELETE FROM tasks WHERE username = ?', [username]);

    // Insert new tasks
    const insertQuery = `
        INSERT INTO tasks (id, username, name, completed, dueDate)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    for (const t of newTasks) {
        await db.runAsync(insertQuery, [
            t.id,
            username,
            t.name,
            t.completed ? 1 : 0,
            t.dueDate ?? null
        ]);
    }

    console.log(`Replaced all tasks for user ${username} with ${newTasks.length} items`);
    return newTasks;
}

async function remove(username, id) {
    await db.runAsync('DELETE FROM tasks WHERE id = ? AND username = ?', [Number(id), username]);
    console.log(`Deleted task ${id} for user: ${username}`);
    return true;
}

module.exports = {
    getAll,
    add,
    update,
    toggle,
    replaceAll,
    remove
};