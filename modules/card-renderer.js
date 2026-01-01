// --- Card Rendering ---
export function renderCard(card, isBack = false) {
  const frontEl = document.getElementById('front-content');
  const backEl = document.getElementById('back-content');

  if (card.type === 'cloze') {
    const clozeRegex = /{{c(\d+)::(.*?)}}/g;
    const frontContent = card.content.replace(clozeRegex, (match, index, text) => {
      if (parseInt(index) === card.activeClozeIndex) {
        return `<span class="cloze-placeholder">[...]</span>`;
      }
      return `<span class="cloze-box">${text}</span>`;
    });

    const backContent = card.content.replace(clozeRegex, (match, index, text) => {
      if (parseInt(index) === card.activeClozeIndex) {
        return `<span class="cloze-highlight">${text}</span>`;
      }
      return text;
    });

    frontEl.innerHTML = frontContent;
    backEl.innerHTML = backContent;
  } else if (card.type === 'occlusion') {
    renderOcclusionCard(card, frontEl, backEl, isBack);
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

function renderOcclusionCard(card, frontEl, backEl, isBack) {
  const img = new Image();
  img.src = card.image;
  img.onload = () => {
    // Render front
    const frontCanvas = createCanvasWithImage(img);
    const frontCtx = frontCanvas.getContext('2d');
    card.occlusionBoxes.forEach(box => {
      frontCtx.fillStyle = '#2196F3'; // Blue for hidden areas
      frontCtx.fillRect(box.x, box.y, box.w, box.h);
    });
    const frontImgEl = createCanvasImage(frontCanvas);
    frontEl.innerHTML = '';
    frontEl.appendChild(frontImgEl);

    // Render back
    const backCanvas = createCanvasWithImage(img);
    const backCtx = backCanvas.getContext('2d');
    card.occlusionBoxes.forEach((box, i) => {
      if (i === card.activeBoxIndex) {
        backCtx.strokeStyle = '#FF5252'; // Red highlight for revealed
        backCtx.lineWidth = 4;
        backCtx.strokeRect(box.x, box.y, box.w, box.h);
      } else {
        backCtx.fillStyle = '#2196F3';
        backCtx.fillRect(box.x, box.y, box.w, box.h);
      }
    });
    const backImgEl = createCanvasImage(backCanvas);
    backEl.innerHTML = '';
    backEl.appendChild(backImgEl);
  };
}

function createCanvasWithImage(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return canvas;
}

function createCanvasImage(canvas) {
  const imgEl = document.createElement('img');
  imgEl.src = canvas.toDataURL('image/webp', 0.85);
  imgEl.style.maxWidth = '100%';
  imgEl.style.height = 'auto';
  return imgEl;
}