// ── SARDAR IT REFERENCE ENGINE CONTROL SYSTEM ────────────────────────

// Fallback System Prompt and Templates
const SYSTEM_PROMPT = `You are an expert IT Proposal Writer for SardarIT. 
Analyze the client's brief. Search the provided Project Database. Only use the listed project entries in the prompt and pick the top 3 most relevant URLs based on Category and Tech Stack. 
Then, select the correct template below based on the brief's Category (WordPress, Full Stack, E-commerce, or Graphics) and write the proposal.`;

// --- MAIN CONFIGURATION & STATE ---
let activeView = 'view-generator';
let portfolioOffset = 0;
const portfolioLimit = 20;
let filteredProjects = [];
let generationHistory = [];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  detectLayoutMode();
  initResizablePopup();
  initDatabaseAndFilters();
  loadSettings();
  setupEventListeners();
  loadHistory();
  
  // Initial icons render
  refreshIcons();
});

// Refresh Lucide Icons helper
function refreshIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Detect if opened in popup or full browser tab
function detectLayoutMode() {
  // If window width is wider than 800px, we treat it as tab mode
  if (window.innerWidth > 800) {
    document.body.classList.add('full-tab');
    
    // Rename tab mode icon to show active status or hide it
    const tabBtn = document.getElementById('tab-mode-btn');
    if (tabBtn) {
      tabBtn.classList.add('active-toggle');
      tabBtn.title = "Running in Widescreen Tab Mode";
    }
  }
}

// --- POPUP RESIZING HANDLE ---
function initResizablePopup() {
  const handle = document.getElementById('popup-resize-handle');
  if (!handle) return;

  // Check if we are in full tab mode. If so, resize is handled natively by the browser window.
  if (window.innerWidth > 800) {
    return;
  }

  // Load saved dimensions
  const popup_width = localStorage.getItem('popup_width');
  const popup_height = localStorage.getItem('popup_height');
  if (popup_width) {
    document.body.style.width = `${popup_width}px`;
  }
  if (popup_height) {
    document.body.style.height = `${popup_height}px`;
  }

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startWidth = document.body.clientWidth;
    const startHeight = document.body.clientHeight;
    const startX = e.clientX;
    const startY = e.clientY;

    function doDrag(dragEvent) {
      const newWidth = Math.max(780, Math.min(800, startWidth + (dragEvent.clientX - startX)));
      const newHeight = Math.max(580, Math.min(600, startHeight + (dragEvent.clientY - startY)));
      document.body.style.width = `${newWidth}px`;
      document.body.style.height = `${newHeight}px`;
    }

    function stopDrag() {
      document.documentElement.removeEventListener('mousemove', doDrag);
      document.documentElement.removeEventListener('mouseup', stopDrag);
      
      // Save dimensions
      const finalWidth = parseInt(document.body.style.width, 10);
      const finalHeight = parseInt(document.body.style.height, 10);
      localStorage.setItem('popup_width', finalWidth);
      localStorage.setItem('popup_height', finalHeight);
    }

    document.documentElement.addEventListener('mousemove', doDrag);
    document.documentElement.addEventListener('mouseup', stopDrag);
  });
}

// --- DATABASE & FILTER POPULATION ---
function initDatabaseAndFilters() {
  if (typeof PROJECT_DB !== 'undefined' && PROJECT_DB.length > 0) {
    // Populate header stats
    document.getElementById('project-count-text').innerText = `${PROJECT_DB.length} References`;
    
    const categories = [...new Set(PROJECT_DB.map(p => p.Category))].filter(Boolean);
    const categoryCountSpan = document.getElementById('categories-count-stat');
    if (categoryCountSpan) categoryCountSpan.innerText = categories.length;
    
    // Set total references loaded in cards
    document.getElementById('projects-loaded-stat').innerText = `${PROJECT_DB.length} projects`;
    
    // Populate AI Generator Category Filter
    populateCategoryFilters(categories);
    
    // Populate Portfolio Explorer Filter Controls
    populatePortfolioFilters(categories);
    
    // Database Status Indicator Update
    const statusDot = document.getElementById('status-dot');
    const statusMsg = document.getElementById('db-status-msg');
    if (statusDot) {
      statusDot.classList.remove('status-dot--loading');
      statusDot.classList.add('status-dot--ready');
    }
    if (statusMsg) {
      statusMsg.innerText = 'Local Database: Connected';
      statusMsg.classList.remove('db-status--loading');
    }
    
    // Initialize Portfolio Grid data
    filteredProjects = [...PROJECT_DB];
    renderPortfolioGrid(true);
    
    // Render Statistics Charts in Settings
    renderCategoryDistributionChart(categories);
  }
}

// Populate Category Chips in AI Generator
function populateCategoryFilters(categories) {
  const bar = document.getElementById('category-filter-bar');
  if (!bar) return;
  
  // Keep the "All" chip, remove other items to reload
  const allBtn = bar.querySelector('[data-cat="All"]');
  bar.innerHTML = '';
  if (allBtn) bar.appendChild(allBtn);
  
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-chip';
    btn.setAttribute('data-cat', cat);
    btn.innerText = cat;
    bar.appendChild(btn);
  });
}

// Populate Dropdowns & Pills in Portfolio Explorer
function populatePortfolioFilters(categories) {
  const catSelect = document.getElementById('portfolio-category-select');
  const catPills = document.getElementById('portfolio-category-pills');
  const techSelect = document.getElementById('portfolio-tech-select');
  
  if (catSelect) {
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.innerText = cat;
      catSelect.appendChild(opt);
    });
  }
  
  // Populate category pills with count badges
  if (catPills) {
    catPills.innerHTML = '<button class="pills-chip active" data-cat="All">All <span class="pills-count">' + PROJECT_DB.length + '</span></button>';
    categories.forEach(cat => {
      const count = PROJECT_DB.filter(p => p.Category === cat).length;
      const btn = document.createElement('button');
      btn.className = 'pills-chip';
      btn.setAttribute('data-cat', cat);
      btn.innerHTML = `${cat} <span class="pills-count">${count}</span>`;
      catPills.appendChild(btn);
    });
  }

  // Extract unique technologies from "Used Stack" database items
  if (techSelect) {
    const techSet = new Set();
    PROJECT_DB.forEach(p => {
      const stackStr = p['Used Stack'] || p['Main Technology'] || '';
      stackStr.split(',').forEach(t => {
        const cleanTech = t.trim();
        if (cleanTech && cleanTech.length > 1 && cleanTech.length < 25) {
          techSet.add(cleanTech);
        }
      });
    });
    
    // Sort and limit tech options
    const sortedTech = Array.from(techSet).sort();
    sortedTech.forEach(tech => {
      const opt = document.createElement('option');
      opt.value = tech;
      opt.innerText = tech;
      techSelect.appendChild(opt);
    });
    
    // Update tech stats count
    const techCountLabel = document.getElementById('stat-tech-count');
    if (techCountLabel) techCountLabel.innerText = `${sortedTech.length}+`;
  }
}

// Render Settings statistics progress bars
function renderCategoryDistributionChart(categories) {
  const chart = document.getElementById('settings-category-chart');
  if (!chart) return;
  
  chart.innerHTML = '';
  
  // Calculate counts
  const breakdown = [];
  categories.forEach(cat => {
    const count = PROJECT_DB.filter(p => p.Category === cat).length;
    breakdown.push({ category: cat, count: count });
  });
  
  // Sort descending
  breakdown.sort((a, b) => b.count - a.count);
  
  // Render bars
  breakdown.forEach(item => {
    const percentage = (item.count / PROJECT_DB.length) * 100;
    const row = document.createElement('div');
    row.className = 'chart-bar-row';
    row.innerHTML = `
      <div class="chart-bar-labels">
        <span>${item.category}</span>
        <span>${item.count} projects (${percentage.toFixed(0)}%)</span>
      </div>
      <div class="chart-bar-container">
        <div class="chart-bar-fill" style="width: ${percentage}%"></div>
      </div>
    `;
    chart.appendChild(row);
  });
}

// --- VIEW NAVIGATION (ROUTER) ---
function setupEventListeners() {
  // Sidebar items navigation click handler
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPanelId = btn.getAttribute('data-target');
      switchView(targetPanelId);
      
      // Update sidebar visual active states
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Open in Tab Button
  const tabModeBtn = document.getElementById('tab-mode-btn');
  if (tabModeBtn) {
    tabModeBtn.addEventListener('click', () => {
      if (false) {
        // removed chrome.tabs
      } else {
        window.open(window.location.href, '_blank');
      }
    });
  }

  // Theme Toggle Button
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // API Key Quick Settings Shortcut
  const apiQuickBtn = document.getElementById('api-key-quick-btn');
  if (apiQuickBtn) {
    apiQuickBtn.addEventListener('click', () => {
      switchView('view-settings');
      document.querySelectorAll('.nav-item').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-target') === 'view-settings');
      });
      const settingsKeyInput = document.getElementById('settings-api-key');
      if (settingsKeyInput) settingsKeyInput.focus();
    });
  }

  // --- AI GENERATOR EVENT LISTENERS ---
  
  // Situation chips pre-fill
  document.getElementById('situation-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.sit-chip');
    if (chip) {
      document.getElementById('brief-input').value = chip.getAttribute('data-fill');
      updateWordCount();
    }
  });

  // Category filters inside Generator
  document.getElementById('category-filter-bar').addEventListener('click', (e) => {
    const chip = e.target.closest('.cat-chip');
    if (chip) {
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('cat-chip--active'));
      chip.classList.add('cat-chip--active');
    }
  });

  // Brief word/character counter
  const briefInput = document.getElementById('brief-input');
  if (briefInput) {
    briefInput.addEventListener('input', updateWordCount);
    briefInput.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('btn-proposal').click();
      }
    });
  }

  // Pricing Mode Select toggle
  const pricingModeSelect = document.getElementById('pricing-mode-select');
  if (pricingModeSelect) {
    pricingModeSelect.addEventListener('change', (e) => {
      const mode = e.target.value;
      document.getElementById('fixed-price-fields').style.display = mode === 'fixed' ? 'block' : 'none';
      document.getElementById('milestone-pricing-fields').style.display = mode === 'milestones' ? 'block' : 'none';
      
      // If milestones list is empty, pre-populate 2 default items
      if (mode === 'milestones') {
        const list = document.getElementById('pricing-milestones-list');
        if (list && list.children.length === 0) {
          addMilestoneRow("Design & Prototyping", "$150", "3 days");
          addMilestoneRow("Development & Integration", "$350", "7 days");
        }
      }
    });
  }

  // Add Milestone Row button
  const addMilestoneBtn = document.getElementById('pricing-add-milestone-btn');
  if (addMilestoneBtn) {
    addMilestoneBtn.addEventListener('click', () => {
      addMilestoneRow();
    });
  }

  // Action buttons trigger
  document.getElementById('find-matches-btn').addEventListener('click', () => handleAction('match'));
  document.getElementById('btn-proposal').addEventListener('click', () => handleAction('proposal'));

  // Copy to clipboard from output viewport
  document.getElementById('copy-output-btn').addEventListener('click', () => {
    const outputContent = document.getElementById('output-content');
    
    // In details view, copy the links; in output view, copy the proposal
    const textToCopy = outputContent.innerText;
    if (textToCopy && !outputContent.querySelector('.empty-state')) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Copied to clipboard!');
      }).catch(err => {
        showToast('Failed to copy: ' + err);
      });
    } else {
      showToast('Nothing to copy yet!');
    }
  });

  // Switch output view tabs (Raw Output vs Matched Project Details)
  const tabReferences = document.getElementById('tab-references');
  const tabMatchedDetails = document.getElementById('tab-matched-details');
  
  if (tabReferences && tabMatchedDetails) {
    tabReferences.addEventListener('click', () => {
      tabReferences.classList.add('active');
      tabMatchedDetails.classList.remove('active');
      toggleOutputDisplay('proposal');
    });
    
    tabMatchedDetails.addEventListener('click', () => {
      tabMatchedDetails.classList.add('active');
      tabReferences.classList.remove('active');
      toggleOutputDisplay('links');
    });
  }

  // Quick API Modal events
  document.getElementById('close-api-modal').addEventListener('click', () => {
    document.getElementById('api-modal').style.display = 'none';
  });
  document.getElementById('save-api-key').addEventListener('click', () => {
    const key = document.getElementById('api-key-input').value.trim();
    if (key) {
      localStorage.setItem('gemini_key', key);
      showToast('API Key Saved!');
      document.getElementById('api-modal').style.display = 'none';
      
      // Update both input controls
      document.getElementById('settings-api-key').value = key;
      updateApiKeyIconStatus(true);
    }
  });

  // --- PORTFOLIO EXPLORER EVENT LISTENERS ---
  const searchInput = document.getElementById('portfolio-search-input');
  const clearSearch = document.getElementById('clear-search-btn');
  const catSelect = document.getElementById('portfolio-category-select');
  const techSelect = document.getElementById('portfolio-tech-select');
  const catPills = document.getElementById('portfolio-category-pills');
  const portfolioScroll = document.getElementById('portfolio-grid-container');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (clearSearch) clearSearch.style.display = searchInput.value ? 'block' : 'none';
      filterPortfolioItems();
    });
  }
  if (clearSearch) {
    clearSearch.addEventListener('click', () => {
      searchInput.value = '';
      clearSearch.style.display = 'none';
      filterPortfolioItems();
    });
  }
  if (catSelect) catSelect.addEventListener('change', filterPortfolioItems);
  if (techSelect) techSelect.addEventListener('change', filterPortfolioItems);
  
  if (catPills) {
    catPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.pills-chip');
      if (pill) {
        catPills.querySelectorAll('.pills-chip').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        
        // Match the dropdown filter
        const catVal = pill.getAttribute('data-cat');
        if (catSelect) {
          catSelect.value = catVal;
        }
        filterPortfolioItems();
      }
    });
  }

  // Lazy loading scrolling listener
  if (portfolioScroll) {
    portfolioScroll.addEventListener('scroll', () => {
      const trigger = document.getElementById('portfolio-loading-trigger');
      if (trigger && isElementInScrollParentViewport(trigger, portfolioScroll)) {
        renderMoreProjects();
      }
    });
  }

  // Portfolio items copy listener (delegated)
  const cardsGrid = document.getElementById('portfolio-cards-grid');
  if (cardsGrid) {
    cardsGrid.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('.project-btn-copy');
      if (copyBtn) {
        const url = copyBtn.getAttribute('data-url');
        navigator.clipboard.writeText(url).then(() => {
          showToast('Project URL Copied!');
        });
      }
    });
  }

  // --- HISTORY VIEW EVENT LISTENERS ---
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const historyItemsList = document.getElementById('history-items-list');
  const restoreBriefBtn = document.getElementById('history-load-brief-btn');
  const copyHistoryBtn = document.getElementById('history-copy-proposal-btn');

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your generation history?')) {
        clearHistory();
      }
    });
  }

  if (historyItemsList) {
    historyItemsList.addEventListener('click', (e) => {
      const item = e.target.closest('.history-item');
      if (item) {
        historyItemsList.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        const index = parseInt(item.getAttribute('data-index'), 10);
        showHistoryDetail(index);
      }
    });
  }

  if (restoreBriefBtn) {
    restoreBriefBtn.addEventListener('click', () => {
      const activeItem = historyItemsList.querySelector('.history-item.active');
      if (activeItem) {
        const index = parseInt(activeItem.getAttribute('data-index'), 10);
        const log = generationHistory[index];
        if (log) {
          // Put brief in generator, set tone and navigate
          document.getElementById('brief-input').value = log.brief;
          document.getElementById('proposal-tone').value = log.tone || 'professional';
          updateWordCount();
          
          // Switch to Generator panel
          switchView('view-generator');
          document.querySelectorAll('.nav-item').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-target') === 'view-generator');
          });
          
          showToast('Brief restored to generator tab!');
        }
      }
    });
  }

  if (copyHistoryBtn) {
    copyHistoryBtn.addEventListener('click', () => {
      const activeItem = historyItemsList.querySelector('.history-item.active');
      if (activeItem) {
        const index = parseInt(activeItem.getAttribute('data-index'), 10);
        const log = generationHistory[index];
        if (log && log.output) {
          navigator.clipboard.writeText(log.output).then(() => {
            showToast('Copied proposal draft!');
          });
        }
      }
    });
  }

  // --- SETTINGS VIEW EVENT LISTENERS ---
  
  // Toggle visibility of API key password
  const toggleApiEye = document.getElementById('toggle-show-api-key');
  if (toggleApiEye) {
    toggleApiEye.addEventListener('click', () => {
      const input = document.getElementById('settings-api-key');
      const icon = toggleApiEye.querySelector('i, svg');
      if (input.type === 'password') {
        input.type = 'text';
        icon.setAttribute('data-lucide', 'eye-off');
      } else {
        input.type = 'password';
        icon.setAttribute('data-lucide', 'eye');
      }
      refreshIcons();
    });
  }

  // Save Settings Button
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveSettings);
  }
}

// Router Switch helper
function switchView(panelId) {
  activeView = panelId;
  
  // Hide all panels, show active
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.remove('active-view');
  });
  
  const targetPanel = document.getElementById(panelId);
  if (targetPanel) {
    targetPanel.classList.add('active-view');
  }

  // Modify page title and subtitle dynamically in header
  const title = document.getElementById('view-title');
  const subtitle = document.getElementById('view-subtitle');
  
  if (panelId === 'view-generator') {
    title.innerText = "Sardar IT Proposal Generator";
    subtitle.innerText = "Generate breif response for Fiverr using Zunaid's local project intelligence";
  } else if (panelId === 'view-portfolio') {
    title.innerText = "Portfolio Explorer";
    subtitle.innerText = "Browse, search, and manage 560+ curated project references";
    // Trigger scroll layout update to load portfolio projects
    setTimeout(filterPortfolioItems, 50);
  } else if (panelId === 'view-history') {
    title.innerText = "Proposal History Log";
    subtitle.innerText = "Review and restore previous runs from local session state";
    loadHistory();
  } else if (panelId === 'view-settings') {
    title.innerText = "Configuration Settings";
    subtitle.innerText = "Configure Gemini AI models, parameters, signatures, and credentials";
  }

  // Trigger icons update inside new view panels
  refreshIcons();
}

// Utility: check if element is visible in scroll container
function isElementInScrollParentViewport(el, parent) {
  const rect = el.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();
  return rect.top <= parentRect.bottom;
}

// --- THEME ---
function toggleTheme() {
  const html = document.querySelector('html');
  const current = html.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  
  const themeIcon = document.getElementById('theme-icon');
  if (themeIcon) {
    themeIcon.setAttribute('data-lucide', next === 'light' ? 'moon' : 'sun');
    refreshIcons();
  }
  
  localStorage.setItem('theme', next);
}

function loadSettings() {
  const result = {
    theme: localStorage.getItem('theme'),
    gemini_key: localStorage.getItem('gemini_key'),
    default_model: localStorage.getItem('default_model'),
    default_tone: localStorage.getItem('default_tone'),
    signature: localStorage.getItem('signature')
  };
  
  // Theme
  if (result.theme) {
    document.querySelector('html').setAttribute('data-theme', result.theme);
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      themeIcon.setAttribute('data-lucide', result.theme === 'light' ? 'moon' : 'sun');
      refreshIcons();
    }
  }
  
  // Key Input Values
  const key = result.gemini_key || '';
  document.getElementById('settings-api-key').value = key;
  document.getElementById('api-key-input').value = key;
  updateApiKeyIconStatus(!!key);
  
  // Proposal Parameters
  const model = result.default_model || 'gemini-flash-latest';
  document.getElementById('settings-default-model').value = model;
  
  const tone = result.default_tone || 'professional';
  document.getElementById('settings-default-tone').value = tone;
  document.getElementById('proposal-tone').value = tone;

  const signature = result.signature || 'Regards,';
  document.getElementById('settings-signature').value = signature;
}

function saveSettings() {
  const key = document.getElementById('settings-api-key').value.trim();
  const model = document.getElementById('settings-default-model').value;
  const tone = document.getElementById('settings-default-tone').value;
  const signature = document.getElementById('settings-signature').value.trim();

  // Save to chrome.storage
  localStorage.setItem('gemini_key', key);
  localStorage.setItem('default_model', model);
  localStorage.setItem('default_tone', tone);
  localStorage.setItem('signature', signature);

  // Update local variables or quick settings in UI
  document.getElementById('proposal-tone').value = tone;
  document.getElementById('api-key-input').value = key;
  updateApiKeyIconStatus(!!key);
  showToast('Settings saved successfully!');
}

function updateApiKeyIconStatus(hasKey) {
  const icon = document.getElementById('api-key-icon-status');
  if (icon) {
    if (hasKey) {
      icon.style.color = 'var(--accent-green)';
      icon.parentElement.title = "Gemini Key Connected";
    } else {
      icon.style.color = 'var(--text-muted)';
      icon.parentElement.title = "API Key Missing (Configure Settings)";
    }
  }
}

function updateWordCount() {
  const text = document.getElementById('brief-input').value;
  document.getElementById('char-count').innerText = `${text.length}/2000`;
  document.getElementById('word-count').innerHTML = `<i data-lucide="text"></i> ${text.trim() ? text.trim().split(/\s+/).length : 0} words`;
  refreshIcons();
}

// --- PORTFOLIO EXPLORER FILTER & LAZY RENDERING ---
function filterPortfolioItems() {
  const searchInput = document.getElementById('portfolio-search-input');
  const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  const catSelect = document.getElementById('portfolio-category-select');
  const catVal = catSelect ? catSelect.value : 'All';
  
  const techSelect = document.getElementById('portfolio-tech-select');
  const techVal = techSelect ? techSelect.value : 'All';

  // Apply filters
  filteredProjects = PROJECT_DB.filter(p => {
    // Category match
    if (catVal !== 'All' && p.Category !== catVal) return false;
    
    // Tech Stack match
    if (techVal !== 'All') {
      const stack = (p['Used Stack'] || p['Main Technology'] || '').toLowerCase();
      if (!stack.includes(techVal.toLowerCase())) return false;
    }
    
    // Search match
    if (searchVal) {
      const url = (p['Website URL'] || '').toLowerCase();
      const cat = (p.Category || '').toLowerCase();
      const stack = (p['Used Stack'] || p['Main Technology'] || '').toLowerCase();
      const desc = (p['Brief Description'] || '').toLowerCase();
      const features = (p['Website Features'] || '').toLowerCase();
      const keywords = (p.Keywords || '').toLowerCase();
      const strengths = (p.Strengths || '').toLowerCase();
      
      const matchSearch = url.includes(searchVal) || 
                          cat.includes(searchVal) || 
                          stack.includes(searchVal) || 
                          desc.includes(searchVal) || 
                          features.includes(searchVal) || 
                          keywords.includes(searchVal) ||
                          strengths.includes(searchVal);
      
      if (!matchSearch) return false;
    }
    
    return true;
  });

  // Reset scroll and offset, render grid from start
  portfolioOffset = 0;
  renderPortfolioGrid(true);
}

// Render portfolio grid (resets or appends)
function renderPortfolioGrid(reset = false) {
  const grid = document.getElementById('portfolio-cards-grid');
  const countText = document.getElementById('results-count-text');
  
  if (!grid) return;
  if (reset) grid.innerHTML = '';

  if (filteredProjects.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i data-lucide="info" class="empty-icon"></i>
        <h4>No reference projects found</h4>
        <p>Try refining your search terms or adjustments to category/tech filters.</p>
      </div>
    `;
    if (countText) countText.innerText = "Showing 0 projects";
    document.getElementById('portfolio-loading-trigger').style.display = 'none';
    refreshIcons();
    return;
  }

  if (countText) {
    countText.innerText = `Showing ${filteredProjects.length} matching reference${filteredProjects.length !== 1 ? 's' : ''}`;
  }

  // Load first slice
  renderMoreProjects();
}

function renderMoreProjects() {
  const grid = document.getElementById('portfolio-cards-grid');
  const trigger = document.getElementById('portfolio-loading-trigger');
  
  if (!grid || portfolioOffset >= filteredProjects.length) {
    if (trigger) trigger.style.display = 'none';
    return;
  }

  if (trigger) trigger.style.display = 'flex';
  
  const end = Math.min(portfolioOffset + portfolioLimit, filteredProjects.length);
  const chunk = filteredProjects.slice(portfolioOffset, end);
  
  chunk.forEach(p => {
    const card = document.createElement('div');
    card.className = 'project-card';
    
    const cleanUrl = p['Website URL'] || '';
    const cleanStack = p['Used Stack'] || p['Main Technology'] || 'Custom Web Dev';
    
    // Build project tags list
    const tagsArr = cleanStack.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4);
    const tagsHtml = tagsArr.map(t => `<span class="project-tag">${t}</span>`).join('');
    
    // Format bullet strengths list
    let strengthsHtml = '';
    if (p.Strengths) {
      const cleanStrengths = p.Strengths.replace(/[•\-\*]/g, '').trim().split('\n').filter(Boolean).slice(0, 2);
      strengthsHtml = `<div class="project-card-strengths">${cleanStrengths.map(s => `• ${s.trim()}`).join('<br>')}</div>`;
    }
    
    card.innerHTML = `
      <div class="project-card-header">
        <div class="project-card-title-group">
          <a href="${cleanUrl}" target="_blank" class="project-card-url">${cleanUrl}</a>
          <span class="project-card-cat">${p.Category || 'Project'}</span>
        </div>
        <div class="project-card-actions">
          <button class="project-btn-copy" data-url="${cleanUrl}">
            <i data-lucide="copy"></i> Copy Link
          </button>
        </div>
      </div>
      <p class="project-card-desc">${p['Brief Description'] || 'No details provided.'}</p>
      <div class="project-card-tags">
        ${tagsHtml}
      </div>
      ${strengthsHtml}
    `;
    grid.appendChild(card);
  });
  
  portfolioOffset = end;
  
  // Hide trigger if fully loaded
  if (portfolioOffset >= filteredProjects.length && trigger) {
    trigger.style.display = 'none';
  }
  
  // Refresh newly appended icons
  refreshIcons();
}

// --- STATE MANAGER FOR OUTPUT RENDERER ---
let currentProposalDraft = '';
let currentMatchedDetails = '';

function toggleOutputDisplay(viewMode) {
  const output = document.getElementById('output-content');
  if (viewMode === 'proposal') {
    output.innerText = currentProposalDraft || "No proposal generated.";
  } else {
    output.innerHTML = currentMatchedDetails || "No matched references.";
  }
}

// --- CORE AI PROPOSAL GENERATOR SYSTEM ---
async function handleAction(actionType) {
  const brief = document.getElementById('brief-input').value.trim();
  if (!brief) return showToast('Please enter a brief description first!');

  // Retrieve Gemini configurations
  const storeData = {
    gemini_key: localStorage.getItem('gemini_key'),
    default_model: localStorage.getItem('default_model'),
    signature: localStorage.getItem('signature')
  };
  
  const key = storeData.gemini_key;
  const targetModel = storeData.default_model || 'gemini-flash-latest';
  const customSignature = storeData.signature || 'Regards,';
  
  // If key is missing, show fallback configuration modal
  if (!key) {
    document.getElementById('api-modal').style.display = 'block';
    return;
  }

  const outputContent = document.getElementById('output-content');
  const tabsReferences = document.getElementById('tab-references');
  const tabDetails = document.getElementById('tab-matched-details');
  
  // Reset tabs to default active view
  tabsReferences.classList.add('active');
  tabDetails.classList.remove('active');
  tabDetails.style.display = 'none'; // Hide details until success
  
  outputContent.innerHTML = `
    <div class="empty-state">
      <div class="spinner"></div>
      <h4 style="margin-top: 12px;">Generating Your Request...</h4>
      <p>Analyzing context and matching database projects via Gemini AI...</p>
    </div>
  `;

  // Filter local database matching the selected Category Chip in UI
  const activeCat = document.querySelector('.cat-chip--active')?.getAttribute('data-cat') || 'All';
  let filteredDb = PROJECT_DB;
  if (activeCat !== 'All') {
    filteredDb = PROJECT_DB.filter(p => p.Category === activeCat);
  }

  // BUG FIX: Maps Website Features correctly using `p['Website Features']` instead of undefined `p.Features`
  const dbContext = filteredDb.map(p => 
    `URL: ${p['Website URL']} | Cat: ${p.Category} | Stack: ${p['Used Stack'] || p['Main Technology']} | Features: ${p['Website Features'] || p.Features} | BestFor: ${p['Best_For'] || p['Use_Case']} | Strengths: ${p.Strengths}`
  ).join('\n');

  // Tone Settings & Names values from inputs
  const toneSelect = document.getElementById('proposal-tone');
  const tone = toneSelect ? toneSelect.value : 'professional';
  const clientNameVal = document.getElementById('client-name').value.trim();
  const signatureVal = customSignature;

  // Dynamic Pricing & Timeline configuration parsing
  const pricingModeSelect = document.getElementById('pricing-mode-select');
  const pricingMode = pricingModeSelect ? pricingModeSelect.value : 'none';
  let pricingDirective = '';
  
  if (pricingMode === 'fixed') {
    const fixedAmount = document.getElementById('pricing-fixed-amount').value.trim();
    const fixedDuration = document.getElementById('pricing-fixed-duration').value.trim();
    if (fixedAmount || fixedDuration) {
      pricingDirective = `Include a total budget of "${fixedAmount || 'TBD'}" and an estimated delivery duration of "${fixedDuration || 'TBD'}" directly in the proposal, framing it professionally.`;
    }
  } else if (pricingMode === 'milestones') {
    const milestoneRows = document.querySelectorAll('#pricing-milestones-list .milestone-row');
    const milestoneList = [];
    milestoneRows.forEach((row, i) => {
      const name = row.querySelector('.ms-name').value.trim();
      const amount = row.querySelector('.ms-amount').value.trim();
      const duration = row.querySelector('.ms-duration').value.trim();
      if (name || amount || duration) {
        milestoneList.push(`- Milestone ${i + 1}: ${name || 'Phase Detail'} | Cost: ${amount || 'TBD'} | Timeframe: ${duration || 'TBD'}`);
      }
    });
    
    if (milestoneList.length > 0) {
      pricingDirective = `Structure the project deliverables with a clear Milestones breakdown under a dedicated heading (e.g. 'Project Deliverables & Milestones Schedule') before the matched projects list, using these items:\n${milestoneList.join('\n')}\nEnsure this schedule is formatted as a clean, readable list or table.`;
    }
  }

  let prompt = '';
  if (actionType === 'match') {
    prompt = `You are an expert IT Project Matcher. Based on the client brief, find the top 3 best matching projects from the database.
    
    Database:
    ${dbContext}
    
    Client Brief: ${brief}
    
    You MUST output your response in JSON format. Do not wrap the output in markdown code blocks. The JSON must have these exact keys:
    1. "brief_analysis": (string - a short one-sentence summary analysis of the client's brief requirements)
    2. "industry": (string - the target business category, e.g. E-commerce, Corporate, SaaS, Blogging, etc.)
    3. "template_selected": (string - value should be "None (Reference Match Only)")
    4. "database_matches": (array of strings - list of the website URLs of the matched projects, max 3)
    5. "proposal_draft": (string - a nicely formatted bulleted list of the top 3 matches, including the URL, Stack, and WHY it matches)`;
  } else {
    // Generate prompt with Tone and Signature directives
    const toneInstructions = {
      'professional': 'Write in a confident, professional, and authoritative agency tone.',
      'friendly': 'Write in a friendly, conversational, and warm tone.',
      'persuasive': 'Write in an highly persuasive, benefits-driven sales copy tone.',
      'technical': 'Write in a detail-oriented, technically precise, and execution-focused tone.'
    };
    
    const greetingDirective = clientNameVal 
      ? `Address the client directly in the greeting: "Hello ${clientNameVal},"` 
      : 'Use a standard professional greeting like "Hello there," or "Hope you are doing well."';
      
    prompt = `You are an expert IT Proposal Writer for SardarIT. Analyze the brief. Match it to the provided Database (pick top 3 most relevant items). Select the correct template (WordPress, Full Stack, E-commerce, or Graphics) and write the proposal.
    
    --- TEMPLATES ---
    
    --- TEMPLATE 1: WORDPRESS ---
    (Use this for WordPress, CMS, Elementor, blog, corporate sites)
    
    Hello there,
    
    I’ve carefully reviewed your requirements and fully understand the scope of work for [insert specific scope from brief].
    I assure you that I can help make the necessary tweaks to your existing website while also handling the graphic design tasks to keep your store visually appealing and aligned with your brand.
    
    Here’s what I’ll take care of:
    - [Insert specific deliverable from brief]
    - [Insert specific deliverable from brief]
    - Enhance the website's visual appeal and navigation
    - Optimize site performance for faster loading and smoother navigation
    - Fully responsive design across desktop, laptop, tablet, and mobile
    
    Additional benefits from my side:
    - Provide instructional videos on how you can manage your products, services, and content.
    - Unlimited revisions until you're satisfied
    
    Requirements: I’ll need access to your WordPress admin dashboard login credentials.
    
    Here are some recent WordPress projects I’ve completed for my clients:
    [Insert Matched Project 1 URL] ([Insert Matched Project 1 Best_For/Strengths])
    [Insert Matched Project 2 URL] ([Insert Matched Project 2 Best_For/Strengths])
    [Insert Matched Project 3 URL] ([Insert Matched Project 3 Best_For/Strengths])
    
    Please feel free to review them and let me know if you have any preferences or questions. I’m excited to collaborate.
    
    Best regards,
    [Signature]
    
    --- TEMPLATE 2: FULL STACK ---
    (Use this for custom web apps, databases, SaaS, dashboard systems)
    
    Hello there,
    
    Hope you are doing well.
    As a professional Full Stack Web Developer with over 6+ years of experience. I specialize in custom platform design, backend architecture, and secure database development. I am always proficient in swiftly resolving issues and ensuring flawless functionality.
    I assure you that I’ll be able to develop your platform into a polished, professional, and user-friendly system.
    
    For this project, we should have the following core areas and pages:
    - [Insert relevant pages from brief, e.g., User Frontend, Admin Backend, Authentication]
    
    Please let me know if you want to add/remove any other pages. Also, I’ll do the following things:
    - Develop responsive front-end features with a modern, intuitive layout
    - Design and implement interactive user profiles and dashboards
    - Set up a scalable backend database structure
    - Establish secure authentication and user permissions
    
    I’ll need access to your current platform/hosting, existing database schema, and any documentation.
    
    Here are some custom authentication platforms and dashboards I’ve developed:
    [Insert Matched Project 1 URL] ([Insert Matched Project 1 Best_For/Strengths])
    [Insert Matched Project 2 URL] ([Insert Matched Project 2 Best_For/Strengths])
    [Insert Matched Project 3 URL] ([Insert Matched Project 3 Best_For/Strengths])
    
    Please review the details and let me know if you are ready to move forward.
    
    Looking forward to working with you.
    Best regards,
    [Signature]
    
    --- TEMPLATE 3: E-COMMERCE ---
    (Use this for Shopify, WooCommerce, carts, products checkouts)
    
    Hello there,
    
    I’ve reviewed your requirements and understand that you're looking to build a professional e-commerce platform. I’d be happy to help you create a clean, modern, and high-performance platform.
    
    Here’s what I will provide:
    - Complete e-commerce platform development
    - Professional product gallery to showcase past work
    - Clean, modern & user-friendly design
    - Smooth cart & checkout experience
    - Fully mobile-responsive design (all devices)
    
    Additional Benefits I'll Provide:
    - Unlimited revisions
    - 30 days post-delivery support
    
    Here are some fully functional e-commerce websites I’ve developed:
    [Insert Matched Project 1 URL] ([Insert Matched Project 1 Best_For/Strengths])
    [Insert Matched Project 2 URL] ([Insert Matched Project 2 Best_For/Strengths])
    [Insert Matched Project 3 URL] ([Insert Matched Project 3 Best_For/Strengths])
    
    I’m confident I can deliver a visually impressive and functional platform.
    
    Feel free to reach out if you’d like to move forward.
    
    Regards,
    [Signature]
    
    --- TEMPLATE 4: GRAPHICS / DESIGN ---
    (Use this for logo design, branding, visual identity, pure design)
    
    Hello there,
    
    Thanks for sharing your project details. I’d be happy to help you design a modern, user-friendly store/site that clearly represents your brand and works seamlessly.
    
    Here's what I'll provide:
    - Design a clean, visually appealing store/site
    - Apply your branding, color scheme, and visual identity 
    - Ensure full responsiveness (desktop, tablet, mobile)
    - On-page SEO and speed optimization
    - Unlimited revisions
    - 30 Days of free support after delivering the project
    
    Requirements:
    - Logo design instructions & visual references
    - Content for the store
    
    Here are some of my work samples:
    [Insert Matched Project 1 URL] ([Insert Matched Project 1 Best_For/Strengths])
    [Insert Matched Project 2 URL] ([Insert Matched Project 2 Best_For/Strengths])
    [Insert Matched Project 3 URL] ([Insert Matched Project 3 Best_For/Strengths])
    
    Looking forward to discussing your ideas.
    
    Best regards,
    [Signature]
    
    --- RULES & PARAMETERS ---
    - Tone Directives: ${toneInstructions[tone]}
    - Greeting Directives: ${greetingDirective}
    - Signature Line: End the proposal draft with the signoff: "${signatureVal}" instead of default placeholders.
    - Pricing & Timeline: ${pricingDirective || 'Do not include explicit pricing details or duration timelines in the text. Focus on technical features and matches.'}
    - Never invent or hallucinate portfolio URLs. ONLY use URLs found in the uploaded database.
    - Always provide exactly 3 matched portfolio links at the bottom.
    - Merge the specific details of the user's brief naturally into the templates.
    
    Database:
    ${dbContext}
    
    Client Brief: ${brief}
    
    You MUST output your response in JSON format. Do not wrap the output in markdown code blocks. The JSON must have these exact keys:
    1. "brief_analysis": (string - a short one-sentence summary analysis of the client's brief requirements)
    2. "industry": (string - the target business category, e.g. E-commerce, Corporate, SaaS, Blogging, etc.)
    3. "template_selected": (string - the template you used: WordPress, Full Stack, E-commerce, or Graphics)
    4. "database_matches": (array of strings - list of the website URLs of the matched projects, max 3)
    5. "proposal_draft": (string - the complete generated proposal text using the template format and details)
    `;
  }

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 }
      })
    });

    const data = await response.json();
    if (data.error) {
      outputContent.innerText = "API Error: " + data.error.message;
    } else if (data.candidates && data.candidates.length > 0) {
      const generatedText = data.candidates[0].content.parts[0].text;
      
      let cleanedJsonText = generatedText.trim();
      if (cleanedJsonText.startsWith('```json')) {
        cleanedJsonText = cleanedJsonText.substring(7);
      } else if (cleanedJsonText.startsWith('```')) {
        cleanedJsonText = cleanedJsonText.substring(3);
      }
      if (cleanedJsonText.endsWith('```')) {
        cleanedJsonText = cleanedJsonText.substring(0, cleanedJsonText.length - 3);
      }
      cleanedJsonText = cleanedJsonText.trim();

      try {
        const responseObj = JSON.parse(cleanedJsonText);
        const briefAnalysis = responseObj.brief_analysis || 'N/A';
        const industry = responseObj.industry || 'N/A';
        const templateSelected = responseObj.template_selected || 'N/A';
        const databaseMatches = responseObj.database_matches || [];
        const proposalDraft = responseObj.proposal_draft || '';

        // Clean double asterisks markdown bolding to look cleaner in plain text
        currentProposalDraft = proposalDraft.replace(/\*\*/g, '');
        
        // Update System Logic card fields in UI
        document.getElementById('logic-brief-analysis').innerText = briefAnalysis;
        document.getElementById('logic-industry').innerText = industry;
        document.getElementById('logic-template-selected').innerText = templateSelected;

        const matchesContainer = document.getElementById('logic-database-matches');
        matchesContainer.innerHTML = '';
        if (databaseMatches.length > 0) {
          databaseMatches.forEach(url => {
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.className = 'logic-match-link';
            link.innerText = url;
            matchesContainer.appendChild(link);
          });
        } else {
          matchesContainer.innerText = 'None';
        }

        outputContent.innerText = currentProposalDraft;
        
        // Parse links for secondary view tab
        parseAndFormatMatchedLinks(currentProposalDraft);
        
        // Show details tab if we generated a proposal
        if (actionType === 'proposal') {
          tabDetails.style.display = 'flex';
        }
        
        // Append generation to persistent History
        saveToHistory(brief, activeCat, actionType, currentProposalDraft, tone);
      } catch (parseError) {
        console.error("JSON parse error, falling back to raw output:", parseError);
        const rawText = generatedText.replace(/\*\*/g, '');
        currentProposalDraft = rawText;
        outputContent.innerText = rawText;
        parseAndFormatMatchedLinks(rawText);
        
        // Reset System Logic card fields in fallback
        document.getElementById('logic-brief-analysis').innerText = 'Failed to parse JSON';
        document.getElementById('logic-industry').innerText = 'N/A';
        document.getElementById('logic-template-selected').innerText = actionType === 'match' ? 'None (Reference Match Only)' : 'Autodetect';
        document.getElementById('logic-database-matches').innerText = 'N/A';
        
        if (actionType === 'proposal') {
          tabDetails.style.display = 'flex';
        }
        saveToHistory(brief, activeCat, actionType, rawText, tone);
      }
      
    } else {
      outputContent.innerText = "Error: No response generated from Gemini API.";
    }
  } catch (e) {
    outputContent.innerText = "Network Communication Error: " + e.message;
  }
}

// Parses matches and formats clickable portfolio links in the secondary tab
function parseAndFormatMatchedLinks(proposalText) {
  // Regex to match URLs (http/https links)
  const urlRegex = /https?:\/\/[^\s\)\],]+/g;
  const urls = proposalText.match(urlRegex) || [];
  
  // Deduplicate matched links
  const uniqueUrls = [...new Set(urls)].slice(0, 3);
  
  if (uniqueUrls.length === 0) {
    currentMatchedDetails = `
      <div class="empty-state">
        <i data-lucide="alert-circle" class="empty-icon"></i>
        <h4>No portfolio links parsed</h4>
        <p>Gemini did not list any URLs in the generated proposal. Ensure templates match the query.</p>
      </div>
    `;
    return;
  }

  let linksHtml = '<div class="matched-links-header"><p>The proposal includes references to the following portfolio websites. Click to open and inspect:</p></div><div class="matched-links-container">';
  
  uniqueUrls.forEach((url, i) => {
    // Lookup database to get strengths
    const matchedProject = PROJECT_DB.find(p => p['Website URL'] === url);
    const category = matchedProject ? matchedProject.Category : 'Reference';
    const strengths = matchedProject ? (matchedProject.Strengths || matchedProject['Brief Description']) : 'Quality portfolio website reference.';
    
    linksHtml += `
      <div class="matched-project-item">
        <div class="matched-project-header">
          <a href="${url}" target="_blank">${url}</a>
          <span class="badge-cat">${category}</span>
        </div>
        <div class="matched-project-strength">
          <strong>Key Strengths:</strong><br>
          ${strengths.replace(/[•\-\*]/g, '').replace(/\n/g, '<br>')}
        </div>
      </div>
    `;
  });
  
  linksHtml += '</div>';
  currentMatchedDetails = linksHtml;
}

// --- HISTORY LOG TRACKER ---
function loadHistory() {
  const historyStr = localStorage.getItem('generation_history');
  generationHistory = historyStr ? JSON.parse(historyStr) : [];
  renderHistoryItems();
}

function saveToHistory(brief, category, action, output, tone) {
  const newItem = {
    id: Date.now(),
    timestamp: new Date().toLocaleString(),
    brief: brief,
    category: category,
    action: action,
    output: output,
    tone: tone
  };
  
  // Add to start of history list
  generationHistory.unshift(newItem);
  
  // Keep last 15 elements
  if (generationHistory.length > 15) {
    generationHistory = generationHistory.slice(0, 15);
  }
  
  localStorage.setItem('generation_history', JSON.stringify(generationHistory));
  renderHistoryItems();
}

function clearHistory() {
  generationHistory = [];
  localStorage.setItem('generation_history', '[]');
  renderHistoryItems();
  
  // Hide details pane workspace
  document.getElementById('history-detail-header').style.display = 'none';
  document.getElementById('history-detail-workspace').innerHTML = `
    <div class="empty-state">
      <i data-lucide="file-search" class="empty-icon"></i>
      <h4>Select a History Item</h4>
      <p>Choose an item from the sidebar to view details, restore the prompt, or copy the generated text.</p>
    </div>
  `;
  refreshIcons();
  showToast('History cleared.');
}

function renderHistoryItems() {
  const list = document.getElementById('history-items-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  if (generationHistory.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i data-lucide="history" class="empty-icon"></i>
        <p>No proposals generated yet in this session.</p>
      </div>
    `;
    refreshIcons();
    return;
  }
  
  generationHistory.forEach((item, index) => {
    const briefSnippet = item.brief.length > 38 ? item.brief.substring(0, 38) + '...' : item.brief;
    const dateLabel = item.timestamp ? item.timestamp.split(',')[0] : '';
    
    const div = document.createElement('div');
    div.className = 'history-item';
    div.setAttribute('data-index', index);
    div.innerHTML = `
      <div class="history-item-header">
        <span class="history-item-cat">${item.category} / ${item.action.toUpperCase()}</span>
        <span class="history-item-date">${dateLabel}</span>
      </div>
      <div class="history-item-snippet">${briefSnippet}</div>
    `;
    list.appendChild(div);
  });
  
  refreshIcons();
}

function showHistoryDetail(index) {
  const log = generationHistory[index];
  if (!log) return;
  
  // Display Header Action panel
  document.getElementById('history-detail-header').style.display = 'flex';
  
  // Set meta details
  document.getElementById('history-detail-category').innerText = `${log.category} (${log.action.toUpperCase()})`;
  document.getElementById('history-detail-time').innerText = log.timestamp;
  
  // Set content workspace
  const workspace = document.getElementById('history-detail-workspace');
  workspace.innerHTML = `
    <div class="history-detail-content-wrap">
      <div class="history-detail-section">
        <div class="history-detail-section-title">Job Brief Context</div>
        <div class="history-detail-box" style="font-family: var(--font-sans); color: var(--text-secondary);">${log.brief}</div>
      </div>
      
      <div class="history-detail-section">
        <div class="history-detail-section-title">Generated Proposal Draft</div>
        <div class="history-detail-box" style="white-space: pre-wrap; font-family: var(--font-sans); font-size: 11.5px; line-height: 1.55;">${log.output}</div>
      </div>
    </div>
  `;
}

// --- UTILITIES ---
function showToast(message) {
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');
  
  if (toast && toastText) {
    toastText.innerText = message;
    toast.classList.add('toast-show');
    
    setTimeout(() => {
      toast.classList.remove('toast-show');
    }, 2500);
  }
}

// Dynamic Milestones row editor helper
function addMilestoneRow(name = '', amount = '', duration = '') {
  const list = document.getElementById('pricing-milestones-list');
  if (!list) return;

  const row = document.createElement('div');
  row.className = 'milestone-row';
  
  row.innerHTML = `
    <input type="text" class="custom-input ms-name" placeholder="Milestone Name (e.g. UI Design)" value="${name}">
    <input type="text" class="custom-input ms-amount" placeholder="Price (e.g. $150)" value="${amount}">
    <input type="text" class="custom-input ms-duration" placeholder="Time (e.g. 3 days)" value="${duration}">
    <button type="button" class="ms-remove-btn" title="Remove Milestone">&times;</button>
  `;
  
  // Remove button event listener
  row.querySelector('.ms-remove-btn').addEventListener('click', () => {
    row.style.opacity = '0';
    row.style.transform = 'scale(0.9)';
    setTimeout(() => {
      row.remove();
    }, 180);
  });
  
  list.appendChild(row);
  refreshIcons();
}