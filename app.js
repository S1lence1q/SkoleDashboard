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

// Themes (Updated Premium List)
const themes = ['theme-midnight', 'theme-royal', 'theme-crimson', 'theme-emerald', 'theme-frost'];

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

// --- FOCUS TIMER LOGIC (REMOVED) ---

// --- CALCULATOR LOGIC (REMOVED) ---

/**
 * Initialize Theme Logic
 */
function initTheme() {
    // Support both old chips and new dots
    const themeElements = document.querySelectorAll('.theme-chip, .theme-dot');

    // Function to set theme
    const setTheme = (themeName) => {
        // 1. Remove ALL theme classes (Robust Regex-like approach)
        document.body.className = document.body.className
            .replace(/theme-\w+/g, '') // Remove existing theme-* classes
            .trim();

        // 2. Determine new class
        let className = themeName;
        if (!className.startsWith('theme-') && className !== 'default') {
            className = `theme-${className}`;
        }

        // Fallback or Validate
        if (!themes.includes(className)) {
            // If invalid/old theme, default to midnight
            className = 'theme-midnight';
        }

        // 3. Add new class
        document.body.classList.add(className);

        // 4. Update State
        currentState.currentTheme = className;
        localStorage.setItem('skole_theme', className);

        // 5. Update UI (Visual Active State)
        themeElements.forEach(el => {
            const elTheme = el.dataset.theme;
            // Match exactly or with prefix
            const match = elTheme === className || `theme-${elTheme}` === className;

            if (match) {
                el.classList.add('active-theme');
            } else {
                el.classList.remove('active-theme');
                // Do NOT wipe style to preserve background color from HTML
                el.style.transform = '';
                el.style.border = '';
            }
        });
    };

    // Initialize Theme from Storage
    const savedTheme = localStorage.getItem('skole_theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        setTheme('theme-midnight'); // Default
    }

    // Event Listeners
    themeElements.forEach(btn => {
        btn.addEventListener('click', () => {
            setTheme(btn.dataset.theme);
        });
    });
}


/**
 * Toggle Secondary Tools in Menu
 * @param {string} sectionId - The ID of the section to show
 */
function toggleSecondary(sectionName) {
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
            // Animate Out
            lockScreen.classList.add('anim-unlock');

            // Wait for animation, then hide
            setTimeout(() => {
                lockScreen.classList.add('hidden');
                lockScreen.style.display = 'none';
            }, 600);
        } else {
            // Show error
            if (lockError) lockError.classList.remove('hidden');
            lockInput.value = '';
            lockInput.focus();

            // Shake effect
            lockInput.classList.add('shake');
            setTimeout(() => lockInput.classList.remove('shake'), 400);
        }
    };

    lockBtn.addEventListener('click', unlock);

    // Auto-unlock on input match
    lockInput.addEventListener('input', (e) => {
        const val = e.target.value.trim().toLowerCase();
        if (val === 'julelars') {
            unlock();
        } else {
            // Hide error while typing
            if (lockError) lockError.classList.add('hidden');
        }
    });

    lockInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') unlock();
    });

    // Focus on load
    setTimeout(() => lockInput.focus(), 100);
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
/**
 * Render the schedule list (Premium Layout)
 */
function renderSchedule() {
    scheduleListEl.innerHTML = '';

    if (!currentState.scheduleToday) {
        scheduleListEl.innerHTML = '<div class="schedule-card"><span class="card-subject" style="text-align:center; padding:0;">Ingen timer i dag 😴</span></div>';
        return;
    }

    currentState.scheduleToday.lessons.forEach((lesson, index) => {
        const item = document.createElement('div');
        // Use new CSS class
        item.className = 'schedule-card';
        if (lesson.type === 'break') item.className += ' break-item';

        item.dataset.start = lesson.start;
        item.dataset.end = lesson.end;

        // Subject Icon Mapping (Simple)
        let icon = "📚";
        if (lesson.subject.includes("Idræt")) icon = "⚽";
        if (lesson.subject.includes("Musik")) icon = "🎵";
        if (lesson.subject.includes("Matematik")) icon = "📐";
        if (lesson.subject.includes("Dansk")) icon = "🇩🇰";
        if (lesson.subject.includes("Engelsk")) icon = "🇬🇧";
        if (lesson.subject.includes("Tysk")) icon = "🇩🇪";
        if (lesson.subject.includes("Fysik")) icon = "⚛️";
        if (lesson.subject.includes("Historie")) icon = "🏛️";
        if (lesson.subject.includes("Kristendom")) icon = "⛪";
        if (lesson.subject.includes("Pause")) icon = "🥪";

        const teacherHtml = lesson.teacher && lesson.type !== 'break'
            ? `<div class="card-room">${lesson.teacher}</div>`
            : '';

        item.innerHTML = `
            <div class="card-time">${lesson.start}<br><span style="opacity:0.6">${lesson.end}</span></div>
            <div class="card-subject">
                <span style="margin-right:8px">${icon}</span> ${lesson.subject}
            </div>
            ${teacherHtml}
        `;

        scheduleListEl.appendChild(item);
    });
}

function highlightActiveItem(currentLesson) {
    const items = scheduleListEl.querySelectorAll('.schedule-card');
    items.forEach(item => {
        item.classList.remove('current', 'past');

        const start = item.dataset.start;
        const end = item.dataset.end;

        if (!start) return;

        if (currentLesson && start === currentLesson.start) {
            item.classList.add('current');

            // Only scroll if we haven't scrolled to this lesson yet
            if (currentState.lastScrolledTo !== start) {
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                currentState.lastScrolledTo = start; // Mark as scrolled
            }
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

// --- ARCADE INTEGRATION ---

// Helper: Smooth Transition
// Refactored to be SEQUENTIAL to prevent layout jumps
window.transitionTo = function (hideId, showId) {
    const hideEl = document.getElementById(hideId);
    const showEl = document.getElementById(showId);

    // Step 1: Fade Out
    if (hideEl && !hideEl.classList.contains('hidden')) {
        hideEl.classList.add('fade-target');
        hideEl.classList.add('fade-out-state');

        // Wait for fade out to finish before showing next
        setTimeout(() => {
            hideEl.classList.add('hidden');
            hideEl.classList.remove('fade-out-state');
            hideEl.classList.remove('fade-target');

            // Step 2: Fade In Next (only after previous is gone)
            if (showEl) {
                showEl.classList.add('hidden'); // Ensure hidden first
                showEl.classList.remove('fade-out-state'); // Reset state
                showEl.classList.add('fade-target');
                showEl.classList.add('fade-out-state'); // Init state

                showEl.classList.remove('hidden'); // Put in DOM

                // Force Reflow
                void showEl.offsetWidth;

                showEl.classList.remove('fade-out-state'); // Animate Opacity -> 1

                // Clean up classes after anim
                setTimeout(() => {
                    showEl.classList.remove('fade-target');
                }, 300);
            }
        }, 250); // Slightly faster than CSS to snap
    } else {
        // Instant show if no hide (first load?)
        if (showEl) showEl.classList.remove('hidden');
    }
}

// --- ARCADE NAVIGATION ---

window.handleArcadeBack = function () {
    const isSnake = !document.getElementById('stage-snake').classList.contains('hidden');
    const isBreakout = !document.getElementById('stage-breakout').classList.contains('hidden');
    const isWordle = !document.getElementById('stage-wordle').classList.contains('hidden');

    if (isSnake) window.closeSnake();
    else if (isBreakout) window.closeBreakout();
    else if (isWordle) window.closeWordle();
    else window.closeArcade();
}

window.openArcade = function () {
    document.getElementById('extras-overlay').classList.add('hidden');
    const arcade = document.getElementById('view-arcade');

    // Animate In
    arcade.classList.add('fade-target');
    arcade.classList.add('fade-out-state');
    arcade.classList.remove('hidden');

    void arcade.offsetWidth;
    arcade.classList.remove('fade-out-state');

    // Init Arcade engine
    if (window.Arcade) window.Arcade.init();
}

window.closeArcade = function () {
    // Animate Out
    const arcade = document.getElementById('view-arcade');
    arcade.classList.add('fade-target');
    arcade.classList.add('fade-out-state');

    setTimeout(() => {
        arcade.classList.add('hidden');
        arcade.classList.remove('fade-target');
        arcade.classList.remove('fade-out-state');

        document.body.style.overflow = '';
        if (window.Arcade) {
            if (window.Arcade.Snake) window.Arcade.Snake.stop();
            if (window.Arcade.Breakout) window.Arcade.Breakout.stop();
            if (window.Arcade.Wordle) window.Arcade.Wordle.stop();
        }
    }, 300);
}

// Snake Specifics
window.openSnake = function () {
    // Transition: Selector -> Snake
    window.transitionTo('arcade-game-selector', 'stage-snake');

    // Start Game
    if (window.Arcade) setTimeout(() => window.Arcade.Snake.start(), 300);
}

window.closeSnake = function () {
    // Transition: Snake -> Selector
    window.transitionTo('stage-snake', 'arcade-game-selector');
    if (window.Arcade) {
        window.Arcade.Snake.stop();
        window.Arcade.updateUI();
    }
}

window.restartSnake = function () {
    if (window.Arcade) window.Arcade.Snake.start();
}

// Breakout Specifics
window.openBreakout = function () {
    window.transitionTo('arcade-game-selector', 'stage-breakout');
    if (window.Arcade) setTimeout(() => window.Arcade.Breakout.start(), 300);
}

window.closeBreakout = function () {
    window.transitionTo('stage-breakout', 'arcade-game-selector');
    if (window.Arcade) {
        window.Arcade.Breakout.stop();
        window.Arcade.updateUI();
    }
}

window.restartBreakout = function () {
    if (window.Arcade) window.Arcade.Breakout.start();
}

// Wordle Specifics
window.openWordle = function () {
    window.transitionTo('arcade-game-selector', 'stage-wordle');
    if (window.Arcade) setTimeout(() => window.Arcade.Wordle.start(), 300);
}

window.closeWordle = function () {
    window.transitionTo('stage-wordle', 'arcade-game-selector');
    if (window.Arcade) {
        window.Arcade.Wordle.stop();
        window.Arcade.updateUI();
    }
}

window.restartWordle = function () {
    if (window.Arcade) window.Arcade.Wordle.start();
}

// --- PONG ---
window.openPong = function () {
    window.transitionTo('arcade-game-selector', 'stage-pong');
    if (window.Arcade) setTimeout(() => window.Arcade.Pong.start(), 300);
}

window.closePong = function () {
    window.transitionTo('stage-pong', 'arcade-game-selector');
    if (window.Arcade) {
        window.Arcade.Pong.stop();
        window.Arcade.updateUI();
    }
}

window.restartPong = function () {
    if (window.Arcade) window.Arcade.Pong.start();
}

window.toggleArcadeSettings = function () {
    const p = document.getElementById('arcade-settings');
    const isHidden = p.classList.contains('hidden');

    // Detect Active Game
    const isSnake = !document.getElementById('stage-snake').classList.contains('hidden');
    const isBreakout = !document.getElementById('stage-breakout').classList.contains('hidden');
    const isWordle = !document.getElementById('stage-wordle').classList.contains('hidden');
    const isPong = !document.getElementById('stage-pong').classList.contains('hidden');

    const snakeControls = document.getElementById('settings-snake-controls');
    const breakoutControls = document.getElementById('settings-breakout-controls');

    if (isHidden) {
        // Open Settings
        p.classList.remove('hidden');

        // Sync UI with Current Settings
        if (window.Arcade && window.Arcade.settings) {
            const s = window.Arcade.settings;
            if (document.getElementById('set-sound-enabled')) document.getElementById('set-sound-enabled').checked = s.soundEnabled;

            // Snake
            if (document.getElementById('set-snake-speed')) document.getElementById('set-snake-speed').value = s.snakeSpeed || 100;
            if (document.getElementById('set-snake-walls')) document.getElementById('set-snake-walls').checked = s.snakeWalls;
            if (document.getElementById('set-snake-theme')) document.getElementById('set-snake-theme').value = s.snakeTheme || 'classic';

            // Breakout
            if (document.getElementById('set-breakout-chance')) document.getElementById('set-breakout-chance').value = s.breakoutChance || 0.2;
            if (document.getElementById('set-breakout-multiball')) document.getElementById('set-breakout-multiball').value = s.breakoutMultiball || 'standard';
            if (document.getElementById('set-breakout-lives')) document.getElementById('set-breakout-lives').value = s.breakoutLives || 3;
            if (document.getElementById('set-breakout-paddle')) document.getElementById('set-breakout-paddle').value = s.breakoutPaddle || 100;
        }

        // Show/Hide Controls based on Game
        snakeControls.classList.add('hidden');
        if (breakoutControls) breakoutControls.classList.add('hidden');

        if (isSnake) {
            snakeControls.classList.remove('hidden');
            if (window.Arcade && window.Arcade.Snake) window.Arcade.Snake.isPaused = true;
        } else if (isBreakout) {
            if (breakoutControls) breakoutControls.classList.remove('hidden');
            if (window.Arcade && window.Arcade.Breakout) window.Arcade.Breakout.isPaused = true;
        } else if (isPong) {
            if (window.Arcade && window.Arcade.Pong) window.Arcade.Pong.gameActive = false; // Pause
        }
    } else {
        // Close Settings
        p.classList.add('hidden');

        // Resume Active Game
        if (isSnake && window.Arcade) window.Arcade.Snake.start();
        if (isBreakout && window.Arcade) window.Arcade.Breakout.isPaused = false;
        if (isPong && window.Arcade) {
            window.Arcade.Pong.gameActive = true;
            window.Arcade.Pong.loop();
        }
    }
}

window.updateArcadeSetting = function (key, val) {
    if (!window.Arcade) return;

    // Convert types
    if (key === 'speed') val = parseInt(val);
    if (key === 'walls') val = (val === true || val === 'true');
    // Breakout conversions
    if (key === 'breakoutChance') val = parseFloat(val);
    if (key === 'breakoutLives') val = parseInt(val);
    if (key === 'breakoutPaddle') val = parseInt(val);

    // Map to internal keys
    const map = {
        'sound': 'soundEnabled',
        'speed': 'snakeSpeed',
        'walls': 'snakeWalls',
        'theme': 'snakeTheme',
        'breakoutChance': 'breakoutChance',
        'breakoutMultiball': 'breakoutMultiball',
        'breakoutLives': 'breakoutLives',
        'breakoutPaddle': 'breakoutPaddle'
    };

    window.Arcade.settings[map[key]] = val;
    window.Arcade.saveSettings();

    // LIVE UPDATES
    if (key === 'breakoutLives' && window.Arcade.Breakout) {
        // Only update if not currently "playing" (ball attached) or just update anyway?
        // User wants to see it update.
        window.Arcade.Breakout.lives = val;
        if (typeof window.Arcade.Breakout.updateLives === 'function') {
            window.Arcade.Breakout.updateLives();
        }
    }
    if (key === 'breakoutPaddle' && window.Arcade.Breakout && window.Arcade.Breakout.paddle) {
        window.Arcade.Breakout.paddle.targetW = val;
    }

    // Do NOT auto-restart here. Wait for user to close settings.
}

// Redirect old "openGame" to openArcade
window.openGame = function () {
    window.openArcade();
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
