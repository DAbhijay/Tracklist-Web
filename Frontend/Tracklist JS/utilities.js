// Helper Functions for Date Formatting and Utilities

/**
 * Check if item was bought today
 */
function boughtToday(purchases) {
  if (!purchases || !purchases.length) return false;
  
  const today = new Date().toISOString().split('T')[0];
  
  return purchases.some(date => {
    const purchaseDate = new Date(date).toISOString().split('T')[0];
    return purchaseDate === today;
  });
}

/**
 * Format date in relative terms (e.g., "Today", "Yesterday", "2 days ago")
 */
function formatDateRelative(isoString) {
  if (!isoString) return "Unknown";
  
  const date = new Date(isoString);
  const today = new Date();
  
  // Reset time to midnight for accurate day comparison
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  
  const diffTime = today - compareDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
}

/**
 * Format date in full format (e.g., "Jan 15, 2024")
 */
function formatDateFull(isoString) {
  if (!isoString) return "Unknown";
  
  const date = new Date(isoString);
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format date for display (e.g., "Monday, Jan 15")
 */
function formatDateDisplay(isoString) {
  if (!isoString) return "No date";
  
  const date = new Date(isoString);
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Set loading state on a button
 */
function setLoading(button, isLoading) {
  if (!button) return;
  
  if (isLoading) {
    button.disabled = true;
    button.classList.add('loading');
    const originalText = button.textContent;
    button.dataset.originalText = originalText;
    button.innerHTML = '<span class="btn-spinner">⏳</span>';
  } else {
    button.disabled = false;
    button.classList.remove('loading');
    button.innerHTML = button.dataset.originalText || button.textContent;
  }
}

/**
 * Show/hide loading overlay
 */
function setLoadingOverlay(show) {
  const overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  
  if (show) {
    overlay.classList.remove('hidden');
  } else {
    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 300);
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) {
    console.warn('Toast container not found');
    return;
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  container.appendChild(toast);
  
  // Auto-remove after duration
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Get current active page
 */
function getCurrentPage() {
  const activePage = document.querySelector('.page.active');
  return activePage ? activePage.id.replace('-page', '') : 'home';
}

/**
 * Show a specific page
 */
function showPage(pageName) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Show selected page
  const page = document.getElementById(`${pageName}-page`);
  if (page) {
    page.classList.add('active');
  }
  
  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.page === pageName) {
      btn.classList.add('active');
    }
  });
  
  // Render appropriate content
  if (pageName === 'groceries' && typeof renderGroceries === 'function') {
    renderGroceries();
  } else if (pageName === 'tasks' && typeof renderTasks === 'function') {
    renderTasks();
  }
}

// Add slideOut animation for toast
if (!document.querySelector('#toast-animation-style')) {
  const style = document.createElement('style');
  style.id = 'toast-animation-style';
  style.textContent = `
    @keyframes slideOut {
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}