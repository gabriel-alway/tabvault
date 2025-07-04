// Background script for TabVault
console.log('TabVault background script loaded');

// One-time migration: ensure sidebar is enabled by default for existing users
chrome.storage.local.get({ sidebarEnabled: true, sidebarDefaultMigrated: false }, (data) => {
  if (!data.sidebarDefaultMigrated && data.sidebarEnabled === false) {
    console.log('Migrating sidebar to enabled by default');
    chrome.storage.local.set({ 
      sidebarEnabled: true, 
      sidebarDefaultMigrated: true 
    }, () => {
      console.log('Sidebar migration completed');
    });
  } else if (!data.sidebarDefaultMigrated) {
    // Mark as migrated even if no change needed
    chrome.storage.local.set({ sidebarDefaultMigrated: true });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);
  if (request.action === 'createTab') {
    console.log('Creating tab with URL:', request.url);
    chrome.tabs.create({ url: request.url }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('Error creating tab:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        console.log('Tab created successfully:', tab);
        sendResponse({ success: true, tab: tab });
      }
    });
    return true; // Keep the message channel open for async response
  } else if (request.action === 'openDashboard') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    sendResponse({ success: true });
  }
});

// Inject content script on page load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('Tab updated:', tabId, changeInfo.status, tab.url);
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    console.log('Injecting content script into tab:', tabId);
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content-script.js']
    }).then(() => {
      console.log('Content script injected successfully into tab:', tabId);
    }).catch((error) => {
      console.log('Failed to inject content script into tab:', tabId, error);
    });
  }
}); 