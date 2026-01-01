// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered'))
      .catch(err => console.log('SW failed:', err));
  });
}

import { db } from './modules/db.js';
import { calculateNextReview } from './modules/fsrs.js';
import { renderCard } from './modules/card-renderer.js';
import { showToast, showView } from './modules/ui.js';

// --- State ---
let activeCard = null;
let activeCardId = null;
let sessionStart = Date.now();
let activeView = 'study';
let activeDeckId = null;
let activeEditingCardId = null;
let activeDeckAction = null;
let activeDeckIdAction = null;
let customSessionCards = [];
let isCustomSessionActive = false;

// --- Pell Editors ---
const editors = {};

function initEditor(id, placeholder) {
  const editor = pell.init({
    element: document.getElementById(id),
    onChange: html => {},
    defaultParagraphSeparator: 'p',
    styleWithCSS: true,
    actions: [
      'bold',
      'italic',
      'underline',
      'strikethrough',
      'heading1',
      'heading2',
      'paragraph',
      'quote',
      'olist',
      'ulist',
      'code',
      'line',
      'link',
      'image'
    ],
    classes: {
      actionbar: 'pell-actionbar',
      button: 'pell-button',
      content: 'pell-content',
      selected: 'pell-button-selected'
    }
  });
  editor.content.setAttribute('placeholder', placeholder);
  editors[id] = editor;
}

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

// --- Load Next Card ---
async function loadNextCard() {
  if (isCustomSessionActive) {
    if (customSessionCards.length > 0) {
      const card = customSessionCards.shift();
      activeCard = card;
      activeCardId = card.id;
      renderCard(card, false);
      document.getElementById('card-inner').classList.remove('is-flipped');
      document.getElementById('rating-controls').classList.remove('active');
      document.getElementById('deck-title').textContent = `Custom Study (${customSessionCards.length + 1} left)`;
    } else {
      isCustomSessionActive = false;
      document.getElementById('deck-title').textContent = "Today's Review";
      showToast("Custom session complete!");
      showView('decks');
    }
    return;
  }

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
  updateStudyStreak();
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

// --- Decks View ---
async function loadDecksList() {
  const decks = await db.decks.toArray();
  const listEl = document.getElementById('decks-list');
  listEl.innerHTML = '';

  if (decks.length === 0) {
    listEl.innerHTML = '<p>No decks yet. Tap + to create one.</p>';
    return;
  }

  const deckTree = buildDeckTree(decks);
  renderDeckTree(deckTree, listEl, 0);

  // Attach event listeners after rendering
  attachDeckEventListeners();
}

function buildDeckTree(decks) {
  const deckMap = new Map(decks.map(deck => [deck.id, { ...deck, children: [] }]));
  const tree = [];
  deckMap.forEach(deck => {
    if (deck.parentId && deckMap.has(deck.parentId)) {
      deckMap.get(deck.parentId).children.push(deck);
    } else {
      tree.push(deck);
    }
  });
  return tree;
}

function renderDeckTree(decks, container, level) {
  decks.forEach(deck => {
    const deckEl = document.createElement('div');
    deckEl.className = 'deck-item';
    deckEl.dataset.deckId = deck.id;
    deckEl.style.marginLeft = `${level * 20}px`;

    deckEl.innerHTML = `
      <div>
        <div class="deck-title">
          ${deck.children.length > 0 ? '<ion-icon name="chevron-down-outline" class="deck-toggle"></ion-icon>' : ''}
          ${deck.title}
        </div>
        <div class="deck-count">Loading...</div>
      </div>
      <div class="deck-actions">
        <button class="btn-icon add-subdeck-btn" data-deck-id="${deck.id}" title="Add Subdeck">
          <ion-icon name="add-outline"></ion-icon>
        </button>
        <button class="btn-icon edit-deck-btn" data-deck-id="${deck.id}" title="Edit Deck">
          <ion-icon name="create-outline"></ion-icon>
        </button>
        <button class="btn-icon delete-deck-btn" data-deck-id="${deck.id}" title="Delete Deck">
          <ion-icon name="trash-outline"></ion-icon>
        </button>
      </div>
    `;

    container.appendChild(deckEl);

    if (deck.children.length > 0) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'deck-children';
      container.appendChild(childrenContainer);
      renderDeckTree(deck.children, childrenContainer, level + 1);
    }

    // Update card count
    db.cards.where('deckId').equals(deck.id).count().then(count => {
      deckEl.querySelector('.deck-count').textContent = `${count} cards`;
    });
  });
}

function attachDeckEventListeners() {
  const listEl = document.getElementById('decks-list');

  listEl.querySelectorAll('.deck-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.deck-actions') || e.target.classList.contains('deck-toggle')) {
        return;
      }
      const deckId = parseInt(item.dataset.deckId);
      showBrowseView(deckId);
    });
  });

  listEl.querySelectorAll('.deck-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const childrenContainer = e.target.closest('.deck-item').nextElementSibling;
      if (childrenContainer && childrenContainer.classList.contains('deck-children')) {
        childrenContainer.style.display = childrenContainer.style.display === 'none' ? '' : 'none';
        toggle.name = childrenContainer.style.display === 'none' ? 'chevron-forward-outline' : 'chevron-down-outline';
      }
    });
  });

  listEl.querySelectorAll('.add-subdeck-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parentId = parseInt(btn.dataset.deckId);
      const title = prompt("Enter subdeck title:");
      if (title && title.trim()) {
        db.decks.add({ title: title.trim(), parentId: parentId }).then(loadDecksList);
      }
    });
  });

  listEl.querySelectorAll('.edit-deck-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const deckId = parseInt(btn.dataset.deckId);
      openDeckModal('rename', deckId);
    });
  });

  listEl.querySelectorAll('.delete-deck-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const deckId = parseInt(btn.dataset.deckId);
      openDeckModal('delete', deckId);
    });
  });
}

document.getElementById('add-deck-btn').addEventListener('click', async () => {
  const title = prompt("Enter deck title:");
  if (title && title.trim()) {
    await db.decks.add({ title: title.trim(), parentId: null });
    loadDecksList();
  }
});

// --- Custom Study Session ---
async function openCustomStudyModal() {
  const modal = document.getElementById('custom-study-modal');
  const deckListEl = document.getElementById('custom-study-deck-list');
  const decks = await db.decks.toArray();

  deckListEl.innerHTML = decks.map(deck => `
    <label class="deck-selection-item">
      <input type="checkbox" name="custom-deck" value="${deck.id}">
      ${deck.title}
    </label>
  `).join('');

  modal.style.display = 'flex';
}

function closeCustomStudyModal() {
  document.getElementById('custom-study-modal').style.display = 'none';
}

document.getElementById('custom-study-btn').addEventListener('click', openCustomStudyModal);
document.getElementById('cancel-custom-study-btn').addEventListener('click', closeCustomStudyModal);

document.getElementById('start-custom-study-btn').addEventListener('click', async () => {
  const selectedDeckIds = Array.from(document.querySelectorAll('[name="custom-deck"]:checked'))
    .map(el => parseInt(el.value));

  if (selectedDeckIds.length === 0) {
    showToast("Please select at least one deck.");
    return;
  }

  const status = document.getElementById('custom-study-status').value;
  const limit = parseInt(document.getElementById('custom-study-limit').value);

  let query;
  const now = new Date();

  if (status === 'new') {
    query = db.cards.where('state').equals(0);
  } else if (status === 'learning') {
    query = db.cards.where('state').equals(1);
  } else if (status === 'due') {
    query = db.cards.where('due').belowOrEqual(now);
  } else {
    query = db.cards;
  }

  let cards = await query.and(card => selectedDeckIds.includes(card.deckId)).toArray();

  // Shuffle and limit
  customSessionCards = cards.sort(() => 0.5 - Math.random()).slice(0, limit);

  if (customSessionCards.length === 0) {
    showToast("No matching cards found.");
    return;
  }

  isCustomSessionActive = true;
  closeCustomStudyModal();
  showView('study');
  loadNextCard();
});
// --- Deck Editor Modal ---
async function openDeckModal(action, deckId) {
  activeDeckAction = action;
  activeDeckIdAction = deckId;

  const modal = document.getElementById('deck-editor-modal');
  const title = document.getElementById('deck-modal-title');
  const renameSection = document.getElementById('deck-rename-section');
  const deleteSection = document.getElementById('deck-delete-section');
  const deckNameInput = document.getElementById('deck-name-input');

  const deck = await db.decks.get(deckId);

  if (action === 'rename') {
    title.textContent = 'Rename Deck';
    renameSection.style.display = 'block';
    deleteSection.style.display = 'none';
    deckNameInput.value = deck.title;
  } else {
    title.textContent = 'Delete Deck';
    renameSection.style.display = 'none';
    deleteSection.style.display = 'block';
  }

  modal.style.display = 'flex';
}

function closeDeckModal() {
  document.getElementById('deck-editor-modal').style.display = 'none';
  activeDeckAction = null;
  activeDeckIdAction = null;
}

document.getElementById('rename-deck-btn').addEventListener('click', async () => {
  const newTitle = document.getElementById('deck-name-input').value.trim();
  if (newTitle) {
    await db.decks.update(activeDeckIdAction, { title: newTitle });
    showToast('Deck renamed!');
    closeDeckModal();
    loadDecksList();
  }
});

document.getElementById('confirm-delete-deck-btn').addEventListener('click', async () => {
  await db.transaction('rw', db.decks, db.cards, async () => {
    await db.cards.where('deckId').equals(activeDeckIdAction).delete();
    await db.decks.delete(activeDeckIdAction);
  });
  showToast('Deck deleted!');
  closeDeckModal();
  loadDecksList();
});

document.getElementById('cancel-deck-action-btn').addEventListener('click', closeDeckModal);


// --- Browse View ---
async function showBrowseView(deckId) {
  activeDeckId = deckId;
  const deck = await db.decks.get(deckId);
  document.getElementById('browse-deck-title').textContent = deck.title;
  showView('browse');
}

async function loadBrowseList() {
  const searchTerm = document.getElementById('browse-search').value.toLowerCase();
  let query = db.cards.where('deckId').equals(activeDeckId);

  const cards = await query.toArray();
  const filteredCards = cards.filter(card => {
    if (!searchTerm) return true;
    return (card.front || card.content || card.summary || '').toLowerCase().includes(searchTerm);
  });

  const listEl = document.getElementById('browse-list');
  if (filteredCards.length === 0) {
    listEl.innerHTML = '<p>No cards found.</p>';
    return;
  }

  listEl.innerHTML = filteredCards.map(card => `
    <div class="browse-item" data-card-id="${card.id}">
      <div class="browse-item-content">${getCardPreview(card)}</div>
    </div>
  `).join('');

  listEl.querySelectorAll('.browse-item').forEach(item => {
    item.addEventListener('click', () => {
      const cardId = parseInt(item.dataset.cardId);
      openEditorModal(cardId);
    });
  });
}

function getCardPreview(card) {
  switch (card.type) {
    case 'cloze': return card.content.replace(/{{c\d+::(.*?)}}/g, '<strong>$1</strong>');
    case 'clinical': return `<strong>${card.question}</strong>: ${card.answer}`;
    default: return `<strong>${card.front}</strong>: ${card.back}`;
  }
}

document.getElementById('back-to-decks').addEventListener('click', () => showView('decks'));
document.getElementById('browse-search').addEventListener('input', loadBrowseList);

// --- Editor Modal ---
async function openEditorModal(cardId) {
  activeEditingCardId = cardId;
  const card = await db.cards.get(cardId);
  const formContainer = document.getElementById('editor-form-container');

  let formHtml = `
    <label>Tags (comma-separated)</label>
    <input type="text" id="edit-tags" value="${(card.tags || []).join(', ')}">
  `;

  switch (card.type) {
    case 'basic':
      formHtml += `
        <label>Front</label><div id="edit-front" class="pell-editor"></div>
        <label>Back</label><div id="edit-back" class="pell-editor"></div>
      `;
      break;
    case 'cloze':
      formHtml += `<label>Content</label><div id="edit-content" class="pell-editor"></div>`;
      break;
    case 'clinical':
      formHtml += `
        <label>Summary</label><div id="edit-summary" class="pell-editor"></div>
        <label>Question</label><div id="edit-question" class="pell-editor"></div>
        <label>Answer</label><div id="edit-answer" class="pell-editor"></div>
        <label>Explanation</label><div id="edit-explanation" class="pell-editor"></div>
      `;
      break;
  }

  formContainer.innerHTML = formHtml;
  document.getElementById('editor-modal').style.display = 'flex';

  // Initialize editors
  if (card.type === 'basic') {
    initEditor('edit-front', 'Front content');
    editors['edit-front'].content.innerHTML = card.front;
    initEditor('edit-back', 'Back content');
    editors['edit-back'].content.innerHTML = card.back;
  } else if (card.type === 'cloze') {
    initEditor('edit-content', 'Cloze content');
    editors['edit-content'].content.innerHTML = card.content;
  } else if (card.type === 'clinical') {
    initEditor('edit-summary', 'Summary');
    editors['edit-summary'].content.innerHTML = card.summary;
    initEditor('edit-question', 'Question');
    editors['edit-question'].content.innerHTML = card.question;
    initEditor('edit-answer', 'Answer');
    editors['edit-answer'].content.innerHTML = card.answer;
    initEditor('edit-explanation', 'Explanation');
    editors['edit-explanation'].content.innerHTML = card.explanation || '';
  }
}

function closeEditorModal() {
  document.getElementById('editor-modal').style.display = 'none';
  activeEditingCardId = null;
}

document.getElementById('save-edited-card-btn').addEventListener('click', async () => {
  if (!activeEditingCardId) return;

  const card = await db.cards.get(activeEditingCardId);
  const updatedData = {
    tags: document.getElementById('edit-tags').value.split(',').map(t => t.trim().toLowerCase()).filter(t => t)
  };

  switch (card.type) {
    case 'basic':
      updatedData.front = editors['edit-front'].content.innerHTML;
      updatedData.back = editors['edit-back'].content.innerHTML;
      break;
    case 'cloze':
      updatedData.content = editors['edit-content'].content.innerHTML;
      break;
    case 'clinical':
      updatedData.summary = editors['edit-summary'].content.innerHTML;
      updatedData.question = editors['edit-question'].content.innerHTML;
      updatedData.answer = editors['edit-answer'].content.innerHTML;
      updatedData.explanation = editors['edit-explanation'].content.innerHTML;
      break;
  }

  await db.cards.update(activeEditingCardId, updatedData);
  showToast('Card saved!');
  closeEditorModal();
  loadBrowseList();
});

document.getElementById('delete-card-btn').addEventListener('click', async () => {
  if (!activeEditingCardId) return;
  if (confirm("Are you sure you want to delete this card?")) {
    await db.cards.delete(activeEditingCardId);
    showToast('Card deleted!');
    closeEditorModal();
    loadBrowseList();
  }
});

document.getElementById('editor-modal').addEventListener('click', (e) => {
  if (e.target.id === 'editor-modal') {
    closeEditorModal();
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
      cardData.front = editors['front-editor'].content.innerHTML;
      cardData.back = editors['back-editor'].content.innerHTML;
      if (!cardData.front || !cardData.back) {
        showToast("Both front and back are required.");
        return;
      }
    } else if (type === 'cloze') {
      cardData.content = editors['cloze-editor'].content.innerHTML;
      if (!cardData.content || !/{{c\d+::/.test(cardData.content)) {
        showToast("Cloze text must contain {{c1::...}} syntax.");
        return;
      }
    } else if (type === 'clinical') {
      cardData.summary = editors['clinical-summary-editor'].content.innerHTML;
      cardData.question = editors['clinical-question-editor'].content.innerHTML;
      cardData.answer = editors['clinical-answer-editor'].content.innerHTML;
      cardData.explanation = editors['clinical-explanation-editor'].content.innerHTML;
      if (!cardData.summary || !cardData.question || !cardData.answer) {
        showToast("Summary, question, and answer are required.");
        return;
      }
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

// --- Study Streak ---
async function updateStudyStreak() {
  const reviews = await db.reviews.orderBy('timestamp').toArray();
  if (reviews.length === 0) {
    document.getElementById('study-streak').textContent = `🔥 0 days`;
    return;
  }

  const reviewDates = [...new Set(reviews.map(r => new Date(r.timestamp).toDateString()))];
  let streak = 0;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  // Check if today or yesterday is in the review dates to start the streak count
  if (reviewDates.includes(today.toDateString()) || reviewDates.includes(yesterday.toDateString())) {
    streak = 1;
    let currentDate = new Date(reviewDates[reviewDates.length - 1]);

    for (let i = reviewDates.length - 2; i >= 0; i--) {
      const prevDate = new Date(reviewDates[i]);
      const diff = (currentDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24);

      if (diff === 1) {
        streak++;
        currentDate = prevDate;
      } else if (diff > 1) {
        break;
      }
    }
  }

  document.getElementById('study-streak').textContent = `🔥 ${streak} day${streak !== 1 ? 's' : ''}`;
}


// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  updateStudyStreak();
  initEditor('front-editor', 'Front of the card');
  initEditor('back-editor', 'Back of the card');
  initEditor('cloze-editor', 'Cloze content');
  initEditor('clinical-summary-editor', 'Patient summary');
  initEditor('clinical-question-editor', 'Question');
  initEditor('clinical-answer-editor', 'Answer');
  initEditor('clinical-explanation-editor', 'Explanation');

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

// Custom Event Listener for View Changes
document.addEventListener('viewchange', (e) => {
  activeView = e.detail.view;
  switch (e.detail.view) {
    case 'decks':
      loadDecksList();
      break;
    case 'add':
      loadDecksIntoSelect();
      break;
    case 'stats':
      setTimeout(loadStatsDashboard, 300);
      break;
    case 'browse':
      loadBrowseList();
      break;
  }
});