document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  document.getElementById('tabTitle').textContent = tab.title;

  // Load existing categories and sessions
  chrome.storage.local.get({ categories: [], sessions: {} }, (data) => {
    const categories = data.categories || [];
    const sessions = data.sessions || {};

    // Populate category dropdown
    const categoryDropdown = document.getElementById('categoryDropdown');
    categoryDropdown.innerHTML = '<option value="">Select Category</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categoryDropdown.appendChild(option);
    });

    // Populate session dropdown
    const sessionDropdown = document.getElementById('sessionDropdown');
    sessionDropdown.innerHTML = '<option value="">Select Session</option>';
    Object.keys(sessions).forEach(sessionName => {
      const option = document.createElement('option');
      option.value = sessionName;
      option.textContent = sessionName;
      sessionDropdown.appendChild(option);
    });
  });

  // Handle category selection/creation
  const categoryDropdown = document.getElementById('categoryDropdown');
  const categoryInput = document.getElementById('category');
  
  categoryDropdown.addEventListener('change', () => {
    if (categoryDropdown.value) {
      categoryInput.value = '';
      categoryInput.placeholder = 'Category selected from dropdown';
    } else {
      categoryInput.placeholder = 'Or create new category...';
    }
  });

  categoryInput.addEventListener('input', () => {
    if (categoryInput.value) {
      categoryDropdown.value = '';
    }
  });

  // Handle session selection/creation
  const sessionDropdown = document.getElementById('sessionDropdown');
  const sessionInput = document.getElementById('session');
  
  sessionDropdown.addEventListener('change', () => {
    if (sessionDropdown.value) {
      sessionInput.value = '';
      sessionInput.placeholder = 'Session selected from dropdown';
    } else {
      sessionInput.placeholder = 'Or create new session...';
    }
  });

  sessionInput.addEventListener('input', () => {
    if (sessionInput.value) {
      sessionDropdown.value = '';
    }
  });

  // Save button functionality
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const note = document.getElementById('note').value.trim();
    const category = categoryInput.value.trim() || categoryDropdown.value || 'Uncategorized';
    const session = sessionInput.value.trim() || sessionDropdown.value;

    // Normalize URL
    let tabUrl = tab.url;
    if (!/^https?:\/\//i.test(tabUrl)) {
      tabUrl = "https://" + tabUrl;
    }

    const newLink = {
      id: Date.now(),
      url: tabUrl,
      title: tab.title,
      note,
      category,
      tags: [],
      dateSaved: new Date().toISOString(),
      pinned: false,
      position: null
    };

    // Add to categories if it's a new category
    if (categoryInput.value.trim() && !categoryDropdown.value) {
      chrome.storage.local.get({ categories: [] }, (data) => {
        const categories = data.categories || [];
        if (!categories.includes(category)) {
          categories.push(category);
          chrome.storage.local.set({ categories });
        }
      });
    }

    // Add to sessions if specified
    if (session) {
      chrome.storage.local.get({ sessions: {} }, (data) => {
        const sessions = data.sessions || {};
        if (!sessions[session]) {
          sessions[session] = [];
        }
        sessions[session].push(newLink);
        chrome.storage.local.set({ sessions });
      });
    }

    // Save the link
    chrome.storage.local.get({ links: [] }, (data) => {
      const updatedLinks = [...data.links, newLink];
      chrome.storage.local.set({ links: updatedLinks }, () => {
        // Show success feedback
        const saveBtn = document.getElementById('saveBtn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved!';
        saveBtn.classList.add('success');
        
        setTimeout(() => {
          saveBtn.textContent = originalText;
          saveBtn.classList.remove('success');
        }, 1500);
      });
    });
  });

  // View Dashboard button
  document.getElementById("viewBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  });

  // Sidebar toggle functionality
  const sidebarToggle = document.getElementById('sidebarToggle');
  
  // Load current sidebar state and ensure it's enabled by default
  chrome.storage.local.get({ sidebarEnabled: true }, (data) => {
    // If sidebarEnabled is explicitly false, reset it to true (new default)
    if (data.sidebarEnabled === false) {
      console.log('Resetting sidebar to enabled (new default)');
      chrome.storage.local.set({ sidebarEnabled: true }, () => {
        sidebarToggle.checked = true;
        updateDescriptionAndVisual(true);
      });
    } else {
      sidebarToggle.checked = data.sidebarEnabled;
      updateDescriptionAndVisual(data.sidebarEnabled);
    }
  });
  
  function updateDescriptionAndVisual(isEnabled) {
    // Update the description text
    const description = document.querySelector('.toggle-description');
    if (description) {
      description.textContent = isEnabled 
        ? 'Sidebar is enabled - toggle button visible on web pages' 
        : 'Sidebar is disabled - toggle button hidden on web pages';
    }
    
    // Add visual feedback
    const toggleSection = document.querySelector('.sidebar-toggle-section');
    if (toggleSection) {
      toggleSection.style.backgroundColor = isEnabled ? '#f0f9ff' : '#fef2f2';
      toggleSection.style.borderColor = isEnabled ? '#3b82f6' : '#ef4444';
    }
  }
  
  // Handle sidebar toggle
  sidebarToggle.addEventListener('change', () => {
    const isEnabled = sidebarToggle.checked;
    console.log('Popup: Sidebar toggle changed to:', isEnabled);
    
    // Update the description text
    const description = document.querySelector('.toggle-description');
    if (description) {
      description.textContent = isEnabled 
        ? 'Sidebar is enabled - toggle button visible on web pages' 
        : 'Sidebar is disabled - toggle button hidden on web pages';
    }
    
    // Add visual feedback
    const toggleSection = document.querySelector('.sidebar-toggle-section');
    if (toggleSection) {
      toggleSection.style.backgroundColor = isEnabled ? '#f0f9ff' : '#fef2f2';
      toggleSection.style.borderColor = isEnabled ? '#3b82f6' : '#ef4444';
    }
    
    // Save preference
    chrome.storage.local.set({ sidebarEnabled: isEnabled }, () => {
      console.log('Popup: Saved sidebarEnabled to storage:', isEnabled);
    });
    
    // Send message to all tabs to show/hide sidebar
    chrome.tabs.query({}, (tabs) => {
      let messageCount = 0;
      let successCount = 0;
      
      console.log('Popup: Found', tabs.length, 'total tabs');
      
      tabs.forEach(tab => {
        if (tab.url && tab.url.startsWith('http')) {
          messageCount++;
          console.log('Popup: Sending message to tab', tab.id, 'URL:', tab.url);
          chrome.tabs.sendMessage(tab.id, {
            action: 'toggleSidebar',
            enabled: isEnabled
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.log('Popup: Tab', tab.id, 'does not have content script loaded:', chrome.runtime.lastError.message);
            } else if (response && response.success) {
              successCount++;
              console.log('Popup: Sidebar toggled successfully on tab', tab.id, 'Response:', response);
            } else {
              console.log('Popup: Tab', tab.id, 'sent response but no success:', response);
            }
          });
        } else {
          console.log('Popup: Skipping tab', tab.id, 'URL:', tab.url);
        }
      });
      
      console.log(`Popup: Sent toggle message to ${messageCount} tabs, ${successCount} successful`);
    });
  });
});
