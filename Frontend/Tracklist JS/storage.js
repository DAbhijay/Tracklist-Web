const API_BASE = window.location.hostname === 'localhost'
  ? "https://localhost:3000/api"
  : "/api";

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
    console.log('🔄 Loading groceries from:', `${API_BASE}/groceries`);
    const res = await fetch(`${API_BASE}/groceries`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📡 Groceries API response status:', res.status, res.statusText);
    
    if (!res.ok) {
      // If backend returns error, return empty array instead of throwing
      console.error(`❌ Backend returned ${res.status}, using empty grocery list`);
      const errorText = await res.text();
      console.error('Error response:', errorText);
      return [];
    }
    
    const data = await res.json();
    console.log('✅ Groceries API returned data:', data);
    console.log('📊 Number of items:', Array.isArray(data) ? data.length : 'Not an array');
    
    if (!Array.isArray(data)) {
      console.error('❌ API did not return an array, got:', typeof data, data);
      return [];
    }
    
    return data;
  } catch (error) {
    // Network error or backend not running - return empty array
    console.error("❌ Could not connect to backend, using empty grocery list:", error.message);
    console.error('Full error:', error);
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
    console.log('🔄 Loading tasks from:', `${API_BASE}/tasks`);
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📡 Tasks API response status:', res.status, res.statusText);
    
    if (!res.ok) {
      // If backend returns error, return empty array instead of throwing
      console.error(`❌ Backend returned ${res.status}, using empty task list`);
      const errorText = await res.text();
      console.error('Error response:', errorText);
      return [];
    }
    
    const data = await res.json();
    console.log('✅ Tasks API returned data:', data);
    console.log('📊 Number of items:', Array.isArray(data) ? data.length : 'Not an array');
    
    if (!Array.isArray(data)) {
      console.error('❌ API did not return an array, got:', typeof data, data);
      return [];
    }
    
    return data;
  } catch (error) {
    // Network error or backend not running - return empty array
    console.error("❌ Could not connect to backend, using empty task list:", error.message);
    console.error('Full error:', error);
    return [];
  }
}
