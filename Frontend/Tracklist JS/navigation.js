// Navigation system for Tracklist app

let currentPage = 'home';

function showPage(pageId, forceRender = false) {
  // LOG: See what's calling showPage
  console.log('🔵 showPage called:', pageId, 'from:', currentPage, 'forceRender:', forceRender);
  
  // Don't do anything if already on this page (unless forcing render)
  if (currentPage === pageId && !forceRender) {
    console.log('⚠️ Already on this page, skipping');
    // But still render if data is ready and we're forcing
    if (forceRender) {
      renderPageContent(pageId);
    }
    return;
  }
  
  // Update URL hash to preserve page state
  if (pageId !== 'home') {
    window.location.hash = pageId;
  } else {
    // Remove hash for home page
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname);
    }
  }
  
  // Save to localStorage as backup
  try {
    localStorage.setItem('lastActivePage', pageId);
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }
  
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Show selected page
  const page = document.getElementById(`${pageId}-page`);
  if (page) {
    page.classList.add('active');
    currentPage = pageId;
    console.log('✅ Switched to page:', pageId);
  }
  
  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageId);
  });
  
  // Re-render content for the active page
  renderPageContent(pageId);
}

function renderPageContent(pageId) {
  // Use a small delay to ensure DOM is ready, but also check if data is ready
  setTimeout(() => {
    if (pageId === 'groceries' && typeof renderGroceries === 'function') {
      // Check if groceries data is ready, if not wait a bit more
      if (typeof groceriesReady !== 'undefined' && groceriesReady) {
        renderGroceries();
      } else {
        // Wait for data to be ready
        const checkGroceries = setInterval(() => {
          if (typeof groceriesReady !== 'undefined' && groceriesReady) {
            renderGroceries();
            clearInterval(checkGroceries);
          }
        }, 50);
        // Timeout after 3 seconds
        setTimeout(() => {
          clearInterval(checkGroceries);
          // Force render even if not ready (will show empty state)
          if (typeof renderGroceries === 'function') {
            renderGroceries();
          }
        }, 3000);
      }
    }
    if (pageId === 'tasks' && typeof renderTasks === 'function') {
      // Check if tasks data is ready, if not wait a bit more
      if (typeof tasksReady !== 'undefined' && tasksReady) {
        renderTasks();
      } else {
        // Wait for data to be ready
        const checkTasks = setInterval(() => {
          if (typeof tasksReady !== 'undefined' && tasksReady) {
            renderTasks();
            clearInterval(checkTasks);
          }
        }, 50);
        // Timeout after 3 seconds
        setTimeout(() => {
          clearInterval(checkTasks);
          // Force render even if not ready (will show empty state)
          if (typeof renderTasks === 'function') {
            renderTasks();
          }
        }, 3000);
      }
    }
  }, 100);
}

// Initialize navigation - only once
let navigationInitialized = false;

function initNavigation() {
  if (navigationInitialized) {
    console.log('⚠️ Navigation already initialized');
    return;
  }
  navigationInitialized = true;
  console.log('🚀 Initializing navigation');
  
  // Set up nav button listeners
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      console.log('🔵 Nav button clicked:', btn.dataset.page);
      e.preventDefault();
      e.stopPropagation();
      showPage(btn.dataset.page);
    });
  });
  
  // Set up feature card listeners - ONLY on the home page cards
  document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('click', (e) => {
      console.log('🟡 Feature card clicked, currentPage:', currentPage, 'target:', e.target.tagName);
      
      // Only handle clicks if we're on the home page
      if (currentPage !== 'home') {
        console.log('❌ Not on home page, ignoring feature card click');
        return;
      }
      
      // Don't navigate if clicking interactive elements
      if (e.target.closest('button') || e.target.closest('input')) {
        console.log('❌ Clicked on button/input, ignoring');
        return;
      }
      
      console.log('✅ Feature card navigation triggered');
      e.preventDefault();
      e.stopPropagation();
      showPage(card.dataset.page);
    });
  });
  
  // Set up feature button listeners separately
  document.querySelectorAll('.feature-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      console.log('🟢 Feature button clicked, currentPage:', currentPage);
      
      // Only handle clicks if we're on the home page
      if (currentPage !== 'home') {
        console.log('❌ Not on home page, ignoring feature button click');
        return;
      }
      
      e.preventDefault();
      e.stopPropagation(); // Prevent card click
      const card = btn.closest('.feature-card');
      if (card) {
        console.log('✅ Feature button navigation triggered');
        showPage(card.dataset.page);
      }
    });
  });
  
  // Check URL hash first to preserve page state on refresh
  const hash = window.location.hash.replace('#', '');
  let initialPage = null;
  
  // Priority 1: URL hash
  if (hash && ['groceries', 'tasks', 'home'].includes(hash)) {
    initialPage = hash;
    console.log('📍 Initial page from URL hash:', initialPage);
  } 
  // Priority 2: localStorage (backup if no hash)
  else {
    try {
      const savedPage = localStorage.getItem('lastActivePage');
      if (savedPage && ['groceries', 'tasks', 'home'].includes(savedPage)) {
        initialPage = savedPage;
        console.log('📍 Initial page from localStorage:', initialPage);
        // Update URL hash to match for future refreshes
        if (initialPage !== 'home') {
          window.location.hash = initialPage;
        }
      }
    } catch (e) {
      console.warn('Could not read localStorage:', e);
    }
  }
  
  // Priority 3: HTML active class (default fallback)
  if (!initialPage) {
    const active = document.querySelector('.page.active');
    if (active) {
      const id = active.id.replace('-page', '');
      if (['groceries', 'tasks', 'home'].includes(id)) {
        initialPage = id;
        console.log('📍 Initial page from HTML:', initialPage);
      }
    }
  }
  
  // Final fallback
  if (!initialPage) {
    initialPage = 'home';
    console.log('📍 Initial page: defaulting to home');
  }
  
  // Always call showPage to ensure proper initialization
  // This will update the DOM, nav buttons, and trigger rendering
  showPage(initialPage, true);
  
  // Listen for hash changes (back/forward buttons)
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['groceries', 'tasks', 'home'].includes(hash)) {
      showPage(hash);
    } else if (!hash) {
      showPage('home');
    }
  });
}

// Initialize navigation when DOM is ready
// Use immediate execution if DOM is already ready, otherwise wait
(function initializeNavigation() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
  } else {
    // DOM is ready, but wait a tiny bit to ensure all scripts are loaded
    setTimeout(initNavigation, 0);
  }
})();

// Export for use in other files
window.showPage = showPage;
window.getCurrentPage = () => currentPage;
window.renderPageContent = renderPageContent;

// Listen for when data becomes ready and render if needed
window.addEventListener('groceriesReady', (event) => {
  console.log('groceriesReady event fired, currentPage:', currentPage, 'hash:', window.location.hash);
  
  // Check multiple ways to determine if we should be on groceries page
  const shouldBeOnGroceries = window.location.hash === '#groceries' ||
                              (typeof localStorage !== 'undefined' && localStorage.getItem('lastActivePage') === 'groceries');
  
  // If we should be on groceries but aren't, switch to it
  if (shouldBeOnGroceries && currentPage !== 'groceries') {
    console.log('Should be on groceries page, switching...');
    showPage('groceries', true);
    return;
  }
  
  const isOnGroceriesPage = currentPage === 'groceries' || 
                            window.location.hash === '#groceries' ||
                            document.querySelector('#groceries-page.active');
  
  if (isOnGroceriesPage) {
    console.log('On groceries page, rendering...');
    setTimeout(() => {
      if (typeof renderGroceries === 'function') {
        renderGroceries();
      }
    }, 150);
  }
});

window.addEventListener('tasksReady', (event) => {
  console.log('tasksReady event fired, currentPage:', currentPage, 'hash:', window.location.hash);
  
  // Check multiple ways to determine if we should be on tasks page
  const shouldBeOnTasks = window.location.hash === '#tasks' ||
                          (typeof localStorage !== 'undefined' && localStorage.getItem('lastActivePage') === 'tasks');
  
  // If we should be on tasks but aren't, switch to it
  if (shouldBeOnTasks && currentPage !== 'tasks') {
    console.log('Should be on tasks page, switching...');
    showPage('tasks', true);
    return;
  }
  
  const isOnTasksPage = currentPage === 'tasks' || 
                        window.location.hash === '#tasks' ||
                        document.querySelector('#tasks-page.active');
  
  if (isOnTasksPage) {
    console.log('On tasks page, rendering...');
    setTimeout(() => {
      if (typeof renderTasks === 'function') {
        renderTasks();
      }
    }, 150);
  }
});