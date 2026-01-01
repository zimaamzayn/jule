// --- FSRS 4.5 Parameters ---
const FSRS_W = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.26, 2.05];

// --- FSRS Logic ---
function nextInterval(stability) {
  return Math.max(1, Math.round(stability));
}

export function calculateNextReview(card, rating) {
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