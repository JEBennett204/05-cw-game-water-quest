// Game configuration and state variables
const GOAL_CANS = 20; // 20 to win
let currentCans = 0;
let gameActive = false;
let spawnInterval;
let timerInterval;
let timeLeft = 30;
let spawnSpeed = 1000; // Faster spawn for more cans
let pollutedChance = 0.15; // Only 15% chance for polluted can
let bonusAwarded = false; // Track if bonus has been awarded

let lastYellowClickTimes = [];
let consecutivePollutedClicks = 0;
let difficultyInterval;

let multiCanMode = false;

const WIN_MESSAGES = [
  "Amazing! You brought clean water to a village! 💧",
  "You did it! Every can counts. 🌟",
  "Victory! Clean water for all! 🎉"
];
const LOSE_MESSAGES = [
  "Keep trying! Every can helps. 💪",
  "Almost there! Try again for clean water. 🚰",
  "Don't give up! Water is life. 🌍"
];

// Audio assets (replace with your own .mp3/.wav files as needed)
const sounds = {
  hit: new Audio('audio/hit.mp3'),
  polluted: new Audio('audio/polluted.mp3'),
  win: new Audio('audio/win.mp3'),
  lose: new Audio('audio/loss.mp3')
};

// Confetti (use GIF as per requirements)
function showConfetti() {
  const confetti = document.createElement('img');
  confetti.src = 'img/confetti.gif';
  confetti.className = 'confetti';
  document.body.appendChild(confetti);
  setTimeout(() => confetti.remove(), 2000);
}
  
// Show overlay at game end
function showEndOverlay(win) {
  const overlay = document.createElement('div');
  overlay.className = 'end-overlay d-flex align-items-center justify-content-center';
  const displayScore = Math.max(0, currentCans);
  
  const winTitle = window.i18n ? window.i18n.translate('win_title', 'You Win!') : 'You Win!';
  const loseTitle = window.i18n ? window.i18n.translate('lose_title', 'Game Over') : 'Game Over';
  const finalScoreLabel = window.i18n ? window.i18n.translate('final_score', 'Final Score') : 'Final Score';
  const resetButtonText = window.i18n ? window.i18n.translate('reset_button', 'Reset Game') : 'Reset Game';
  
  const messageText = win ? 
    (window.i18n ? window.i18n.getRandomMessage('win') : WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]) :
    (window.i18n ? window.i18n.getRandomMessage('lose') : LOSE_MESSAGES[Math.floor(Math.random() * LOSE_MESSAGES.length)]);

  overlay.innerHTML = `
    <div class="end-content text-center">
      <h2 class="fw-bold mb-3">${win ? winTitle : loseTitle}</h2>
      <p class="fs-5 mb-2">${finalScoreLabel}: <strong>${displayScore}</strong></p>
      <p class="mb-4">${messageText}</p>
      <button id="reset-game" class="btn btn-warning btn-lg px-4">${resetButtonText}</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('reset-game').onclick = resetGame;
  if (win) {
    showConfetti();
    sounds.win.play();
  }
}

// Enhanced popup for better responsive design - positioned above game area
function showPollutedPopup() {
  const popup = document.createElement('div');
  popup.className = 'polluted-popup';
  
  const pollutedTitle = window.i18n ? window.i18n.translate('polluted_title', 'Whoops!') : 'Whoops!';
  const pollutedMessage = window.i18n ? window.i18n.translate('polluted_message', 'That can was polluted!') : 'That can was polluted!';
  const okButton = window.i18n ? window.i18n.translate('ok_button', 'OK') : 'OK';
  
  popup.innerHTML = `
    <div class="popup-content">
      <h3 class="text-center fw-bold">${pollutedTitle}</h3>
      <p class="text-center">${pollutedMessage}</p>
      <div class="text-center">
        <button class="btn btn-danger btn-sm" onclick="this.closest('.polluted-popup').remove()">${okButton}</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);
  
  setTimeout(() => {
    if (popup.parentNode) popup.remove();
  }, 2000);
}

// Show warning for polluted can
function showWarning(msg) {
  let warn = document.getElementById('polluted-warning');
  if (!warn) {
    warn = document.createElement('div');
    warn.id = 'polluted-warning';
    warn.className = 'polluted-warning';
    document.body.appendChild(warn);
  }
  
  const warningText = window.i18n ? window.i18n.translate('polluted_warning', msg) : msg;
  warn.textContent = warningText;
  warn.style.display = 'block';
  setTimeout(() => { warn.style.display = 'none'; }, 1000);
}

// Show bonus popup
function showBonusPopup() {
  const popup = document.createElement('div');
  popup.className = 'bonus-popup';
  
  const bonusTitle = window.i18n ? window.i18n.translate('bonus_title', 'Bonus!') : 'Bonus!';
  const bonusMessage = window.i18n ? window.i18n.translate('bonus_message', '+15 seconds added!') : '+15 seconds added!';
  
  popup.innerHTML = `
    <div class="bonus-content">
      <h3 class="text-center fw-bold">${bonusTitle}</h3>
      <p class="text-center">${bonusMessage}</p>
    </div>
  `;
  document.body.appendChild(popup);
  
  setTimeout(() => {
    if (popup.parentNode) popup.remove();
  }, 2000);
}

// Update score and timer displays
function updateStats() {
  const cansElement = document.getElementById('current-cans');
  const timerElement = document.getElementById('timer');
  
  if (cansElement) {
    cansElement.textContent = Math.max(0, currentCans);
  } else {
    console.error('current-cans element not found');
  }
  
  if (timerElement) {
    timerElement.textContent = timeLeft;
  } else {
    console.error('timer element not found');
  }
}

// Creates the 3x3 game grid where items will appear
function createGrid() {
  const grid = document.querySelector('.game-grid');
  if (!grid) {
    console.error('Game grid element not found!');
    return;
  }
  
  grid.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    grid.appendChild(cell);
  }
}

// Spawns a new item in a random grid cell
function spawnWaterCan() {
  if (!gameActive) {
    return;
  }

  const cells = document.querySelectorAll('.grid-cell');
  if (cells.length === 0) {
    return;
  }

  // Clear all cells first
  cells.forEach(cell => (cell.innerHTML = ''));

  if (!multiCanMode) {
    // Original single-can logic
    const yellowIdx = Math.floor(Math.random() * cells.length);
    const pollutedIdx = Math.random() < pollutedChance
      ? (yellowIdx + Math.floor(Math.random() * (cells.length - 1)) + 1) % cells.length
      : -1;

    cells.forEach((cell, idx) => {
      if (idx === yellowIdx) {
        // ...existing code for yellow can...
        cell.innerHTML = `
          <div class="water-can-wrapper">
            <div class="water-can yellow-can"></div>
          </div>
        `;
        const yellowCan = cell.querySelector('.yellow-can');
        if (yellowCan) {
          yellowCan.onclick = function () {
            if (!gameActive) return;
            currentCans++;
            updateStats();
            this.classList.add('can-hit');
            setTimeout(() => this.classList.remove('can-hit'), 200);
            cell.innerHTML = '';
            trackYellowClick();
            if (currentCans >= 20 && !bonusAwarded) {
              bonusAwarded = true;
              timeLeft += 15;
              updateStats();
              showBonusPopup();
            }
          };
        }
      }
      if (idx === pollutedIdx) {
        // ...existing code for polluted can...
        cell.innerHTML += `
          <div class="water-can-wrapper">
            <div class="water-can polluted-can"></div>
          </div>
        `;
        const pollutedCan = cell.querySelector('.polluted-can');
        if (pollutedCan) {
          pollutedCan.onclick = function () {
            if (!gameActive) return;
            currentCans = currentCans - 1;
            updateStats();
            sounds.hit.currentTime = 0; sounds.hit.play();
            setTimeout(() => {
              sounds.polluted.currentTime = 0; sounds.polluted.play();
            }, 1000);
            showWarning("Oops! That's not safe water.");
            showPollutedPopup();
            this.classList.add('can-polluted');
            setTimeout(() => this.classList.remove('can-polluted'), 200);
            cell.innerHTML = '';
            trackPollutedClick();
            if (currentCans < 0) {
              setTimeout(() => {
                endGame();
              }, 100);
              return;
            }
          };
        }
      }
    });
  } else {
    // Multi-can mode: always 2-3 cans, at least 1 polluted
    let canCount = Math.floor(Math.random() * 2) + 2; // 2 or 3
    // Pick unique random indices for cans
    let indices = Array.from({length: 9}, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    let canIndices = indices.slice(0, canCount);

    // Randomly choose which of these will be polluted (at least 1)
    let pollutedIndices = [];
    let pollutedCount = 1 + Math.floor(Math.random() * (canCount - 1)); // at least 1, up to canCount-1
    pollutedIndices = canIndices.slice(0, pollutedCount);
    let yellowIndices = canIndices.slice(pollutedCount);

    // Place polluted cans
    pollutedIndices.forEach(idx => {
      const cell = cells[idx];
      cell.innerHTML = `
        <div class="water-can-wrapper">
          <div class="water-can polluted-can"></div>
        </div>
      `;
      const pollutedCan = cell.querySelector('.polluted-can');
      if (pollutedCan) {
        pollutedCan.onclick = function () {
          if (!gameActive) return;
          currentCans = currentCans - 1;
          updateStats();
          sounds.hit.currentTime = 0; sounds.hit.play();
          setTimeout(() => {
            sounds.polluted.currentTime = 0; sounds.polluted.play();
          }, 1000);
          showWarning("Oops! That's not safe water.");
          showPollutedPopup();
          this.classList.add('can-polluted');
          setTimeout(() => this.classList.remove('can-polluted'), 200);
          cell.innerHTML = '';
          trackPollutedClick();
          if (currentCans < 0) {
            setTimeout(() => {
              endGame();
            }, 100);
            return;
          }
        };
      }
    });

    // Place yellow cans
    yellowIndices.forEach(idx => {
      const cell = cells[idx];
      cell.innerHTML = `
        <div class="water-can-wrapper">
          <div class="water-can yellow-can"></div>
        </div>
      `;
      const yellowCan = cell.querySelector('.yellow-can');
      if (yellowCan) {
        yellowCan.onclick = function () {
          if (!gameActive) return;
          currentCans++;
          updateStats();
          this.classList.add('can-hit');
          setTimeout(() => this.classList.remove('can-hit'), 200);
          cell.innerHTML = '';
          trackYellowClick();
          if (currentCans >= 20 && !bonusAwarded) {
            bonusAwarded = true;
            timeLeft += 15;
            updateStats();
            showBonusPopup();
          }
        };
      }
    });
  }
  applyReducedMotion();
}

// Timer logic
function startTimer() {
  timeLeft = 30;
  updateStats();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateStats();
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

// Initializes and starts a new game
function startGame() {
  if (gameActive) {
    return;
  }

  gameActive = true;
  currentCans = 0;
  bonusAwarded = false;
  spawnSpeed = 1000;
  pollutedChance = 0.40;
  multiCanMode = false;

  updateStats();
  createGrid();

  const grid = document.querySelector('.game-grid');
  if (grid) {
    grid.style.pointerEvents = 'auto';
  }

  const startButton = document.getElementById('start-game');
  if (startButton) {
    startButton.style.display = 'none';
  }

  const overlay = document.querySelector('.end-overlay');
  if (overlay) overlay.remove();

  const gameTitle = document.getElementById('game-title');
  if (gameTitle) {
    gameTitle.classList.add('no-blur');
  }

  spawnInterval = setInterval(spawnWaterCan, spawnSpeed);
  startTimer();
  difficultyInterval = setInterval(evaluatePlayerPerformance, 3000);

  // After 10 seconds, enable multi-can mode
  setTimeout(() => {
    multiCanMode = true;
  }, 10000);
}

// Ends the game, stopping all actions and showing the end overlay
function endGame() {
  gameActive = false;
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  clearInterval(difficultyInterval);
  
  const grid = document.querySelector('.game-grid');
  if (grid) {
    grid.style.pointerEvents = 'none';
  }
  
  const startButton = document.getElementById('start-game');
  if (startButton) {
    startButton.style.display = 'block';
  }
  
  const displayScore = Math.max(0, currentCans);
  const isWin = displayScore >= GOAL_CANS;
  
  if (!isWin) {
    sounds.lose.play();
  }
  showEndOverlay(isWin);
}

// Resets the game to initial state
function resetGame() {
  const overlay = document.querySelector('.end-overlay');
  if (overlay) overlay.remove();

  currentCans = 0;
  timeLeft = 30;
  bonusAwarded = false;
  gameActive = false;
  clearInterval(difficultyInterval);
  difficultyInterval = null;
  lastYellowClickTimes = [];
  consecutivePollutedClicks = 0;

  updateStats();
  createGrid();
  startGame();  // Skip intro; just restart game
}

// Dark mode toggle functionality
function initDarkMode() {
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (!darkModeToggle) {
    return;
  }
  
  const body = document.body;
  
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    body.classList.add('dark-mode');
  }
  
  // Update toggle text with translation
  function updateToggleText() {
    if (window.i18n) {
      window.i18n.updateDarkModeToggle();
    }
  }
  
  darkModeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    updateToggleText();
  });
  
  // Initial update
  setTimeout(updateToggleText, 100);
}

// Animation for startup sequence
async function startupAnimation() {
  await darkenCells([0, 2]);
  await darkenCells([4]);
  await darkenCells([6, 8]);
  const startBtn = document.getElementById('start-game');
  if (startBtn) {
    startBtn.disabled = false;
    startBtn.classList.add('show-start');
  }
}

function darkenCells(cellIndices) {
  return new Promise((resolve) => {
    const cells = document.querySelectorAll('.grid-cell');
    cellIndices.forEach(i => cells[i]?.classList.add('darken'));
    setTimeout(() => {
      cellIndices.forEach(i => cells[i]?.classList.remove('darken'));
      resolve();
    }, 500);
  });
}

// Utility: Get browser language (e.g. "en", "es", "zh", etc.)
function getBrowserLang() {
  const lang = (navigator.language || navigator.userLanguage || "en").split('-')[0];
  return lang;
}

// Utility: Try to get language from user's location (GeoIP)
// Returns a Promise that resolves to a language code or null
async function getLangFromLocation() {
  try {
    // Use a free GeoIP service (ipapi.co is simple and CORS-friendly)
    const resp = await fetch('https://ipapi.co/json/');
    if (!resp.ok) return null;
    const data = await resp.json();
    // Map country code to language (very basic, can be improved)
    const countryLangMap = {
      "CN": "zh", "TW": "zh", "HK": "zh",
      "IN": "hi",
      "ES": "es", "MX": "es", "AR": "es", "CO": "es", "PE": "es", "VE": "es", "CL": "es", "EC": "es", "GT": "es", "CU": "es", "BO": "es", "DO": "es", "HN": "es", "PY": "es", "SV": "es", "NI": "es", "CR": "es", "PA": "es", "UY": "es", "GQ": "es",
      "FR": "fr", "BE": "fr", "CA": "fr", "CH": "fr", "LU": "fr", "MC": "fr",
      "DE": "de", "AT": "de", "CH": "de", "LI": "de", "LU": "de",
      "RU": "ru", "BY": "ru", "KZ": "ru", "KG": "ru",
      "JP": "ja",
      "IL": "he",
      "SA": "ar", "EG": "ar", "DZ": "ar", "MA": "ar", "IQ": "ar", "SD": "ar", "YE": "ar", "SY": "ar", "JO": "ar", "LB": "ar", "LY": "ar", "PS": "ar", "KW": "ar", "OM": "ar", "QA": "ar", "BH": "ar", "TN": "ar", "AE": "ar", "MR": "ar"
    };
    if (data && data.country_code && countryLangMap[data.country_code]) {
      return countryLangMap[data.country_code];
    }
  } catch (e) {}
  return null;
}

// Set language selector and i18n to the best language
async function autoDetectLanguage() {
  const langSelect = document.getElementById('language-select');
  if (!langSelect) return;

  // 1. Try browser language
  let lang = getBrowserLang();

  // 2. If browser language not supported, try GeoIP
  const supported = Array.from(langSelect.options).map(opt => opt.value);
  if (!supported.includes(lang)) {
    lang = await getLangFromLocation() || "en";
  }

  // 3. If still not supported, fallback to English
  if (!supported.includes(lang)) lang = "en";

  // 4. Set selector and trigger change event if needed
  if (langSelect.value !== lang) {
    langSelect.value = lang;
    // If your i18n system needs to be triggered:
    if (window.i18n && typeof window.i18n.setLanguage === "function") {
      window.i18n.setLanguage(lang);
    } else {
      // Or trigger change event if needed
      langSelect.dispatchEvent(new Event('change'));
    }
  }
}

// Helper: update title screen text to match selected language
async function updateTitleScreenI18n() {
  const langSelect = document.getElementById('language-select');
  const lang = langSelect ? langSelect.value : 'en';

  // Load the language JSON dynamically if not already loaded
  if (!window.i18n) window.i18n = {};
  if (!window.i18n.translations) window.i18n.translations = {};

  // If not loaded, fetch and cache
  if (!window.i18n.translations[lang]) {
    try {
      const resp = await fetch(`languages/${lang}.json`);
      if (resp.ok) {
        window.i18n.translations[lang] = await resp.json();
      }
    } catch (e) {}
  }
  const dict = window.i18n.translations[lang] || window.i18n.translations['en'] || {};

  // Title
  const titleEl = document.getElementById('game-title');
  if (titleEl && dict.main_title) titleEl.textContent = dict.main_title;

  // Start button
  const startBtn = document.getElementById('start-game');
  if (startBtn && dict.start_game) startBtn.textContent = dict.start_game;

  // Logo alt
  const logoEl = document.getElementById('logo');
  if (logoEl && dict.main_logo_alt) logoEl.alt = dict.main_logo_alt;
}

document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  updateStats();

  // Update title screen i18n on load and on language change
  const langSelect = document.getElementById('language-select');
  if (langSelect) {
    // Set selector from localStorage if present
    const savedLang = localStorage.getItem('selectedLanguage');
    if (savedLang && langSelect.value !== savedLang) {
      langSelect.value = savedLang;
    }
    // On change, save and update
    langSelect.addEventListener('change', () => {
      localStorage.setItem('selectedLanguage', langSelect.value);
      updateTitleScreenI18n();
      // If you want a reload, uncomment:
      // location.reload();
    });
    updateTitleScreenI18n();
  }

  const startButton = document.getElementById('start-game');
  const titleScreen = document.getElementById('title-screen');
  const gameContainer = document.querySelector('.game-container');
  const gameGrid = document.querySelector('.game-grid');

  if (startButton && titleScreen && gameContainer && gameGrid) {
    startButton.addEventListener('click', async () => {
      // Fade out title screen
      titleScreen.classList.add('fade-out');
      await new Promise(res => setTimeout(res, 800));
      titleScreen.remove();

      // Reveal game container and scroll to it
      gameContainer.classList.remove('d-none');
      gameContainer.scrollIntoView({ behavior: 'smooth' });

      // Tic Tac Toe animation
      await animateGridIntro([0, 2]);
      await animateGridIntro([4]);
      await animateGridIntro([6, 8]);

      // Wait 2s, then start game
      setTimeout(() => {
        startGame();
      }, 2000);
    });
  } else {
    console.error('Start button or title screen not found!');
  }
});

// Respect prefers-reduced-motion for can animations
function applyReducedMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.water-can').forEach((can) => {
      can.style.animation = 'none';
      can.style.transition = 'none';
    });
  }
}

// Animation for grid introduction
async function animateGridIntro(cellIndices) {
  return new Promise((resolve) => {
    const cells = document.querySelectorAll('.grid-cell');
    cellIndices.forEach(i => {
      const cell = cells[i];
      if (cell) {
        cell.classList.add('animate-intro');
        setTimeout(() => {
          cell.classList.remove('animate-intro');
        }, 700);
      }
    });
    setTimeout(resolve, 700);
  });
}

// Darkens cells in Tic Tac Toe sequence
(async function() {
  await darkenCells([0, 2]);
  await darkenCells([4]);
  await darkenCells([6, 8]);
})();

const bigStartBtn = document.getElementById('big-start-game');
if (bigStartBtn) {
  bigStartBtn.addEventListener('click', async () => {
    document.querySelector('.game-container').classList.remove('d-none');
    createGrid();
    await startupAnimation();
    startGame();
  });
}

// Respect prefers-reduced-motion for can animations
function applyReducedMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.water-can').forEach((can) => {
      can.style.animation = 'none';
      can.style.transition = 'none';
    });
  }
}
