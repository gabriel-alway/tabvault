// Content script for TabVault sidebar widget
(function() {
  'use strict';

  console.log('TabVault content script starting...');

  // Create sidebar HTML with SVG chevron
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
    .tabvault-sidebar {
      position: fixed !important;
      top: 0 !important;
      left: -320px !important;
      width: 320px !important;
      height: 100vh !important;
      background: #ffffff !important;
      border-right: 2px solid #e2e8f0 !important;
      box-shadow: 4px 0 12px rgba(0, 0, 0, 0.1) !important;
      z-index: 999999 !important;
      transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }

    .tabvault-sidebar.open {
      left: 0 !important;
    }

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

    .tabvault-sidebar-content {
      height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
    }

    .tabvault-sidebar-header {
      padding: 20px !important;
      border-bottom: 1px solid #e2e8f0 !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      background: #f8fafc !important;
    }

    .tabvault-sidebar-header h3 {
      margin: 0 !important;
      color: #1e293b !important;
      font-size: 18px !important;
      font-weight: 600 !important;
    }

    .tabvault-close-btn {
      background: none !important;
      border: none !important;
      font-size: 24px !important;
      color: #64748b !important;
      cursor: pointer !important;
      padding: 0 !important;
      width: 30px !important;
      height: 30px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 4px !important;
      transition: all 0.2s ease !important;
    }

    .tabvault-close-btn:hover {
      background: #e2e8f0 !important;
      color: #1e293b !important;
    }

    .tabvault-sessions-list {
      flex: 1 !important;
      padding: 16px !important;
      overflow-y: auto !important;
    }

    .tabvault-session-item {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 8px !important;
      padding: 12px !important;
      margin-bottom: 12px !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
    }

    .tabvault-session-item:hover {
      border-color: #3b82f6 !important;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15) !important;
      transform: translateY(-1px) !important;
    }

    .tabvault-session-name {
      font-weight: 600 !important;
      color: #1e293b !important;
      margin-bottom: 4px !important;
      font-size: 14px !important;
    }

    .tabvault-session-count {
      font-size: 12px !important;
      color: #64748b !important;
    }

    .tabvault-loading {
      text-align: center !important;
      color: #64748b !important;
      font-style: italic !important;
      padding: 20px !important;
    }

    .tabvault-empty {
      text-align: center !important;
      color: #64748b !important;
      padding: 40px 20px !important;
    }

    .tabvault-empty-icon {
      font-size: 48px !important;
      margin-bottom: 16px !important;
      opacity: 0.5 !important;
    }

    .tabvault-sidebar-footer {
      padding: 16px 20px !important;
      border-top: 1px solid #e2e8f0 !important;
      background: #f8fafc !important;
    }

    .tabvault-manage-btn {
      width: 100% !important;
      background: #3b82f6 !important;
      color: white !important;
      border: none !important;
      padding: 10px 16px !important;
      border-radius: 6px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
    }

    .tabvault-manage-btn:hover {
      background: #2563eb !important;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .tabvault-sidebar {
        background: #1e293b !important;
        border-right-color: #334155 !important;
      }

      .tabvault-sidebar-header {
        background: #0f172a !important;
        border-bottom-color: #334155 !important;
      }

      .tabvault-sidebar-header h3 {
        color: #f1f5f9 !important;
      }

      .tabvault-session-item {
        background: #334155 !important;
        border-color: #475569 !important;
      }

      .tabvault-session-item:hover {
        border-color: #3b82f6 !important;
      }

      .tabvault-session-name {
        color: #f1f5f9 !important;
      }

      .tabvault-session-count {
        color: #94a3b8 !important;
      }

          .tabvault-sidebar-footer {
      background: #0f172a !important;
      border-top-color: #334155 !important;
    }
    
    .tabvault-hidden {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  }
  `;

  console.log('Injecting CSS...');
  // Inject CSS
  const style = document.createElement('style');
  style.textContent = sidebarCSS;
  document.head.appendChild(style);

  console.log('Injecting HTML...');
  // Inject sidebar HTML
  document.body.insertAdjacentHTML('beforeend', sidebarHTML);

  console.log('Getting sidebar elements...');
  // Get sidebar elements
  const sidebar = document.getElementById('tabvault-sidebar');
  const toggle = document.getElementById('tabvault-toggle');
  const toggleIcon = document.getElementById('tabvault-toggle-icon');
  const chevron = document.getElementById('tabvault-chevron');
  const closeBtn = document.getElementById('tabvault-close');
  const sessionsList = document.getElementById('tabvault-sessions');
  const manageBtn = document.getElementById('tabvault-manage');

  console.log('Sidebar elements found:', { sidebar, toggle, closeBtn, sessionsList, manageBtn });

  // Check if sidebar should be enabled
  let sidebarEnabled = true; // Start with true as default
  console.log('Initial sidebarEnabled value:', sidebarEnabled);
  
  chrome.storage.local.get({ sidebarEnabled: true }, (data) => {
    // If sidebarEnabled is explicitly false, reset it to true (new default)
    if (data.sidebarEnabled === false) {
      console.log('Content script: Resetting sidebar to enabled (new default)');
      chrome.storage.local.set({ sidebarEnabled: true }, () => {
        sidebarEnabled = true;
        updateSidebarVisibility();
      });
    } else {
      sidebarEnabled = data.sidebarEnabled;
      console.log('Sidebar enabled from storage:', sidebarEnabled);
      updateSidebarVisibility();
    }
  });
  
  // Fallback: if storage callback doesn't execute, check again after a delay
  setTimeout(() => {
    console.log('Fallback check - current sidebarEnabled:', sidebarEnabled);
    chrome.storage.local.get({ sidebarEnabled: true }, (data) => {
      const newValue = data.sidebarEnabled;
      console.log('Fallback storage check - sidebarEnabled:', newValue);
      if (sidebarEnabled !== newValue) {
        sidebarEnabled = newValue;
        console.log('Updating sidebarEnabled to:', sidebarEnabled);
        updateSidebarVisibility();
      }
    });
  }, 1000);

  function updateSidebarVisibility() {
    console.log('Updating sidebar visibility, enabled:', sidebarEnabled);
    if (!toggle) {
      console.error('Toggle element not found in updateSidebarVisibility!');
      return;
    }
    
    if (sidebarEnabled) {
      toggle.style.display = 'flex';
      toggle.style.visibility = 'visible';
      toggle.style.opacity = '1';
      toggle.classList.remove('tabvault-hidden');
      console.log('Sidebar toggle should be visible');
    } else {
      toggle.style.display = 'none';
      toggle.style.visibility = 'hidden';
      toggle.style.opacity = '0';
      toggle.classList.add('tabvault-hidden');
      if (sidebar) {
        sidebar.classList.remove('open');
      }
      console.log('Sidebar toggle should be hidden');
    }
  }

  // Load starred sessions
  function loadStarredSessions() {
    console.log('Loading starred sessions...');
    chrome.storage.local.get(['starredSessions'], (result) => {
      const starredSessions = result.starredSessions || [];
      console.log('Starred sessions found:', starredSessions);
      
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
    console.log('Launching session:', sessionName);
    chrome.storage.local.get(['starredSessions'], (result) => {
      const starredSessions = result.starredSessions || [];
      const session = starredSessions.find(s => s.name === sessionName);
      
      if (session && session.links) {
        console.log('Found starred session with links:', session.links);
        // Close sidebar
        sidebar.classList.remove('open');
        
        // Launch all tabs in the session
        session.links.forEach((link, index) => {
          console.log('Creating tab for:', link.url);
          chrome.runtime.sendMessage({
            action: 'createTab',
            url: link.url
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('Error creating tab:', chrome.runtime.lastError);
            } else {
              console.log('Tab created successfully:', response);
            }
          });
        });
      } else {
        console.log('Starred session not found or has no links:', sessionName);
        console.log('Available starred sessions:', starredSessions);
      }
    });
  }

  // Update arrow direction (just rotate SVG)
  function updateArrow() {
    // No need to change innerHTML, just let CSS handle rotation
    // This function is kept for compatibility
  }

  // Toggle sidebar
  function toggleSidebar() {
    console.log('Toggling sidebar...');
    sidebar.classList.toggle('open');
    updateArrow();
  }

  // Close sidebar
  function closeSidebar() {
    console.log('Closing sidebar...');
    sidebar.classList.remove('open');
    updateArrow();
  }

  // Open dashboard
  function openDashboard() {
    console.log('Opening dashboard...');
    chrome.runtime.sendMessage({ action: 'openDashboard' });
  }

  // Event listeners
  if (toggle) {
    toggle.addEventListener('click', toggleSidebar);
    console.log('Toggle event listener added');
  } else {
    console.error('Toggle element not found!');
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSidebar);
    console.log('Close button event listener added');
  } else {
    console.error('Close button element not found!');
  }
  
  if (manageBtn) {
    manageBtn.addEventListener('click', openDashboard);
    console.log('Manage button event listener added');
  } else {
    console.error('Manage button element not found!');
  }

  // Close sidebar when clicking outside
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
    console.log('Storage changed:', changes);
    if (changes.starredSessions) {
      loadStarredSessions();
    }
    if (changes.sidebarEnabled) {
      const oldValue = sidebarEnabled;
      sidebarEnabled = changes.sidebarEnabled.newValue;
      console.log('Storage change: sidebar enabled changed from', oldValue, 'to:', sidebarEnabled);
      updateSidebarVisibility();
    }
  });

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);
    if (request.action === 'toggleSidebar') {
      const oldValue = sidebarEnabled;
      sidebarEnabled = request.enabled;
      console.log('Sidebar toggled from', oldValue, 'to:', sidebarEnabled);
      updateSidebarVisibility();
      sendResponse({ success: true, enabled: sidebarEnabled });
    }
  });

  // Set initial arrow
  updateArrow();

  // Add global function for debugging
  window.tabvaultDebug = {
    getSidebarState: () => {
      console.log('Current sidebarEnabled:', sidebarEnabled);
      console.log('Toggle element display:', toggle ? toggle.style.display : 'Toggle not found');
      console.log('Sidebar element:', sidebar);
      return { sidebarEnabled, toggleDisplay: toggle ? toggle.style.display : 'not found' };
    },
    forceUpdate: () => {
      console.log('Forcing sidebar visibility update...');
      updateSidebarVisibility();
    },
    testStorage: () => {
      console.log('Testing storage...');
      chrome.storage.local.get({ sidebarEnabled: true }, (data) => {
        console.log('Storage value:', data.sidebarEnabled);
        console.log('Current variable:', sidebarEnabled);
        if (data.sidebarEnabled !== sidebarEnabled) {
          console.log('MISMATCH! Storage says:', data.sidebarEnabled, 'but variable is:', sidebarEnabled);
          sidebarEnabled = data.sidebarEnabled;
          updateSidebarVisibility();
        } else {
          console.log('Values match:', sidebarEnabled);
        }
      });
    },
    forceDisable: () => {
      console.log('Force disabling sidebar...');
      sidebarEnabled = false;
      updateSidebarVisibility();
    },
    forceEnable: () => {
      console.log('Force enabling sidebar...');
      sidebarEnabled = true;
      updateSidebarVisibility();
    }
  };

  console.log('TabVault sidebar widget loaded successfully!');
  console.log('Debug functions available: window.tabvaultDebug.getSidebarState() and window.tabvaultDebug.forceUpdate()');
  
  // Force a test update after 2 seconds
  setTimeout(() => {
    console.log('=== FORCE TEST UPDATE ===');
    console.log('Current sidebarEnabled:', sidebarEnabled);
    console.log('Toggle element:', toggle);
    console.log('Toggle display style:', toggle ? toggle.style.display : 'no toggle');
    updateSidebarVisibility();
  }, 2000);
})(); 