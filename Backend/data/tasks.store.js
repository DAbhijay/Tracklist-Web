const db = require('../db/database');

// ----- Queries -----

const selectAllStmt = db.prepare(`
    SELECT id, name, completed, dueDate
    FROM tasks
    ORDER BY id ASC
`);

const insertStmt = db.prepare(`
    INSERT INTO tasks (id, name, completed, dueDate)
    VALUES (@id, @name, @completed, @dueDate)    
`);

const updateStmt = db.prepare(`
    UPDATE tasks
    SET
        name = COALESCE(@name, name),
        completed = COALESCE(@completed, completed),
        dueDate = COALESCE(@dueDate, dueDate)
    WHERE id = @id    
`);

const deleteStmt = db.prepare(`
    DELETE FROM tasks WHERE id = ?
`);

const deleteAllStmt = db.prepare(`
    DELETE FROM tasks    
`);

const findByIdStmt = db.prepare(`
    SELECT id, name, completed, dueDate
    FROM tasks
    WHERE id = ?    
`);

// ----- Public API -----

function getAll() {
    const rows = selectAllStmt.all();
    return rows.map(r => ({
        ...r,
        completed: Boolean(r.completed)
    }));
}

function add({ name, dueDate = null }) {
    const newTask = {
        id: Date.now(),
        name,
        completed: 0,
        dueDate
    }

    insertStmt.run(newTask);

    return {
        ...newTask,
        completed: false
    };
}

function update(id, updates) {
    const existing = findByIdStmt.get(id);
    if (!existing) return null;

    const payload = {
        id,
        name: updates.name ?? null,
        completed:
        updates.completed !== undefined
            ? updates.completed ? 1 : 0
            : null,
        dueDate: updates.dueDate ?? null
    };

    updateStmt.run(payload);

    const updated = findByIdStmt.get(id);
    return {
        ...updated,
        completed: Boolean(updates.completed)
    };
}

function toggle(id) {
    const existing = findByIdStmt.get(id);
    if (!existing) return null;

    const newValue = existing.completed ? 0 : 1;

    updateStmt.run({
        id,
        name: null,
        completed: newValue,
        dueDate: null
    });

    return {
        ...existing,
        completed: !existing.completed
    };
}

function replaceAll(newTasks) {
    const tx = db.transaction(tasks => {
        deleteAllStmt.run();

        for (const t of tasks) {
            insertStmt.run({
                id: t.id,
                name: t.name,
                completed: t.completed ? 1 : 0,
                dueDate: t.dueDate ?? null
            });
        }
    });

    tx(newTasks);
    return newTasks;
}

function remove(id) {
    deleteStmt.run(Number(id));
    return true;
}

module.exports = {
    getAll,
    add,
    update,
    toggle,
    replaceAll,
    remove
}
