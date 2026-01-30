let groceries = [];
let groceriesReady = false;

// Make groceries accessible globally
window.groceries = groceries;

// Load groceries from API
async function loadGroceries() {
  try {
    const res = await fetch("/api/groceries");
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error loading groceries:", error);
    return []; // Return empty array on error
  }
}

// Save groceries to API
async function saveGroceries(groceriesData) {
  try {
    const res = await fetch("/api/groceries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groceriesData),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Error saving groceries:", error);
    throw error;
  }
}

// Initialize groceries from API
(async function initGroceries() {
  try {
    console.log('🚀 Starting groceries initialization...');
    
    const loadedData = await loadGroceries();
    console.log('📦 Raw data from API:', loadedData);
    
    // Migration - ensure proper structure
    if (Array.isArray(loadedData)) {
      let needsMigration = false;
      groceries = loadedData.map(item => {
        // Already has correct structure
        if (item.purchases && Array.isArray(item.purchases)) {
          return {
            name: item.name,
            purchases: item.purchases,
            expanded: item.expanded || false
          };
        }
        
        // Old structure with lastBought
        if (item.lastBought) {
          needsMigration = true;
          return {
            name: item.name,
            purchases: [item.lastBought],
            expanded: false
          };
        }
        
        // No purchase data
        return {
          name: item.name,
          purchases: [],
          expanded: false
        };
      });

      if (needsMigration) {
        console.log('🔄 Migrating old data structure...');
        try {
          await saveGroceries(groceries);
        } catch (saveError) {
          console.warn("Could not save migrated groceries:", saveError);
        }
      }
    } else {
      console.warn('⚠️ API returned non-array data, using empty array');
      groceries = [];
    }
    
    // Update global reference
    window.groceries = groceries;
    
    groceriesReady = true;
    console.log('✅ Groceries loaded:', groceries.length, 'items');
    console.log('📋 Groceries data:', groceries);
    
    // Notify listeners
    if (window.onGroceriesReady) {
      window.onGroceriesReady();
    }
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('groceriesReady', { detail: groceries }));
    
    // Auto-render if on groceries page
    setTimeout(() => {
      const isOnGroceriesPage = 
        (typeof getCurrentPage === 'function' && getCurrentPage() === 'groceries') ||
        window.location.hash === '#groceries' ||
        document.querySelector('#groceries-page.active') ||
        (typeof localStorage !== 'undefined' && localStorage.getItem('lastActivePage') === 'groceries');
      
      if (isOnGroceriesPage && typeof renderGroceries === 'function') {
        console.log('🎨 Auto-rendering groceries page');
        renderGroceries();
        if (typeof showPage === 'function' && !document.querySelector('#groceries-page.active')) {
          showPage('groceries', true);
        }
      }
    }, 100);
    
  } catch (error) {
    console.error("❌ Fatal error loading groceries:", error);
    groceries = [];
    window.groceries = groceries;
    groceriesReady = true;
    
    if (window.onGroceriesReady) {
      window.onGroceriesReady();
    }
    window.dispatchEvent(new CustomEvent('groceriesReady', { detail: groceries }));
  }
})();

async function addGrocery(name) {
  try {
    const res = await fetch("/api/groceries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to add grocery");
    }

    const result = await res.json();
    
    // Handle both array response and single item response
    if (Array.isArray(result)) {
      groceries = result;
    } else {
      groceries.push(result);
    }
    
    window.groceries = groceries;
    console.log('✅ Added grocery, new count:', groceries.length);
    
    if (typeof showToast !== 'undefined') {
      showToast(`Added "${name}" to grocery list`, "success");
    }
    
    return result;
  } catch (error) {
    console.error("Error adding grocery:", error);
    if (typeof showToast !== 'undefined') {
      showToast(error.message || "Failed to add grocery item", "error");
    }
    throw error;
  }
}

async function togglePurchase(grocery, isChecked) {
  const today = new Date().toISOString();
  const todayDate = today.split('T')[0];
  
  try {
    if (isChecked) {
      const res = await fetch(`/api/groceries/${encodeURIComponent(grocery.name)}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        throw new Error("Failed to record purchase");
      }

      const updatedItem = await res.json();
      const index = groceries.findIndex(g => g.name === grocery.name);
      if (index !== -1) {
        groceries[index] = updatedItem;
        window.groceries = groceries;
      }
      
      if (typeof showToast !== 'undefined') {
        showToast(`Marked "${grocery.name}" as purchased`, "success");
      }
    } else {
      const purchaseIndex = grocery.purchases.findIndex(date => {
        const purchaseDate = new Date(date).toISOString().split('T')[0];
        return purchaseDate === todayDate;
      });
      
      if (purchaseIndex !== -1) {
        grocery.purchases.splice(purchaseIndex, 1);
        
        const res = await fetch(`/api/groceries/${encodeURIComponent(grocery.name)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purchases: grocery.purchases }),
        });

        if (!res.ok) {
          throw new Error("Failed to update grocery");
        }

        const updatedItem = await res.json();
        const index = groceries.findIndex(g => g.name === grocery.name);
        if (index !== -1) {
          groceries[index] = updatedItem;
          window.groceries = groceries;
        }
        
        if (typeof showToast !== 'undefined') {
          showToast(`Unmarked "${grocery.name}"`, "info");
        }
      }
    }
  } catch (error) {
    console.error("Error toggling purchase:", error);
    if (typeof showToast !== 'undefined') {
      showToast("Failed to update item", "error");
    }
    
    // Fallback: update locally
    if (isChecked) {
      if (!grocery.purchases.some(date => {
        const purchaseDate = new Date(date).toISOString().split('T')[0];
        return purchaseDate === todayDate;
      })) {
        grocery.purchases.push(today);
      }
    } else {
      const purchaseIndex = grocery.purchases.findIndex(date => {
        const purchaseDate = new Date(date).toISOString().split('T')[0];
        return purchaseDate === todayDate;
      });
      if (purchaseIndex !== -1) {
        grocery.purchases.splice(purchaseIndex, 1);
      }
    }
    
    try {
      await saveGroceries(groceries);
    } catch (saveError) {
      console.error("Failed to save locally:", saveError);
    }
  }
}

async function toggleHistory(grocery) {
  grocery.expanded = !grocery.expanded;
  
  try {
    const res = await fetch(`/api/groceries/${encodeURIComponent(grocery.name)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expanded: grocery.expanded }),
    });

    if (!res.ok) {
      throw new Error("Failed to update grocery");
    }

    const updatedItem = await res.json();
    const index = groceries.findIndex(g => g.name === grocery.name);
    if (index !== -1) {
      groceries[index] = updatedItem;
      window.groceries = groceries;
    }
  } catch (error) {
    console.error("Error toggling history:", error);
    try {
      await saveGroceries(groceries);
    } catch (saveError) {
      console.error("Failed to save locally:", saveError);
    }
  }
}

async function resetGroceries() {
  if (!confirm("Clear all grocery data? This cannot be undone.")) {
    return;
  }
  
  const resetBtn = document.getElementById("reset-groceries");
  if (resetBtn && typeof setLoading !== 'undefined') {
    setLoading(resetBtn, true);
  }
  
  try {
    const res = await fetch("/api/groceries", {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Failed to reset groceries");
    }

    groceries = [];
    window.groceries = groceries;
    
    if (typeof showToast !== 'undefined') {
      showToast("Grocery list reset successfully", "success");
    }
  } catch (error) {
    console.error("Error resetting groceries:", error);
    if (typeof showToast !== 'undefined') {
      showToast("Failed to reset groceries", "error");
    }
    
    groceries = [];
    window.groceries = groceries;
    
    try {
      await saveGroceries(groceries);
    } catch (saveError) {
      console.error("Failed to save empty list:", saveError);
    }
  } finally {
    if (resetBtn && typeof setLoading !== 'undefined') {
      setLoading(resetBtn, false);
    }
  }
}

async function deleteGrocery(index) {
  const grocery = groceries[index];
  if (!grocery) {
    console.error("Grocery not found at index:", index);
    return;
  }

  try {
    const res = await fetch(`/api/groceries/${encodeURIComponent(grocery.name)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Failed to delete grocery");
    }

    const result = await res.json();
    
    // Handle both array response and success response
    if (Array.isArray(result)) {
      groceries = result;
    } else {
      groceries.splice(index, 1);
    }
    
    window.groceries = groceries;

    if (typeof showToast !== 'undefined') {
      showToast(`Deleted "${grocery.name}"`, "success");
    }
  } catch (error) {
    console.error("Error deleting grocery:", error);
    if (typeof showToast !== 'undefined') {
      showToast("Failed to delete grocery", "error");
    }
    
    // Fallback: remove locally
    groceries.splice(index, 1);
    window.groceries = groceries;
    
    try {
      await saveGroceries(groceries);
    } catch (saveError) {
      console.error("Failed to save after delete:", saveError);
    }
  }
}

// Export for use in other files
window.resetGroceries = resetGroceries;
window.addGrocery = addGrocery;
window.deleteGrocery = deleteGrocery;
window.togglePurchase = togglePurchase;
window.toggleHistory = toggleHistory;