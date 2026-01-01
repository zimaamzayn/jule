import Dexie from 'https://unpkg.com/dexie@4.0.8/dist/dexie.mjs';

const db = new Dexie('MedFlashDB');
db.version(3).stores({
  decks: '++id, title, parentId',
  cards: '++id, deckId, due, stability, difficulty, state, type, front, back, content, summary, question, answer, explanation, tags, image, occlusionBoxes, activeBoxIndex',
  reviews: '++id, cardId, rating, timestamp, interval',
  sessions: '++id, start, end, cardCount'
});

export { db };