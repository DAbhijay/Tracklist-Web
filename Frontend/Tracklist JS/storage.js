// Storage.js - API communication layer with authentication
// This file must be loaded BEFORE groceries.js and tasks.js

const API_BASE = window.location.hostname === 'localhost'
  ? "http://localhost:3000/api"
  : "/api";

console.log('📡 Storage layer initialized, API base:', API_BASE);

// Check auth IMMEDIATELY on page load
(function() {
  // Don't check if we're already on login page
  if (window.location.pathname.includes('login.html') || 
      window.location.pathname.includes('login')) {
    return;
  }
  
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.log('🔒 No auth token found, redirecting to login');
    window.location.href = '/login.html';
  }
})();

// ----- AUTH HELPERS -----

function getAuthToken() {
  return localStorage.getItem('auth_token');
}

function getAuthHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

function handleUnauthorized() {
  // Token expired or invalid, redirect to login
  console.warn('⚠️ Unauthorized - redirecting to login');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('username');
  localStorage.removeItem('isDemo');
  window.location.href = '/login.html';
}

function getCurrentUsername() {
  return localStorage.getItem('username') || 'unknown';
}

function isDemo() {
  return localStorage.getItem('isDemo') === 'true';
}

function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('username');
  localStorage.removeItem('isDemo');
  localStorage.removeItem('lastActivePage');
  window.location.href = '/login.html';
}

// ----- GROCERY API FUNCTIONS -----

async function loadGroceries() {
  try {
    console.log('🔄 Loading groceries from:', `${API_BASE}/groceries`);
    const res = await fetch(`${API_BASE}/groceries`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (res.status === 401 || res.status === 403) {
      handleUnauthorized();
      return [];
    }
    
    console.log('📡 Groceries API response status:', res.status, res.statusText);
    
    if (!res.ok) {
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
    console.error("❌ Could not connect to backend, using empty grocery list:", error.message);
    console.error('Full error:', error);
    return [];
  }
}

async function saveGroceries(groceries) {
  try {
    const res = await fetch(`${API_BASE}/groceries`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(groceries),
    });
    
    if (res.status === 401 || res.status === 403) {
      handleUnauthorized();
      throw new Error('Unauthorized');
    }
    
    if (!res.ok) {
      throw new Error(`Failed to save groceries: ${res.statusText}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error("Error saving groceries:", error);
    throw error;
  }
}

// ----- TASK API FUNCTIONS -----

async function loadTasks() {
  try {
    console.log('🔄 Loading tasks from:', `${API_BASE}/tasks`);
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (res.status === 401 || res.status === 403) {
      handleUnauthorized();
      return [];
    }
    
    console.log('📡 Tasks API response status:', res.status, res.statusText);
    
    if (!res.ok) {
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
    console.error("❌ Could not connect to backend, using empty task list:", error.message);
    console.error('Full error:', error);
    return [];
  }
}

async function saveTasks(tasks) {
  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(tasks),
    });
    
    if (res.status === 401 || res.status === 403) {
      handleUnauthorized();
      throw new Error('Unauthorized');
    }
    
    if (!res.ok) {
      throw new Error(`Failed to save tasks: ${res.statusText}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error("Error saving tasks:", error);
    throw error;
  }
}

// Make functions globally available
window.loadGroceries = loadGroceries;
window.saveGroceries = saveGroceries;
window.loadTasks = loadTasks;
window.saveTasks = saveTasks;
window.getAuthToken = getAuthToken;
window.getAuthHeaders = getAuthHeaders;
window.getCurrentUsername = getCurrentUsername;
window.isDemo = isDemo;
window.logout = logout;

console.log('✅ Storage API functions registered globally');
console.log('👤 Current user:', getCurrentUsername(), isDemo() ? '(Demo)' : '(Family)');