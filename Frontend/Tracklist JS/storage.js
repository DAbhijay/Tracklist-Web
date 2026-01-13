const API_BASE = "http://localhost:3000/api";

function safeJSONParse(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

async function saveGroceries(groceries) {
  const res = await fetch(`${API_BASE}/groceries`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ groceries }),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to save groceries: ${res.statusText}`);
  }
  
  return await res.json();
}

async function loadGroceries() {
  try {
    const res = await fetch(`${API_BASE}/groceries`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      // If backend returns error, return empty array instead of throwing
      console.warn(`Backend returned ${res.status}, using empty grocery list`);
      return [];
    }
    
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    // Network error or backend not running - return empty array
    console.warn("Could not connect to backend, using empty grocery list:", error.message);
    return [];
  }
}

async function saveTasks(tasks) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tasks }),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to save tasks: ${res.statusText}`);
  }
  
  return await res.json();
}

async function loadTasks() {
  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      // If backend returns error, return empty array instead of throwing
      console.warn(`Backend returned ${res.status}, using empty task list`);
      return [];
    }
    
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    // Network error or backend not running - return empty array
    console.warn("Could not connect to backend, using empty task list:", error.message);
    return [];
  }
}
