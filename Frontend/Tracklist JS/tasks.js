let tasks = [];
let tasksReady = false;

// Make tasks accessible globally
window.tasks = tasks;

// Load tasks from API
async function loadTasks() {
  try {
    const res = await fetch("/api/tasks");
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error loading tasks:", error);
    return []; // Return empty array on error
  }
}

// Save tasks to API
async function saveTasks(tasksData) {
  try {
    const res = await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tasksData),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error saving tasks:", error);
    throw error;
  }
}

// Initialize tasks from API
(async function initTasks() {
  try {
    console.log('🚀 Starting tasks initialization...');
    
    const loadedData = await loadTasks();
    console.log('📦 Raw data from API:', loadedData);
    
    // Ensure tasks is an array
    if (!Array.isArray(loadedData)) {
      console.warn('⚠️ API returned non-array data, using empty array');
      tasks = [];
    } else {
      tasks = loadedData;
    }
    
    // Migration: ensure all tasks have IDs and proper structure
    let needsUpdate = false;
    tasks = tasks.map(task => {
      let updatedTask = { ...task };
      
      // Ensure task has an ID
      if (!updatedTask.id) {
        needsUpdate = true;
        updatedTask.id = Date.now() + Math.random();
      }
      
      // Ensure task has completed status
      if (typeof updatedTask.completed !== 'boolean') {
        updatedTask.completed = false;
      }
      
      return updatedTask;
    });
    
    // Save if migration was needed
    if (needsUpdate && tasks.length > 0) {
      console.log('🔄 Migrating tasks data structure...');
      try {
        await saveTasks(tasks);
      } catch (saveError) {
        console.warn("Could not save migrated tasks:", saveError);
      }
    }
    
    // Update global reference
    window.tasks = tasks;
    
    tasksReady = true;
    console.log('✅ Tasks loaded:', tasks.length, 'items');
    console.log('📋 Tasks data:', tasks);
    
    // Notify listeners
    if (window.onTasksReady) {
      window.onTasksReady();
    }
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('tasksReady', { detail: tasks }));
    
    // Auto-render if on tasks page
    setTimeout(() => {
      const isOnTasksPage = 
        (typeof getCurrentPage === 'function' && getCurrentPage() === 'tasks') ||
        window.location.hash === '#tasks' ||
        document.querySelector('#tasks-page.active') ||
        (typeof localStorage !== 'undefined' && localStorage.getItem('lastActivePage') === 'tasks');
      
      if (isOnTasksPage && typeof renderTasks === 'function') {
        console.log('🎨 Auto-rendering tasks page');
        renderTasks();
        if (typeof showPage === 'function' && !document.querySelector('#tasks-page.active')) {
          showPage('tasks', true);
        }
      }
    }, 100);
    
  } catch (error) {
    console.error("❌ Fatal error loading tasks:", error);
    tasks = [];
    window.tasks = tasks;
    tasksReady = true;
    
    if (window.onTasksReady) {
      window.onTasksReady();
    }
    window.dispatchEvent(new CustomEvent('tasksReady', { detail: tasks }));
  }
})();

async function addTask(name, dueDate) {
  try {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name, 
        dueDate: dueDate || null,
        completed: false
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to add task");
    }

    const result = await res.json();
    
    // Handle both array response and single item response
    if (Array.isArray(result)) {
      tasks = result;
    } else {
      // Ensure new task has an ID
      if (!result.id) {
        result.id = Date.now() + Math.random();
      }
      tasks.push(result);
    }
    
    window.tasks = tasks;
    console.log('✅ Added task, new count:', tasks.length);
    
    if (typeof showToast !== 'undefined') {
      showToast(`Added task: "${name}"`, "success");
    }
    
    return result;
  } catch (error) {
    console.error("Error adding task:", error);
    if (typeof showToast !== 'undefined') {
      showToast(error.message || "Failed to add task", "error");
    }
    throw error;
  }
}

async function toggleTask(task) {
  const wasCompleted = task.completed;
  
  try {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: task.completed }),
    });

    if (!res.ok) {
      throw new Error("Failed to update task");
    }

    const result = await res.json();
    
    // Handle both array response and single item response
    if (Array.isArray(result)) {
      tasks = result;
      window.tasks = tasks;
    } else {
      // Update the specific task in the array
      const index = tasks.findIndex(t => t.id === task.id);
      if (index !== -1) {
        tasks[index] = result;
        window.tasks = tasks;
      }
    }
    
    if (typeof showToast !== 'undefined') {
      const status = task.completed ? "completed" : "reopened";
      showToast(`Task "${task.name}" ${status}`, "success", 2000);
    }
  } catch (error) {
    console.error("Error toggling task:", error);
    
    // Revert on error
    task.completed = wasCompleted;
    
    if (typeof showToast !== 'undefined') {
      showToast("Failed to update task", "error");
    }
    
    // Fallback: save all tasks
    try {
      await saveTasks(tasks);
    } catch (saveError) {
      console.error("Failed to save locally:", saveError);
    }
  }
}

async function deleteTask(index) {
  const task = tasks[index];
  if (!task) {
    console.error("Task not found at index:", index);
    return;
  }

  const taskName = task.name;
  
  try {
    // If task has an ID, use the DELETE endpoint
    if (task.id) {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete task");
      }

      const result = await res.json();
      
      // Handle both array response and success response
      if (Array.isArray(result)) {
        tasks = result;
      } else {
        tasks.splice(index, 1);
      }
    } else {
      // No ID, just remove locally and save
      tasks.splice(index, 1);
      await saveTasks(tasks);
    }
    
    window.tasks = tasks;
    
    if (typeof showToast !== 'undefined') {
      showToast(`Deleted "${taskName}"`, "success");
    }
  } catch (error) {
    console.error("Error deleting task:", error);
    if (typeof showToast !== "undefined") {
      showToast("Failed to delete task", "error");
    }
    
    // Fallback: remove locally
    tasks.splice(index, 1);
    window.tasks = tasks;
    
    try {
      await saveTasks(tasks);
    } catch (saveError) {
      console.error("Failed to save after delete:", saveError);
    }
  }
}

// Export for use in other files
window.addTask = addTask;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;