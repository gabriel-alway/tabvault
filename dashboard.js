// dashboard.js - Rewritten & Cleaned Up

console.log("Dashboard loaded, trying to get links...");

let allLinks = [];
let isDragging = false;
let draggedElement = null;
let dragOffset = { x: 0, y: 0 };

function displayLinks(filteredLinks) {
  const container = document.getElementById("linksContainer");
  container.innerHTML = "";

  if (filteredLinks.length === 0) {
    container.textContent = "No results found.";
    return;
  }

  filteredLinks.forEach((link, index) => {
    const card = document.createElement("div");
    card.className = "link-card";
    card.dataset.linkId = link.id;

    // Checkbox for selection
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "session-select";
    checkbox.dataset.index = index;

    // Title
    const title = document.createElement("a");
    title.className = "link-title";
    title.href = link.url;
    title.target = "_blank";
    title.textContent = link.title;

    // Category
    const category = document.createElement("div");
    category.className = "category";
    category.textContent = "Category: " + link.category;

    // Note
    const note = document.createElement("div");
    note.className = "note";
    note.textContent = link.note || "(No note)";

    // Card actions
    const cardActions = document.createElement("div");
    cardActions.className = "card-actions";

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete-btn";
    deleteBtn.onclick = () => {
      if (confirm("Are you sure you want to delete this link?")) {
        allLinks.splice(index, 1);
        chrome.storage.local.set({ links: allLinks }, () => runFilter());
      }
    };

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.onclick = () => createEditForm(card, link, index);

    cardActions.appendChild(editBtn);
    cardActions.appendChild(deleteBtn);

    // Assemble card
    card.appendChild(checkbox);
    card.appendChild(title);
    card.appendChild(category);
    card.appendChild(note);
    card.appendChild(cardActions);

    container.appendChild(card);
  });
}

// Removed individual card drag/resize functions - now handled by panels

function createEditForm(card, link, index) {
  const existingForm = document.getElementById("edit-form-" + index);
  if (existingForm) return;

  const form = document.createElement("div");
  form.id = "edit-form-" + index;
  form.style.marginTop = "10px";
  form.style.padding = "10px";
  form.style.background = "#eef";
  form.style.borderRadius = "6px";

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.value = link.title;
  titleInput.style.width = "100%";
  titleInput.placeholder = "Title";

  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.value = link.url;
  urlInput.style.width = "100%";
  urlInput.placeholder = "URL";

  const noteInput = document.createElement("input");
  noteInput.type = "text";
  noteInput.value = link.note || "";
  noteInput.style.width = "100%";
  noteInput.placeholder = "Note (optional)";

  const categorySelect = buildCategoryDropdown(link.category);
  const sessionSelect = document.createElement("select");
  sessionSelect.style.marginTop = "8px";
  sessionSelect.style.width = "100%";

  chrome.storage.local.get({ sessions: {} }, (data) => {
    const allSessions = Object.keys(data.sessions);

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "Select Session (optional)";
    sessionSelect.appendChild(defaultOpt);

    allSessions.forEach(sess => {
      const opt = document.createElement("option");
      opt.value = sess;
      opt.textContent = sess;
      const isInSession = (data.sessions[sess] || []).some(l => l.id === link.id);
      if (isInSession) opt.selected = true;
      sessionSelect.appendChild(opt);
    });

    form.appendChild(sessionSelect);
  });

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.style.marginRight = "8px";
  saveBtn.onclick = () => {
    const updatedLink = {
      ...link,
      title: titleInput.value.trim(),
      url: urlInput.value.trim(),
      note: noteInput.value.trim(),
      category: categorySelect.value
    };

    allLinks[index] = updatedLink;

    chrome.storage.local.get({ sessions: {} }, (data) => {
      const sessions = data.sessions;

      for (const sess in sessions) {
        sessions[sess] = sessions[sess].filter(l => l.id !== link.id);
      }

      const newSession = sessionSelect.value;
      if (newSession) {
        if (!sessions[newSession]) sessions[newSession] = [];
        sessions[newSession].push(updatedLink);
      }

      chrome.storage.local.set({ links: allLinks, sessions }, () => {
        form.remove();
        renderSessionList();
        runFilter();
      });
    });
  };

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.onclick = () => form.remove();

  form.appendChild(titleInput);
  form.appendChild(urlInput);
  form.appendChild(noteInput);
  form.appendChild(categorySelect);
  form.appendChild(saveBtn);
  form.appendChild(cancelBtn);
  card.appendChild(form);
}

function buildCategoryDropdown(selectedValue) {
  const dropdown = document.createElement("select");
  dropdown.style.marginTop = "8px";
  dropdown.style.width = "100%";

  const manualDropdown = document.getElementById("manualCategoryDropdown");

  if (manualDropdown) {
    Array.from(manualDropdown.options).forEach(opt => {
      if (!opt.value || opt.value === "__create_new__") return;
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.textContent;
      if (opt.value === selectedValue) option.selected = true;
      dropdown.appendChild(option);
    });
  } else {
    const uniqueCategories = [...new Set(allLinks.map(l => l.category))];
    uniqueCategories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      if (cat === selectedValue) option.selected = true;
      dropdown.appendChild(option);
    });
  }

  return dropdown;
}

// Update all category dropdowns when categories change
function updateAllCategoryDropdowns() {
  chrome.storage.local.get({ categories: [] }, (data) => {
    const categories = data.categories;
    
    // Update filter dropdown
    const filterDropdown = document.getElementById("categoryFilter");
    if (filterDropdown) {
      filterDropdown.innerHTML = '<option value="">All Categories</option>';
      categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        filterDropdown.appendChild(opt);
      });
    }

    // Update manual category dropdown
    const manualCatDropdown = document.getElementById("manualCategoryDropdown");
    if (manualCatDropdown) {
      manualCatDropdown.innerHTML = '<option value="">Select Category</option>';
      categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        manualCatDropdown.appendChild(opt);
      });
      const newCatOpt = document.createElement("option");
      newCatOpt.value = "__create_new__";
      newCatOpt.textContent = "Create New Category...";
      manualCatDropdown.appendChild(newCatOpt);
    }
  });
}

function runFilter() {
  const search = document.getElementById("searchInput").value.toLowerCase();

  // Get all categories and sessions for search
  chrome.storage.local.get({ categories: [], sessions: {} }, (data) => {
    const categories = data.categories || [];
    const sessions = data.sessions || {};
    
    // Filter links
    const filteredLinks = allLinks.filter(link => {
      const matchKeyword =
        link.title.toLowerCase().includes(search) ||
        (link.note && link.note.toLowerCase().includes(search)) ||
        (link.category && link.category.toLowerCase().includes(search));
      
      return matchKeyword;
    });

    // Filter categories
    const filteredCategories = categories.filter(category => 
      category.toLowerCase().includes(search)
    );

    // Filter sessions
    const filteredSessions = Object.keys(sessions).filter(sessionName => 
      sessionName.toLowerCase().includes(search)
    );

    // Display combined results
    displaySearchResults(filteredLinks, filteredCategories, filteredSessions, sessions);
    
    // Also update the main links panel
    displayLinks(filteredLinks);
  });
}

function displaySearchResults(filteredLinks, filteredCategories, filteredSessions, sessions) {
  const searchResults = document.getElementById("searchResults");
  
  if (!searchResults) return;
  
  searchResults.innerHTML = "";

  const search = document.getElementById("searchInput").value.toLowerCase();

  // Show placeholder if no search terms
  if (!search) {
    searchResults.innerHTML = '<p class="search-placeholder">Enter a search term to find your saved links, categories, or sessions...</p>';
    return;
  }

  const totalResults = filteredLinks.length + filteredCategories.length + filteredSessions.length;
  
  if (totalResults === 0) {
    searchResults.innerHTML = '<p class="no-results">No results found for your search.</p>';
    return;
  }

  // Show result count
  const resultCount = document.createElement("div");
  resultCount.style.cssText = "font-size: 0.8em; color: #666; margin-bottom: 10px; padding: 5px; background: #f0f0f0; border-radius: 4px;";
  resultCount.textContent = `Found ${totalResults} result${totalResults === 1 ? '' : 's'}`;
  searchResults.appendChild(resultCount);

  filteredLinks.forEach((link, index) => {
    const resultItem = document.createElement("div");
    resultItem.className = "search-result-item";

    const title = document.createElement("div");
    title.className = "search-result-title";
    title.textContent = link.title;

    const category = document.createElement("div");
    category.className = "search-result-category";
    category.textContent = `Category: ${link.category}`;

    const note = document.createElement("div");
    note.className = "search-result-note";
    note.textContent = link.note || "(No note)";

    const actions = document.createElement("div");
    actions.className = "search-result-actions";

    const openBtn = document.createElement("button");
    openBtn.textContent = "Open";
    openBtn.onclick = (e) => {
      e.stopPropagation();
      window.open(link.url, '_blank');
    };

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.onclick = (e) => {
      e.stopPropagation();
      showEditLinkPopup(link.id);
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete-btn";
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteLinkFromPopup(link.id);
    };

    actions.appendChild(openBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    // Make entire item clickable to open link
    resultItem.onclick = () => {
      window.open(link.url, '_blank');
    };

    resultItem.appendChild(title);
    resultItem.appendChild(category);
    resultItem.appendChild(note);
    resultItem.appendChild(actions);

    searchResults.appendChild(resultItem);
  });

  // Display category results
  if (filteredCategories.length > 0) {
    const categoryHeader = document.createElement("div");
    categoryHeader.style.cssText = "font-weight: bold; color: #2d89ef; margin: 15px 0 8px 0; padding-top: 10px; border-top: 1px solid #eee;";
    categoryHeader.textContent = "Categories:";
    searchResults.appendChild(categoryHeader);

    filteredCategories.forEach(category => {
      const categoryItem = document.createElement("div");
      categoryItem.className = "search-result-item";
      categoryItem.style.borderLeft = "4px solid #28a745";

      const categoryTitle = document.createElement("div");
      categoryTitle.className = "search-result-title";
      categoryTitle.textContent = category;

      const categoryInfo = document.createElement("div");
      categoryInfo.className = "search-result-category";
      const categoryCount = allLinks.filter(link => link.category === category).length;
      categoryInfo.textContent = `${categoryCount} link${categoryCount === 1 ? '' : 's'}`;

      const categoryActions = document.createElement("div");
      categoryActions.className = "search-result-actions";

      const viewBtn = document.createElement("button");
      viewBtn.textContent = "View Links";
      viewBtn.onclick = (e) => {
        e.stopPropagation();
        showCategoryPopup(category);
      };

      categoryActions.appendChild(viewBtn);
      categoryItem.appendChild(categoryTitle);
      categoryItem.appendChild(categoryInfo);
      categoryItem.appendChild(categoryActions);
      searchResults.appendChild(categoryItem);
    });
  }

  // Display session results
  if (filteredSessions.length > 0) {
    const sessionHeader = document.createElement("div");
    sessionHeader.style.cssText = "font-weight: bold; color: #2d89ef; margin: 15px 0 8px 0; padding-top: 10px; border-top: 1px solid #eee;";
    sessionHeader.textContent = "Sessions:";
    searchResults.appendChild(sessionHeader);

    filteredSessions.forEach(sessionName => {
      const sessionItem = document.createElement("div");
      sessionItem.className = "search-result-item";
      sessionItem.style.borderLeft = "4px solid #ffc107";

      const sessionTitle = document.createElement("div");
      sessionTitle.className = "search-result-title";
      sessionTitle.textContent = sessionName;

      const sessionInfo = document.createElement("div");
      sessionInfo.className = "search-result-category";
      const sessionLinks = sessions[sessionName] || [];
      sessionInfo.textContent = `${sessionLinks.length} link${sessionLinks.length === 1 ? '' : 's'}`;

      const sessionActions = document.createElement("div");
      sessionActions.className = "search-result-actions";

      const launchBtn = document.createElement("button");
      launchBtn.textContent = "Launch";
      launchBtn.onclick = (e) => {
        e.stopPropagation();
        sessionLinks.forEach(link => {
          chrome.tabs.create({ url: link.url });
        });
      };

      const viewBtn = document.createElement("button");
      viewBtn.textContent = "View";
      viewBtn.onclick = (e) => {
        e.stopPropagation();
        showSessionPopup(sessionName, sessionLinks);
      };

      sessionActions.appendChild(launchBtn);
      sessionActions.appendChild(viewBtn);
      sessionItem.appendChild(sessionTitle);
      sessionItem.appendChild(sessionInfo);
      sessionItem.appendChild(sessionActions);
      searchResults.appendChild(sessionItem);
    });
  }
}
// Add manual link
document.getElementById("addManualBtn").addEventListener("click", () => {
  const title = document.getElementById("manualTitle").value.trim();
  let url = document.getElementById("manualUrl").value.trim();
  const note = document.getElementById("manualNote").value.trim();
  const category = document.getElementById("newCategoryInput").value.trim() || document.getElementById("manualCategoryDropdown").value;
  const session = document.getElementById("newSessionInput").value.trim() || document.getElementById("manualSessionDropdown").value;

  if (!title || !url) return alert("Please enter both title and URL.");
  if (!category) return alert("Please select or enter a category.");

  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const newLink = {
    id: Date.now(),
    url,
    title,
    note,
    category,
    tags: [],
    dateSaved: new Date().toISOString(),
    pinned: false,
    position: null // Will be set when user positions the card
  };

  allLinks.push(newLink);

  chrome.storage.local.get({ sessions: {}, categories: [] }, (data) => {
    const sessions = data.sessions;
    const categories = data.categories;
    
    // Handle new category creation
    const newCategoryInput = document.getElementById("newCategoryInput").value.trim();
    if (newCategoryInput && !categories.includes(newCategoryInput)) {
      categories.push(newCategoryInput);
    }
    
    // Handle new session creation
    if (session) {
      if (!sessions[session]) sessions[session] = [];
      sessions[session].push(newLink);
    }

    chrome.storage.local.set({ links: allLinks, sessions, categories }, () => {
      // Update UI immediately
      displayLinks(allLinks);
      runFilter();
      renderSessionList();
      renderCategoryList();
      updateAllCategoryDropdowns();
      
      // Clear form
      document.getElementById("manualTitle").value = "";
      document.getElementById("manualUrl").value = "";
      document.getElementById("manualNote").value = "";
      document.getElementById("newCategoryInput").value = "";
      document.getElementById("newSessionInput").value = "";
      document.getElementById("manualCategoryDropdown").value = "";
      document.getElementById("manualSessionDropdown").value = "";
      
      alert("Link added successfully!");
    });
  });
});

// Create category
document.getElementById("createCategoryBtn").addEventListener("click", () => {
  const input = document.getElementById("newCategoryStandaloneInput");
  const newCat = input.value.trim();
  if (!newCat) return alert("Enter a category name.");

  chrome.storage.local.get({ categories: [] }, (data) => {
    const categories = data.categories;
    if (categories.includes(newCat)) return alert("That category already exists.");

    categories.push(newCat);
    chrome.storage.local.set({ categories }, () => {
      // Update UI immediately
      renderCategoryList();
      updateAllCategoryDropdowns();
      
      // Clear input
      input.value = "";
      alert("Category created successfully!");
    });
  });
});

// Create session
document.getElementById("createSessionBtn").addEventListener("click", () => {
  const input = document.getElementById("newSessionStandaloneInput");
  const newSess = input.value.trim();
  if (!newSess) return alert("Enter a session name.");

  chrome.storage.local.get({ sessions: {} }, (data) => {
    const sessions = data.sessions;
    if (sessions[newSess]) return alert("That session already exists.");

    sessions[newSess] = [];
    chrome.storage.local.set({ sessions }, () => {
      // Update UI immediately
      renderSessionList();
      
      // Clear input
      input.value = "";
      alert("Session created successfully!");
    });
  });
});

// Save selected links to session
document.getElementById("saveSelectedToSessionBtn").addEventListener("click", () => {
  const selectedSession = document.getElementById("selectedSessionDropdown").value;
  const newSessionName = document.getElementById("newSelectedSessionInput").value.trim();
  const name = selectedSession === "__create_new__" ? newSessionName : selectedSession;

  if (!name) return alert("Please select or enter a session name.");

  const checkboxes = document.querySelectorAll(".session-select:checked");
  if (checkboxes.length === 0) return alert("Select at least one link.");

  const selectedLinks = Array.from(checkboxes).map(cb => allLinks[parseInt(cb.dataset.index)]);

  chrome.storage.local.get({ sessions: {} }, (data) => {
    const updated = data.sessions;
    if (!updated[name]) updated[name] = [];

    const existingURLs = new Set(updated[name].map(l => l.url));
    selectedLinks.forEach(link => {
      if (!existingURLs.has(link.url)) updated[name].push(link);
    });

    chrome.storage.local.set({ sessions: updated }, () => {
      // Update UI immediately
      renderSessionList();
      
      // Clear selections
      document.querySelectorAll(".session-select:checked").forEach(cb => cb.checked = false);
      document.getElementById("selectedSessionDropdown").value = "";
      document.getElementById("newSelectedSessionInput").value = "";
      document.getElementById("newSelectedSessionInput").style.display = "none";
      
      alert("Links saved to session successfully!");
    });
  });
});

function renderSessionList() {
  const list = document.getElementById("sessionList");
  list.innerHTML = "";

  chrome.storage.local.get({ sessions: {} }, (data) => {
    const sessions = data.sessions;

    if (Object.keys(sessions).length === 0) {
      list.textContent = "No saved sessions.";
      return;
    }

    // Populate manual session dropdown
    const manualDropdown = document.getElementById("manualSessionDropdown");
    if (manualDropdown) {
      manualDropdown.innerHTML = '<option value="">Add to Session (optional)</option>';

      Object.keys(sessions).forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        manualDropdown.appendChild(opt);
      });

      const newSessOpt = document.createElement("option");
      newSessOpt.value = "__create_new__";
      newSessOpt.textContent = "Create New Session...";
      manualDropdown.appendChild(newSessOpt);
    }

    // Populate selected session dropdown (for saved links panel)
    const selectedDropdown = document.getElementById("selectedSessionDropdown");
    if (selectedDropdown) {
      selectedDropdown.innerHTML = '<option value="">Select Session</option>';

      Object.keys(sessions).forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        selectedDropdown.appendChild(opt);
      });

      const newSessOpt = document.createElement("option");
      newSessOpt.value = "__create_new__";
      newSessOpt.textContent = "Create New Session...";
      selectedDropdown.appendChild(newSessOpt);
    }

    // Render each session
    Object.entries(sessions).forEach(([name, links]) => {
      const sessionCard = document.createElement("div");
      sessionCard.className = "session-card";
      sessionCard.style.cssText = `
        margin-bottom: 12px;
        padding: 12px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-card);
        transition: all 0.2s ease;
      `;

      // Session header with expand/collapse
      const sessionHeader = document.createElement("div");
      sessionHeader.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        user-select: none;
      `;

      const sessionInfo = document.createElement("div");
      sessionInfo.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      `;

      const expandIcon = document.createElement("span");
      expandIcon.innerHTML = "▶";
      expandIcon.style.cssText = `
        font-size: 12px;
        color: var(--text-secondary);
        transition: transform 0.2s ease;
        margin-right: 8px;
      `;

      const sessionName = document.createElement("strong");
      sessionName.textContent = name;
      sessionName.style.cssText = `
        color: var(--text-primary);
        font-size: 14px;
      `;

      const sessionCount = document.createElement("span");
      sessionCount.textContent = `(${links.length} tabs)`;
      sessionCount.style.cssText = `
        color: var(--text-secondary);
        font-size: 12px;
      `;

      sessionInfo.appendChild(expandIcon);
      sessionInfo.appendChild(sessionName);
      sessionInfo.appendChild(sessionCount);

      // Action buttons
      const actionButtons = document.createElement("div");
      actionButtons.style.cssText = `
        display: flex;
        gap: 6px;
        align-items: center;
      `;

      const launchBtn = document.createElement("button");
      launchBtn.textContent = "Launch";
      launchBtn.style.cssText = `
        padding: 6px 12px;
        font-size: 12px;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-weight: 500;
      `;
      launchBtn.onclick = (e) => {
        e.stopPropagation();
        links.forEach(link => {
          chrome.tabs.create({ url: link.url });
        });
      };

      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️";
      editBtn.title = "Edit Name";
      editBtn.style.cssText = `
        padding: 6px 8px;
        font-size: 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #64748b;
      `;
      editBtn.onclick = (e) => {
        e.stopPropagation();
        const newName = prompt("Enter a new name for this session:", name);
        if (!newName || newName === name || sessions[newName]) return;

        sessions[newName] = links;
        delete sessions[name];
        chrome.storage.local.set({ sessions }, () => renderSessionList());
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️";
      deleteBtn.title = "Delete Session";
      deleteBtn.style.cssText = `
        padding: 6px 8px;
        font-size: 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #64748b;
      `;
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete the session "${name}"?`)) {
          delete sessions[name];
          chrome.storage.local.set({ sessions }, () => renderSessionList());
        }
      };

      // Star button (moved to the end, styled like other icon buttons)
      const starBtn = document.createElement("button");
      starBtn.title = "Star for Quick Access";
      starBtn.style.cssText = `
        padding: 6px 8px;
        font-size: 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #64748b;
        flex-shrink: 0;
        width: fit-content;
        min-width: fit-content;
      `;
      
      // Check if session is starred
      chrome.storage.local.get(['starredSessions'], (result) => {
        const starredSessions = result.starredSessions || [];
        const isStarred = starredSessions.some(s => s.name === name);
        
        starBtn.innerHTML = isStarred ? "⭐" : "☆";
        starBtn.style.color = isStarred ? "#f59e0b" : "#64748b";
        
        starBtn.onclick = (e) => {
          e.stopPropagation();
          toggleSessionStar(name, links, starBtn);
        };
      });

      actionButtons.appendChild(launchBtn);
      actionButtons.appendChild(editBtn);
      actionButtons.appendChild(deleteBtn);
      actionButtons.appendChild(starBtn);

      sessionHeader.appendChild(sessionInfo);
      sessionHeader.appendChild(actionButtons);

      // Collapsible content
      const sessionContent = document.createElement("div");
      sessionContent.className = "session-content";
      sessionContent.style.cssText = `
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--border-color);
        display: none;
        max-height: 200px;
        overflow-y: auto;
      `;

      // Add links to content
      links.forEach((link, i) => {
        const linkRow = document.createElement("div");
        linkRow.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          padding: 8px;
          background: var(--bg-secondary);
          border-radius: 6px;
          border: 1px solid var(--border-light);
        `;

        const linkAnchor = document.createElement("a");
        linkAnchor.href = link.url;
        linkAnchor.target = "_blank";
        linkAnchor.textContent = link.title;
        linkAnchor.style.cssText = `
          color: var(--text-primary);
          text-decoration: none;
          font-size: 13px;
          flex: 1;
          margin-right: 8px;
          word-break: break-word;
        `;

        const removeBtn = document.createElement("button");
        removeBtn.innerHTML = "🗑️";
        removeBtn.title = "Remove from session";
        removeBtn.style.cssText = `
          padding: 4px 6px;
          font-size: 11px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #64748b;
          flex-shrink: 0;
        `;
        removeBtn.onclick = (e) => {
          e.stopPropagation();
          links.splice(i, 1);
          sessions[name] = links;
          chrome.storage.local.set({ sessions }, () => renderSessionList());
        };

        linkRow.appendChild(linkAnchor);
        linkRow.appendChild(removeBtn);
        sessionContent.appendChild(linkRow);
      });

      // Toggle functionality
      let isExpanded = false;
      sessionHeader.addEventListener('click', () => {
        isExpanded = !isExpanded;
        if (isExpanded) {
          sessionContent.style.display = 'block';
          expandIcon.style.transform = 'rotate(90deg)';
          sessionCard.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        } else {
          sessionContent.style.display = 'none';
          expandIcon.style.transform = 'rotate(0deg)';
          sessionCard.style.boxShadow = 'none';
        }
      });

      // Add hover effects
      sessionCard.addEventListener('mouseenter', () => {
        sessionCard.style.borderColor = '#3b82f6';
        sessionCard.style.transform = 'translateY(-1px)';
      });

      sessionCard.addEventListener('mouseleave', () => {
        sessionCard.style.borderColor = 'var(--border-color)';
        sessionCard.style.transform = 'translateY(0)';
      });

      sessionCard.appendChild(sessionHeader);
      sessionCard.appendChild(sessionContent);
      list.appendChild(sessionCard);
    });
  });
}

// Toggle session star for quick access
function toggleSessionStar(sessionName, sessionLinks, starBtn) {
  chrome.storage.local.get(['starredSessions'], (result) => {
    const starredSessions = result.starredSessions || [];
    const existingIndex = starredSessions.findIndex(s => s.name === sessionName);
    
    if (existingIndex >= 0) {
      // Remove from starred
      starredSessions.splice(existingIndex, 1);
      starBtn.innerHTML = "☆";
      starBtn.style.color = "#64748b";
    } else {
      // Add to starred
      starredSessions.push({
        name: sessionName,
        links: sessionLinks
      });
      starBtn.innerHTML = "⭐";
      starBtn.style.color = "#f59e0b";
    }
    
    chrome.storage.local.set({ starredSessions }, () => {
      console.log('Starred sessions updated:', starredSessions);
    });
  });
}
// Individual Panel Reset Function
function resetIndividualPanel(panelId) {
  const screenWidth = window.innerWidth;
  
  // Calculate appropriate card size based on screen width
  let cardWidth, cardHeight, margin;
  
  if (screenWidth >= 1280) {
    cardWidth = 500;
    cardHeight = 320;
    margin = 40;
  } else if (screenWidth >= 1024) {
    cardWidth = 450;
    cardHeight = 280;
    margin = 30;
  } else {
    cardWidth = 380;
    cardHeight = 240;
    margin = 20;
  }
  
  // Calculate centered column positions
  const totalWidth = (cardWidth * 2) + (margin * 3);
  const startX = (screenWidth - totalWidth) / 2;
  const leftColumnX = startX;
  const rightColumnX = leftColumnX + cardWidth + margin;
  
  // Get the default position for this panel
  const defaultPositions = {
    search: { x: leftColumnX, y: margin, width: cardWidth, height: cardHeight },
    manualAdd: { x: rightColumnX, y: margin, width: cardWidth, height: cardHeight },
    sessionSaver: { x: leftColumnX, y: margin + cardHeight + margin + 20, width: cardWidth, height: cardHeight },
    sessionManager: { x: rightColumnX, y: margin + cardHeight + margin + 20, width: cardWidth, height: cardHeight },
    categoryManager: { x: leftColumnX, y: margin + (cardHeight + margin + 20) * 2, width: cardWidth, height: cardHeight },
    createSections: { x: rightColumnX, y: margin + (cardHeight + margin + 20) * 2, width: cardWidth, height: cardHeight },
    controls: { x: leftColumnX, y: margin + (cardHeight + margin + 20) * 3, width: cardWidth, height: cardHeight },
    savedLinks: { x: rightColumnX, y: margin + (cardHeight + margin + 20) * 3, width: cardWidth, height: cardHeight }
  };
  
  const panel = document.querySelector(`[data-panel-id="${panelId}"]`);
  if (panel && defaultPositions[panelId]) {
    const pos = defaultPositions[panelId];
    panel.style.left = pos.x + 'px';
    panel.style.top = pos.y + 'px';
    panel.style.width = pos.width + 'px';
    panel.style.height = pos.height + 'px';
    
    // Save the updated position
    panelPositions[panelId] = pos;
    chrome.storage.local.set({ panelPositions });
  }
}

// Panel Management
let panelPositions = {};

function initializePanels() {
  // Load saved panel positions
  chrome.storage.local.get({ panelPositions: {} }, (data) => {
    panelPositions = data.panelPositions;
    
    // If no saved positions exist, use the new default grid layout
    if (Object.keys(panelPositions).length === 0) {
      resetPanelPositions();
      return;
    }
    
    // Apply saved positions to panels
    Object.keys(panelPositions).forEach(panelId => {
      const panel = document.querySelector(`[data-panel-id="${panelId}"]`);
      if (panel && panelPositions[panelId]) {
        panel.style.left = panelPositions[panelId].x + 'px';
        panel.style.top = panelPositions[panelId].y + 'px';
        panel.style.width = panelPositions[panelId].width + 'px';
        panel.style.height = panelPositions[panelId].height + 'px';
      }
    });
    
    // Ensure body has enough height for panels and scrolling
    ensureBodyHeight();
    
    // Make all panels draggable and resizable
    document.querySelectorAll('.draggable-panel').forEach(panel => {
      makePanelDraggable(panel);
      makePanelResizable(panel);
    });
  });
}

function makePanelDraggable(panel) {
  const dragHandle = panel.querySelector('.drag-handle');
  
  dragHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    isDragging = true;
    draggedElement = panel;
    
    // Get the current position of the panel
    const currentLeft = parseInt(panel.style.left) || 0;
    const currentTop = parseInt(panel.style.top) || 0;
    
    // Calculate offset from mouse to panel corner
    dragOffset.x = e.clientX - currentLeft;
    dragOffset.y = e.clientY - currentTop;
    
    panel.classList.add('dragging');
    panel.style.zIndex = '1001';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging || !draggedElement || !draggedElement.classList.contains('draggable-panel')) return;
    
    // Use requestAnimationFrame for smooth performance
    requestAnimationFrame(() => {
      // Calculate new position
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;
      
      // Keep panel within viewport bounds horizontally only
      const maxX = window.innerWidth - draggedElement.offsetWidth;
      newX = Math.max(0, Math.min(newX, maxX));
      
      // Allow vertical movement beyond viewport - no Y constraint
      
      // Apply new position
      draggedElement.style.left = newX + 'px';
      draggedElement.style.top = newY + 'px';
    });
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging && draggedElement && draggedElement.classList.contains('draggable-panel')) {
      isDragging = false;
      draggedElement.classList.remove('dragging');
      draggedElement.style.zIndex = '100';
      
      // Save panel position
      const panelId = draggedElement.dataset.panelId;
      panelPositions[panelId] = {
        x: parseInt(draggedElement.style.left),
        y: parseInt(draggedElement.style.top),
        width: parseInt(draggedElement.style.width) || 300,
        height: parseInt(draggedElement.style.height) || 200
      };
      
      chrome.storage.local.set({ panelPositions });
      draggedElement = null;
    }
  });
}

function makePanelResizable(panel) {
  const resizeHandle = panel.querySelector('.resize-handle');
  
  resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = panel.offsetWidth;
    const startHeight = panel.offsetHeight;
    
    // Add resizing class for visual feedback
    panel.classList.add('resizing');
    panel.style.zIndex = '1001';
    
    function onMouseMove(e) {
      // Use requestAnimationFrame for smooth performance
      requestAnimationFrame(() => {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newWidth = Math.max(250, startWidth + deltaX);
        const newHeight = Math.max(100, startHeight + deltaY);
        
        // Apply new size
        panel.style.width = newWidth + 'px';
        panel.style.height = newHeight + 'px';
      });
    }
    
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      // Remove resizing class
      panel.classList.remove('resizing');
      panel.style.zIndex = '100';
      
      // Save new size
      const panelId = panel.dataset.panelId;
      panelPositions[panelId] = {
        x: parseInt(panel.style.left) || 0,
        y: parseInt(panel.style.top) || 0,
        width: parseInt(panel.style.width),
        height: parseInt(panel.style.height)
      };
      
      chrome.storage.local.set({ panelPositions });
    }
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

function resetPanelPositions() {
  // Reset all panel positions to default - uniform 2-column grid layout
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  // Calculate appropriate card size based on screen width
  let cardWidth, cardHeight, margin;
  
  if (screenWidth >= 1280) {
    // Full size for large screens
    cardWidth = 500;
    cardHeight = 320;
    margin = 40;
  } else if (screenWidth >= 1024) {
    // Medium size for medium screens
    cardWidth = 450;
    cardHeight = 280;
    margin = 30;
  } else {
    // Smaller size for small screens
    cardWidth = 380;
    cardHeight = 240;
    margin = 20;
  }
  
  // Calculate centered column positions
  const totalWidth = (cardWidth * 2) + (margin * 3); // 2 cards + 3 margins
  const startX = (screenWidth - totalWidth) / 2; // Center the grid
  const leftColumnX = startX;
  const rightColumnX = leftColumnX + cardWidth + margin;
  
  const headerOffset = 80; // Account for header height
  
  const defaultPositions = {
    // Row 1: Search and Manual Add
    search: { x: leftColumnX, y: margin + headerOffset, width: cardWidth, height: cardHeight },
    manualAdd: { x: rightColumnX, y: margin + headerOffset, width: cardWidth, height: cardHeight },
    
    // Row 2: Session Manager and Category Manager
    sessionManager: { x: leftColumnX, y: margin + cardHeight + margin + 20 + headerOffset, width: cardWidth, height: cardHeight },
    categoryManager: { x: rightColumnX, y: margin + cardHeight + margin + 20 + headerOffset, width: cardWidth, height: cardHeight },
    
    // Row 3: Create Sections and Saved Links
    createSections: { x: leftColumnX, y: margin + (cardHeight + margin + 20) * 2 + headerOffset, width: cardWidth, height: cardHeight },
    savedLinks: { x: rightColumnX, y: margin + (cardHeight + margin + 20) * 2 + headerOffset, width: cardWidth, height: cardHeight }
  };
  
  // Calculate total height needed for all panels
  const totalHeight = margin + (cardHeight + margin + 20) * 2 + cardHeight + margin + 100 + headerOffset; // Extra 100px for padding + header offset
  
  // Set body height to accommodate all panels plus extra space for dragging
  ensureBodyHeight();
  
  // Ensure panels don't go off-screen horizontally
  Object.keys(defaultPositions).forEach(panelId => {
    const pos = defaultPositions[panelId];
    pos.x = Math.max(0, Math.min(pos.x, screenWidth - pos.width));
    // Don't limit Y position - let panels extend the page
  });
  
  Object.keys(defaultPositions).forEach(panelId => {
    const panel = document.querySelector(`[data-panel-id="${panelId}"]`);
    if (panel) {
      const pos = defaultPositions[panelId];
      panel.style.left = pos.x + 'px';
      panel.style.top = pos.y + 'px';
      panel.style.width = pos.width + 'px';
      panel.style.height = pos.height + 'px';
    }
  });
  
  panelPositions = defaultPositions;
  chrome.storage.local.set({ panelPositions });
}

// Ensure body has enough height for panels and scrolling
function ensureBodyHeight() {
  // Calculate the maximum Y position of all panels
  let maxY = 0;
  let maxHeight = 0;
  
  Object.keys(panelPositions).forEach(panelId => {
    const pos = panelPositions[panelId];
    if (pos && pos.y !== undefined && pos.height !== undefined) {
      const panelBottom = pos.y + pos.height;
      if (panelBottom > maxY) {
        maxY = panelBottom;
      }
      if (pos.height > maxHeight) {
        maxHeight = pos.height;
      }
    }
  });
  
  // If no panels found, use default values
  if (maxY === 0) {
    maxY = 800; // Default height
  }
  
  // Add extra space for comfortable scrolling and dragging
  const extraSpace = Math.max(2000, maxHeight * 2); // At least 2000px or 2x panel height
  const totalHeight = maxY + extraSpace;
  
  // Set body min-height to ensure scrolling works
  document.body.style.minHeight = totalHeight + 'px';
}

// Dark Mode Management
let isDarkMode = false;

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  const html = document.documentElement;
  const icon = document.getElementById('darkModeIcon');
  
  if (isDarkMode) {
    html.setAttribute('data-theme', 'dark');
    icon.textContent = '☀️';
  } else {
    html.setAttribute('data-theme', 'light');
    icon.textContent = '🌙';
  }
  
  // Save preference
  chrome.storage.local.set({ darkMode: isDarkMode });
}

function initializeDarkMode() {
  chrome.storage.local.get({ darkMode: false }, (data) => {
    isDarkMode = data.darkMode;
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      const icon = document.getElementById('darkModeIcon');
      icon.textContent = '☀️';
    }
  });
}

// Show options popup
function showOptions() {
  const popup = document.getElementById("optionsPopup");
  popup.style.display = "block";
  popup.style.opacity = "0";
  setTimeout(() => {
    popup.style.opacity = "1";
  }, 10);
}

// Hide options popup
function hideOptions() {
  const popup = document.getElementById("optionsPopup");
  popup.style.opacity = "0";
  setTimeout(() => {
    popup.style.display = "none";
  }, 200);
}

// Header Controls Event Listeners
document.getElementById("darkModeToggle").addEventListener("click", toggleDarkMode);
document.getElementById("optionsToggle").addEventListener("click", showOptions);
document.getElementById("closeOptions").addEventListener("click", hideOptions);

// Options Popup Event Listeners
document.getElementById("resetAllPanelsBtn").addEventListener("click", () => {
  resetPanelPositions();
  hideOptions();
});
document.getElementById("resetSearchBtn").addEventListener("click", () => {
  resetIndividualPanel("search");
  hideOptions();
});
document.getElementById("resetManualAddBtn").addEventListener("click", () => {
  resetIndividualPanel("manualAdd");
  hideOptions();
});

document.getElementById("resetSessionManagerBtn").addEventListener("click", () => {
  resetIndividualPanel("sessionManager");
  hideOptions();
});
document.getElementById("resetCategoryManagerBtn").addEventListener("click", () => {
  resetIndividualPanel("categoryManager");
  hideOptions();
});
document.getElementById("resetCreateSectionsBtn").addEventListener("click", () => {
  resetIndividualPanel("createSections");
  hideOptions();
});
document.getElementById("resetSavedLinksBtn").addEventListener("click", () => {
  resetIndividualPanel("savedLinks");
  hideOptions();
});

// Show input if "Create New Session" selected
document.getElementById("selectedSessionDropdown").addEventListener("change", (e) => {
  const show = e.target.value === "__create_new__";
  document.getElementById("newSelectedSessionInput").style.display = show ? "inline-block" : "none";
});

// Popup Modal Functions
function showPopup(title, content) {
  document.getElementById('popupTitle').textContent = title;
  document.getElementById('popupBody').innerHTML = content;
  document.getElementById('popupModal').style.display = 'block';
  
  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

function closePopup() {
  document.getElementById('popupModal').style.display = 'none';
  document.body.style.overflow = 'auto';
}

function showLinkPopup(link) {
  const content = `
    <div class="popup-link-item">
      <div class="popup-link-title">${link.title}</div>
      <div class="popup-link-url">${link.url}</div>
      <div class="popup-link-category">Category: ${link.category}</div>
      <div class="popup-link-note">${link.note || '(No note)'}</div>
      <div class="popup-actions">
        <button class="primary" onclick="window.open('${link.url}', '_blank')">Open Link</button>
        <button onclick="showEditLinkPopup(${link.id})">Edit</button>
        <button class="danger" onclick="deleteLinkFromPopup(${link.id})">Delete</button>
      </div>
    </div>
  `;
  showPopup('Link Details', content);
}

function showEditLinkPopup(linkId) {
  const link = allLinks.find(l => l.id === linkId);
  if (!link) return;

  // Get categories for dropdown
  chrome.storage.local.get({ categories: [] }, (data) => {
    const categories = data.categories || [];
    const categoryOptions = categories.map(cat => 
      `<option value="${cat}" ${cat === link.category ? 'selected' : ''}>${cat}</option>`
    ).join('');

    const content = `
      <div class="popup-edit-form">
        <input type="text" id="editTitle" placeholder="Title" value="${link.title}">
        <input type="text" id="editUrl" placeholder="URL" value="${link.url}">
        <select id="editCategory">
          <option value="">Select Category</option>
          ${categoryOptions}
        </select>
        <textarea id="editNote" placeholder="Note (optional)">${link.note || ''}</textarea>
        <div class="popup-actions">
          <button class="primary" onclick="saveLinkEdit(${linkId})">Save Changes</button>
          <button onclick="closePopup()">Cancel</button>
        </div>
      </div>
    `;
    showPopup('Edit Link', content);
  });
}

function saveLinkEdit(linkId) {
  const linkIndex = allLinks.findIndex(l => l.id === linkId);
  if (linkIndex === -1) return;

  const title = document.getElementById('editTitle').value.trim();
  const url = document.getElementById('editUrl').value.trim();
  const category = document.getElementById('editCategory').value.trim();
  const note = document.getElementById('editNote').value.trim();

  if (!title || !url) {
    alert('Please enter both title and URL.');
    return;
  }

  allLinks[linkIndex] = {
    ...allLinks[linkIndex],
    title,
    url,
    category: category || 'Uncategorized',
    note
  };

  chrome.storage.local.set({ links: allLinks }, () => {
    closePopup();
    runFilter(); // Refresh search results
    displayLinks(allLinks); // Refresh main panel
  });
}

function deleteLinkFromPopup(linkId) {
  if (!confirm('Are you sure you want to delete this link?')) return;

  const linkIndex = allLinks.findIndex(l => l.id === linkId);
  if (linkIndex === -1) return;

  allLinks.splice(linkIndex, 1);
  chrome.storage.local.set({ links: allLinks }, () => {
    closePopup();
    runFilter(); // Refresh search results
    displayLinks(allLinks); // Refresh main panel
  });
}

function showCategoryPopup(categoryName) {
  const categoryLinks = allLinks.filter(link => link.category === categoryName);
  
  const content = `
    <div class="popup-stats">
      <div class="popup-stat">
        <div class="popup-stat-number">${categoryLinks.length}</div>
        <div class="popup-stat-label">Links</div>
      </div>
    </div>
    <h4>Links in "${categoryName}":</h4>
    ${categoryLinks.map(link => `
      <div class="popup-link-item">
        <div class="popup-link-title">${link.title}</div>
        <div class="popup-link-url">${link.url}</div>
        <div class="popup-link-note">${link.note || '(No note)'}</div>
        <div class="popup-actions">
          <button class="primary" onclick="window.open('${link.url}', '_blank')">Open</button>
          <button onclick="showEditLinkPopup(${link.id})">Edit</button>
          <button class="danger" onclick="deleteLinkFromPopup(${link.id})">Delete</button>
        </div>
      </div>
    `).join('')}
  `;
  showPopup(`Category: ${categoryName}`, content);
}

function showSessionPopup(sessionName, sessionLinks) {
  const content = `
    <div class="popup-stats">
      <div class="popup-stat">
        <div class="popup-stat-number">${sessionLinks.length}</div>
        <div class="popup-stat-label">Links</div>
      </div>
    </div>
    <div class="popup-actions" style="margin-bottom: 20px;">
      <button class="primary" onclick="launchSession('${sessionName}')">Launch All Links</button>
    </div>
    <h4>Links in "${sessionName}":</h4>
    ${sessionLinks.map(link => `
      <div class="popup-link-item">
        <div class="popup-link-title">${link.title}</div>
        <div class="popup-link-url">${link.url}</div>
        <div class="popup-link-category">Category: ${link.category}</div>
        <div class="popup-link-note">${link.note || '(No note)'}</div>
        <div class="popup-actions">
          <button class="primary" onclick="window.open('${link.url}', '_blank')">Open</button>
          <button onclick="showEditLinkPopup(${link.id})">Edit</button>
          <button class="danger" onclick="deleteLinkFromPopup(${link.id})">Delete</button>
        </div>
      </div>
    `).join('')}
  `;
  showPopup(`Session: ${sessionName}`, content);
}

function launchSession(sessionName) {
  chrome.storage.local.get({ sessions: {} }, (data) => {
    const sessionLinks = data.sessions[sessionName] || [];
    sessionLinks.forEach(link => {
      chrome.tabs.create({ url: link.url });
    });
  });
}

// Popup event listeners
document.getElementById('closePopup').addEventListener('click', closePopup);
document.getElementById('popupModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('popupModal')) {
    closePopup();
  }
});

// Search event listener
document.getElementById("searchInput").addEventListener("input", runFilter);

// Initial load of links, categories, and sessions
chrome.storage.local.get(["links", "categories", "sessions"], (data) => {
  allLinks = data.links || [];
  const categoryList = data.categories || [];

  // Populate filter dropdown
  const filterDropdown = document.getElementById("categoryFilter");
  if (filterDropdown) {
    filterDropdown.innerHTML = '<option value="">All Categories</option>';
    categoryList.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      filterDropdown.appendChild(opt);
    });
  }

  // Populate manual category dropdown
  const manualCatDropdown = document.getElementById("manualCategoryDropdown");
  if (manualCatDropdown) {
    manualCatDropdown.innerHTML = '<option value="">Select Category</option>';
    categoryList.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      manualCatDropdown.appendChild(opt);
    });
    const newCatOpt = document.createElement("option");
    newCatOpt.value = "__create_new__";
    newCatOpt.textContent = "Create New Category...";
    manualCatDropdown.appendChild(newCatOpt);
  }

function renderCategoryList() {
  const list = document.getElementById("categoryList");
  list.innerHTML = "";

  chrome.storage.local.get({ categories: [], links: [] }, (data) => {
    const categoryCounts = {};
    const categoryLinks = {};

    data.links.forEach(link => {
      if (link.category) {
        categoryCounts[link.category] = (categoryCounts[link.category] || 0) + 1;
        if (!categoryLinks[link.category]) categoryLinks[link.category] = [];
        categoryLinks[link.category].push(link);
      }
    });

    if (data.categories.length === 0) {
      list.textContent = "No saved categories.";
      return;
    }

    data.categories.forEach((cat, i) => {
      const categoryCard = document.createElement("div");
      categoryCard.className = "category-card";
      categoryCard.style.cssText = `
        margin-bottom: 12px;
        padding: 12px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-card);
        transition: all 0.2s ease;
      `;

      // Category header with expand/collapse
      const categoryHeader = document.createElement("div");
      categoryHeader.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        user-select: none;
      `;

      const categoryInfo = document.createElement("div");
      categoryInfo.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      `;

      const expandIcon = document.createElement("span");
      expandIcon.innerHTML = "▶";
      expandIcon.style.cssText = `
        font-size: 12px;
        color: var(--text-secondary);
        transition: transform 0.2s ease;
        margin-right: 8px;
      `;

      const categoryName = document.createElement("strong");
      categoryName.textContent = cat;
      categoryName.style.cssText = `
        color: var(--text-primary);
        font-size: 14px;
      `;

      const categoryCount = document.createElement("span");
      categoryCount.textContent = `(${categoryCounts[cat] || 0} links)`;
      categoryCount.style.cssText = `
        color: var(--text-secondary);
        font-size: 12px;
      `;

      categoryInfo.appendChild(expandIcon);
      categoryInfo.appendChild(categoryName);
      categoryInfo.appendChild(categoryCount);

      // Action buttons
      const actionButtons = document.createElement("div");
      actionButtons.style.cssText = `
        display: flex;
        gap: 6px;
        align-items: center;
      `;

      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️";
      editBtn.title = "Edit Name";
      editBtn.style.cssText = `
        padding: 6px 8px;
        font-size: 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #64748b;
      `;
      editBtn.onclick = (e) => {
        e.stopPropagation();
        const newName = prompt("Enter a new name for this category:", cat);
        if (!newName || newName === cat || data.categories.includes(newName)) return;

        // Update category name in links and category list
        data.links.forEach(link => {
          if (link.category === cat) link.category = newName;
        });

        data.categories[i] = newName;

        chrome.storage.local.set({ links: data.links, categories: data.categories }, () => {
          renderCategoryList();
          updateAllCategoryDropdowns();
          runFilter(); // Refresh visible list
          displayLinks(allLinks); // Update main links panel
        });
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️";
      deleteBtn.title = "Delete Category";
      deleteBtn.style.cssText = `
        padding: 6px 8px;
        font-size: 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #64748b;
      `;
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to delete category "${cat}"? Links will remain but lose this category.`)) return;

        // Remove category from list
        const updatedCategories = data.categories.filter(c => c !== cat);

        // Strip category from links
        data.links.forEach(link => {
          if (link.category === cat) link.category = "";
        });

        chrome.storage.local.set({ categories: updatedCategories, links: data.links }, () => {
          renderCategoryList();
          updateAllCategoryDropdowns();
          runFilter(); // Re-filter to reflect changes
          displayLinks(allLinks); // Update main links panel
        });
      };

      actionButtons.appendChild(editBtn);
      actionButtons.appendChild(deleteBtn);

      categoryHeader.appendChild(categoryInfo);
      categoryHeader.appendChild(actionButtons);

      // Collapsible content
      const categoryContent = document.createElement("div");
      categoryContent.className = "category-content";
      categoryContent.style.cssText = `
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--border-color);
        display: none;
        max-height: 200px;
        overflow-y: auto;
      `;

      // Add links to content
      const links = categoryLinks[cat] || [];
      links.forEach((link, linkIndex) => {
        const linkRow = document.createElement("div");
        linkRow.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          padding: 8px;
          background: var(--bg-secondary);
          border-radius: 6px;
          border: 1px solid var(--border-light);
        `;

        const linkAnchor = document.createElement("a");
        linkAnchor.href = link.url;
        linkAnchor.target = "_blank";
        linkAnchor.textContent = link.title;
        linkAnchor.style.cssText = `
          color: var(--text-primary);
          text-decoration: none;
          font-size: 13px;
          flex: 1;
          margin-right: 8px;
          word-break: break-word;
        `;

        const removeBtn = document.createElement("button");
        removeBtn.innerHTML = "🗑️";
        removeBtn.title = "Remove from category";
        removeBtn.style.cssText = `
          padding: 4px 6px;
          font-size: 11px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #64748b;
          flex-shrink: 0;
        `;
        removeBtn.onclick = (e) => {
          e.stopPropagation();
          // Remove category from this link
          const linkToUpdate = data.links.find(l => l.id === link.id);
          if (linkToUpdate) {
            linkToUpdate.category = "";
            chrome.storage.local.set({ links: data.links }, () => {
              renderCategoryList();
              displayLinks(allLinks);
              runFilter();
            });
          }
        };

        linkRow.appendChild(linkAnchor);
        linkRow.appendChild(removeBtn);
        categoryContent.appendChild(linkRow);
      });

      // Toggle functionality
      let isExpanded = false;
      categoryHeader.addEventListener('click', () => {
        isExpanded = !isExpanded;
        if (isExpanded) {
          categoryContent.style.display = 'block';
          expandIcon.style.transform = 'rotate(90deg)';
          categoryCard.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        } else {
          categoryContent.style.display = 'none';
          expandIcon.style.transform = 'rotate(0deg)';
          categoryCard.style.boxShadow = 'none';
        }
      });

      // Add hover effects
      categoryCard.addEventListener('mouseenter', () => {
        categoryCard.style.borderColor = '#3b82f6';
        categoryCard.style.transform = 'translateY(-1px)';
      });

      categoryCard.addEventListener('mouseleave', () => {
        categoryCard.style.borderColor = 'var(--border-color)';
        categoryCard.style.transform = 'translateY(0)';
      });

      categoryCard.appendChild(categoryHeader);
      categoryCard.appendChild(categoryContent);
      list.appendChild(categoryCard);
    });
  });
}
  // ✅ Display links
  displayLinks(allLinks);

  // ✅ Display sessions
renderSessionList();
renderCategoryList();

// ✅ Initialize dark mode
initializeDarkMode();

// ✅ Initialize draggable panels
initializePanels();



// Help Popup Logic
const helpBtn = document.getElementById('helpBtn');
const helpPopup = document.getElementById('helpPopup');
const closeHelpPopup = document.getElementById('closeHelpPopup');

if (helpBtn && helpPopup && closeHelpPopup) {
  // Show popup when button is clicked
  helpBtn.addEventListener('click', () => {
    helpPopup.classList.add('show');
    helpPopup.style.opacity = '0';
    setTimeout(() => { helpPopup.style.opacity = '1'; }, 10);
  });

  // Close popup when X is clicked
  closeHelpPopup.addEventListener('click', () => {
    helpPopup.style.opacity = '0';
    setTimeout(() => { 
      helpPopup.classList.remove('show');
    }, 200);
  });

  // Close popup when clicking outside
  helpPopup.addEventListener('click', (e) => {
    if (e.target === helpPopup) {
      helpPopup.style.opacity = '0';
      setTimeout(() => { 
        helpPopup.classList.remove('show');
      }, 200);
    }
  });
}

});
