// TabVault Sidebar Widget for New Tab Page
(function() {
  // Sidebar HTML with SVG chevron
  const sidebarHTML = `
    <div id="tabvault-sidebar" class="tabvault-sidebar">
      <div class="tabvault-sidebar-toggle" id="tabvault-toggle">
        <span class="tabvault-toggle-icon" id="tabvault-toggle-icon">
          <svg id="tabvault-chevron" width="18" height="36" viewBox="0 0 18 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:auto;">
            <polyline points="6,8 12,18 6,28" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </span>
      </div>
      <div class="tabvault-sidebar-content">
        <div class="tabvault-sidebar-header">
          <h3>Quick Sessions</h3>
          <button class="tabvault-close-btn" id="tabvault-close">×</button>
        </div>
        <div class="tabvault-sessions-list" id="tabvault-sessions">
          <div class="tabvault-loading">Loading sessions...</div>
        </div>
        <div class="tabvault-sidebar-footer">
          <button class="tabvault-manage-btn" id="tabvault-manage">Manage Sessions</button>
        </div>
      </div>
    </div>
  `;

  // Sleek, tall, slender toggle CSS with darker blue
  const sidebarCSS = `
    .tabvault-sidebar-toggle {
      position: fixed !important;
      top: 50% !important;
      left: 0 !important;
      transform: translateY(-50%) !important;
      width: 18px !important;
      height: 72px !important;
      background: #1e3a8a !important;
      border-radius: 0 20px 20px 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      z-index: 999998 !important;
      transition: background 0.2s, width 0.2s, height 0.2s !important;
      box-shadow: 1px 0 6px rgba(0, 0, 0, 0.10) !important;
      padding: 0 !important;
      border: none !important;
    }
    .tabvault-sidebar-toggle:hover {
      background: #172554 !important;
      width: 22px !important;
      height: 80px !important;
    }
    .tabvault-toggle-icon {
      width: 18px !important;
      height: 36px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
      margin: 0 !important;
      user-select: none !important;
    }
    #tabvault-chevron {
      width: 18px;
      height: 36px;
      display: block;
      transition: transform 0.25s cubic-bezier(.4,0,.2,1);
    }
    .tabvault-sidebar.open #tabvault-chevron {
      transform: rotate(180deg);
    }
  `;

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = sidebarCSS;
  document.head.appendChild(style);

  // Inject sidebar HTML
  document.body.insertAdjacentHTML('beforeend', sidebarHTML);
  // Get sidebar elements
  const sidebar = document.getElementById('tabvault-sidebar');
  const toggle = document.getElementById('tabvault-toggle');
  const toggleIcon = document.getElementById('tabvault-toggle-icon');
  const closeBtn = document.getElementById('tabvault-close');
  const sessionsList = document.getElementById('tabvault-sessions');
  const manageBtn = document.getElementById('tabvault-manage');
  // Check if sidebar should be enabled
  let sidebarEnabled = true; // Start with true as default
  chrome.storage.local.get({ sidebarEnabled: true }, (data) => {
    // If sidebarEnabled is explicitly false, reset it to true (new default)
    if (data.sidebarEnabled === false) {
      console.log('NewTab: Resetting sidebar to enabled (new default)');
      chrome.storage.local.set({ sidebarEnabled: true }, () => {
        sidebarEnabled = true;
        updateSidebarVisibility();
      });
    } else {
      sidebarEnabled = data.sidebarEnabled;
      updateSidebarVisibility();
    }
  });
  
  // Fallback: if storage callback doesn't execute, check again after a delay
  setTimeout(() => {
    chrome.storage.local.get({ sidebarEnabled: true }, (data) => {
      const newValue = data.sidebarEnabled;
      if (sidebarEnabled !== newValue) {
        sidebarEnabled = newValue;
        updateSidebarVisibility();
      }
    });
  }, 1000);
  
  function updateSidebarVisibility() {
    if (sidebarEnabled) {
      toggle.style.display = 'flex';
      toggle.style.visibility = 'visible';
      toggle.style.opacity = '1';
      toggle.classList.remove('tabvault-hidden');
    } else {
      toggle.style.display = 'none';
      toggle.style.visibility = 'hidden';
      toggle.style.opacity = '0';
      toggle.classList.add('tabvault-hidden');
      sidebar.classList.remove('open');
    }
  }
  // Update arrow direction (just rotate SVG)
  function updateArrow() {
    // No need to change innerHTML, just let CSS handle rotation
    // This function is kept for compatibility
  }
  // Load starred sessions
  function loadStarredSessions() {
    chrome.storage.local.get(['starredSessions'], (result) => {
      const starredSessions = result.starredSessions || [];
      if (starredSessions.length === 0) {
        sessionsList.innerHTML = `
          <div class="tabvault-empty">
            <div class="tabvault-empty-icon">⭐</div>
            <p>No starred sessions yet</p>
            <p style="font-size: 12px; margin-top: 8px;">Star sessions in the dashboard to see them here</p>
          </div>
        `;
        return;
      }
      sessionsList.innerHTML = starredSessions.map(session => `
        <div class="tabvault-session-item" data-session-name="${session.name}">
          <div class="tabvault-session-name">${session.name}</div>
          <div class="tabvault-session-count">${session.links.length} tabs</div>
        </div>
      `).join('');
      // Add click handlers for session items
      sessionsList.querySelectorAll('.tabvault-session-item').forEach(item => {
        item.addEventListener('click', () => {
          const sessionName = item.dataset.sessionName;
          launchSession(sessionName);
        });
      });
    });
  }
  // Launch session
  function launchSession(sessionName) {
    chrome.storage.local.get(['starredSessions'], (result) => {
      const starredSessions = result.starredSessions || [];
      const session = starredSessions.find(s => s.name === sessionName);
      if (session && session.links) {
        sidebar.classList.remove('open');
        updateArrow();
        session.links.forEach((link, index) => {
          chrome.runtime.sendMessage({
            action: 'createTab',
            url: link.url
          });
        });
      }
    });
  }
  // Toggle sidebar
  function toggleSidebar() {
    sidebar.classList.toggle('open');
    updateArrow();
  }
  // Close sidebar
  function closeSidebar() {
    sidebar.classList.remove('open');
    updateArrow();
  }
  // Open dashboard
  function openDashboard() {
    chrome.runtime.sendMessage({ action: 'openDashboard' });
  }
  // Event listeners
  toggle.addEventListener('click', toggleSidebar);
  closeBtn.addEventListener('click', closeSidebar);
  manageBtn.addEventListener('click', openDashboard);
  document.addEventListener('click', (e) => {
    if (sidebar.classList.contains('open') && 
        !sidebar.contains(e.target) && 
        !toggle.contains(e.target)) {
      closeSidebar();
    }
  });
  // Load sessions on startup
  loadStarredSessions();
  // Listen for storage changes to update the list
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.starredSessions) {
      loadStarredSessions();
    }
    if (changes.sidebarEnabled) {
      sidebarEnabled = changes.sidebarEnabled.newValue;
      updateSidebarVisibility();
    }
  });
  // Set initial arrow
  updateArrow();
  
  // Add global function for debugging
  window.tabvaultDebug = {
    getSidebarState: () => {
      console.log('NewTab - Current sidebarEnabled:', sidebarEnabled);
      console.log('NewTab - Toggle element display:', toggle ? toggle.style.display : 'Toggle not found');
      return { sidebarEnabled, toggleDisplay: toggle ? toggle.style.display : 'not found' };
    },
    testStorage: () => {
      console.log('NewTab - Testing storage...');
      chrome.storage.local.get({ sidebarEnabled: true }, (data) => {
        console.log('NewTab - Storage value:', data.sidebarEnabled);
        console.log('NewTab - Current variable:', sidebarEnabled);
        if (data.sidebarEnabled !== sidebarEnabled) {
          console.log('NewTab - MISMATCH! Storage says:', data.sidebarEnabled, 'but variable is:', sidebarEnabled);
          sidebarEnabled = data.sidebarEnabled;
          updateSidebarVisibility();
        } else {
          console.log('NewTab - Values match:', sidebarEnabled);
        }
      });
    }
  };
  
  console.log('TabVault newtab sidebar loaded successfully!');
  console.log('NewTab debug functions available: window.tabvaultDebug.getSidebarState() and window.tabvaultDebug.testStorage()');
})(); 