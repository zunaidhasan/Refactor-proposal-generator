// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  loadTheme();
  checkApiKey();
  initDatabase();
  setupEventListeners();
});

function initDatabase() {
  if (typeof PROJECT_DB !== 'undefined' && PROJECT_DB.length > 0) {
    document.getElementById('project-count-text').innerText = `${PROJECT_DB.length} Projects`;
    document.getElementById('projects-loaded-stat').innerText = `${PROJECT_DB.length} projects`;
    
    const categories = [...new Set(PROJECT_DB.map(p => p.Category))].filter(Boolean);
    document.getElementById('categories-count-stat').innerText = `${categories.length} categories`;
    
    populateCategoryFilters(categories);
    
    document.getElementById('status-dot').classList.remove('status-dot--loading');
    document.getElementById('status-dot').classList.add('status-dot--ready');
    document.getElementById('db-status-msg').innerText = 'Database ready';
    document.getElementById('db-status-msg').classList.remove('db-status--loading');
  }
}

function populateCategoryFilters(categories) {
  const bar = document.getElementById('category-filter-bar');
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-chip';
    btn.setAttribute('data-cat', cat);
    btn.innerText = cat;
    bar.appendChild(btn);
  });
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Theme
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  // Situation Chips
  document.querySelectorAll('.sit-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('brief-input').value = chip.getAttribute('data-fill');
      updateWordCount();
    });
  });

  // Category Chips
  document.getElementById('category-filter-bar').addEventListener('click', (e) => {
    if (e.target.classList.contains('cat-chip')) {
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('cat-chip--active'));
      e.target.classList.add('cat-chip--active');
    }
  });

  // Textarea
  document.getElementById('brief-input').addEventListener('input', updateWordCount);
  document.getElementById('brief-input').addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') document.getElementById('find-matches-btn').click();
  });

  // Actions (Match, Proposal, Upwork)
  document.getElementById('find-matches-btn').addEventListener('click', () => handleAction('match'));
  document.getElementById('btn-proposal').addEventListener('click', () => handleAction('proposal'));
  document.getElementById('btn-upwork').addEventListener('click', () => handleAction('upwork'));

  // Copy Output
  document.getElementById('copy-output-btn').addEventListener('click', () => {
    const text = document.getElementById('output-content').innerText;
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!'));
  });

  // API Key Modal
  document.getElementById('api-key-btn').addEventListener('click', () => document.getElementById('api-modal').style.display = 'block');
  document.getElementById('close-api-modal').addEventListener('click', () => document.getElementById('api-modal').style.display = 'none');
  document.getElementById('save-api-key').addEventListener('click', saveApiKey);
}

function updateWordCount() {
  const text = document.getElementById('brief-input').value;
  document.getElementById('char-count').innerText = `${text.length}/2000`;
  document.getElementById('word-count').innerText = `${text.trim() ? text.trim().split(/\s+/).length : 0} words`;
}

// --- THEME (Web Version - localStorage) ---
function toggleTheme() {
  const html = document.querySelector('html');
  const current = html.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}
function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.querySelector('html').setAttribute('data-theme', savedTheme);
  }
}

// --- API KEY (Web Version - localStorage) ---
function checkApiKey() {
  const key = localStorage.getItem('gemini_key');
  if (!key) {
    document.getElementById('api-modal').style.display = 'block';
  } else {
    document.getElementById('api-key-input').value = key;
  }
}
function saveApiKey() {
  const key = document.getElementById('api-key-input').value;
  if (key) {
    localStorage.setItem('gemini_key', key);
    showToast('API Key Saved!');
    document.getElementById('api-modal').style.display = 'none';
  }
}

// --- CORE AI LOGIC ---
async function handleAction(actionType) {
  const brief = document.getElementById('brief-input').value;
  if (!brief) return showToast('Please enter a brief first!');

  // Web version API key fetch
  const key = localStorage.getItem('gemini_key');
  if (!key) {
    document.getElementById('api-modal').style.display = 'block';
    return;
  }

  const outputContent = document.getElementById('output-content');
  let loadingText = actionType === 'match' ? 'Matches' : (actionType === 'proposal' ? 'Proposal' : 'Cover Letter');
  outputContent.innerHTML = `<div class="empty-state"><p>Generating ${loadingText}...</p></div>`;

  const activeCat = document.querySelector('.cat-chip--active')?.getAttribute('data-cat') || 'All';
  let filteredDb = PROJECT_DB;
  if (activeCat !== 'All') filteredDb = PROJECT_DB.filter(p => p.Category === activeCat);

  const dbContext = filteredDb.map(p => `URL: ${p['Website URL']} | Cat: ${p.Category} | Stack: ${p['Used Stack']} | Features: ${p.Features} | BestFor: ${p['Best_For']}`).join('\n');

  let prompt = '';
  
  if (actionType === 'match') {
    prompt = `You are an expert IT Project Matcher. Based on the client brief, find the top 3 best matching projects from the database. Format nicely with bullet points, including the URL, Stack, and WHY it matches.\n\nDatabase:\n${dbContext}\n\nClient Brief: ${brief}`;
  
  } else if (actionType === 'upwork') {
    prompt = `You are an expert Upwork Freelancer and Web Developer named Md Mehedi Hasan. 
Analyze the provided Upwork job post. Write a concise, ready-to-paste Upwork cover letter.
Do NOT use generic templates. Keep it short and highly targeted.

RULES:
1. Start with "Hello there,"
2. Write ONE short paragraph (2-3 sentences max) proving you read their specific requirements (mention their requested pages, SEO tools like Yoast/Rankmath, speed requirements, etc.).
3. Write a transition sentence: "To ensure the quality of my work, please have a look at some of my relevant work samples below, and I'd be happy to discuss the project further:"
4. Search the provided database and pick the top 3 most relevant URLs based on the job requirements. Format them as bullet points.
5. End EXACTLY with:
Best regards,
Md Mehedi Hasan

Database:\n${dbContext}\n\nUpwork Job Post: ${brief}`;

  } else {
    // Proposal Generator
    prompt = `You are an expert IT Proposal Writer for SardarIT. Analyze the brief. Match it to the provided Database (pick top 3). Select the correct template (WordPress, Full Stack, E-commerce, or Graphics) and write the proposal.

--- TEMPLATES ---
[PASTE YOUR 4 TEMPLATES HERE - THE SAME ONES FROM PREVIOUS MESSAGES]

--- RULES ---
- Never invent URLs. Only use URLs from the database.
- Always provide exactly 3 portfolio links at the bottom.
- Merge specific brief details into the template.

Database:\n${dbContext}\n\nClient Brief: ${brief}`;
  }

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
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
      outputContent.innerText = "Error: " + data.error.message;
    } else if (data.candidates && data.candidates.length > 0) {
      const generatedText = data.candidates[0].content.parts[0].text;
      outputContent.innerText = generatedText.replace(/\*\*/g, ''); 
    } else {
      outputContent.innerText = "Error: No response generated.";
    }
  } catch (e) {
    outputContent.innerText = "Network Error: " + e.message;
  }
}

// --- UTILS ---
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 2000);
}
