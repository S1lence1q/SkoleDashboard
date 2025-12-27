// Data variables (will be loaded in init)
let schedules = null;
let days = null;
let students = null;
let teachers = null;

// Firebase & Live Link State
var firebaseConfig = {
    apiKey: "AIzaSyD8zbwNjLmzTNRWM-f0ujP258mzB_deAiQ",
    authDomain: "live-link-drop.firebaseapp.com",
    databaseURL: "https://live-link-drop-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "live-link-drop",
    storageBucket: "live-link-drop.firebasestorage.app",
    messagingSenderId: "335736846822",
    appId: "1:335736846822:web:6ed6aea2b739933f66fe27",
    measurementId: "G-ZDFT90QC42"
};

var liveLinkState = {
    mode: 'demo',
    db: null,
    currentRoom: 'global'
};

// DOM Elements
const clockEl = document.getElementById('clock');
const dateEl = document.getElementById('date');
const statusLabelEl = document.getElementById('status-label');
const currentSubjectEl = document.getElementById('current-subject');
const nextInfoEl = document.getElementById('next-info');
const countdownEl = document.getElementById('countdown');
const scheduleListEl = document.getElementById('schedule-list');
const classSelector = document.getElementById('class-selector');
const themeBtn = document.getElementById('theme-btn');

// State
// State
let currentState = {
    dayIndex: -1,
    scheduleToday: null,
    currentClass: localStorage.getItem('skole_class') || 'valhalla',
    currentTheme: localStorage.getItem('skole_theme') || 'default',
    timeOffset: 0, // Difference in ms between real time and simulated time
    isSimulating: false
};

// Themes
const themes = ['default', 'theme-midnight', 'theme-forest', 'theme-sunset', 'theme-crimson', 'theme-coffee', 'theme-oled'];

/**
 * Initialize the app
 */
function init() {
    // Check if data is loaded
    if (!window.SkoleData) {
        console.error("SkoleData is missing! Make sure data.js is loaded.");
        if (currentSubjectEl) currentSubjectEl.textContent = "Fejl: Data mangler";
        return;
    }

    // Load data
    schedules = window.SkoleData.schedules;
    days = window.SkoleData.days;
    students = window.SkoleData.students;
    teachers = window.SkoleData.teachers;

    if (!schedules) {
        console.error("Schedules missing in SkoleData");
        if (currentSubjectEl) currentSubjectEl.textContent = "Fejl: Skema mangler";
        return;
    }

    // Init Theme
    initTheme();

    // Lock Screen Logic
    checkLock();

    // Init Classmates
    initClassmates();

    // Set selector to current class
    if (classSelector) {
        classSelector.value = currentState.currentClass;
        classSelector.addEventListener('change', (e) => {
            currentState.currentClass = e.target.value;
            localStorage.setItem('skole_class', currentState.currentClass);
            currentState.dayIndex = -1; // Force re-render
            currentState.scheduleToday = null;
            updateTime();
        });
    }

    // Init Live Link Drop
    initLiveLink();

    // Apple-Level Polish
    initScrollObserver();

    updateTime();
    setInterval(updateTime, 1000); // Update every second
    renderSchedule();
}

/**
 * Initialize Theme Logic
 */
/**
 * Initialize Theme Logic
 */
function initTheme() {
    // Support both old chips and new dots
    const themeElements = document.querySelectorAll('.theme-chip, .theme-dot');

    // Function to set theme
    const setTheme = (themeName) => {
        // Remove ALL known theme classes
        themes.forEach(t => {
            if (t !== 'default') document.body.classList.remove(t);
        });

        // Determine class name to add
        // Users might pass "midnight" or "theme-midnight"
        let className = themeName;
        if (themeName !== 'default' && !themeName.startsWith('theme-')) {
            className = `theme-${themeName}`;
        }

        // Add class
        if (themeName !== 'default') {
            document.body.classList.add(className);
        }

        currentState.currentTheme = className; // Save the full class name
        localStorage.setItem('skole_theme', className);

        // Update active state visual
        themeElements.forEach(el => {
            // Check loosely matches (dataset might be "theme-midnight" or "midnight")
            const elTheme = el.dataset.theme;
            const match = elTheme === className || `theme-${elTheme}` === className || elTheme === 'default' && className === 'default';

            if (match) {
                el.style.transform = 'scale(1.2)';
                el.style.borderColor = 'var(--accent)';
                el.style.opacity = '1';
                el.style.boxShadow = '0 0 10px var(--accent)';
            } else {
                el.style.transform = 'scale(1)';
                el.style.borderColor = 'rgba(255,255,255,0.2)';
                el.style.opacity = '0.5';
                el.style.boxShadow = 'none';
            }
        });
    };

    // Apply saved theme (handle old saves like "midnight" vs new "theme-midnight")
    let startTheme = currentState.currentTheme;
    // Fix legacy saves
    if (startTheme !== 'default' && !startTheme.startsWith('theme-')) {
        startTheme = 'theme-' + startTheme;
    }
    setTheme(startTheme);

    // Add listeners
    themeElements.forEach(el => {
        el.addEventListener('click', () => {
            const theme = el.dataset.theme;
            setTheme(theme);
        });
    });
}

/**
 * Toggle Secondary Tools in Menu
 * @param {string} sectionId - The ID of the section to show (e.g., 'calculator')
 */
function toggleSecondary(sectionName) {
    const overlay = document.getElementById('extras-overlay'); // Main menu
    const parent = document.getElementById('secondary-view');
    const sections = document.querySelectorAll('.sec-content');
    const target = document.getElementById(`sec-${sectionName}`);

    // If opening an already open section, close it
    if (target && !target.classList.contains('hidden') && !parent.classList.contains('hidden')) {
        parent.classList.add('hidden');
        return;
    }

    // Hide all first
    sections.forEach(s => s.classList.add('hidden'));

    // Show parent and target
    if (target) {
        parent.classList.remove('hidden');
        target.classList.remove('hidden');

        // Scroll to it
        setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
}
// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// --- VISUAL POLISH FUNCTIONS ---

/* Scroll Observer for Storyboard Reveal */
function initScrollObserver() {
    const sections = document.querySelectorAll('.story-section');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.2 // Trigger when 20% visible
    });

    sections.forEach(section => {
        observer.observe(section);
    });
}



// --- LIVE LINK FUNCTIONS ---
function initLiveLink() {
    if (typeof firebase === 'undefined') {
        console.warn("Firebase not loaded.");
        return;
    }

    // Config Check
    if (firebaseConfig.apiKey === "API_KEY_HER") {
        setupDemoMode();
    } else {
        try {
            firebase.initializeApp(firebaseConfig);
            liveLinkState.db = firebase.database();
            liveLinkState.mode = 'firebase';
            setupFirebaseListener();
        } catch (e) {
            console.error("Firebase init error:", e);
            setupDemoMode();
        }
    }

    setupLiveLinkUI();
}

function setupFirebaseListener() {
    var roomRef = liveLinkState.db.ref('rooms/' + liveLinkState.currentRoom);
    roomRef.on('value', function (snapshot) {
        var data = snapshot.val();
        if (data) {
            displayLiveLink(data);
        }
    });
}

function setupDemoMode() {
    try {
        var saved = localStorage.getItem('lld_global_link');
        if (saved) displayLiveLink(JSON.parse(saved));
    } catch (e) { }

    window.addEventListener('storage', function (e) {
        if (e.key === 'lld_global_link') {
            try {
                displayLiveLink(JSON.parse(e.newValue));
            } catch (e) { }
        }
    });
}

function sendLiveLink(input) {
    if (!input) return;

    var isUrl = /^(http|https):\/\/[^ "]+$/.test(input);
    if (!isUrl && /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/.test(input) && !input.includes(' ')) {
        input = 'https://' + input;
        isUrl = true;
    }

    var data = {
        content: input,
        type: isUrl ? 'url' : 'text',
        timestamp: Date.now()
    };

    if (liveLinkState.mode === 'firebase') {
        liveLinkState.db.ref('rooms/' + liveLinkState.currentRoom).set(data)
            .then(() => {
                // Clear input (handle both standalone and normal if exists)
                const inputEl = document.getElementById('link-input') || document.getElementById('link-input-standalone');
                if (inputEl) inputEl.value = '';
            })
            .catch((err) => alert("Fejl: " + err.message));
    } else {
        localStorage.setItem('lld_global_link', JSON.stringify(data));
        displayLiveLink(data);
        document.getElementById('link-input').value = '';
    }
}

function displayLiveLink(data) {
    var content = data.content || data.url;
    if (!content) return;

    // Helper to find normal or standalone
    const get = (id) => document.getElementById(id) || document.getElementById(id + '-standalone');

    const ui = {
        dropZone: get('drop-zone'),
        linkContent: get('link-content'),
        currentLink: get('current-link'),
        timestamp: get('timestamp'),
        copyBtn: get('copy-btn'),
        openBtn: get('open-btn')
    };

    if (!ui.dropZone) return;

    ui.dropZone.classList.add('active');
    // Hide empty state in the correct container
    const emptyState = ui.dropZone.querySelector('.empty-state');
    if (emptyState) emptyState.classList.add('hidden');
    ui.linkContent.classList.remove('hidden');

    var isUrl = data.type === 'url' || (data.url && !data.type);

    if (isUrl) {
        ui.currentLink.href = content;
        ui.currentLink.textContent = new URL(content).hostname + "/...";
        ui.currentLink.style.pointerEvents = "auto";
        ui.openBtn.classList.remove('hidden');
    } else {
        ui.currentLink.removeAttribute('href');
        ui.currentLink.textContent = content;
        ui.currentLink.style.pointerEvents = "none";
        ui.openBtn.classList.add('hidden');
    }

    ui.copyBtn.classList.remove('hidden');

    const time = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    ui.timestamp.textContent = (isUrl ? "Link" : "Tekst") + " fra " + time;
}

function setupLiveLinkUI() {
    // Generic handler for both normal and standalone IDs
    const getEl = (id) => document.getElementById(id) || document.getElementById(id + '-standalone');

    const form = getEl('send-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = getEl('link-input');
            sendLiveLink(input.value.trim());
        });
    }

    const copyBtn = getEl('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const linkEl = getEl('current-link');
            const val = linkEl.href ? linkEl.href : linkEl.textContent;
            navigator.clipboard.writeText(val);
            const toast = document.getElementById('toast');
            toast.classList.remove('hidden');
            toast.style.display = 'block';
            setTimeout(() => toast.style.display = 'none', 2000);
        });
    }

    const openBtn = getEl('open-btn');
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            const linkEl = getEl('current-link');
            if (linkEl.href) window.open(linkEl.href, '_blank');
        });
    }
}

// VIEW SWITCHING FUNCTIONS (SPA)
// VIEW SWITCHING FUNCTIONS (SPA - ANIMATED)
// VIEW SWITCHING FUNCTIONS (SPA - ANIMATED)
window.showLiveLink = function () {
    const dashboard = document.getElementById('view-dashboard');
    const liveLink = document.getElementById('view-livelink');

    liveLink.classList.remove('hidden');
    liveLink.classList.remove('anim-slide-down-out');

    // Force Reflow (CRITICAL for animation to restart)
    void liveLink.offsetWidth;

    liveLink.classList.add('anim-slide-down-in');

    // Dashboard scales down
    dashboard.style.transition = "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s ease";
    dashboard.style.transform = "scale(0.92)";
    dashboard.style.opacity = "0.5";
    dashboard.style.pointerEvents = "none";

    setTimeout(() => {
        dashboard.classList.add('hidden');
        dashboard.style.pointerEvents = "auto";
    }, 400);
}

window.showDashboard = function () {
    const dashboard = document.getElementById('view-dashboard');
    const liveLink = document.getElementById('view-livelink');

    dashboard.classList.remove('hidden');
    dashboard.style.pointerEvents = "none"; // Prevent clicks during anim

    // Force Reflow
    void dashboard.offsetWidth;

    // Animate dashboard in (scale up)
    // Start from 0.5 opacity (where we left it) so it doesn't flash
    dashboard.style.transition = "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s ease";
    dashboard.style.transform = "scale(0.92)";
    dashboard.style.opacity = "0.5";

    requestAnimationFrame(() => {
        dashboard.style.transform = "scale(1)";
        dashboard.style.opacity = "1";
    });

    // Animate Live Link out
    liveLink.classList.remove('anim-slide-down-in');
    liveLink.classList.add('anim-slide-down-out');

    setTimeout(() => {
        liveLink.classList.add('hidden');
        liveLink.classList.remove('anim-slide-down-out');
        dashboard.style.pointerEvents = "auto";
        // Reset dashboard styles specifically
        dashboard.style.transform = "";
        dashboard.style.opacity = "";
        dashboard.style.transition = "";
    }, 400);
}

function checkLock() {
    const lockScreen = document.getElementById('lock-screen');
    const lockInput = document.getElementById('lock-input');
    const lockBtn = document.getElementById('lock-btn');
    const lockError = document.getElementById('lock-error');

    if (!lockScreen || !lockInput || !lockBtn) {
        return;
    }

    // Check if already unlocked in this session
    if (sessionStorage.getItem('skole_unlocked') === 'true') {
        lockScreen.classList.add('hidden');
        setTimeout(() => lockScreen.style.display = 'none', 0); // Immediate
        return;
    }

    // Unlock function
    const unlock = () => {
        const val = lockInput.value.trim().toLowerCase();

        if (val === 'julelars') {
            sessionStorage.setItem('skole_unlocked', 'true');
            lockScreen.classList.add('hidden');

            // FORCE REMOVAL: Wait for transition (600ms) then kill it
            setTimeout(() => {
                lockScreen.style.display = 'none';
            }, 600);
        } else {
            lockError.classList.remove('hidden');
            lockInput.value = '';
            lockInput.focus();
        }
    };

    lockBtn.addEventListener('click', unlock);
    lockInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') unlock();
    });
}

/**
 * Main update loop
 */
function updateTime() {
    let now = new Date();

    // Time Travel Override
    // Time Travel Override (Live Simulation)
    if (currentState.isSimulating) {
        now = new Date(now.getTime() + currentState.timeOffset);

        // Visual Warning
        if (!document.getElementById('sim-badge')) {
            const badge = document.createElement('div');
            badge.id = 'sim-badge';
            badge.innerText = '⚡ LIVE SIMULATION';
            badge.style.position = 'fixed';
            badge.style.bottom = '10px';
            badge.style.left = '50%';
            badge.style.transform = 'translateX(-50%)';
            badge.style.background = '#ef4444';
            badge.style.color = 'white';
            badge.style.padding = '4px 12px';
            badge.style.borderRadius = '20px';
            badge.style.zIndex = '9999';
            badge.style.fontSize = '0.75rem';
            badge.style.fontWeight = 'bold';
            badge.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.5)';
            badge.style.pointerEvents = 'none';
            document.body.appendChild(badge);
        }
    } else {
        const badge = document.getElementById('sim-badge');
        if (badge) badge.remove();
    }

    // Update Header Clock (REMOVED - Cleaner look)
    // const timeString = now.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
    // if(clockEl) clockEl.textContent = timeString;

    // // Update Header Date (REMOVED)
    // const dateOptions = { weekday: 'long', day: 'numeric', month: 'short' };
    // if(dateEl) dateEl.textContent = capitalizeFirstLetter(now.toLocaleDateString('da-DK', dateOptions));

    // Determine current day schedule
    // JS getDay(): 0 = Sunday, 1 = Monday.
    let currentDayIndex = now.getDay();

    // Force Monday if weekend during simulation (to show data)
    if (currentState.isSimulating && (currentDayIndex === 0 || currentDayIndex === 6)) {
        currentDayIndex = 1;
    }

    // Check if we need to update schedule data (Day changed OR Class changed)
    const activeSchedule = schedules[currentState.currentClass];

    if (currentState.dayIndex !== currentDayIndex || !currentState.scheduleToday) {
        currentState.dayIndex = currentDayIndex;
        // Find schedule for today using the active class schedule
        if (activeSchedule) {
            currentState.scheduleToday = activeSchedule.find(d => d.dayIndex === currentDayIndex);
        } else {
            currentState.scheduleToday = null;
        }
        renderSchedule(); // Re-render if day changes
    }

    updateStatus(now);
}

/**
 * Update the main status card (Current subject, countdown)
 */
function updateStatus(now) {
    if (!currentState.scheduleToday) {
        // Weekend or no schedule
        statusLabelEl.textContent = "Fri";
        currentSubjectEl.textContent = "Ingen skole";
        nextInfoEl.textContent = "Nyd fridagen!";
        countdownEl.textContent = "";
        return;
    }

    const currentTimeValue = now.getHours() * 60 + now.getMinutes();
    const lessons = currentState.scheduleToday.lessons;
    let currentLesson = null;
    let nextLesson = null;

    // Find where we are in the schedule
    for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        const startVal = timeStringToMinutes(lesson.start);
        const endVal = timeStringToMinutes(lesson.end);

        if (currentTimeValue >= startVal && currentTimeValue < endVal) {
            currentLesson = lesson;
            // Next is just the next one in the list, if exists
            if (i + 1 < lessons.length) {
                nextLesson = lessons[i + 1];
            }
            break;
        }

        if (currentTimeValue < startVal) {
            // We are before this calculation, so this is the "next" event (e.g. morning before school)
            nextLesson = lesson;
            break;
        }
    }

    // Update UI based on finding
    if (currentLesson) {
        statusLabelEl.textContent = "Lige nu";
        currentSubjectEl.textContent = currentLesson.subject;
        currentSubjectEl.style.color = currentLesson.color;

        // Calculate Remaining Time
        const endVal = timeStringToMinutes(currentLesson.end);
        const diffMinutes = endVal - currentTimeValue;

        // For seconds precision, we need to be more granular than just minutes
        // Let's do a full timestamp calc for the specific Time
        const endTimeDate = new Date(now);
        const [endH, endM] = currentLesson.end.split(':');
        endTimeDate.setHours(endH, endM, 0, 0);

        const diffSeconds = Math.floor((endTimeDate - now) / 1000);
        countdownEl.textContent = formatCountdown(diffSeconds);

        if (nextLesson) {
            nextInfoEl.textContent = `Næste: ${nextLesson.subject} (${nextLesson.start})`;
        } else {
            nextInfoEl.textContent = "Dagen er snart slut";
        }

        // --- PROGRESS RING CALCULATION ---
        const startTimeDate = new Date(now);
        const [startH, startM] = currentLesson.start.split(':');
        startTimeDate.setHours(startH, startM, 0, 0);

        const totalDuration = endTimeDate - startTimeDate;
        const elapsed = now - startTimeDate;

        // constrain percent between 0 and 100
        let percent = (elapsed / totalDuration) * 100;
        if (nextLesson) {
            nextInfoEl.textContent = `Næste: ${nextLesson.subject} (${nextLesson.start})`;
        } else {
            nextInfoEl.textContent = "Dagen er snart slut";
        }

    } else if (nextLesson) {
        // Before school or in a gap that isn't explicitly a break (though our data maps breaks)
        statusLabelEl.textContent = "Næste";
        currentSubjectEl.textContent = nextLesson.subject;
        currentSubjectEl.style.color = nextLesson.color; // Use next lesson color

        const startTimeDate = new Date(now);
        const [startH, startM] = nextLesson.start.split(':');
        startTimeDate.setHours(startH, startM, 0, 0);

        const diffSeconds = Math.floor((startTimeDate - now) / 1000);
        countdownEl.textContent = formatCountdown(diffSeconds);

        nextInfoEl.textContent = `Starter kl. ${nextLesson.start}`;

    } else {
        // After school
        statusLabelEl.textContent = "Status";
        currentSubjectEl.textContent = "Fri";
        currentSubjectEl.style.color = "var(--text-primary)";
        nextInfoEl.textContent = "Vi ses i morgen!";
        countdownEl.textContent = "";
    }

    // Highlight active item in list
    highlightActiveItem(currentLesson);
}

/**
 * Render the schedule list
 */
function renderSchedule() {
    scheduleListEl.innerHTML = '';

    if (!currentState.scheduleToday) {
        scheduleListEl.innerHTML = '<div class="schedule-item"><span class="subject-name">Ingen timer i dag</span></div>';
        return;
    }

    currentState.scheduleToday.lessons.forEach((lesson, index) => {
        const item = document.createElement('div');
        item.className = 'schedule-item';
        item.dataset.start = lesson.start;
        item.dataset.end = lesson.end;

        // Styling border for lessons
        if (lesson.type !== 'break') {
            item.style.borderLeftColor = lesson.color;
        } else {
            item.style.borderLeftColor = 'transparent';
            item.classList.add('break-item');
        }

        const teacherHtml = lesson.teacher ? `<span class="teacher-name">${lesson.teacher}</span>` : '';

        item.innerHTML = `
            <div class="time-slot">${lesson.start} - ${lesson.end}</div>
            <div class="subject-info">
                <span class="subject-name">${lesson.subject}</span>
                ${teacherHtml}
            </div>
        `;

        scheduleListEl.appendChild(item);
    });
}

function highlightActiveItem(currentLesson) {
    const items = scheduleListEl.querySelectorAll('.schedule-item');
    items.forEach(item => {
        item.classList.remove('active', 'past');

        const start = item.dataset.start;
        const end = item.dataset.end;

        if (!start) return; // Skip if no data

        if (currentLesson && start === currentLesson.start) {
            item.classList.add('active');
        } else {
            // Check if past
            const now = new Date();
            const currentMins = now.getHours() * 60 + now.getMinutes();
            const endMins = timeStringToMinutes(end);

            if (currentMins >= endMins) {
                item.classList.add('past');
            }
        }
    });
}

// Helpers
function timeStringToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function formatCountdown(totalSeconds) {
    if (totalSeconds < 0) return "00:00:00";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    // If more than an hour, show hours
    if (h > 0) {
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
}

function pad(num) {
    return num.toString().padStart(2, '0');
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// --- NEW FEATURE LOGIC ---

// 1. Scratchpad Logic
const scratchpad = document.getElementById('scratchpad');
if (scratchpad) {
    // Load saved note
    const savedNote = localStorage.getItem('skole_dashboard_note');
    if (savedNote) scratchpad.value = savedNote;

    // Save on input
    scratchpad.addEventListener('input', (e) => {
        localStorage.setItem('skole_dashboard_note', e.target.value);
    });
}

// 2. Tab Logic (for Tools)
window.switchTool = function (toolName) {
    // Hide all
    document.querySelectorAll('.tool-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    // Show target
    document.getElementById(`tool-${toolName}`).classList.add('active');

    // Highlight button
    const buttons = document.querySelectorAll('.tab-btn');
    if (toolName === 'calculator') buttons[0].classList.add('active');
    if (toolName === 'timer') buttons[1].classList.add('active');
}

// 3. Calculator Logic
let calcExpression = '';
const display = document.getElementById('calc-display');

window.calcAppend = function (val) {
    calcExpression += val;
    display.textContent = calcExpression;
}

window.calcOperate = function (op) {
    calcExpression += ' ' + op + ' ';
    display.textContent = calcExpression;
}

window.calcClear = function () {
    calcExpression = '';
    display.textContent = '0';
}

window.calcEqual = function () {
    try {
        const result = eval(calcExpression);
        display.textContent = result;
        calcExpression = result.toString();
    } catch (e) {
        display.textContent = 'Error';
        calcExpression = '';
    }
}

// 4. Focus Timer Logic
let focusTimeLeft = 25 * 60;
let focusInterval = null;
const focusDisplay = document.getElementById('focus-display');

window.startFocusTimer = function () {
    if (focusInterval) return; // Already running

    focusInterval = setInterval(() => {
        focusTimeLeft--;
        if (focusTimeLeft <= 0) {
            clearInterval(focusInterval);
            focusInterval = null;
            console.log("Tiden er gået! Hold en pause. ☕");
        }
        updateFocusDisplay();
    }, 1000);
}

window.resetFocusTimer = function () {
    clearInterval(focusInterval);
    focusInterval = null;
    focusTimeLeft = 25 * 60;
    updateFocusDisplay();
}

function updateFocusDisplay() {
    const m = Math.floor(focusTimeLeft / 60);
    const s = focusTimeLeft % 60;
    if (focusDisplay) focusDisplay.textContent = `${pad(m)}:${pad(s)}`;
}

// --- 5. Secret Snake Game Logic ---
let snakeGameInterval;
const gameOverlay = document.getElementById('game-overlay');
const canvas = document.getElementById('snake-game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('game-score');

// Game Vars
const gridSize = 20;
const tileCount = 20; // 400px / 20 = 20
let playerX = 10;
let playerY = 10;
let velX = 0;
let velY = 0;
let trail = [];
let tail = 5;
let appleX = 15;
let appleY = 15;
let score = 0;

// Setup Hidden Trigger (Triple Click on Header Title)
const headerTitle = document.querySelector('header h1');
if (headerTitle) {
    headerTitle.addEventListener('click', (e) => {
        if (e.detail === 3) { // Triple click detected
            openGame();
        }
    });
}

// Close Game on ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !gameOverlay.classList.contains('hidden')) {
        closeGame();
    }
});

// Controls
document.addEventListener('keydown', keyPush);

// Close on Click Outside
if (gameOverlay) {
    gameOverlay.addEventListener('click', (e) => {
        if (e.target === gameOverlay) {
            closeGame();
        }
    });
}

function openGame() {
    gameOverlay.classList.remove('hidden');
    resetGame();
    snakeGameInterval = setInterval(gameLoop, 1000 / 10); // 10 FPS (Slower)
}

function closeGame() {
    gameOverlay.classList.add('hidden');
    clearInterval(snakeGameInterval);
}

function resetGame() {
    playerX = 10;
    playerY = 10;
    velX = 0;
    velY = 0;
    trail = [];
    tail = 5;
    score = 0;
    scoreEl.textContent = score;
    appleX = Math.floor(Math.random() * tileCount);
    appleY = Math.floor(Math.random() * tileCount);
}

function gameLoop() {
    playerX += velX;
    playerY += velY;

    // Wrap around screen
    if (playerX < 0) {
        playerX = tileCount - 1;
    }
    if (playerX > tileCount - 1) {
        playerX = 0;
    }
    if (playerY < 0) {
        playerY = tileCount - 1;
    }
    if (playerY > tileCount - 1) {
        playerY = 0;
    }

    // Background
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Snake
    ctx.fillStyle = "#4FD1C5"; // Accent color
    for (let i = 0; i < trail.length; i++) {
        ctx.fillRect(trail[i].x * gridSize, trail[i].y * gridSize, gridSize - 2, gridSize - 2);

        // Death check
        if (trail[i].x === playerX && trail[i].y === playerY && (velX !== 0 || velY !== 0)) {
            tail = 5;
            score = 0;
            scoreEl.textContent = score;
        }
    }

    trail.push({ x: playerX, y: playerY });
    while (trail.length > tail) {
        trail.shift();
    }

    // Apple
    if (appleX === playerX && appleY === playerY) {
        tail++;
        score++;
        scoreEl.textContent = score;
        appleX = Math.floor(Math.random() * tileCount);
        appleY = Math.floor(Math.random() * tileCount);
    }

    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(appleX * gridSize, appleY * gridSize, gridSize - 2, gridSize - 2);
}

function keyPush(evt) {
    if (gameOverlay.classList.contains('hidden')) return;

    // Prevent scrolling
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(evt.code) > -1) {
        evt.preventDefault();
    }

    switch (evt.key) {
        case "ArrowLeft":
            if (velX !== 1) { velX = -1; velY = 0; }
            break;
        case "ArrowUp":
            if (velY !== 1) { velX = 0; velY = -1; }
            break;
        case "ArrowRight":
            if (velX !== -1) { velX = 1; velY = 0; }
            break;
        case "ArrowDown":
            if (velY !== -1) { velX = 0; velY = 1; }
            break;
    }
}

// --- 6. Classmate Features ---
const studentSearchInput = document.getElementById('student-search');
const studentListEl = document.getElementById('student-list');
const funDisplayEx = document.getElementById('fun-display');

function initClassmates() {
    if (!students || !studentListEl) return;
    renderStudents(students);

    // Search Listener
    if (studentSearchInput) {
        studentSearchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = students.filter(s => s.name.toLowerCase().includes(term) || s.full.toLowerCase().includes(term));
            renderStudents(filtered);
        });
    }
}

function renderStudents(list) {
    if (!studentListEl) return;
    studentListEl.innerHTML = '';

    // Check for birthdays today
    const now = new Date();
    // Format: "10. feb" -> we need basic parsing or just string matching if we're lazy.
    // Let's do string matching for now as Danes use standard formatting.
    const monthNames = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
    const todayStr = `${now.getDate()}. ${monthNames[now.getMonth()]}`;

    list.forEach(s => {
        const item = document.createElement('div');
        item.className = 'student-item';

        let bdayIcon = '';
        if (s.bday.includes(todayStr)) {
            item.classList.add('birthday-today');
            bdayIcon = '🎂 ';
        }

        item.innerHTML = `
            <span>${bdayIcon}${s.name}</span>
            <span class="student-bday">${s.bday}</span>
        `;
        // Add click to copy full name?
        item.title = s.full;
        studentListEl.appendChild(item);
    });
}

// --- 7. Fun Zone Logic ---

window.startRoulette = function () {
    if (!students || !funDisplayEx) return;
    funDisplayEx.classList.remove('hidden');
    funDisplayEx.innerHTML = '🎲 Ruller...';

    let count = 0;
    const max = 20;
    const interval = setInterval(() => {
        const randomStudent = students[Math.floor(Math.random() * students.length)];
        funDisplayEx.innerHTML = `🎲 ${randomStudent.name}`;
        count++;
        if (count >= max) {
            clearInterval(interval);
            funDisplayEx.innerHTML = `✨ <strong>${randomStudent.name}</strong> er den heldige! ✨`;
        }
    }, 100);
}

// --- 8. Teacher Quotes ---
const quoteText = document.getElementById('quote-text');
const quoteAuthor = document.getElementById('quote-author');

window.newQuote = function () {
    if (!students || !quoteText || !quoteAuthor) return; // students check just ensures data loaded

    // Ensure we have quotes and teachers from global scope or window
    const quotes = window.SkoleData.quotes || ["Ingen citater fundet."];
    const teachersList = window.SkoleData.teachers || ["Ukendt Lærer"];

    const rQuote = quotes[Math.floor(Math.random() * quotes.length)];
    const rTeacher = teachersList[Math.floor(Math.random() * teachersList.length)];

    // Animate change
    quoteText.style.opacity = 0;
    quoteAuthor.style.opacity = 0;

    setTimeout(() => {
        quoteText.textContent = `"${rQuote}"`;
        quoteAuthor.textContent = `- ${rTeacher}`;
        quoteText.style.opacity = 1;
        quoteAuthor.style.opacity = 1;
    }, 200);
}

// --- 9. Extras Overlay (Menu) ---
const menuBtn = document.getElementById('menu-btn');
const closeExtrasBtn = document.getElementById('close-extras-btn');
const extrasOverlay = document.getElementById('extras-overlay');

if (menuBtn && extrasOverlay) {
    menuBtn.addEventListener('click', () => {
        extrasOverlay.classList.remove('hidden');
    });
}

if (closeExtrasBtn && extrasOverlay) {
    closeExtrasBtn.addEventListener('click', () => {
        extrasOverlay.classList.add('hidden');
    });

    // Close on click outside content
    extrasOverlay.addEventListener('click', (e) => {
        if (e.target === extrasOverlay) {
            extrasOverlay.classList.add('hidden');
        }
    });
}

// Override startLoveMatch with Animation
window.startLoveMatch = function () {
    if (!students || !funDisplayEx) return;
    funDisplayEx.classList.remove('hidden');

    // Animation Loop
    let count = 0;
    const max = 15; // Animation frames

    const animation = setInterval(() => {
        const tmp1 = students[Math.floor(Math.random() * students.length)];
        const tmp2 = students[Math.floor(Math.random() * students.length)];
        const tmpPct = Math.floor(Math.random() * 101);

        funDisplayEx.innerHTML = `
            <div style="font-size: 0.9rem; opacity: 0.7;">${tmp1.name} + ${tmp2.name}</div>
            <div style="font-size: 2rem; font-weight: 800; color: var(--text-muted); margin: 5px 0;">${tmpPct}%</div>
        `;

        count++;
        if (count >= max) {
            clearInterval(animation);
            showFinalLoveResult();
        }
    }, 100);
}

function showFinalLoveResult() {
    const p1 = students[Math.floor(Math.random() * students.length)];
    let p2 = students[Math.floor(Math.random() * students.length)];

    while (p1 === p2) {
        p2 = students[Math.floor(Math.random() * students.length)];
    }

    const percent = Math.floor(Math.random() * 101);
    let comment = "";
    if (percent > 90) comment = "Power Couple! 🔥";
    else if (percent > 50) comment = "Måske? 😉";
    else comment = "Akavet... 😬";

    funDisplayEx.innerHTML = `
        <div style="font-size: 0.9rem;">${p1.name} + ${p2.name}</div>
        <div style="font-size: 2rem; font-weight: 800; color: var(--accent); margin: 5px 0; animation: popIn 0.5s ease;">${percent}%</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">${comment}</div>
    `;
}

// --- TIME TRAVEL FUNCTIONS ---
window.setTimeTravel = function (hours, minutes) {
    const now = new Date();
    // Create target date for TODAY at requested time
    const target = new Date();
    target.setHours(hours);
    target.setMinutes(minutes);
    target.setSeconds(0);

    // Calculate offset: Target Time - Real Time
    // e.g. if now is 20:00 and target is 10:00, offset is -10 hours.
    currentState.timeOffset = target.getTime() - now.getTime();
    currentState.isSimulating = true;

    // Force immediate update
    currentState.dayIndex = -1; // Force schedule reload
    updateTime();
    renderSchedule();

    // Close overlay (optional, but good for feedback)
    const overlay = document.getElementById('extras-overlay');
    if (overlay) overlay.classList.add('hidden');
}

window.resetTimeTravel = function () {
    currentState.isSimulating = false;
    currentState.timeOffset = 0;
    currentState.dayIndex = -1; // Force schedule reload
    // Remove badge
    const badge = document.getElementById('sim-badge');
    if (badge) badge.remove();

    updateTime();
    renderSchedule();
}
// ... (End of file)

/**
 * --- SMART WIDGET LOGIC ---
 */

// Helper: Get ISO Week Number
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

// Current Widget State
let widgetState = {
    currentSubject: null,
    manualOverride: {} // { 'Dansk': 2 (index), 'Matematik': 0 }
};

// Update the Widget
function updateSubjectWidget(subjectName) {
    // 1. Check if we have a plan for this subject
    const yearPlan = window.SkoleData.yearPlan;
    if (!yearPlan || !yearPlan[subjectName]) {
        // Hide widget if no data
        document.getElementById('subject-widget').classList.add('hidden');
        return;
    }

    // 2. Show Widget
    document.getElementById('subject-widget').classList.remove('hidden');
    document.getElementById('widget-subject').textContent = subjectName;
    widgetState.currentSubject = subjectName;

    // 3. Find Topic
    // Check override first
    let topicIndex = widgetState.manualOverride[subjectName];

    if (topicIndex === undefined) {
        // Auto-detect based on week
        const currentWeek = getWeekNumber(new Date());
        const topics = yearPlan[subjectName];

        // Find matching week
        const foundIndex = topics.findIndex(t => t.weeks.includes(currentWeek));
        topicIndex = foundIndex !== -1 ? foundIndex : 0; // Default to first if not found
    }

    // 4. Render Topic
    const topics = yearPlan[subjectName];
    const currentTopic = topics[topicIndex] || topics[0];

    document.getElementById('widget-topic').textContent = currentTopic.title;

    // 5. Update Link
    const linkMap = window.SkoleData.oneNoteLinks;
    const link = linkMap[subjectName] || linkMap['default'];

    const btn = document.getElementById('widget-btn');
    btn.href = link;
    // Update button text? keeping it simple "Åbn OneNote"
}

// Handle Topic Switching (Arrows)
window.changeTopic = function (direction) {
    if (!widgetState.currentSubject) return;

    const subject = widgetState.currentSubject;
    const topics = window.SkoleData.yearPlan[subject];
    if (!topics) return;

    // Get current index (from override or calc)
    let currentIndex = widgetState.manualOverride[subject];
    if (currentIndex === undefined) {
        // Recalculate default to find starting point
        const currentWeek = getWeekNumber(new Date());
        currentIndex = topics.findIndex(t => t.weeks.includes(currentWeek));
        if (currentIndex === -1) currentIndex = 0;
    }

    // Calc new index
    let newIndex = currentIndex + direction;
    // Bounds check
    if (newIndex < 0) newIndex = topics.length - 1; // Cycle? or stop? Let's cycle
    if (newIndex >= topics.length) newIndex = 0;

    // Save override
    widgetState.manualOverride[subject] = newIndex;

    // Re-render
    updateSubjectWidget(subject);
};

// Hook into updateTime (called every second)
// We need to inject this call into the existing updateTime loop
// Instead of editing the giant function, let's append a poller or use the existing loop if possible.
// Finding: The `updateTime` function calls `renderStatus`. 
// I will start a separate interval for the widget to check every few seconds, or just hook into the existing one if I can edit it.
// Simpler: Just run it every second.
setInterval(() => {
    // Get current subject name from DOM (hacky but effective since updateTime logic is complex)
    const currentSubjText = document.getElementById('current-subject').textContent;
    // If text says "Fri", "Pause", etc., we might want to hide or show "Next" topic?
    // Let's stick to showing it only if it matches a known subject in yearPlan.

    // Clean text (remove emojis if any, though current-subject usually has none)
    const cleanSubj = currentSubjText.trim();

    // Optimization: Only update if changed
    updateSubjectWidget(cleanSubj);
}, 1000);

// Load Overrides
const savedOverrides = localStorage.getItem('skole_topic_overrides');
if (savedOverrides) {
    widgetState.manualOverride = JSON.parse(savedOverrides);
}

// Save on change
const originalChangeTopic = window.changeTopic;
window.changeTopic = function (dir) {
    originalChangeTopic(dir);
    localStorage.setItem('skole_topic_overrides', JSON.stringify(widgetState.manualOverride));
}

// End Script

/**
 * SECRET GOD MODE TRIGGER (RETRY) 🌩️
 * Click the Main Status Card 5 times
 */
document.addEventListener('DOMContentLoaded', () => {
    let secretClicks = 0;
    let secretTimer = null;
    const triggerZone = document.getElementById('status-card'); // The big card

    if (triggerZone) {
        // Prevent selecting text on rapid clicks
        triggerZone.style.userSelect = 'none';
        triggerZone.style.cursor = 'pointer'; // Hint that it's clickable (subtle)

        triggerZone.addEventListener('click', (e) => {
            // Don't trigger if clicking buttons inside (like Start/Reset or Widget arrows)
            if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'A') return;

            secretClicks++;

            // Reset after 3 seconds
            clearTimeout(secretTimer);
            secretTimer = setTimeout(() => {
                secretClicks = 0;
            }, 3000);

            if (secretClicks === 5) {
                // Activate
                const debugPanel = document.querySelector('.debug-hidden');
                if (debugPanel) {
                    const isHidden = !debugPanel.classList.contains('show');

                    // Toggle class
                    if (isHidden) {
                        debugPanel.classList.add('show');
                        debugPanel.style.display = 'block'; // Force
                        showToast("⚡ GOD MODE: UNOUVER (Se i menuen)");
                    } else {
                        debugPanel.classList.remove('show');
                        debugPanel.style.display = 'none'; // Force
                        showToast("🚫 GOD MODE: DEAKTIVERET");
                    }

                    // Visual feedback
                    triggerZone.style.animation = 'shake 0.5s';
                    setTimeout(() => triggerZone.style.animation = '', 500);
                } else {
                    console.error("Debug panel not found!");
                    showToast("Fejl: Debug panel mangler");
                }
                secretClicks = 0;
            }
        });
    } else {
        console.error("Status Card not found for trigger");
    }

    // Helper Toast (if not exists)
    window.showToast = function (msg) {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.remove('hidden');
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 3000);
    }
});

// Add shake animation style AND Toast Style (Bulletproof)
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes shake {
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  50% { transform: translateX(5px); }
  75% { transform: translateX(-5px); }
  100% { transform: translateX(0); }
}

#toast {
    position: fixed !important;
    top: 20px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    background: var(--accent) !important;
    color: #000 !important;
    padding: 10px 20px !important;
    border-radius: 99px !important;
    font-weight: 800 !important;
    text-transform: uppercase !important;
    letter-spacing: 1px !important;
    font-size: 0.9rem !important;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
    z-index: 2147483647 !important;
    display: none;
    pointer-events: none;
    white-space: nowrap !important;
}
`;
document.head.appendChild(styleSheet);

/**
 * Toggle Standalone Live Link Overlay
 */
window.toggleLiveLink = function () {
    const overlay = document.getElementById('livelink-overlay');
    const mainMenu = document.getElementById('extras-overlay');

    // Check if we are opening or closing
    const isOpening = overlay.classList.contains('hidden');

    if (isOpening) {
        // If opening Live Link, close the main menu to prevent clutter
        if (!mainMenu.classList.contains('hidden')) {
            mainMenu.classList.add('hidden');
        }
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}
