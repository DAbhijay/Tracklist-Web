// export.js - Data Export/Import Feature

function exportData() {
  const data = {
    groceries: window.groceries || [],
    tasks: window.tasks || [],
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tracklist-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('✅ Data exported:', data.groceries.length, 'groceries,', data.tasks.length, 'tasks');
  
  if (typeof showToast !== 'undefined') {
    showToast('Data exported successfully!', 'success');
  }
}

async function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate data structure
      if (!data.groceries || !data.tasks) {
        throw new Error('Invalid backup file format');
      }
      
      if (!Array.isArray(data.groceries) || !Array.isArray(data.tasks)) {
        throw new Error('Invalid data format - groceries and tasks must be arrays');
      }
      
      // Confirm before importing
      const confirmMsg = `This will replace all current data:\n\n` +
                        `Current: ${window.groceries?.length || 0} groceries, ${window.tasks?.length || 0} tasks\n` +
                        `Import: ${data.groceries.length} groceries, ${data.tasks.length} tasks\n\n` +
                        `Continue?`;
      
      if (!confirm(confirmMsg)) {
        return;
      }
      
      console.log('📥 Starting import...');
      
      // Import groceries
      if (typeof saveGroceries === 'function') {
        await saveGroceries(data.groceries);
        window.groceries = data.groceries;
        console.log('✅ Imported', data.groceries.length, 'groceries');
      }
      
      // Import tasks
      if (typeof saveTasks === 'function') {
        await saveTasks(data.tasks);
        window.tasks = data.tasks;
        console.log('✅ Imported', data.tasks.length, 'tasks');
      }
      
      // Re-render current page
      if (typeof renderGroceries === 'function') {
        renderGroceries();
      }
      if (typeof renderTasks === 'function') {
        renderTasks();
      }
      
      if (typeof showToast !== 'undefined') {
        showToast(`Imported ${data.groceries.length} groceries and ${data.tasks.length} tasks!`, 'success');
      } else {
        alert('Data imported successfully!');
      }
      
      console.log('✅ Import complete');
    } catch (error) {
      console.error('❌ Import error:', error);
      if (typeof showToast !== 'undefined') {
        showToast('Failed to import data: ' + error.message, 'error');
      } else {
        alert('Failed to import data: ' + error.message);
      }
    }
  });
  
  input.click();
}

// Add export/import buttons to the navigation bar
document.addEventListener('DOMContentLoaded', () => {
  const navBar = document.querySelector('.nav-bar');
  if (navBar) {
    // Check if buttons already exist
    if (navBar.querySelector('.export-btn')) {
      console.log('Export/Import buttons already exist');
      return;
    }
    
    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'nav-btn export-btn';
    exportBtn.innerHTML = '<span>💾</span> Export';
    exportBtn.title = 'Export all data to backup file';
    exportBtn.addEventListener('click', (e) => {
      e.preventDefault();
      exportData();
    });
    
    const importBtn = document.createElement('button');
    importBtn.type = 'button';
    importBtn.className = 'nav-btn import-btn';
    importBtn.innerHTML = '<span>📥</span> Import';
    importBtn.title = 'Import data from backup file';
    importBtn.addEventListener('click', (e) => {
      e.preventDefault();
      importData();
    });
    
    navBar.appendChild(exportBtn);
    navBar.appendChild(importBtn);
    
    console.log('✅ Export/Import buttons added to navigation');
  }
});

// Make functions globally available
window.exportData = exportData;
window.importData = importData;

console.log('✅ Export/Import module loaded');