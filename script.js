// Game configuration and state variables
const GOAL_CANS = 20; // 20 to win
let currentCans = 0;
let gameActive = false;
let spawnInterval;
let timerInterval;
let timeLeft = 30;
let spawnSpeed = 1500; // Start slower for more time to click
let pollutedChance = 0.25; // 25% chance for polluted can
let bonusAwarded = false; // Track if bonus has been awarded
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
  cells.forEach(cell => (cell.innerHTML = ''));

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
      cell.querySelector('.yellow-can').onclick = function () {
        if (!gameActive) return;
        currentCans++;
        updateStats();
        // Removed hit sound - yellow cans should be silent
        this.classList.add('can-hit');
        setTimeout(() => this.classList.remove('can-hit'), 200);
        cell.innerHTML = '';
        
        // Check for bonus time at 20 score
        if (currentCans >= 20 && !bonusAwarded) {
          bonusAwarded = true;
          timeLeft += 15; // Add 15 seconds
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
      cell.querySelector('.polluted-can').onclick = function () {
        if (!gameActive) return;
        const lostPoint = currentCans >= 0; // Always subtract if game is active
        currentCans = currentCans - 1; // Allow going negative
        updateStats();
        
        // Always play hit.mp3 first, then polluted.mp3 after 1 second
        sounds.hit.currentTime = 0; sounds.hit.play();
        setTimeout(() => {
          sounds.polluted.currentTime = 0; sounds.polluted.play();
        }, 1000);
        
        showWarning("Oops! That's not safe water.");
        showPollutedPopup(); // Show the popup
        this.classList.add('can-polluted');
        setTimeout(() => this.classList.remove('can-polluted'), 200);
        cell.innerHTML = '';
        
        // Check if score went negative and end game immediately
        if (currentCans < 0) {
          setTimeout(() => {
            endGame(); // End game instantly if score goes below 0
          }, 100); // Small delay to allow visual feedback
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

// Increase difficulty by speeding up spawn
function increaseDifficulty() {
  spawnSpeed = Math.max(700, spawnSpeed - 300);
  clearInterval(spawnInterval);
  spawnInterval = setInterval(spawnWaterCan, spawnSpeed);
}

// Initializes and starts a new game
function startGame() {
  if (gameActive) return;
  gameActive = true;
  currentCans = 0;
  bonusAwarded = false; // Reset bonus flag
  spawnSpeed = 1500;
  updateStats();
  createGrid();
  document.querySelector('.game-grid').style.pointerEvents = 'auto';
  document.getElementById('start-game').style.display = 'none';
  const overlay = document.querySelector('.end-overlay');
  if (overlay) overlay.remove();
  spawnInterval = setInterval(spawnWaterCan, spawnSpeed);
  startTimer();
}

// Ends the game, stopping all actions and showing the end overlay
function endGame() {
  gameActive = false;
  clearInterval(spawnInterval);
  clearInterval(timerInterval);
  document.querySelector('.game-grid').style.pointerEvents = 'none';
  document.getElementById('start-game').style.display = 'block'; // Show start button again
  // Use Math.max to ensure displayed final score is never negative
  const displayScore = Math.max(0, currentCans);
  const isWin = displayScore >= GOAL_CANS;
  // Player wins only if they have 20+ points at the end of the game
  if (!isWin) {
    sounds.lose.play(); // Play loss.mp3 when game is lost
  }
  showEndOverlay(isWin);
}

// Resets the game to initial state
function resetGame() {
  const overlay = document.querySelector('.end-overlay');
  if (overlay) overlay.remove();
  currentCans = 0;
  timeLeft = 30;
  spawnSpeed = 1500;
  updateStats();
  createGrid();
  document.querySelector('.game-grid').style.pointerEvents = 'auto';
  document.getElementById('start-game').style.display = 'block'; // Show start button
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
