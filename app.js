// app.js - Controller wiring the 3-stage mechanical pipeline to the UI

(function () {
  // DOM Elements
  const inputEl = document.getElementById('formula-input');
  const pointerLine = document.getElementById('pointer-line');
  const pointerArrow = document.getElementById('pointer-arrow');
  const errorBanner = document.getElementById('error-banner');
  const errorText = document.getElementById('error-text');
  const answerDisplay = document.getElementById('answer-display');
  const stepsRail = document.getElementById('steps-rail');
  const stepCounter = document.getElementById('step-counter');
  const stage1Tokens = document.getElementById('stage1-tokens');
  const stage2Queue = document.getElementById('stage2-queue');
  const btnDeg = document.getElementById('btn-deg');
  const btnRad = document.getElementById('btn-rad');
  const ansValEl = document.getElementById('ans-val');
  const btnCopy = document.getElementById('btn-copy');
  const btnClear = document.getElementById('btn-clear');
  const chips = document.querySelectorAll('.chip');

  // Application State
  let angleMode = 'deg';
  let ansValue = 0;
  const history = [];
  let historyIndex = -1;
  let currentComputedAnswer = null;

  // Approximate monospace character width calculator
  function getCharWidth() {
    const testSpan = document.createElement('span');
    testSpan.style.fontFamily = getComputedStyle(inputEl).fontFamily;
    testSpan.style.fontSize = getComputedStyle(inputEl).fontSize;
    testSpan.style.visibility = 'hidden';
    testSpan.style.position = 'absolute';
    testSpan.textContent = 'M';
    document.body.appendChild(testSpan);
    const width = testSpan.getBoundingClientRect().width;
    document.body.removeChild(testSpan);
    return width || 14.4;
  }

  function setPointerPosition(charIndex) {
    if (charIndex === null || charIndex === undefined || charIndex < 0) {
      pointerArrow.style.display = 'none';
      return;
    }
    const charWidth = getCharWidth();
    // Prompt prefix offset (e.g. '> ' width)
    const offset = charIndex * charWidth + (charWidth / 2);
    pointerArrow.style.left = `${offset}px`;
    pointerArrow.style.display = 'block';
  }

  function clearError() {
    errorBanner.classList.remove('visible');
    errorText.textContent = '';
    setPointerPosition(null);
  }

  function showError(msg, pos) {
    errorBanner.classList.add('visible');
    errorText.textContent = msg;
    setPointerPosition(pos);
  }

  // Core Evaluation Pipeline
  function processInput() {
    const rawExpr = inputEl.value;

    if (!rawExpr.trim()) {
      clearError();
      answerDisplay.textContent = '—';
      answerDisplay.classList.add('soft');
      stepCounter.textContent = '0 steps';
      stepsRail.innerHTML = '<div class="step-empty">Type an expression above to watch the mechanical gears turn...</div>';
      stage1Tokens.innerHTML = '<span style="color: var(--text-muted); font-size: 11px;">Waiting for input...</span>';
      stage2Queue.innerHTML = '<span style="color: var(--text-muted); font-size: 11px;">Waiting for input...</span>';
      currentComputedAnswer = null;
      return;
    }

    // Stage 1: The Sorting Tray
    const { tokens, error: sortErr } = tokenize(rawExpr, ansValue);

    if (sortErr) {
      showError(sortErr.message, sortErr.position);
      answerDisplay.textContent = '—';
      answerDisplay.classList.add('soft');
      stage1Tokens.innerHTML = `<span style="color: var(--accent-red); font-size: 11px;">Fault in sorting tray</span>`;
      stage2Queue.innerHTML = `<span style="color: var(--text-muted); font-size: 11px;">Halted</span>`;
      stepsRail.innerHTML = `<div class="step-empty" style="color: #fca5a5;">Machine stopped at character ${sortErr.position}</div>`;
      stepCounter.textContent = 'halted';
      currentComputedAnswer = null;
      return;
    }

    // Render Stage 1 tokens
    stage1Tokens.innerHTML = '';
    tokens.forEach(tok => {
      const pill = document.createElement('span');
      pill.className = `token-pill ${tok.type === 'open' || tok.type === 'close' ? 'bracket' : tok.type}`;
      pill.textContent = tok.type === 'number' ? (tok.raw || tok.value) : (tok.raw || tok.op || tok.func);
      stage1Tokens.appendChild(pill);
    });

    // Stage 2: The Priority Gate (RPN Queue)
    const { queue, error: gateErr } = parseToQueue(tokens);

    if (gateErr) {
      showError(gateErr.message, gateErr.position);
      answerDisplay.textContent = '—';
      answerDisplay.classList.add('soft');
      stage2Queue.innerHTML = `<span style="color: var(--accent-red); font-size: 11px;">Priority gate blocked</span>`;
      stepsRail.innerHTML = `<div class="step-empty" style="color: #fca5a5;">Mismatched gates: ${gateErr.message}</div>`;
      stepCounter.textContent = 'blocked';
      currentComputedAnswer = null;
      return;
    }

    // Render Stage 2 RPN Queue
    stage2Queue.innerHTML = '';
    queue.forEach(item => {
      const pill = document.createElement('span');
      pill.className = `token-pill ${item.type === 'open' || item.type === 'close' ? 'bracket' : item.type}`;
      pill.textContent = item.type === 'number' ? (item.raw || item.value) : (item.raw || item.op || item.func);
      stage2Queue.appendChild(pill);
    });

    // Stage 3: The Gearbox Evaluator
    const result = evaluateQueue(queue, angleMode);

    if (result.error) {
      showError(result.error.message, result.error.position);
      answerDisplay.textContent = '—';
      answerDisplay.classList.add('soft');
      stepCounter.textContent = `${result.steps.length} steps (error)`;
      currentComputedAnswer = null;

      // Render any steps prior to failure
      renderSteps(result.steps, result.error);
      return;
    }

    // Clean execution!
    clearError();
    currentComputedAnswer = result.answer;
    answerDisplay.textContent = result.formattedAnswer;
    answerDisplay.classList.remove('soft');
    stepCounter.textContent = `${result.steps.length} step${result.steps.length === 1 ? '' : 's'}`;

    renderSteps(result.steps);
  }

  function renderSteps(steps, error = null) {
    if (!steps || steps.length === 0) {
      if (error) {
        stepsRail.innerHTML = `<div class="step-empty" style="color: #fca5a5;">Jam: ${error.message}</div>`;
      } else {
        stepsRail.innerHTML = `<div class="step-empty">Single scalar term (no gear reductions needed).</div>`;
      }
      return;
    }

    stepsRail.innerHTML = '';
    steps.forEach(st => {
      const card = document.createElement('div');
      card.className = 'step-card';
      card.innerHTML = `
        <div class="step-meta">
          <span class="step-badge">STEP ${st.stepNum}</span>
          <span class="step-expr">${st.desc}</span>
        </div>
        <span class="step-op-tag">${st.op}</span>
      `;
      stepsRail.appendChild(card);
    });

    if (error) {
      const errCard = document.createElement('div');
      errCard.className = 'step-card';
      errCard.style.borderLeftColor = 'var(--accent-red)';
      errCard.style.background = 'rgba(255, 51, 68, 0.08)';
      errCard.innerHTML = `
        <div class="step-meta">
          <span class="step-badge" style="color: var(--accent-red);">FAULT</span>
          <span class="step-expr" style="color: #fca5a5;">${error.message}</span>
        </div>
        <span class="step-op-tag" style="background: rgba(255, 51, 68, 0.2); color: #f87171;">ERR</span>
      `;
      stepsRail.appendChild(errCard);
    }
  }

  // Event Listeners
  inputEl.addEventListener('input', processInput);

  // Keyboard navigation & Shortcuts
  inputEl.addEventListener('keydown', (e) => {
    // Tab: Switch DEG / RAD
    if (e.key === 'Tab') {
      e.preventDefault();
      toggleAngleMode();
      return;
    }

    // Enter: Commit to History & ANS
    if (e.key === 'Enter') {
      if (currentComputedAnswer !== null && !isNaN(currentComputedAnswer)) {
        ansValue = currentComputedAnswer;
        ansValEl.textContent = formatNumber(ansValue);
        const expr = inputEl.value.trim();
        if (expr && (history.length === 0 || history[history.length - 1] !== expr)) {
          history.push(expr);
        }
        historyIndex = history.length;
        // Visual feedback flash on answer
        answerDisplay.style.color = 'var(--accent-vermilion)';
        setTimeout(() => {
          answerDisplay.style.color = '#ffffff';
        }, 180);
      }
      return;
    }

    // Up Arrow: History backward
    if (e.key === 'ArrowUp') {
      if (history.length > 0) {
        e.preventDefault();
        if (historyIndex > 0) {
          historyIndex--;
        } else if (historyIndex === -1) {
          historyIndex = history.length - 1;
        }
        inputEl.value = history[historyIndex] || '';
        processInput();
      }
      return;
    }

    // Down Arrow: History forward
    if (e.key === 'ArrowDown') {
      if (history.length > 0) {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          historyIndex++;
          inputEl.value = history[historyIndex];
        } else {
          historyIndex = history.length;
          inputEl.value = '';
        }
        processInput();
      }
      return;
    }

    // Escape: Clear
    if (e.key === 'Escape') {
      inputEl.value = '';
      processInput();
      return;
    }
  });

  function toggleAngleMode(targetMode) {
    if (targetMode) {
      angleMode = targetMode;
    } else {
      angleMode = angleMode === 'deg' ? 'rad' : 'deg';
    }

    if (angleMode === 'deg') {
      btnDeg.classList.add('active');
      btnRad.classList.remove('active');
    } else {
      btnRad.classList.add('active');
      btnDeg.classList.remove('active');
    }

    processInput();
  }

  btnDeg.addEventListener('click', () => toggleAngleMode('deg'));
  btnRad.addEventListener('click', () => toggleAngleMode('rad'));

  // Copy button
  btnCopy.addEventListener('click', () => {
    if (currentComputedAnswer !== null) {
      const text = formatNumber(currentComputedAnswer);
      navigator.clipboard.writeText(text).then(() => {
        const orig = btnCopy.textContent;
        btnCopy.textContent = 'Copied!';
        setTimeout(() => { btnCopy.textContent = orig; }, 1200);
      });
    }
  });

  // Clear button
  btnClear.addEventListener('click', () => {
    inputEl.value = '';
    processInput();
    inputEl.focus();
  });

  // Interactive Chips
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      inputEl.value = chip.getAttribute('data-expr');
      processInput();
      inputEl.focus();
    });
  });

  // Initialize with a default demonstration formula
  inputEl.value = 'sqrt(3^2 + 4^2)';
  processInput();

})();
