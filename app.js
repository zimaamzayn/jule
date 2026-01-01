// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered'))
      .catch(err => console.log('SW failed:', err));
  });
}

// --- Dexie Setup ---
import Dexie from 'https://unpkg.com/dexie@4.0.8/dist/dexie.mjs';

const db = new Dexie('MedFlashDB');
db.version(3).stores({
  decks: '++id, title, parentId',
  cards: '++id, deckId, due, stability, difficulty, state, type, front, back, content, summary, question, answer, explanation, tags, image, occlusionBoxes, activeBoxIndex',
  reviews: '++id, cardId, rating, timestamp, interval',
  sessions: '++id, start, end, cardCount'
});

// --- FSRS 4.5 Parameters ---
const FSRS_W = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.26, 2.05];

// --- State ---
let activeCard = null;
let activeCardId = null;
let sessionStart = Date.now();
let activeView = 'study';

// --- Canvas State for Occlusion ---
let occlusionCanvas = null;
let occlusionCtx = null;
let occlusionImage = null;
let occlusionBoxes = [];
let isOcclusionDrawing = false;
let occlusionStartX = 0;
let occlusionStartY = 0;
let occlusionCurrentX = 0;
let occlusionCurrentY = 0;

// --- UI ---
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- Theme ---
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon();

themeToggle.addEventListener('click', () => {
  const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon();
});

function updateThemeIcon() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  themeToggle.innerHTML = `<ion-icon name="${isDark ? 'sunny-outline' : 'moon-outline'}"></ion-icon>`;
}

// --- FSRS Logic ---
function nextInterval(stability) {
  return Math.max(1, Math.round(stability));
}

function calculateNextReview(card, rating) {
  const now = Date.now();
  const state = card.state || 0;

  if (state === 0) {
    card.stability = FSRS_W[rating - 1];
    card.difficulty = Math.min(10, Math.max(1, FSRS_W[4] - (rating - 3) * FSRS_W[5]));
    card.state = 1;
    card.due = now + 86400000;
  } else {
    const elapsedDays = (now - (card.lastReview || now)) / 86400000;
    card.difficulty = Math.min(10, Math.max(1, card.difficulty - FSRS_W[6] * (rating - 3)));

    if (rating === 1) {
      card.stability = FSRS_W[7] * Math.pow(card.difficulty, -FSRS_W[8]) * (Math.pow(card.stability + 1, FSRS_W[9]) - 1);
      card.due = now;
      card.state = 3;
    } else {
      card.stability = card.stability * (1 + Math.exp(FSRS_W[10]) * (11 - card.difficulty) * Math.pow(card.stability + 1, -FSRS_W[11]));
      const interval = nextInterval(card.stability);
      card.due = now + interval * 86400000;
      card.state = 2;
    }
  }
  card.lastReview = now;
  return card;
}

// --- Card Rendering ---
function renderCard(card, isBack = false) {
  const frontEl = document.getElementById('front-content');
  const backEl = document.getElementById('back-content');

  if (card.type === 'cloze') {
    const regex = /{{c\d+::(.*?)}}/g;
    const q = card.content.replace(regex, '<span class="cloze-box">[...]</span>');
    const a = card.content.replace(regex, '<span class="cloze-highlight">$1</span>');
    frontEl.innerHTML = q;
    backEl.innerHTML = a;
  } else if (card.type === 'occlusion') {
    const img = new Image();
    img.src = card.image;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      card.occlusionBoxes.forEach((box, i) => {
        if (isBack && i === (card.activeBoxIndex || 0)) {
          // reveal
        } else {
          ctx.fillStyle = 'rgba(255, 82, 82, 0.85)';
          ctx.fillRect(box.x, box.y, box.w, box.h);
        }
      });

      const dataUrl = canvas.toDataURL('image/webp', 0.8);
      const imgEl = document.createElement('img');
      imgEl.src = dataUrl;
      imgEl.style.maxWidth = '100%';
      imgEl.style.height = 'auto';

      const container = document.createElement('div');
      container.appendChild(imgEl);
      if (isBack) {
        const label = document.createElement('p');
        label.textContent = 'Tapped area revealed';
        label.style.marginTop = '10px';
        label.style.fontSize = '0.9rem';
        label.style.color = '#666';
        container.appendChild(label);
      }

      if (isBack) {
        backEl.innerHTML = '';
        backEl.appendChild(container);
      } else {
        frontEl.innerHTML = '';
        frontEl.appendChild(container);
      }

      // Render LaTeX
      if (typeof MathJax !== 'undefined') {
        MathJax.typesetClear([frontEl, backEl]);
        MathJax.typeset([frontEl, backEl]);
      }
    };
  } else if (card.type === 'clinical') {
    if (isBack) {
      backEl.innerHTML = `
        <div class="clinical-card">
          <div class="clinical-section"><strong>Summary:</strong> ${card.summary}</div>
          <div class="clinical-section"><strong>Q:</strong> ${card.question}</div>
          <div class="clinical-section"><strong>A:</strong> ${card.answer}</div>
          ${card.explanation ? `<div class="clinical-section"><strong>Explanation:</strong> ${card.explanation}</div>` : ''}
        </div>
      `;
    } else {
      frontEl.innerHTML = `
        <div class="clinical-card">
          <div class="clinical-section"><strong>Summary:</strong> ${card.summary}</div>
          <div class="clinical-section"><strong>Question:</strong> ${card.question}</div>
        </div>
      `;
    }
  } else {
    frontEl.textContent = card.front || '';
    backEl.textContent = card.back || '';
  }

  // Render LaTeX for non-occlusion
  if (card.type !== 'occlusion' && typeof MathJax !== 'undefined') {
    MathJax.typesetClear([frontEl, backEl]);
    MathJax.typeset([frontEl, backEl]);
  }
}

// --- Load Next Card ---
async function loadNextCard() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const newLimit = parseInt(localStorage.getItem('newLimit') || '20');
  const reviewLimit = parseInt(localStorage.getItem('reviewLimit') || '100');

  const newToday = await db.cards
    .where('state').equals(0)
    .and(card => card.due >= todayStart)
    .count();
  
  const reviewsToday = await db.reviews
    .where('timestamp').above(todayStart.getTime())
    .count();

  if (reviewsToday >= reviewLimit) {
    document.getElementById('study-view').innerHTML = `<div style="text-align:center;padding:40px;">
      <h2>⏸ Daily Limit Reached</h2>
      <p>You've hit your review limit for today.</p>
    </div>`;
    return;
  }

  let query = db.cards.where('due').belowOrEqual(now);
  if (newToday >= newLimit) {
    query = query.and(card => card.state !== 0);
  }

  const card = await query.sortBy('due').then(cards => cards[0]);
  const dueCount = await query.count();
  document.getElementById('cards-due').textContent = `${dueCount} Card${dueCount !== 1 ? 's' : ''} Due`;

  if (card) {
    activeCard = card;
    activeCardId = card.id;
    renderCard(card, false);
    document.getElementById('card-inner').classList.remove('is-flipped');
    document.getElementById('rating-controls').classList.remove('active');
  } else {
    document.getElementById('study-view').innerHTML = `
      <div style="text-align:center; padding:40px;">
        <h2>🎉 Inbox Zero!</h2>
        <p>You've reviewed all due cards.</p>
        <button class="btn" style="background:var(--primary); margin-top:20px;" onclick="location.reload()">Reload</button>
      </div>
    `;
  }
}

// --- Handle Rating ---
async function handleRate(rating) {
  if (!activeCard) return;
  const updated = calculateNextReview({...activeCard}, rating);
  await db.cards.put(updated);
  await db.reviews.add({
    cardId: activeCardId,
    rating: rating,
    timestamp: Date.now(),
    interval: (updated.due - updated.lastReview) / 86400000
  });
  if (navigator.vibrate) navigator.vibrate(20);
  showToast(`Next review: ${new Date(updated.due).toLocaleDateString()}`);
  loadNextCard();
}

// --- Event Listeners ---
document.getElementById('card-inner').addEventListener('click', () => {
  const cardEl = document.getElementById('card-inner');
  const controls = document.getElementById('rating-controls');
  const isFlipped = cardEl.classList.contains('is-flipped');
  
  if (!isFlipped) {
    cardEl.classList.add('is-flipped');
    controls.classList.add('active');
  } else {
    cardEl.classList.remove('is-flipped');
    controls.classList.remove('active');
  }
});

document.querySelectorAll('.rate-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const rating = parseInt(btn.dataset.rating);
    handleRate(rating);
  });
});

// --- Navigation ---
function showView(viewName) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === viewName);
  });
  document.querySelectorAll('.view').forEach(el => {
    el.classList.toggle('active', el.id === viewName + '-view');
  });
  activeView = viewName;

  if (viewName === 'decks') {
    loadDecksList();
  } else if (viewName === 'add') {
    loadDecksIntoSelect();
  } else if (viewName === 'stats') {
    setTimeout(loadStatsDashboard, 300);
  }
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    showView(item.dataset.view);
  });
});

// --- Decks View ---
async function loadDecksList() {
  const tagFilter = document.getElementById('tag-filter')?.value.trim().toLowerCase() || null;
  const decks = await db.decks.toArray();
  const listEl = document.getElementById('decks-list');
  
  if (decks.length === 0) {
    listEl.innerHTML = '<p>No decks yet. Tap + to create one.</p>';
    return;
  }

  listEl.innerHTML = decks.map(deck => `
    <div class="deck-item" data-deck-id="${deck.id}">
      <div>
        <div class="deck-title">${deck.title}</div>
        <div class="deck-count">Loading...</div>
      </div>
      <ion-icon name="chevron-forward-outline"></ion-icon>
    </div>
  `).join('');

  decks.forEach(async (deck) => {
    let countQuery = db.cards.where('deckId').equals(deck.id);
    if (tagFilter) {
      countQuery = countQuery.and(card => card.tags && card.tags.includes(tagFilter));
    }
    const count = await countQuery.count();
    document.querySelector(`.deck-item[data-deck-id="${deck.id}"] .deck-count`).textContent = `${count} cards`;
  });
}

document.getElementById('add-deck-btn').addEventListener('click', async () => {
  const title = prompt("Enter deck title (e.g., Pharmacology):");
  if (title && title.trim()) {
    await db.decks.add({ title: title.trim(), parentId: null });
    loadDecksList();
  }
});

// --- Add Card View ---
async function loadDecksIntoSelect() {
  const decks = await db.decks.toArray();
  const select = document.getElementById('deck-select');
  select.innerHTML = decks.map(d => `<option value="${d.id}">${d.title}</option>`).join();
}

document.getElementById('card-type').addEventListener('change', (e) => {
  const type = e.target.value;
  document.getElementById('basic-fields').style.display = type === 'basic' ? 'block' : 'none';
  document.getElementById('cloze-fields').style.display = type === 'cloze' ? 'block' : 'none';
  document.getElementById('occlusion-fields').style.display = type === 'occlusion' ? 'block' : 'none';
  document.getElementById('clinical-fields').style.display = type === 'clinical' ? 'block' : 'none';

  if (type === 'occlusion') {
    initOcclusionEditor();
  }
});

// --- Occlusion Editor ---
function initOcclusionEditor() {
  occlusionCanvas = document.getElementById('occlusion-canvas');
  occlusionCtx = occlusionCanvas.getContext('2d');
  occlusionBoxes = [];
  occlusionImage = null;

  occlusionCanvas.width = 300;
  occlusionCanvas.height = 200;
  occlusionCtx.fillStyle = '#f0f0f0';
  occlusionCtx.fillRect(0, 0, 300, 200);
  occlusionCtx.fillStyle = '#666';
  occlusionCtx.font = '14px sans-serif';
  occlusionCtx.fillText('Upload an image to start', 80, 110);

  document.getElementById('occlusion-tools').style.display = 'none';
}

document.getElementById('image-upload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    occlusionImage = new Image();
    occlusionImage.onload = () => {
      const maxWidth = Math.min(occlusionCanvas.parentElement.clientWidth, 500);
      const ratio = occlusionImage.width / occlusionImage.height;
      occlusionCanvas.width = maxWidth;
      occlusionCanvas.height = maxWidth / ratio;
      redrawOcclusionCanvas();
      document.getElementById('occlusion-tools').style.display = 'block';
    };
    occlusionImage.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

function redrawOcclusionCanvas() {
  if (!occlusionImage) return;
  occlusionCtx.clearRect(0, 0, occlusionCanvas.width, occlusionCanvas.height);
  occlusionCtx.drawImage(occlusionImage, 0, 0, occlusionCanvas.width, occlusionCanvas.height);
  occlusionBoxes.forEach(box => {
    occlusionCtx.fillStyle = 'rgba(255, 82, 82, 0.7)';
    occlusionCtx.fillRect(box.x, box.y, box.w, box.h);
  });
}

document.getElementById('clear-occlusion').addEventListener('click', () => {
  occlusionBoxes = [];
  redrawOcclusionCanvas();
});

// Attach occlusion events
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('occlusion-canvas');
  if (!canvas) return;

  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0]?.clientX) || 0) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0]?.clientY) || 0) - rect.top;
    return { x, y };
  };

  canvas.addEventListener('mousedown', (e) => {
    if (!occlusionImage) return;
    const pos = getPos(e);
    occlusionStartX = pos.x;
    occlusionStartY = pos.y;
    occlusionCurrentX = pos.x;
    occlusionCurrentY = pos.y;
    isOcclusionDrawing = true;
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!occlusionImage) return;
    const pos = getPos(e);
    occlusionStartX = pos.x;
    occlusionStartY = pos.y;
    occlusionCurrentX = pos.x;
    occlusionCurrentY = pos.y;
    isOcclusionDrawing = true;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isOcclusionDrawing || !occlusionImage) return;
    const pos = getPos(e);
    occlusionCurrentX = pos.x;
    occlusionCurrentY = pos.y;
    redrawOcclusionCanvas();
    occlusionCtx.strokeStyle = '#2196F3';
    occlusionCtx.lineWidth = 2;
    occlusionCtx.setLineDash([5, 5]);
    const w = occlusionCurrentX - occlusionStartX;
    const h = occlusionCurrentY - occlusionStartY;
    occlusionCtx.strokeRect(occlusionStartX, occlusionStartY, w, h);
    occlusionCtx.setLineDash([]);
  });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isOcclusionDrawing || !occlusionImage) return;
    const pos = getPos(e);
    occlusionCurrentX = pos.x;
    occlusionCurrentY = pos.y;
    redrawOcclusionCanvas();
    occlusionCtx.strokeStyle = '#2196F3';
    occlusionCtx.lineWidth = 2;
    occlusionCtx.setLineDash([5, 5]);
    const w = occlusionCurrentX - occlusionStartX;
    const h = occlusionCurrentY - occlusionStartY;
    occlusionCtx.strokeRect(occlusionStartX, occlusionStartY, w, h);
    occlusionCtx.setLineDash([]);
  });

  canvas.addEventListener('mouseup', () => {
    if (!isOcclusionDrawing || !occlusionImage) return;
    isOcclusionDrawing = false;
    const w = occlusionCurrentX - occlusionStartX;
    const h = occlusionCurrentY - occlusionStartY;
    if (Math.abs(w) >= 20 && Math.abs(h) >= 20) {
      const x = w >= 0 ? occlusionStartX : occlusionCurrentX;
      const y = h >= 0 ? occlusionStartY : occlusionCurrentY;
      occlusionBoxes.push({ x, y, w: Math.abs(w), h: Math.abs(h) });
      redrawOcclusionCanvas();
    }
  });

  canvas.addEventListener('touchend', () => {
    if (!isOcclusionDrawing || !occlusionImage) return;
    isOcclusionDrawing = false;
    const w = occlusionCurrentX - occlusionStartX;
    const h = occlusionCurrentY - occlusionStartY;
    if (Math.abs(w) >= 20 && Math.abs(h) >= 20) {
      const x = w >= 0 ? occlusionStartX : occlusionCurrentX;
      const y = h >= 0 ? occlusionStartY : occlusionCurrentY;
      occlusionBoxes.push({ x, y, w: Math.abs(w), h: Math.abs(h) });
      redrawOcclusionCanvas();
    }
  });
});

// --- Save Card ---
document.getElementById('save-card-btn').addEventListener('click', async () => {
  const deckId = parseInt(document.getElementById('deck-select').value);
  const type = document.getElementById('card-type').value;
  const tags = document.getElementById('tags-input').value
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => t);

  if (type === 'occlusion') {
    if (!occlusionImage) {
      showToast("Please upload an image.");
      return;
    }
    if (occlusionBoxes.length === 0) {
      showToast("Draw at least one occlusion box.");
      return;
    }

    const imageData = occlusionCanvas.toDataURL('image/webp', 0.85);
    const cardPromises = occlusionBoxes.map((box, index) => {
      return db.cards.add({
        deckId,
        type: 'occlusion',
        image: imageData,
        occlusionBoxes: occlusionBoxes,
        activeBoxIndex: index,
        due: new Date(),
        state: 0,
        stability: 0,
        difficulty: 0,
        tags
      });
    });

    await Promise.all(cardPromises);
    showToast(`Saved ${occlusionBoxes.length} occlusion cards!`);
  } else {
    let cardData = { deckId, tags, type, due: new Date(), state: 0, stability: 0, difficulty: 0 };

    if (type === 'basic') {
      const front = document.getElementById('front-input').value.trim();
      const back = document.getElementById('back-input').value.trim();
      if (!front || !back) {
        showToast("Both front and back are required.");
        return;
      }
      cardData.front = front;
      cardData.back = back;
    } else if (type === 'cloze') {
      const content = document.getElementById('cloze-input').value.trim();
      if (!content || !/{{c\d+::/.test(content)) {
        showToast("Cloze text must contain {{c1::...}} syntax.");
        return;
      }
      cardData.content = content;
    } else if (type === 'clinical') {
      const summary = document.getElementById('clinical-summary').value.trim();
      const question = document.getElementById('clinical-question').value.trim();
      const answer = document.getElementById('clinical-answer').value.trim();
      if (!summary || !question || !answer) {
        showToast("Summary, question, and answer are required.");
        return;
      }
      cardData.summary = summary;
      cardData.question = question;
      cardData.answer = answer;
      cardData.explanation = document.getElementById('clinical-explanation').value.trim();
    }

    await db.cards.add(cardData);
    showToast("Card saved!");
  }

  showView('study');
  loadNextCard();
});

// --- Import/Export ---
document.getElementById('import-btn').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    let cards = [];
    const decks = await db.decks.toArray();
    if (decks.length === 0) {
      showToast("Create a deck first!");
      return;
    }
    const deckNames = decks.map((d,i) => `${i+1}. ${d.title}`).join('\n');
    const input = prompt(`Choose deck by number:\n${deckNames}`);
    const idx = parseInt(input) - 1;
    if (idx < 0 || idx >= decks.length) return;
    const deckId = decks[idx].id;

    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      cards = parseCSV(text, deckId);
    } else if (file.name.endsWith('.json')) {
      const text = await file.text();
      const json = JSON.parse(text);
      cards = parseJSON(json, deckId);
    } else {
      throw new Error("Unsupported file type. Use .csv or .json");
    }

    if (cards.length === 0) {
      showToast("No valid cards found.");
      return;
    }

    if (!confirm(`Import ${cards.length} cards into deck?`)) return;
    await db.cards.bulkAdd(cards);
    showToast(`✅ Imported ${cards.length} cards!`);
    loadDecksList();
    showView('study');
    loadNextCard();
  } catch (err) {
    console.error(err);
    showToast("Import failed: " + (err.message || 'Invalid file'));
  }
  e.target.value = '';
});

function parseCSVRow(str) {
  const result = [];
  let inQuotes = false;
  let current = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '"' && (i === 0 || str[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(csvText, deckId) {
  const lines = csvText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

  const cards = [];
  const headers = lines[0]?.toLowerCase() || '';
  const hasTags = headers.includes('tag');
  const startIndex = headers.includes('question') || headers.includes('front') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const fields = parseCSVRow(line);
    if (fields.length < 2) continue;

    let front = fields[0].trim();
    let back = fields[1].trim();
    let tags = [];

    if (hasTags && fields[2]) {
      tags = fields[2].split(',').map(t => t.trim().toLowerCase()).filter(t => t);
    }

    if (/{{c\d+::/.test(front)) {
      cards.push({
        deckId,
        type: 'cloze',
        content: front,
        tags,
        due: new Date(),
        state: 0,
        stability: 0,
        difficulty: 0
      });
    } else {
      cards.push({
        deckId,
        type: 'basic',
        front,
        back,
        tags,
        due: new Date(),
        state: 0,
        stability: 0,
        difficulty: 0
      });
    }
  }

  return cards;
}

function parseJSON(json, deckId) {
  if (!Array.isArray(json)) {
    throw new Error("JSON must be an array of cards");
  }

  return json.map(item => {
    const card = { ...item, deckId };
    card.due = new Date(card.due || Date.now());
    card.state = card.state || 0;
    card.stability = card.stability || 0;
    card.difficulty = card.difficulty || 0;
    card.tags = Array.isArray(card.tags) ? card.tags.map(t => t.toLowerCase()) : [];
    if (!card.type) {
      if (card.content && /{{c\d+::/.test(card.content)) {
        card.type = 'cloze';
      } else if (card.image) {
        card.type = 'occlusion';
      } else if (card.summary) {
        card.type = 'clinical';
      } else {
        card.type = 'basic';
      }
    }
    return card;
  });
}

document.getElementById('export-btn').addEventListener('click', async () => {
  const data = {
    decks: await db.decks.toArray(),
    cards: await db.cards.toArray(),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `medflash-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// --- Analytics ---
let retentionChart = null;
let deckChart = null;
let tagChart = null;
let sessionChart = null;

async function loadStatsDashboard() {
  const totalCards = await db.cards.count();
  document.getElementById('total-cards').textContent = totalCards;

  const allReviews = await db.reviews.toArray();
  const goodReviews = allReviews.filter(r => r.rating >= 2).length;
  const retention = allReviews.length ? Math.round((goodReviews / allReviews.length) * 100) : 0;
  document.getElementById('retention-rate').textContent = `${retention}%`;

  const today = new Date();
  today.setHours(0,0,0,0);
  const todayReviews = await db.reviews
    .where('timestamp').above(today.getTime())
    .count();
  document.getElementById('today-review').textContent = todayReviews;

  await renderRetentionChart();
  await renderDeckChart();
  await renderTagChart();
  await renderSessionChart();
}

async function renderRetentionChart() {
  const ctx = document.getElementById('retention-chart').getContext('2d');
  const days = 30;
  const data = [];
  const labels = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start.getTime() + 86400000);
    
    const reviews = await db.reviews
      .where('timestamp').between(start.getTime(), end.getTime())
      .toArray();
    
    const retention = reviews.length 
      ? Math.round((reviews.filter(r => r.rating >= 2).length / reviews.length) * 100)
      : 0;
    
    labels.push(i === 0 ? 'Today' : i === 1 ? 'Yesterday' : date.getDate());
    data.push(retention);
  }

  if (retentionChart) retentionChart.destroy();
  retentionChart = new Chart(ctx, {
    type: 'line',
    data : {
      labels: labels,
      datasets: [{
        label: 'Daily Retention (%)',
         data,
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, ticks: { callback: v => v + '%' } }
      }
    }
  });
}

async function renderDeckChart() {
  const decks = await db.decks.toArray();
  const labels = [];
  const data = [];
  const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

  for (const deck of decks) {
    const count = await db.cards.where('deckId').equals(deck.id).count();
    if (count > 0) {
      labels.push(deck.title);
      data.push(count);
    }
  }

  const ctx = document.getElementById('deck-chart').getContext('2d');
  if (deckChart) deckChart.destroy();
  deckChart = new Chart(ctx, {
    type: 'bar',
    data : {
      labels: labels,
      datasets: [{
         data,
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: window.innerWidth < 600 ? 'y' : 'x',
      plugins: { legend: { display: false } }
    }
  });
}

async function renderTagChart() {
  const cards = await db.cards.toArray();
  const tagCount = {};
  cards.forEach(card => {
    if (card.tags) {
      card.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    }
  });

  const sorted = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const labels = sorted.map(([tag]) => tag);
  const data = sorted.map(([, count]) => count);
  const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

  const ctx = document.getElementById('tag-chart').getContext('2d');
  if (tagChart) tagChart.destroy();
  tagChart = new Chart(ctx, {
    type: 'doughnut',
    data : {
      labels: labels,
      datasets: [{
         data,
        backgroundColor: colors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

async function renderSessionChart() {
  const sessions = await db.sessions
    .orderBy('start')
    .reverse()
    .toArray();

  const last7 = sessions.slice(0, 7).reverse();
  const labels = last7.map(s => {
    const d = new Date(s.start);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  });
  const data = last7.map(s => s.cardCount);

  const ctx = document.getElementById('session-chart').getContext('2d');
  if (sessionChart) sessionChart.destroy();
  sessionChart = new Chart(ctx, {
    type: 'bar',
    data : {
      labels: labels,
      datasets: [{
        label: 'Cards Reviewed',
         data,
        backgroundColor: '#4CAF50'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

document.getElementById('refresh-stats').addEventListener('click', loadStatsDashboard);

// --- Settings ---
document.getElementById('new-limit').value = localStorage.getItem('newLimit') || '20';
document.getElementById('review-limit').value = localStorage.getItem('reviewLimit') || '100';
document.getElementById('new-limit').addEventListener('change', (e) => {
  localStorage.setItem('newLimit', e.target.value);
});
document.getElementById('review-limit').addEventListener('change', (e) => {
  localStorage.setItem('reviewLimit', e.target.value);
});
document.getElementById('tag-filter').addEventListener('input', loadDecksList);

// --- Session Tracking ---
window.addEventListener('beforeunload', async () => {
  if (activeView === 'study') {
    await db.sessions.add({
      start: sessionStart,
      end: Date.now(),
      cardCount: await db.reviews.where('timestamp').between(sessionStart, Date.now()).count()
    });
  }
});

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  const hasDecks = await db.decks.count();
  if (hasDecks === 0) {
    const deckId = await db.decks.add({ title: "Cardiovascular System" });
    await db.cards.bulkAdd([
      {
        deckId, front: "SA node blood supply?", back: "Right Coronary Artery (60%)", 
        due: new Date(), state: 0, stability: 0, difficulty: 0, type: 'basic', tags: ['anatomy']
      },
      {
        deckId, content: "The {{c1::right coronary artery}} supplies the {{c2::SA node}} in most people.",
        due: new Date(), state: 0, stability: 0, difficulty: 0, type: 'cloze', tags: ['anatomy']
      },
      {
        deckId, type: 'clinical', summary: "68M with crushing chest pain, BP 90/60, HR 110", 
        question: "Most likely diagnosis?", answer: "Inferior STEMI",
        due: new Date(), state: 0, stability: 0, difficulty: 0, tags: ['cardiology']
      }
    ]);
  }
  loadNextCard();
});