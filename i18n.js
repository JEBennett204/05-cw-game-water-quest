class I18n {
  constructor() {
    this.currentLang = localStorage.getItem('language') || 'en';
    this.translations = {};
    this.rtlLanguages = ['ar', 'he'];
  }

  async init() {
    await this.loadTranslations(this.currentLang);
    this.updateDirection();
    this.updatePageContent();
    this.setupLanguageSelector();
  }

  async loadTranslations(lang) {
    try {
      const response = await fetch(`languages/${lang}.json`);
      if (!response.ok) throw new Error(`Translation file languages/${lang}.json not found`);
      this.translations = await response.json();
      this.currentLang = lang;
    } catch (error) {
      console.warn(`Failed to load languages/${lang}.json, falling back to English`);
      if (lang !== 'en') {
        await this.loadTranslations('en');
      }
    }
  }

  updateDirection() {
    const isRTL = this.rtlLanguages.includes(this.currentLang);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.body.style.direction = isRTL ? 'rtl' : 'ltr';
  }

  updatePageContent() {
    // Update page title
    document.title = this.translations.page_title || 'Water Quest';

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (this.translations[key]) {
        element.textContent = this.translations[key];
      }
    });

    // Update dark mode toggle text
    this.updateDarkModeToggle();
  }

  updateDarkModeToggle() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const isDarkMode = document.body.classList.contains('dark-mode');
    const modeText = isDarkMode ? this.translations.light_mode : this.translations.dark_mode;
    const icon = isDarkMode ? '☀️' : '🌙';
    darkModeToggle.innerHTML = `${icon} ${modeText}`;
  }

  setupLanguageSelector() {
    const languageSelect = document.getElementById('language-select');
    languageSelect.value = this.currentLang;
    
    languageSelect.addEventListener('change', (e) => {
      const newLang = e.target.value;
      localStorage.setItem('language', newLang);
      window.location.reload();
    });
  }

  translate(key, fallback = '') {
    return this.translations[key] || fallback;
  }

  getRandomMessage(type) {
    const messages = this.translations[`${type}_messages`] || [];
    return messages[Math.floor(Math.random() * messages.length)] || '';
  }
}

// Global i18n instance
window.i18n = new I18n();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  await window.i18n.init();
});
