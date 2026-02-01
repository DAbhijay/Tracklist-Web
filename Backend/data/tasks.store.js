const db = require('../db/database');

// ----- Queries -----

const selectAllStmt = db.prepare(`
    SELECT id, name, completed, dueDate
    FROM tasks
    WHERE username = ?
    ORDER BY id ASC
`);

const insertStmt = db.prepare(`
    INSERT INTO tasks (id, username, name, completed, dueDate)
    VALUES (@id, @username, @name, @completed, @dueDate)    
`);

const updateStmt = db.prepare(`
    UPDATE tasks
    SET
        name = COALESCE(@name, name),
        completed = COALESCE(@completed, completed),
        dueDate = COALESCE(@dueDate, dueDate)
    WHERE id = @id AND username = @username
`);

const deleteStmt = db.prepare(`
    DELETE FROM tasks WHERE id = ? AND username = ?
`);

const deleteAllStmt = db.prepare(`
    DELETE FROM tasks WHERE username = ?
`);

const findByIdStmt = db.prepare(`
    SELECT id, name, completed, dueDate
    FROM tasks
    WHERE id = ? AND username = ?
`);

// ----- Public API (requires username) -----

function getAll(username) {
    const rows = selectAllStmt.all(username);
    console.log(`Retrieved ${rows.length} tasks for user: ${username}`);
    return rows.map(r => ({
        ...r,
        completed: Boolean(r.completed)
    }));
}

function add(username, { name, dueDate = null }) {
    const newTask = {
        id: Date.now(),
        username,
        name,
        completed: 0,
        dueDate
    }

    insertStmt.run(newTask);
    console.log(`Added task: ${name} for user: ${username}`);

    return {
        ...newTask,
        completed: false
    };
}

function update(username, id, updates) {
    const existing = findByIdStmt.get(id, username);
    if (!existing) {
        console.log(`Task ${id} not found for user: ${username}`);
        return null;
    }

    const payload = {
        id,
        username,
        name: updates.name ?? null,
        completed:
        updates.completed !== undefined
            ? updates.completed ? 1 : 0
            : null,
        dueDate: updates.dueDate ?? null
    };

    updateStmt.run(payload);
    console.log(`Updated task ${id} for user: ${username}`);

    const updated = findByIdStmt.get(id, username);
    return {
        ...updated,
        completed: Boolean(updates.completed)
    };
}

function toggle(username, id) {
    const existing = findByIdStmt.get(id, username);
    if (!existing) {
        console.log(`Task ${id} not found for user: ${username}`);
        return null;
    }

    const newValue = existing.completed ? 0 : 1;

    updateStmt.run({
        id,
        username,
        name: null,
        completed: newValue,
        dueDate: null
    });

    console.log(`Toggled task ${id} for user: ${username}`);

    return {
        ...existing,
        completed: !existing.completed
    };
}

function replaceAll(username, newTasks) {
    const tx = db.transaction(tasks => {
        deleteAllStmt.run(username);

        for (const t of tasks) {
            insertStmt.run({
                id: t.id,
                username,
                name: t.name,
                completed: t.completed ? 1 : 0,
                dueDate: t.dueDate ?? null
            });
        }
    });

    tx(newTasks);
    console.log(`Replaced all tasks for user ${username} with ${newTasks.length} items`);
    return newTasks;
}

function remove(username, id) {
    deleteStmt.run(Number(id), username);
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