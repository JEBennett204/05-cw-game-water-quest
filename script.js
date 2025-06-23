// Game configuration and state variables
const GOAL_CANS = 20; // 20 to win
let currentCans = 0;
let gameActive = false;
let spawnInterval;
let timerInterval;
let performanceInterval;
let timeLeft = 30;
let spawnSpeed = 1500; // Start slower for more time to click
let pollutedChance = 0.25; // 25% chance for polluted can
let bonusAwarded = false; // Track if bonus has been awarded

// Adaptive difficulty variables
let clickHistory = []; // Track timestamps of yellow can clicks
let pollutedClickHistory = []; // Track polluted can clicks
let missedCans = 0; // Track cans that disappeared without being clicked
let currentCanSpawnTime = null; // Track when current can spawned
const MIN_SPAWN_SPEED = 600; // Fastest spawn rate
const MAX_SPAWN_SPEED = 2500; // Slowest spawn rate
const MIN_POLLUTED_CHANCE = 0.15; // Minimum polluted chance
const MAX_POLLUTED_CHANCE = 0.4; // Maximum polluted chance
let canVisibilityTime = 2500; // How long each can stays visible
const MIN_VISIBILITY_TIME = 1500;
const MAX_VISIBILITY_TIME = 4000;

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
  lose: new Audio('audio/lose.mp3')
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
  // Display 0 if score is negative, otherwise show actual score
  document.getElementById('current-cans').textContent = Math.max(0, currentCans);
  document.getElementById('timer').textContent = timeLeft;
}

// Creates the 3x3 game grid where items will appear
function createGrid() {
  const grid = document.querySelector('.game-grid');
  grid.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    grid.appendChild(cell);
  }
}

// Spawns a new item in a random grid cell
function spawnWaterCan() {
  if (!gameActive) return;
  const cells = document.querySelectorAll('.grid-cell');
  
  // Track missed can if previous can wasn't clicked
  if (currentCanSpawnTime && cells.some(cell => cell.innerHTML !== '')) {
    trackMissedCan();
  }
  
  cells.forEach(cell => (cell.innerHTML = ''));
  currentCanSpawnTime = Date.now();

  // Pick random cell for yellow can
  const yellowIdx = Math.floor(Math.random() * cells.length);
  const pollutedIdx = Math.random() < pollutedChance
    ? (yellowIdx + Math.floor(Math.random() * (cells.length - 1)) + 1) % cells.length
    : -1;

  cells.forEach((cell, idx) => {
    if (idx === yellowIdx) {
      cell.innerHTML = `
        <div class="water-can-wrapper">
          <div class="water-can yellow-can"></div>
        </div>
      `;
      
      // Auto-remove can after visibility time
      const canRemovalTimeout = setTimeout(() => {
        if (cell.innerHTML !== '' && gameActive) {
          trackMissedCan();
          cell.innerHTML = '';
        }
      }, canVisibilityTime);
      
      cell.querySelector('.yellow-can').onclick = function () {
        if (!gameActive) return;
        clearTimeout(canRemovalTimeout);
        currentCans++;
        trackYellowCanClick();
        updateStats();
        this.classList.add('can-hit');
        setTimeout(() => this.classList.remove('can-hit'), 200);
        cell.innerHTML = '';
        
        // Check for bonus time at 20 score
        if (currentCans >= 20 && !bonusAwarded) {
          bonusAwarded = true;
          timeLeft += 15;
          updateStats();
          showBonusPopup();
        }
      };
    }
    if (idx === pollutedIdx) {
      cell.innerHTML += `
        <div class="water-can-wrapper">
          <div class="water-can polluted-can"></div>
        </div>
      `;
      
      // Auto-remove polluted can after visibility time
      const pollutedRemovalTimeout = setTimeout(() => {
        if (cell.querySelector('.polluted-can') && gameActive) {
          cell.innerHTML = cell.innerHTML.replace(/<div class="water-can-wrapper">[\s\S]*?polluted-can[\s\S]*?<\/div>/g, '');
        }
      }, canVisibilityTime);
      
      cell.querySelector('.polluted-can').onclick = function () {
        if (!gameActive) return;
        clearTimeout(pollutedRemovalTimeout);
        trackPollutedCanClick();
        const lostPoint = currentCans >= 0;
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
        
        if (currentCans < 0) {
          setTimeout(() => {
            endGame();
          }, 100);
          return;
        }
      };
    }
  });
}

// Timer logic
function startTimer() {
  timeLeft = 30;
  updateStats();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateStats();
    if (timeLeft === 20 || timeLeft === 10) increaseDifficulty();
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

// Adaptive difficulty functions
function trackYellowCanClick() {
  const now = Date.now();
  clickHistory.push(now);
  // Keep only last 5 clicks
  if (clickHistory.length > 5) {
    clickHistory.shift();
  }
}

function trackPollutedCanClick() {
  const now = Date.now();
  pollutedClickHistory.push(now);
  // Keep only last 10 seconds of polluted clicks
  pollutedClickHistory = pollutedClickHistory.filter(time => now - time < 10000);
}

function trackMissedCan() {
  missedCans++;
}

function evaluatePlayerPerformance() {
  if (!gameActive) return;
  
  const now = Date.now();
  const recentTime = 5000; // 5 seconds
  
  // Check for fast clicking (3+ clicks in 5 seconds)
  const recentClicks = clickHistory.filter(time => now - time < recentTime);
  const fastClicking = recentClicks.length >= 3;
  
  // Check for recent polluted clicks (2+ in 5 seconds)
  const recentPollutedClicks = pollutedClickHistory.filter(time => now - time < recentTime);
  const tooManyPollutedClicks = recentPollutedClicks.length >= 2;
  
  // Check for no recent activity (no clicks in 5 seconds)
  const lastClick = clickHistory.length > 0 ? clickHistory[clickHistory.length - 1] : 0;
  const noRecentActivity = now - lastClick > 5000 && clickHistory.length > 0;
  
  // Check for too many missed cans
  const tooManyMisses = missedCans >= 3;
  
  // Adjust difficulty based on performance
  if (fastClicking && !tooManyPollutedClicks) {
    increaseDifficulty();
  } else if (noRecentActivity || tooManyPollutedClicks || tooManyMisses) {
    decreaseDifficulty();
  }
  
  // Reset missed cans counter periodically
  if (missedCans > 0) {
    missedCans = Math.max(0, missedCans - 1);
  }
}

function increaseDifficulty() {
  // Make cans spawn faster
  spawnSpeed = Math.max(MIN_SPAWN_SPEED, spawnSpeed - 100);
  
  // Make cans visible for shorter time
  canVisibilityTime = Math.max(MIN_VISIBILITY_TIME, canVisibilityTime - 200);
  
  // Slightly increase polluted chance
  pollutedChance = Math.min(MAX_POLLUTED_CHANCE, pollutedChance + 0.05);
  
  // Update spawn interval
  clearInterval(spawnInterval);
  spawnInterval = setInterval(spawnWaterCan, spawnSpeed);
  
  console.log(`Difficulty increased: spawn=${spawnSpeed}ms, visibility=${canVisibilityTime}ms, polluted=${pollutedChance.toFixed(2)}`);
}

function decreaseDifficulty() {
  // Make cans spawn slower
  spawnSpeed = Math.min(MAX_SPAWN_SPEED, spawnSpeed + 150);
  
  // Make cans visible for longer time
  canVisibilityTime = Math.min(MAX_VISIBILITY_TIME, canVisibilityTime + 300);
  
  // Decrease polluted chance
  pollutedChance = Math.max(MIN_POLLUTED_CHANCE, pollutedChance - 0.05);
  
  // Update spawn interval
  clearInterval(spawnInterval);
  spawnInterval = setInterval(spawnWaterCan, spawnSpeed);
  
  console.log(`Difficulty decreased: spawn=${spawnSpeed}ms, visibility=${canVisibilityTime}ms, polluted=${pollutedChance.toFixed(2)}`);
}

function resetDifficulty() {
  spawnSpeed = 1500;
  pollutedChance = 0.25;
  canVisibilityTime = 2500;
  clickHistory = [];
  pollutedClickHistory = [];
  missedCans = 0;
  currentCanSpawnTime = null;
}

// Initializes and starts a new game
function startGame() {
  if (gameActive) return;
  gameActive = true;
  currentCans = 0;
  bonusAwarded = false;
  resetDifficulty(); // Reset difficulty settings
  updateStats();
  createGrid();
  document.querySelector('.game-grid').style.pointerEvents = 'auto';
  document.getElementById('start-game').style.display = 'none';
  const overlay = document.querySelector('.end-overlay');
  if (overlay) overlay.remove();
  
  // Start game intervals
  spawnInterval = setInterval(spawnWaterCan, spawnSpeed);
  startTimer();
  
  // Start performance evaluation interval
  performanceInterval = setInterval(evaluatePlayerPerformance, 3000); // Every 3 seconds
}

// Ends the game, stopping all actions and showing the end overlay
function endGame() {
  gameActive = false;
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  clearInterval(performanceInterval); // Stop performance evaluation
  document.querySelector('.game-grid').style.pointerEvents = 'none';
  document.getElementById('start-game').style.display = 'block';
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
  resetDifficulty(); // Reset difficulty when resetting game
  updateStats();
  createGrid();
  document.querySelector('.game-grid').style.pointerEvents = 'auto';
  document.getElementById('start-game').style.display = 'block';
}

// Dark mode toggle functionality
function initDarkMode() {
  const darkModeToggle = document.getElementById('dark-mode-toggle');
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

// Initialize dark mode on page load
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
});

// Set up click handler for the start button
document.getElementById('start-game').addEventListener('click', startGame);

// Initial setup
createGrid();
updateStats();
document.getElementById('start-game').addEventListener('click', startGame);

// Initial setup
createGrid();
updateStats();
