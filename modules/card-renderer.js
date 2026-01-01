// --- Card Rendering ---
export function renderCard(card, isBack = false) {
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