const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "groceries.json");

// Internal Helpers
function readData() {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeData(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Public API
function getAll() {
    return readData();
}

function add(name) {
    const groceries = readData();

    if (groceries.some(g => g.name.toLowerCase() === name.toLowerCase())) {
        return null;
    }

    const item = {
        name,
        purchases: [],
        expanded: false
    };

    groceries.push(item);
    writeData(groceries);

    return item;
}

function recordPurchase(name) {
    const groceries = readData();
    const item = groceries.find(
        g => g.name.toLowerCase() === name.toLowerCase()
    );

    if (!item) return null;

    item.purchases.push(new Date().toISOString());
    writeData(groceries);

    return item;
}

function update(name, updates) {
    const groceries = readData();
    const item = groceries.find(
        g => g.name.toLowerCase() === name.toLowerCase()
    );

    if (!item) return null;

    if (updates.expanded !== undefined) {
        item.expanded = updates.expanded;
    }
    if (updates.name !== undefined) {
        item.name = updates.name;
    }
    if (updates.purchases !== undefined) {
        item.purchases = updates.purchases
    }

    writeData(groceries);
    return item;
}

function replaceAll(newGroceries) {
    writeData(newGroceries);
    return newGroceries;
}

function reset() {
    writeData([]);
    return true;
}

module.exports = {
    getAll,
    add,
    recordPurchase,
    update,
    replaceAll,
    reset
}