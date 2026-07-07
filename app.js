// Application Central State Block
const state = {
    habits: [],
    filters: {
        search: '',
        status: 'all' // all, pending, completed
    },
    isDarkTheme: false,
    notificationsEnabled: false,
    activeDeleteTargetId: null // Contextual tracker for confirmation modals
};

// Rolling coaching strings keyed to active consistency metrics
const MOTIVATIONAL_QUOTES = [
    { threshold: 0, text: "The secret of getting ahead is getting started." },
    { threshold: 3, text: "Consistency established! Keep pushing the boundary line." },
    { threshold: 7, text: "7-Day loop cleared. You are actively remodeling neural pathways!" },
    { threshold: 14, text: "Unstoppable momentum. Excellence is a habit, not an isolated event." },
    { threshold: 21, text: "21 Days completed. This behavior is fully wired into your identity." }
];

let progressChart = null;

// Application Boot Sequence
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadStateFromStorage();
    setupCoreListeners();
    syncNotificationUIState();
    renderGlobalView();
    updateGlobalAnalytics();
});

function initTheme() {
    const savedTheme = localStorage.getItem('hl-theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark');
        state.isDarkTheme = true;
        updateThemeIcon();
    }
}

function loadStateFromStorage() {
    try {
        const payload = localStorage.getItem('hl-habits-data');
        state.habits = payload ? JSON.parse(payload) : [];
        state.notificationsEnabled = localStorage.getItem('hl-alerts') === 'true';
    } catch (e) {
        console.error("Storage structure corrupted. Reinitializing track state.", e);
        state.habits = [];
        dispatchCustomToast("Data cache reset due to system load errors.", "danger");
    }
}

function saveStateToStorage() {
    localStorage.setItem('hl-habits-data', JSON.stringify(state.habits));
}

function setupCoreListeners() {
    document.getElementById('habit-form').addEventListener('submit', handleHabitCreation);
    document.getElementById('modal-edit-form').addEventListener('submit', saveCustomModalEdit);
    
    document.getElementById('btn-modal-execute-delete').addEventListener('click', executeHabitDeletion);

    document.getElementById('search-input').addEventListener('input', (e) => {
        state.filters.search = e.target.value.trim().toLowerCase();
        renderGlobalView(); 
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            state.filters.status = e.target.dataset.filter;
            renderGlobalView();
        });
    });

    document.getElementById('theme-toggle').addEventListener('click', toggleThemeMode);
    document.getElementById('btn-notification').addEventListener('click', toggleNotificationState);
    document.getElementById('btn-export').addEventListener('click', exportHabitStateData);
    document.getElementById('import-file').addEventListener('change', importHabitStateData);
}

// Custom Interactive Overlays: Lightweight Toast Notification Engine
function dispatchCustomToast(message, type = 'info') {
    const container = document.getElementById('toast-stack-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `custom-toast-node toast-${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check';
    if (type === 'danger') icon = 'alert-triangle';

    toast.innerHTML = `<i data-lucide="${icon}" style="width:18px; min-width:18px;"></i><span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        toast.style.transition = 'opacity 0.2s, transform 0.2s';
        setTimeout(() => toast.remove(), 200);
    }, 3500);
}

// Custom Interactive Overlays: Core Window State Managers
function openCustomModal(modalId) {
    const target = document.getElementById(modalId);
    if (target) target.classList.remove('hidden');
}

function closeCustomModal(modalId) {
    const target = document.getElementById(modalId);
    if (target) target.classList.add('hidden');
    if (modalId === 'modal-confirm-overlay') state.activeDeleteTargetId = null;
}

// Habit Creation Pipeline
function handleHabitCreation(e) {
    e.preventDefault();
    const nameInput = document.getElementById('habit-name');
    const categoryInput = document.getElementById('habit-category');
    
    const targetName = nameInput.value.trim();
    const checkDuplicate = state.habits.some(h => h.name.toLowerCase() === targetName.toLowerCase());
    
    if (checkDuplicate) {
        dispatchCustomToast("A habit with that exact name already exists.", "danger");
        return;
    }

    const newHabit = {
        id: crypto.randomUUID(),
        name: targetName,
        category: categoryInput.value,
        createdAt: new Date().toISOString(),
        history: [] 
    };

    state.habits.push(newHabit);
    saveStateToStorage();
    
    nameInput.value = '';
    
    renderGlobalView();
    updateGlobalAnalytics();
    dispatchCustomToast(`"${targetName}" initialized successfully!`, "success");
    triggerNotificationAlert("Habit Created", `"${targetName}" has been successfully added to your tracker.`);
}

// Feature Core Upgrade: Interactive Edit Modals Lifecycle Implementation
function openEditHabitModal(habitId) {
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;

    document.getElementById('edit-target-id').value = habit.id;
    document.getElementById('edit-target-name').value = habit.name;
    document.getElementById('edit-target-category').value = habit.category;

    openCustomModal('modal-edit-overlay');
}

function saveCustomModalEdit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-target-id').value;
    const newName = document.getElementById('edit-target-name').value.trim();
    const newCategory = document.getElementById('edit-target-category').value;

    const duplicateCheck = state.habits.some(h => h.id !== id && h.name.toLowerCase() === newName.toLowerCase());
    if (duplicateCheck) {
        dispatchCustomToast("Another habit already uses that name configuration.", "danger");
        return;
    }

    const habit = state.habits.find(h => h.id === id);
    if (habit) {
        habit.name = newName;
        habit.category = newCategory;
        saveStateToStorage();
        closeCustomModal('modal-edit-overlay');
        renderGlobalView();
        updateGlobalAnalytics();
        dispatchCustomToast("Habit modifications updated securely.", "success");
    }
}

// Feature Core Upgrade: Native Confirmation Modals Lifecycle Execution
function openDeleteConfirmationModal(habitId) {
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;

    state.activeDeleteTargetId = habitId;
    document.getElementById('confirm-deletion-label-target').textContent = habit.name;
    openCustomModal('modal-confirm-overlay');
}

function executeHabitDeletion() {
    const targetId = state.activeDeleteTargetId;
    if (!targetId) return;

    const habit = state.habits.find(h => h.id === targetId);
    const label = habit ? habit.name : 'Habit';

    state.habits = state.habits.filter(h => h.id !== targetId);
    saveStateToStorage();
    closeCustomModal('modal-confirm-overlay');
    renderGlobalView();
    updateGlobalAnalytics();
    dispatchCustomToast(`"${label}" wiped clean from timeline logs.`, "info");
}

// Master UI Synchronization Loop
function renderGlobalView() {
    const container = document.getElementById('habits-container');
    const emptyState = document.getElementById('habits-empty-state');
    const totalBadge = document.getElementById('habit-totals-badge');
    
    const dynamicTimelineRange = getRolling30DaysTimeline();
    const activeDateTodayStr = dynamicTimelineRange[dynamicTimelineRange.length - 1];

    const processedHabits = state.habits.filter(habit => {
        const matchesSearch = habit.name.toLowerCase().includes(state.filters.search);
        const isDoneToday = habit.history.includes(activeDateTodayStr);
        
        if (state.filters.status === 'completed') return matchesSearch && isDoneToday;
        if (state.filters.status === 'pending') return matchesSearch && !isDoneToday;
        return matchesSearch;
    });

    totalBadge.textContent = `${processedHabits.length} Visible`;

    if (processedHabits.length === 0) {
        emptyState.classList.remove('hidden');
        container.innerHTML = '';
    } else {
        emptyState.classList.add('hidden');
        container.innerHTML = '';

        processedHabits.forEach(habit => {
            const card = buildHabitCardElement(habit, dynamicTimelineRange, activeDateTodayStr);
            container.appendChild(card);
        });
    }

    lucide.createIcons();
}

function buildHabitCardElement(habit, timeline, todayStr) {
    const card = document.createElement('div');
    const allowedCategories = ['health', 'mind', 'work', 'routine'];
    const safeCategory = allowedCategories.includes(habit.category) ? habit.category : 'routine';
    
    card.className = `habit-card cat-${safeCategory}`;
    
    const stats = computeStreakMetrics(habit.history, todayStr);
    const completedCount = habit.history.length;
    const overallRatio = timeline.filter(d => habit.history.includes(d)).length;
    const ratioPercent = Math.round((overallRatio / 30) * 100);

    card.innerHTML = `
        <div class="habit-header">
            <div class="habit-title-area">
                <h3>${escapeHTML(habit.name)}</h3>
                <span class="category-indicator cat-${safeCategory}-badge">${safeCategory}</span>
            </div>
            <div class="habit-card-actions">
                <button class="btn-card-action btn-edit-trigger" title="Edit tracking specifications" data-edit-id="${habit.id}">
                    <i data-lucide="edit-2" style="width: 16px;"></i>
                </button>
                <button class="btn-card-action hover-danger btn-delete-trigger" title="Delete habit timeline" data-delete-id="${habit.id}">
                    <i data-lucide="trash-2" style="width: 16px;"></i>
                </button>
            </div>
        </div>

        <div class="habit-metrics-grid">
            <div class="metric-unit">Current Streak: <strong>${stats.current} days</strong></div>
            <div class="metric-unit">Longest Streak: <strong>${stats.longest} days</strong></div>
            <div class="metric-unit">30-Day Rate: <strong>${ratioPercent}% (${overallRatio}/30)</strong></div>
            <div class="metric-unit">Total Actions: <strong>${completedCount}</strong></div>
        </div>

        <div class="calendar-track-title">Last 30 Days Progress</div>
        <div class="matrix-grid-30"></div>
        <div class="matrix-legend-row">
            <span>30 days ago</span>
            <span>Today</span>
        </div>
    `;

    const matrixGrid = card.querySelector('.matrix-grid-30');
    timeline.forEach(dateStr => {
        const node = document.createElement('div');
        const isFilled = habit.history.includes(dateStr);
        const isToday = dateStr === todayStr;
        
        node.className = `matrix-day-node cat-${safeCategory}-node ${isFilled ? 'filled' : ''} ${isToday ? 'today-node' : ''}`;
        
        const formattedDateLabel = new Date(dateStr.replace(/-/g, '/')).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
        node.setAttribute('data-date', `${formattedDateLabel}${isFilled ? ' (Completed)' : ' (Pending)'}`);

        node.addEventListener('click', () => {
            toggleDateExecutionState(habit.id, dateStr);
            updateGlobalAnalytics(); 
        });
        matrixGrid.appendChild(node);
    });

    // Link Custom Modal Event Triggers
    card.querySelector('.btn-edit-trigger').addEventListener('click', () => openEditHabitModal(habit.id));
    card.querySelector('.btn-delete-trigger').addEventListener('click', () => openDeleteConfirmationModal(habit.id));

    return card;
}

// Linear Mathematical Processing Matrix
function computeStreakMetrics(historyArray, todayStr) {
    if (historyArray.length === 0) return { current: 0, longest: 0 };
    const sortedDates = [...new Set(historyArray)].sort();
    
    let longestStreak = 0;
    let runningStreak = 0;
    let internalPreviousDate = null;

    for (let i = 0; i < sortedDates.length; i++) {
        const [y, m, d] = sortedDates[i].split('-').map(Number);
        const currentItemDate = new Date(y, m - 1, d);
        
        if (internalPreviousDate === null) {
            runningStreak = 1;
        } else {
            const dateDifference = Math.round((currentItemDate - internalPreviousDate) / (1000 * 60 * 60 * 24));
            if (dateDifference <= 1) {
                runningStreak++;
            } else {
                if (runningStreak > longestStreak) longestStreak = runningStreak;
                runningStreak = 1;
            }
        }
        internalPreviousDate = currentItemDate;
    }
    if (runningStreak > longestStreak) longestStreak = runningStreak;

    let currentStreak = 0;
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const cursorDate = new Date(ty, tm - 1, td);
    
    const yesterdayDate = new Date(ty, tm - 1, td - 1);
    const yesterdayStr = getLocalDateString(yesterdayDate);

    const parsedContainsToday = sortedDates.includes(todayStr);
    const parsedContainsYesterday = sortedDates.includes(yesterdayStr);

    if (parsedContainsToday || parsedContainsYesterday) {
        if (!parsedContainsToday) {
            cursorDate.setDate(cursorDate.getDate() - 1);
        }
        
        while (true) {
            const formattedCursorStr = getLocalDateString(cursorDate);
            if (sortedDates.includes(formattedCursorStr)) {
                currentStreak++;
                cursorDate.setDate(cursorDate.getDate() - 1);
            } else {
                break;
            }
        }
    }

    return { current: currentStreak, longest: longestStreak };
}

function toggleDateExecutionState(habitId, dateStr) {
    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;

    const index = habit.history.indexOf(dateStr);
    if (index > -1) {
        habit.history.splice(index, 1);
    } else {
        habit.history.push(dateStr);
    }

    saveStateToStorage();
    renderGlobalView();
}

function updateGlobalAnalytics() {
    const timeline = getRolling30DaysTimeline();
    const todayStr = timeline[timeline.length - 1];

    let peakCurrentStreak = 0;
    state.habits.forEach(h => {
        const metrics = computeStreakMetrics(h.history, todayStr);
        if (metrics.current > peakCurrentStreak) peakCurrentStreak = metrics.current;
    });

    updateMotivationalMessaging(peakCurrentStreak);
    generateAnalyticsChartLayout(timeline);
}

function updateMotivationalMessaging(streakValue) {
    const banner = document.getElementById('motivational-banner');
    let dynamicText = MOTIVATIONAL_QUOTES[0].text;

    for (let quote of MOTIVATIONAL_QUOTES) {
        if (streakValue >= quote.threshold) {
            dynamicText = quote.text;
        }
    }
    banner.textContent = `[Max Streak: ${streakValue}d] — ${dynamicText}`;
}

// Core Execution Upgrade: Network Resiliency & Graceful Fallback Mechanics
function generateAnalyticsChartLayout(timeline) {
    const last7DaysSlice = timeline.slice(-7);
    
    // Check variable definitions to verify Chart.js CDN initialization
    if (typeof Chart === 'undefined') {
        renderFallbackAnalyticsUI(last7DaysSlice);
        return;
    }

    const readableLabels = last7DaysSlice.map(d => new Date(d.replace(/-/g, '/')).toLocaleDateString(undefined, {weekday: 'short'}));
    const aggregatedCompletionData = last7DaysSlice.map(dateStr => {
        if (state.habits.length === 0) return 0;
        const completeCount = state.habits.filter(h => h.history.includes(dateStr)).length;
        return Math.round((completeCount / state.habits.length) * 100);
    });

    const contextNode = document.getElementById('weekly-progress-chart');
    if (!contextNode) return;

    if (progressChart) {
        progressChart.destroy();
    }

    const cssThemeColorHex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const UIThemeTextColor = state.isDarkTheme ? '#94a3b8' : '#64748b';

    try {
        progressChart = new Chart(contextNode, {
            type: 'line',
            data: {
                labels: readableLabels,
                datasets: [{
                    data: aggregatedCompletionData,
                    borderColor: cssThemeColorHex,
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { min: 0, max: 100, grid: { display: false }, ticks: { color: UIThemeTextColor } },
                    x: { grid: { display: false }, ticks: { color: UIThemeTextColor } }
                }
            }
        });
    } catch (err) {
        console.error("Chart rendering lifecycle execution error, fallback invoked: ", err);
        renderFallbackAnalyticsUI(last7DaysSlice);
    }
}

// Render clean pure HTML metrics if third-party libraries fail to initialize
function renderFallbackAnalyticsUI(last7DaysSlice) {
    const container = document.getElementById('chart-workspace-container');
    if (!container) return;

    let averageWeekPercentage = 0;
    if (state.habits.length > 0) {
        let matches = 0;
        last7DaysSlice.forEach(d => {
            matches += state.habits.filter(h => h.history.includes(d)).length;
        });
        averageWeekPercentage = Math.round((matches / (state.habits.length * 7)) * 100);
    }

    container.innerHTML = `
        <div class="chart-fallback-panel">
            <div class="fallback-metric-row">
                <span>Weekly Target Completion Rate:</span>
                <strong>${averageWeekPercentage}%</strong>
            </div>
            <div class="fallback-bar-outer">
                <div class="fallback-bar-inner" style="width: ${averageWeekPercentage}%"></div>
            </div>
            <p style="font-size:0.75rem; color:var(--text-muted); text-align:center; margin-top:4px;">
                Analytics loaded via native UI fallback mode.
            </p>
        </div>
    `;
}

function exportHabitStateData() {
    if (state.habits.length === 0) {
        dispatchCustomToast("No data available to build export manifests.", "info");
        return;
    }
    const blob = new Blob([JSON.stringify(state.habits, null, 2)], {type: 'application/json'});
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `habitloop_backup_${getLocalDateString()}.json`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    dispatchCustomToast("Data manifest generated successfully.", "success");
}

// Feature Core Upgrade: Comprehensive Operational Verification Schema
function validateHabitSchema(parsedArray) {
    if (!Array.isArray(parsedArray)) return false;
    
    const validCategories = ['health', 'mind', 'work', 'routine'];
    const dateSignaturePattern = /^\d{4}-\d{2}-\d{2}$/;

    for (let current of parsedArray) {
        if (typeof current !== 'object' || current === null) return false;
        
        // Match explicit typed field definitions across models
        if (typeof current.id !== 'string' || current.id.trim() === '') return false;
        if (typeof current.name !== 'string' || current.name.trim() === '') return false;
        if (!validCategories.includes(current.category)) return false;
        if (typeof current.createdAt !== 'string') return false;
        if (!Array.isArray(current.history)) return false;

        // Verify sub-history elements are string formats mapping YYYY-MM-DD
        const checksHistoryStrings = current.history.every(d => typeof d === 'string' && dateSignaturePattern.test(d));
        if (!checksHistoryStrings) return false;
    }
    return true;
}

function importHabitStateData(e) {
    const trackingFile = e.target.files[0];
    if (!trackingFile) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const records = JSON.parse(event.target.result);
            
            // Run strict data sanitization pipeline
            if (validateHabitSchema(records)) {
                state.habits = records;
                saveStateToStorage();
                renderGlobalView();
                updateGlobalAnalytics();
                dispatchCustomToast("Data arrays fully restored successfully!", "success");
            } else {
                dispatchCustomToast("Security Alert: Malformed data schema rejected.", "danger");
            }
        } catch (err) {
            dispatchCustomToast("Failed to parse structural data formats cleanly.", "danger");
        }
    };
    reader.readAsText(trackingFile);
    e.target.value = ''; 
}

function toggleNotificationState() {
    if (!("Notification" in window)) {
        dispatchCustomToast("This client browser environment cannot dispatch push updates.", "info");
        return;
    }

    if (Notification.permission === "granted") {
        state.notificationsEnabled = !state.notificationsEnabled;
        localStorage.setItem('hl-alerts', state.notificationsEnabled);
        syncNotificationUIState();
        dispatchCustomToast(`Alert toggles flagged ${state.notificationsEnabled ? 'ON' : 'OFF'}.`, "info");
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                state.notificationsEnabled = true;
                localStorage.setItem('hl-alerts', true);
                triggerNotificationAlert("System Enabled", "Habit tracker micro-alerts initialized successfully.");
            }
            syncNotificationUIState();
        });
    } else {
        dispatchCustomToast("Permission to prompt alerts blocked via system parameters.", "danger");
    }
}

function syncNotificationUIState() {
    const btn = document.getElementById('btn-notification');
    if (!btn) return;

    if (state.notificationsEnabled && Notification.permission === "granted") {
        btn.innerHTML = '<i data-lucide="bell"></i> On';
        btn.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
    } else {
        btn.innerHTML = '<i data-lucide="bell-off"></i> Alerts';
        btn.style.backgroundColor = '';
    }
    lucide.createIcons();
}

function triggerNotificationAlert(title, text) {
    if (state.notificationsEnabled && Notification.permission === "granted") {
        new Notification(title, { body: text });
    }
}

function toggleThemeMode() {
    state.isDarkTheme = !state.isDarkTheme;
    document.body.classList.toggle('dark', state.isDarkTheme);
    localStorage.setItem('hl-theme', state.isDarkTheme ? 'dark' : 'light');
    updateThemeIcon();
    updateGlobalAnalytics(); 
}

function updateThemeIcon() {
    const wrapper = document.getElementById('theme-icon-container');
    if (!wrapper) return;
    wrapper.innerHTML = state.isDarkTheme ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
    lucide.createIcons();
}

function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getRolling30DaysTimeline() {
    const dates = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(getLocalDateString(d));
    }
    return dates;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}