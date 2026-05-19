// Zentrale App-Verwaltung für Navigation und Datenspeicherung
class CalorieTrackerApp {
    constructor() {
        this.currentPage = 'today';
        this.foodLog = this.loadFoodLog();
        this.selectedDate = new Date().toISOString().split('T')[0];
        this.init();
    }

    init() {
        // Bei jedem Seiten-Load prüfen, welche Seite aktiv sein sollte
        this.updateNavigation();
        this.setupNavListeners();
    }

    setupNavListeners() {
        // Alle Navigation-Buttons aktualisieren
        document.addEventListener('DOMContentLoaded', () => {
            const navButtons = document.querySelectorAll('[data-nav-button]');
            navButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = button.dataset.navButton;
                    this.navigateTo(page);
                });
            });
        });
    }

    navigateTo(page) {
        const pages = {
            'today': 'Main.html',
            'scan': 'Scan.html',
            'history': 'History.html'
        };

        if (pages[page]) {
            window.location.href = pages[page];
        }
    }

    updateNavigation() {
        // Aktive Seite basierend auf HTML-Dateiname erkennen
        const currentFile = window.location.pathname.split('/').pop().toLowerCase();
        
        if (currentFile === 'main.html' || currentFile === '') {
            this.currentPage = 'today';
        } else if (currentFile === 'history.html') {
            this.currentPage = 'history';
        } else if (currentFile === 'scan.html') {
            this.currentPage = 'scan';
        }

        // Aktive Button markieren
        document.querySelectorAll('[data-nav-button]').forEach(btn => {
            if (btn.dataset.navButton === this.currentPage) {
                btn.classList.add('text-emerald-600', 'font-bold');
                btn.classList.remove('text-slate-400', 'hover:text-emerald-500');
            } else {
                btn.classList.remove('text-emerald-600', 'font-bold');
                btn.classList.add('text-slate-400', 'hover:text-emerald-500');
            }
        });
    }

    addFood(item) {
        const today = new Date().toISOString().split('T')[0];
        if (!this.foodLog[today]) {
            this.foodLog[today] = [];
        }
        // Ensure all numeric values are numbers
        const normalizedItem = {
            ...item,
            calories: parseFloat(item.calories) || 0,
            protein: parseFloat(item.protein) || 0,
            carbs: parseFloat(item.carbs) || 0,
            fat: parseFloat(item.fat) || 0,
            quantity: parseFloat(item.quantity) || 1,
            timestamp: new Date().toISOString()
        };
        this.foodLog[today].push(normalizedItem);
        this.saveFoodLog();
    }

    removeFood(date, index) {
        if (this.foodLog[date] && this.foodLog[date][index]) {
            this.foodLog[date].splice(index, 1);
            this.saveFoodLog();
            return true;
        }
        return false;
    }

    getFoodLog(date = null) {
        if (!date) {
            date = new Date().toISOString().split('T')[0];
        }
        return this.foodLog[date] || [];
    }

    getCurrentDate() {
        return this.selectedDate;
    }

    setCurrentDate(dateStr) {
        this.selectedDate = dateStr;
    }

    getStatsForDate(date) {
        const foods = this.foodLog[date] || [];
        return {
            calories: foods.reduce((sum, food) => sum + (parseFloat(food.calories) || 0), 0),
            protein: foods.reduce((sum, food) => sum + (parseFloat(food.protein) || 0), 0),
            carbs: foods.reduce((sum, food) => sum + (parseFloat(food.carbs) || 0), 0),
            fat: foods.reduce((sum, food) => sum + (parseFloat(food.fat) || 0), 0),
            items: foods
        };
    }

    getWeekStats() {
        const week = {};
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const foods = this.foodLog[dateStr] || [];
            week[dateStr] = foods.reduce((sum, food) => sum + (food.calories || 0), 0);
        }
        return week;
    }

    getTodayStats() {
        const today = new Date().toISOString().split('T')[0];
        const foods = this.foodLog[today] || [];
        return {
            calories: foods.reduce((sum, food) => sum + (food.calories || 0), 0),
            protein: foods.reduce((sum, food) => sum + (food.protein || 0), 0),
            carbs: foods.reduce((sum, food) => sum + (food.carbs || 0), 0),
            fat: foods.reduce((sum, food) => sum + (food.fat || 0), 0),
            items: foods
        };
    }

    saveFoodLog() {
        localStorage.setItem('foodLog', JSON.stringify(this.foodLog));
    }

    loadFoodLog() {
        const saved = localStorage.getItem('foodLog');
        return saved ? JSON.parse(saved) : {};
    }
}

// App-Instanz initialisieren
const app = new CalorieTrackerApp();
