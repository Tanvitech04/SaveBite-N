// Savebite - Main JavaScript Application Logic (Full-Stack Express REST API + Local Fallback)

const API_BASE = window.location.origin.includes('http') ? '/api' : 'http://localhost:5000/api';

// ==========================================
// INITIAL DEFAULT STATE
// ==========================================
const DEFAULT_STATE = {
  wasteLogs: [
    { id: 'log-1', name: 'Leftover Rice & Curry', category: 'Cooked Meals', quantity: '2 bowls', cost: 80.00, reason: 'Cooked too much food', date: '2026-09-21' },
    { id: 'log-2', name: 'Extra Chapati / Rotis', category: 'Rotis & Bread', quantity: '4 roties', cost: 40.00, reason: 'Cooked too much food', date: '2026-09-19' },
    { id: 'log-3', name: 'Sour Dahi / Curd', category: 'Dairy', quantity: '250g', cost: 45.00, reason: 'Food spoils before consume', date: '2026-09-17' },
    { id: 'log-4', name: 'Wilted Palak (Spinach)', category: 'Vegetables', quantity: '1 bunch', cost: 30.00, reason: 'Food spoils before consume', date: '2026-09-14' },
    { id: 'log-5', name: 'Expired Milk Packet', category: 'Dairy', quantity: '500 ml', cost: 32.00, reason: 'Expired food', date: '2026-09-10' }
  ],
  expiryItems: [
    { id: 'exp-1', name: 'Fresh Dahi (Curd)', category: 'Dairy', quantity: '400g', expiryDate: getOffsetDate(1) },
    { id: 'exp-2', name: 'Paneer Pack', category: 'Dairy', quantity: '200g', expiryDate: getOffsetDate(0) },
    { id: 'exp-3', name: 'Amul Milk Packet', category: 'Dairy', quantity: '1 L', expiryDate: getOffsetDate(2) },
    { id: 'exp-4', name: 'Cooked Mixed Sabzi', category: 'Cooked Meals', quantity: '1 bowl', expiryDate: getOffsetDate(1) },
    { id: 'exp-5', name: 'Fresh Dhaniya & Chillies', category: 'Vegetables', quantity: '100g', expiryDate: getOffsetDate(4) },
    { id: 'exp-6', name: 'Atta Dough Ball', category: 'Rotis & Bread', quantity: '1 bowl', expiryDate: getOffsetDate(1) }
  ],
  groceryList: [
    { id: 'groc-1', name: 'Whole Wheat Atta (5kg)', category: 'Pantry', bought: false, estPrice: 240 },
    { id: 'groc-2', name: 'Toor Dal (1kg)', category: 'Pantry', bought: false, estPrice: 160 },
    { id: 'groc-3', name: 'Fresh Tomatoes (1kg)', category: 'Vegetables', bought: true, estPrice: 40 },
    { id: 'groc-4', name: 'Fresh Paneer (200g)', category: 'Dairy', bought: false, estPrice: 90 }
  ],
  selectedLeftovers: ['Leftover Rice', 'Extra Rotis'],
  currentExpiryFilter: 'ALL',
  currentTipCategory: 'ALL',
  goals: [
    { id: 'goal-1', title: 'Keep Monthly Food Waste Under ₹500', target: 500, timeframe: 'Monthly' },
    { id: 'goal-2', title: 'Zero Wasted Sabzi This Week', target: 0, timeframe: 'Weekly' }
  ],
  userProfile: {
    ecoStreak: 7,
    lastCheckIn: new Date().toISOString().split('T')[0],
    ecoPoints: 450,
    level: 3
  },
  practicedTips: ['tip-1', 'tip-2'],
  bookmarkedTips: ['tip-1']
};

function getOffsetDate(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

// Global App State
let state = loadState();
let isBackendOnline = false;

function loadState() {
  const saved = localStorage.getItem('savebite_indian_state');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse localStorage state', e);
    }
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function saveState() {
  localStorage.setItem('savebite_indian_state', JSON.stringify(state));
  renderHeaderMetrics();
}

// Chart Instances
let chartMonthly = null;
let chartCategory = null;
let chartReasons = null;

// Initialize App on DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  checkBackendStatus();
  switchTab('tracker');
  renderHeaderMetrics();
  initDashboardCharts();
  renderLeftoverTags();
  renderRecipes();
  renderDailyMealPlan();
  updateCalculator();
});

// Check REST API Backend Health
async function checkBackendStatus() {
  const badge = document.getElementById('api-status-badge');
  try {
    const res = await fetch(`${API_BASE}/status`);
    if (res.ok) {
      isBackendOnline = true;
      if (badge) {
        badge.textContent = 'API Connected';
        badge.className = 'bg-emerald-400/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/40';
      }
    }
  } catch (err) {
    isBackendOnline = false;
    if (badge) {
      badge.textContent = 'Local Browser Mode';
      badge.className = 'bg-amber-400/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-400/40';
    }
  }
}

// ==========================================
// NAVIGATION & TAB SWITCHING
// ==========================================
function switchTab(tabId) {
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.add('hidden');
  });

  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.remove('active-tab');
  });

  const targetView = document.getElementById(`tab-content-${tabId}`);
  if (targetView) {
    targetView.classList.remove('hidden');
  }

  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('active-tab');
  }

  document.getElementById('mobile-nav').classList.add('hidden');

  if (tabId === 'tracker') renderWasteLogTable();
  if (tabId === 'dashboard') updateDashboard();
  if (tabId === 'mealplan') renderDailyMealPlan();
  if (tabId === 'expiry') renderExpiryItems();
  if (tabId === 'grocery') renderGroceryList();
  if (tabId === 'leftover') renderRecipes();
  if (tabId === 'tips') renderTips();
  if (tabId === 'goals') renderGoals();

  setTimeout(() => lucide.createIcons(), 50);
}

function toggleMobileNav() {
  const nav = document.getElementById('mobile-nav');
  nav.classList.toggle('hidden');
}

// ==========================================
// HEADER METRICS & STREAK
// ==========================================
function renderHeaderMetrics() {
  const totalCost = state.wasteLogs.reduce((acc, item) => acc + (parseFloat(item.cost) || 0), 0);
  document.getElementById('header-wasted-cost').textContent = `₹${totalCost.toFixed(2)}`;

  const today = new Date();
  today.setHours(0,0,0,0);
  
  const urgentCount = state.expiryItems.filter(item => {
    const expDate = new Date(item.expiryDate);
    expDate.setHours(0,0,0,0);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  }).length;

  document.getElementById('header-expiring-count').textContent = `${urgentCount} item${urgentCount === 1 ? '' : 's'}`;
  
  const dot = document.getElementById('expiry-badge-dot');
  if (dot) {
    if (urgentCount > 0) dot.classList.remove('hidden');
    else dot.classList.add('hidden');
  }

  const streakVal = state.userProfile?.ecoStreak || 7;
  document.getElementById('header-streak').textContent = `${streakVal} Days`;
}

function handleCheckInStreak() {
  const profile = state.userProfile || { ecoStreak: 7, ecoPoints: 450 };
  profile.ecoStreak += 1;
  profile.ecoPoints += 50;
  state.userProfile = profile;
  saveState();
  renderHeaderMetrics();

  if (typeof confetti === 'function') {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }

  triggerToast(`🎉 Awesome! Zero-waste check-in logged. Eco streak is now ${profile.ecoStreak} Days!`);
}

// ==========================================
// MODULE 1: FOOD WASTE TRACKER
// ==========================================
function renderWasteLogTable() {
  const tbody = document.getElementById('waste-log-tbody');
  const emptyState = document.getElementById('tracker-empty-state');
  
  const searchTerm = (document.getElementById('tracker-search')?.value || '').toLowerCase();
  const catFilter = document.getElementById('tracker-filter-category')?.value || 'ALL';
  const reasonFilter = document.getElementById('tracker-filter-reason')?.value || 'ALL';

  let filtered = state.wasteLogs.filter(log => {
    const matchesSearch = log.name.toLowerCase().includes(searchTerm);
    const matchesCat = catFilter === 'ALL' || log.category === catFilter;
    const matchesReason = reasonFilter === 'ALL' || log.reason === reasonFilter;
    return matchesSearch && matchesCat && matchesReason;
  });

  const totalItems = state.wasteLogs.length;
  const totalLoss = state.wasteLogs.reduce((acc, log) => acc + (parseFloat(log.cost) || 0), 0);

  const catCounts = {};
  const reasonCounts = {};
  state.wasteLogs.forEach(log => {
    catCounts[log.category] = (catCounts[log.category] || 0) + 1;
    reasonCounts[log.reason] = (reasonCounts[log.reason] || 0) + 1;
  });

  let topCat = 'N/A';
  let maxCatCount = 0;
  for (let c in catCounts) {
    if (catCounts[c] > maxCatCount) {
      maxCatCount = catCounts[c];
      topCat = c;
    }
  }

  let topReason = 'N/A';
  let maxReasonCount = 0;
  for (let r in reasonCounts) {
    if (reasonCounts[r] > maxReasonCount) {
      maxReasonCount = reasonCounts[r];
      topReason = r;
    }
  }

  document.getElementById('stat-total-items').textContent = totalItems;
  document.getElementById('stat-total-loss').textContent = `₹${totalLoss.toFixed(2)}`;
  document.getElementById('stat-top-category').textContent = topCat;
  document.getElementById('stat-top-reason').textContent = topReason;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  tbody.innerHTML = filtered.map(log => `
    <tr class="hover:bg-slate-50 transition border-b border-slate-100">
      <td class="py-3 px-4 font-semibold text-slate-900">${escapeHtml(log.name)}</td>
      <td class="py-3 px-4">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getCategoryBadgeClass(log.category)}">
          ${escapeHtml(log.category)}
        </span>
      </td>
      <td class="py-3 px-4 text-slate-600">${escapeHtml(log.quantity)}</td>
      <td class="py-3 px-4 font-bold text-red-600">₹${parseFloat(log.cost).toFixed(2)}</td>
      <td class="py-3 px-4">
        <span class="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-md font-medium">
          ${escapeHtml(log.reason)}
        </span>
      </td>
      <td class="py-3 px-4 text-slate-500 text-xs">${log.date}</td>
      <td class="py-3 px-4 text-right">
        <button onclick="deleteWasteLog('${log.id}')" title="Delete entry" class="p-1.5 text-slate-400 hover:text-red-600 transition rounded-lg hover:bg-red-50">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    </tr>
  `).join('');

  lucide.createIcons();
}

function openLogModal() {
  document.getElementById('log-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('modal-log-waste').classList.remove('hidden');
}

function closeLogModal() {
  document.getElementById('modal-log-waste').classList.add('hidden');
  document.getElementById('form-log-waste').reset();
}

function handleLogWasteSubmit(e) {
  e.preventDefault();
  const newLog = {
    id: 'log-' + Date.now(),
    name: document.getElementById('log-item-name').value.trim(),
    category: document.getElementById('log-category').value,
    cost: parseFloat(document.getElementById('log-cost').value) || 0,
    quantity: document.getElementById('log-quantity').value.trim(),
    reason: document.getElementById('log-reason').value,
    date: document.getElementById('log-date').value
  };

  state.wasteLogs.unshift(newLog);
  saveState();
  closeLogModal();
  renderWasteLogTable();
}

function deleteWasteLog(id) {
  state.wasteLogs = state.wasteLogs.filter(l => l.id !== id);
  saveState();
  renderWasteLogTable();
}

function getCategoryBadgeClass(category) {
  switch (category) {
    case 'Cooked Meals': return 'bg-teal-100 text-teal-800';
    case 'Vegetables': return 'bg-emerald-100 text-emerald-800';
    case 'Dairy': return 'bg-blue-100 text-blue-800';
    case 'Rotis & Bread': return 'bg-amber-100 text-amber-800';
    case 'Non-Veg & Eggs': return 'bg-rose-100 text-rose-800';
    case 'Pantry': return 'bg-purple-100 text-purple-800';
    default: return 'bg-slate-100 text-slate-800';
  }
}

// ==========================================
// MODULE 2: WASTE DASHBOARD & ANALYTICS
// ==========================================
function initDashboardCharts() {
  const ctxMonthly = document.getElementById('chart-monthly-trend')?.getContext('2d');
  if (ctxMonthly) {
    chartMonthly = new Chart(ctxMonthly, {
      type: 'line',
      data: {
        labels: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
        datasets: [{
          label: 'Financial Loss (₹)',
          data: [4200, 3800, 2900, 2400, 1850, 1270],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#047857'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  const ctxCategory = document.getElementById('chart-category-doughnut')?.getContext('2d');
  if (ctxCategory) {
    chartCategory = new Chart(ctxCategory, {
      type: 'doughnut',
      data: {
        labels: ['Cooked Meals', 'Vegetables', 'Dairy', 'Rotis & Bread', 'Non-Veg & Eggs', 'Pantry'],
        datasets: [{
          data: [40, 25, 15, 10, 5, 5],
          backgroundColor: ['#14b8a6', '#10b981', '#3b82f6', '#f59e0b', '#f43f5e', '#8b5cf6']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' } }
      }
    });
  }

  const ctxReasons = document.getElementById('chart-reasons-bar')?.getContext('2d');
  if (ctxReasons) {
    chartReasons = new Chart(ctxReasons, {
      type: 'bar',
      data: {
        labels: ['Cooked too much', 'Spoils before consume', 'Expired food', 'Poor meal planning', 'Change in plan'],
        datasets: [{
          label: 'Count of Incidents',
          data: [5, 4, 2, 2, 1],
          backgroundColor: '#059669',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }
}

function updateDashboard() {
  if (!chartCategory || !chartReasons) return;

  const catTotals = { 'Cooked Meals': 0, 'Vegetables': 0, 'Dairy': 0, 'Rotis & Bread': 0, 'Non-Veg & Eggs': 0, 'Pantry': 0 };
  const reasonTotals = { 'Cooked too much food': 0, 'Food spoils before consume': 0, 'Expired food': 0, 'Poor meal planning': 0, 'Change in plan': 0 };

  state.wasteLogs.forEach(log => {
    if (catTotals[log.category] !== undefined) catTotals[log.category] += 1;
    if (reasonTotals[log.reason] !== undefined) reasonTotals[log.reason] += 1;
  });

  chartCategory.data.datasets[0].data = [
    catTotals['Cooked Meals'] || 1,
    catTotals['Vegetables'] || 1,
    catTotals['Dairy'] || 1,
    catTotals['Rotis & Bread'] || 1,
    catTotals['Non-Veg & Eggs'] || 1,
    catTotals['Pantry'] || 1
  ];
  chartCategory.update();

  chartReasons.data.datasets[0].data = [
    reasonTotals['Cooked too much food'] || 0,
    reasonTotals['Food spoils before consume'] || 0,
    reasonTotals['Expired food'] || 0,
    reasonTotals['Poor meal planning'] || 0,
    reasonTotals['Change in plan'] || 0
  ];
  chartReasons.update();

  const totalCost = state.wasteLogs.reduce((acc, l) => acc + (parseFloat(l.cost) || 0), 0);
  const estimatedSavings = Math.max(0, 4500 - totalCost);
  const co2Saved = (estimatedSavings * 0.008).toFixed(1);
  const waterSaved = Math.round(estimatedSavings * 0.7);

  document.getElementById('dash-savings-val').textContent = `₹${estimatedSavings.toFixed(2)}`;
  document.getElementById('dash-co2-val').textContent = `${co2Saved} kg CO₂e`;
  document.getElementById('dash-water-val').textContent = `${waterSaved.toLocaleString()} Litres`;
}

// ==========================================
// MODULE 3: DAILY MEAL PLANNER (NEW FEATURE)
// ==========================================
function renderDailyMealPlan() {
  const container = document.getElementById('meal-plan-container');
  if (!container) return;

  const today = new Date();
  today.setHours(0,0,0,0);

  const urgentItems = state.expiryItems.filter(item => {
    const expDate = new Date(item.expiryDate);
    expDate.setHours(0,0,0,0);
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  });

  const meals = [
    {
      slot: 'Breakfast 🍳',
      dish: 'Roti Cutlets & Hot Chai',
      uses: urgentItems.filter(i => i.category === 'Rotis & Bread' || i.name.toLowerCase().includes('roti')).map(i => i.name),
      defaultUse: 'Extra Rotis & Spices',
      time: '12 mins',
      tip: 'Shred extra roties and toss with mustard seeds, curry leaves & lemon juice!'
    },
    {
      slot: 'Lunch 🍲',
      dish: 'Phodnicha Bhaat & Tadka Dal Shorba',
      uses: urgentItems.filter(i => i.category === 'Cooked Meals' || i.name.toLowerCase().includes('rice') || i.name.toLowerCase().includes('dal')).map(i => i.name),
      defaultUse: 'Leftover Rice & Dal',
      time: '15 mins',
      tip: 'Re-heat leftover rice with peanuts and curry leaves for fluffy fried rice.'
    },
    {
      slot: 'Evening Snack ☕',
      dish: 'Refreshing Dahi Lassi / Chaat',
      uses: urgentItems.filter(i => i.category === 'Dairy').map(i => i.name),
      defaultUse: 'Fresh Curd / Dahi',
      time: '5 mins',
      tip: 'Whisk slightly sour curd with sugar, salt & roasted cumin powder.'
    },
    {
      slot: 'Dinner 🌙',
      dish: 'Mix-Veg Stuffed Parathas with Paneer Bhurji',
      uses: urgentItems.filter(i => i.category === 'Vegetables' || i.name.toLowerCase().includes('paneer')).map(i => i.name),
      defaultUse: 'Paneer Pack & Mixed Sabzi',
      time: '20 mins',
      tip: 'Crumble expiring paneer into quick Bhurji with onions and tomatoes.'
    }
  ];

  container.innerHTML = meals.map(m => {
    const itemsList = m.uses.length > 0 ? m.uses.join(', ') : m.defaultUse;
    return `
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-3 hover:shadow-md transition">
        <div>
          <div class="flex items-center justify-between">
            <span class="font-extrabold text-slate-900 text-sm">${m.slot}</span>
            <span class="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">⏱️ ${m.time}</span>
          </div>
          <h4 class="font-bold text-emerald-800 text-base mt-2">${escapeHtml(m.dish)}</h4>
          <p class="text-xs text-slate-500 mt-1"><strong>Uses Expiring:</strong> ${escapeHtml(itemsList)}</p>
        </div>
        <div class="p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-slate-600 text-xs leading-relaxed">
          <strong>💡 Hack:</strong> ${escapeHtml(m.tip)}
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// MODULE 4: EXPIRY REMINDERS & PANTRY TRACKER
// ==========================================
function renderExpiryItems() {
  const grid = document.getElementById('expiry-grid');
  const today = new Date();
  today.setHours(0,0,0,0);

  const processed = state.expiryItems.map(item => {
    const expDate = new Date(item.expiryDate);
    expDate.setHours(0,0,0,0);
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    
    let status = 'FRESH';
    if (diffDays <= 0) status = 'URGENT';
    else if (diffDays <= 3) status = 'SOON';

    return { ...item, diffDays, status };
  });

  const cAll = processed.length;
  const cUrgent = processed.filter(i => i.status === 'URGENT').length;
  const cSoon = processed.filter(i => i.status === 'SOON').length;
  const cFresh = processed.filter(i => i.status === 'FRESH').length;

  document.getElementById('count-exp-all').textContent = cAll;
  document.getElementById('count-exp-urgent').textContent = cUrgent;
  document.getElementById('count-exp-soon').textContent = cSoon;
  document.getElementById('count-exp-fresh').textContent = cFresh;

  let filtered = processed;
  if (state.currentExpiryFilter === 'URGENT') filtered = processed.filter(i => i.status === 'URGENT');
  if (state.currentExpiryFilter === 'SOON') filtered = processed.filter(i => i.status === 'SOON');
  if (state.currentExpiryFilter === 'FRESH') filtered = processed.filter(i => i.status === 'FRESH');

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80">
        <i data-lucide="check-circle-2" class="w-12 h-12 mx-auto mb-2 text-emerald-500"></i>
        <p class="font-bold text-slate-700">No items found in this section!</p>
        <p class="text-xs text-slate-400 mt-1">Your fridge is fresh and organized.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  grid.innerHTML = filtered.map(item => {
    let statusBadge = '';
    let borderClass = 'border-slate-200';

    if (item.status === 'URGENT') {
      borderClass = 'border-red-300 bg-red-50/20';
      statusBadge = `<span class="bg-red-100 text-red-800 text-xs px-2.5 py-1 rounded-full font-bold animate-pulse">🔴 ${item.diffDays < 0 ? 'Expired' : 'Expiring Today!'}</span>`;
    } else if (item.status === 'SOON') {
      borderClass = 'border-amber-300 bg-amber-50/20';
      statusBadge = `<span class="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-bold">🟡 Expiring in ${item.diffDays} day${item.diffDays === 1 ? '' : 's'}</span>`;
    } else {
      borderClass = 'border-emerald-200 bg-emerald-50/10';
      statusBadge = `<span class="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold">🟢 Fresh (${item.diffDays} days left)</span>`;
    }

    return `
      <div class="bg-white p-5 rounded-2xl border ${borderClass} shadow-sm space-y-3 flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between gap-2">
            <h4 class="font-bold text-slate-900 text-base">${escapeHtml(item.name)}</h4>
            ${statusBadge}
          </div>
          <div class="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <span class="px-2 py-0.5 rounded-md bg-slate-100 font-medium">${escapeHtml(item.category)}</span>
            <span>•</span>
            <span>Qty: ${escapeHtml(item.quantity)}</span>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button onclick="markExpiryEaten('${item.id}')" class="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition text-center flex items-center justify-center gap-1">
            <i data-lucide="check" class="w-3.5 h-3.5"></i> Ate It
          </button>

          <button onclick="findLeftoverForExpiry('${escapeHtml(item.name)}')" class="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition text-center flex items-center justify-center gap-1">
            <i data-lucide="utensils" class="w-3.5 h-3.5"></i> Recipe
          </button>

          <button onclick="logExpiryWasted('${item.id}')" class="py-1.5 px-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition text-center" title="Log as Wasted">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function filterExpiryTab(filter) {
  state.currentExpiryFilter = filter;
  ['all', 'urgent', 'soon', 'fresh'].forEach(f => {
    const btn = document.getElementById(`expiry-filter-${f}`);
    if (btn) {
      if (f.toUpperCase() === filter) {
        btn.className = "px-4 py-2 text-sm font-semibold rounded-xl bg-slate-900 text-white";
      } else {
        btn.className = "px-4 py-2 text-sm font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200";
      }
    }
  });
  renderExpiryItems();
}

function openExpiryModal() {
  document.getElementById('exp-date').value = getOffsetDate(3);
  document.getElementById('modal-add-expiry').classList.remove('hidden');
}

function closeExpiryModal() {
  document.getElementById('modal-add-expiry').classList.add('hidden');
  document.getElementById('form-add-expiry').reset();
}

function handleExpiryAddSubmit(e) {
  e.preventDefault();
  const newItem = {
    id: 'exp-' + Date.now(),
    name: document.getElementById('exp-item-name').value.trim(),
    category: document.getElementById('exp-category').value,
    quantity: document.getElementById('exp-quantity').value.trim(),
    expiryDate: document.getElementById('exp-date').value
  };

  state.expiryItems.unshift(newItem);
  saveState();
  closeExpiryModal();
  renderExpiryItems();
  renderDailyMealPlan();
}

function markExpiryEaten(id) {
  state.expiryItems = state.expiryItems.filter(i => i.id !== id);
  saveState();
  renderExpiryItems();
  renderDailyMealPlan();
  triggerToast('🎉 Yum! Item marked as eaten instead of wasted.');
}

function logExpiryWasted(id) {
  const item = state.expiryItems.find(i => i.id === id);
  if (item) {
    openLogModal();
    document.getElementById('log-item-name').value = item.name;
    document.getElementById('log-category').value = item.category;
    document.getElementById('log-quantity').value = item.quantity;
    document.getElementById('log-reason').value = 'Food spoils before consume';
    state.expiryItems = state.expiryItems.filter(i => i.id !== id);
    saveState();
    renderExpiryItems();
  }
}

function findLeftoverForExpiry(itemName) {
  if (!state.selectedLeftovers.includes(itemName)) {
    state.selectedLeftovers.push(itemName);
  }
  switchTab('leftover');
}

// ==========================================
// MODULE 5: GROCERY PLANNER
// ==========================================
function renderGroceryList() {
  const container = document.getElementById('grocery-list-container');
  const countEl = document.getElementById('grocery-count');

  countEl.textContent = state.groceryList.length;

  if (state.groceryList.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-slate-400">
        <i data-lucide="shopping-bag" class="w-10 h-10 mx-auto mb-2 text-slate-300"></i>
        <p class="text-sm font-medium">Your grocery shopping list is empty.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = state.groceryList.map(item => `
    <div class="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
      <div class="flex items-center gap-3">
        <input type="checkbox" ${item.bought ? 'checked' : ''} onchange="toggleGroceryBought('${item.id}')" class="w-5 h-5 accent-emerald-600 rounded cursor-pointer">
        <span class="${item.bought ? 'line-through text-slate-400 font-normal' : 'font-semibold text-slate-900'} text-sm">${escapeHtml(item.name)}</span>
        <span class="text-xs px-2 py-0.5 rounded-full ${getCategoryBadgeClass(item.category)} font-medium">${escapeHtml(item.category)}</span>
      </div>

      <button onclick="deleteGroceryItem('${item.id}')" class="p-1 text-slate-400 hover:text-red-600 rounded">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `).join('');

  lucide.createIcons();
}

function handleGroceryAdd(e) {
  e.preventDefault();
  const name = document.getElementById('groc-name').value.trim();
  const category = document.getElementById('groc-category').value;

  const existing = state.expiryItems.find(i => i.name.toLowerCase().includes(name.toLowerCase()));
  if (existing) {
    if (!confirm(`⚠️ Impulse & Supply Check: You already have "${existing.name}" in your kitchen/fridge! Are you sure you want to add this to your shopping list?`)) {
      return;
    }
  }

  state.groceryList.unshift({
    id: 'groc-' + Date.now(),
    name,
    category,
    bought: false
  });

  document.getElementById('groc-name').value = '';
  saveState();
  renderGroceryList();
}

function toggleGroceryBought(id) {
  const item = state.groceryList.find(g => g.id === id);
  if (item) {
    item.bought = !item.bought;
    
    if (item.bought) {
      if (confirm(`🛒 Move "${item.name}" to your Expiry Reminders pantry tracker?`)) {
        openExpiryModal();
        document.getElementById('exp-item-name').value = item.name;
        document.getElementById('exp-category').value = item.category;
      }
    }
    saveState();
    renderGroceryList();
  }
}

function deleteGroceryItem(id) {
  state.groceryList = state.groceryList.filter(g => g.id !== id);
  saveState();
  renderGroceryList();
}

function clearBoughtGrocery() {
  state.groceryList = state.groceryList.filter(g => !g.bought);
  saveState();
  renderGroceryList();
}

function exportGroceryListText() {
  if (state.groceryList.length === 0) {
    triggerToast('⚠️ Shopping list is empty!');
    return;
  }

  const lines = state.groceryList.map((g, i) => `${i + 1}. ${g.name} (${g.category}) ${g.bought ? '[✓ Bought]' : ''}`);
  const text = `🛒 *Savebite Kirana & Grocery List*\n\n${lines.join('\n')}\n\nGenerated via Savebite • Zero Waste Household`;

  navigator.clipboard.writeText(text).then(() => {
    triggerToast('📋 Grocery list copied to clipboard! Ready to paste into WhatsApp.');
  }).catch(() => {
    alert(text);
  });
}

// ==========================================
// MODULE 6: LEFTOVER IDEAS (INDIAN RECIPES)
// ==========================================
const PRESET_LEFTOVERS = [
  'Leftover Rice', 'Extra Rotis', 'Leftover Dal', 'Cooked Sabzi', 
  'Sour Dahi / Curd', 'Boiled Potatoes', 'Paneer', 'Dhaniya & Chillies'
];

const PRESET_RECIPES = [
  {
    id: 'rec-1',
    title: 'Phodnicha Bhaat (Tadka Rice)',
    time: '10 mins',
    difficulty: 'Easy',
    servings: '2 Servings',
    matchingIngredients: ['Leftover Rice'],
    allIngredients: ['2 cups leftover cooked rice', '1 tbsp oil / ghee', '1/2 tsp mustard seeds', '1/2 tsp cumin', 'Curry leaves', '1 green chilli chopped', '1/2 tsp turmeric', 'Peanuts & Salt'],
    steps: [
      'Heat ghee or mustard oil in a Kadhai over medium flame.',
      'Add mustard seeds, cumin seeds, curry leaves, and green chillies until they crackle.',
      'Add roasted peanuts and turmeric powder.',
      'Toss in leftover rice, sprinkle a splash of water, mix gently and cover for 3 minutes until steaming hot.'
    ],
    tip: 'Squeeze fresh lemon juice on top right before serving to bring out maximum flavor!'
  },
  {
    id: 'rec-2',
    title: 'Crispy Roti Chivda / Cutlet',
    time: '15 mins',
    difficulty: 'Easy',
    servings: '3 Servings',
    matchingIngredients: ['Extra Rotis'],
    allIngredients: ['4-5 leftover stale roties', '1 finely chopped onion', '1 chopped tomato', '1/2 tsp turmeric', '1/2 tsp red chilli powder', 'Mustard seeds & Curry leaves'],
    steps: [
      'Tear or shred leftover roties into small bite-sized chips or flakes.',
      'Heat oil in a pan, crackle mustard seeds and curry leaves, then sauté chopped onions till golden.',
      'Add tomatoes, turmeric, chilli powder, and salt.',
      'Toss shredded roti chips into the pan and roast on low heat for 5 minutes until crispy.'
    ],
    tip: 'Stale roties crisp up far better than fresh roties when toasted with spices!'
  },
  {
    id: 'rec-3',
    title: 'Mix-Veg Stuffed Paratha',
    time: '20 mins',
    difficulty: 'Medium',
    servings: '4 Parathas',
    matchingIngredients: ['Cooked Sabzi', 'Extra Rotis'],
    allIngredients: ['1 cup leftover dry cooked sabzi (Aloo, Gobi, Bhindi)', '2 cups Wheat Atta', '1/2 tsp Ajwain (Carom seeds)', '1/2 tsp Cumin powder', 'Ghee for frying'],
    steps: [
      'Mash leftover cooked sabzi thoroughly with a fork or potato masher.',
      'Knead Wheat Atta dough using water and a pinch of salt.',
      'Roll a small dough ball, place 2 tbsp of mashed sabzi in the center, seal the edges, and roll into a paratha.',
      'Cook on a hot tawa with ghee until golden brown spots appear on both sides.'
    ],
    tip: 'You can also knead leftover Dal directly into Atta dough without water to make super soft, protein-rich Missi Roti!'
  },
  {
    id: 'rec-4',
    title: 'South-Indian Comfort Dahi Rice',
    time: '10 mins',
    difficulty: 'Easy',
    servings: '2 Servings',
    matchingIngredients: ['Leftover Rice', 'Sour Dahi / Curd'],
    allIngredients: ['2 cups cooked leftover rice', '1 cup fresh Dahi / Curd', '1/4 cup milk', '1/2 tsp mustard seeds', 'Grated ginger & green chillies', 'Curry leaves'],
    steps: [
      'Mash leftover rice gently with hands and stir in fresh dahi and a splash of milk.',
      'Heat 1 tsp oil in a small tadka pan, pop mustard seeds, curry leaves, and green chillies.',
      'Pour hot tadka over the curd rice and mix well.'
    ],
    tip: 'Adding a small splash of milk prevents curd rice from turning overly sour if stored for a few hours!'
  },
  {
    id: 'rec-5',
    title: 'Nourishing Dal Shorba / Soup',
    time: '15 mins',
    difficulty: 'Easy',
    servings: '2 Bowls',
    matchingIngredients: ['Leftover Dal'],
    allIngredients: ['1.5 cups leftover Dal Tadka', '1 chopped tomato', '2 cloves minced garlic', '1/2 tsp roasted cumin powder', 'Black pepper & Dhaniya'],
    steps: [
      'Blend leftover dal with tomato and garlic until smooth.',
      'Simmer in a saucepan with 1/2 cup water for 8 minutes.',
      'Season with roasted cumin powder, black pepper, and garnish with fresh dhaniya.'
    ],
    tip: 'Extends leftover dal into a warm, appetizing appetizer soup!'
  }
];

function renderLeftoverTags() {
  const container = document.getElementById('leftover-ingredient-tags');
  container.innerHTML = PRESET_LEFTOVERS.map(ing => {
    const isSelected = state.selectedLeftovers.includes(ing);
    return `
      <button onclick="toggleLeftoverTag('${escapeHtml(ing)}')" class="px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${isSelected ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
        ${isSelected ? '✓ ' : '+ '} ${escapeHtml(ing)}
      </button>
    `;
  }).join('');
}

function toggleLeftoverTag(tag) {
  if (state.selectedLeftovers.includes(tag)) {
    state.selectedLeftovers = state.selectedLeftovers.filter(t => t !== tag);
  } else {
    state.selectedLeftovers.push(tag);
  }
  saveState();
  renderLeftoverTags();
  renderRecipes();
}

function addCustomLeftover() {
  const input = document.getElementById('custom-leftover-input');
  const val = input.value.trim();
  if (val && !PRESET_LEFTOVERS.includes(val)) {
    PRESET_LEFTOVERS.push(val);
    state.selectedLeftovers.push(val);
    input.value = '';
    saveState();
    renderLeftoverTags();
    renderRecipes();
  }
}

function renderRecipes() {
  const grid = document.getElementById('recipes-grid');
  const countEl = document.getElementById('recipes-count');

  const scored = PRESET_RECIPES.map(rec => {
    const matchCount = rec.matchingIngredients.filter(i => state.selectedLeftovers.includes(i)).length;
    return { ...rec, matchCount };
  }).sort((a, b) => b.matchCount - a.matchCount);

  countEl.textContent = scored.length;

  grid.innerHTML = scored.map(rec => `
    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition">
      <div>
        <div class="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span class="font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md">${rec.matchCount} Leftover Match</span>
          <span>⏱️ ${rec.time}</span>
        </div>
        <h4 class="font-bold text-slate-900 text-lg">${escapeHtml(rec.title)}</h4>
        
        <div class="mt-3 flex flex-wrap gap-1.5">
          ${rec.allIngredients.slice(0, 3).map(i => `<span class="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">${escapeHtml(i)}</span>`).join('')}
          ${rec.allIngredients.length > 3 ? `<span class="text-xs text-slate-400 align-middle">+${rec.allIngredients.length - 3} more</span>` : ''}
        </div>
      </div>

      <button onclick="showRecipeDetail('${rec.id}')" class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition">
        View Full Recipe & Instructions
      </button>
    </div>
  `).join('');
}

function showRecipeDetail(id) {
  const rec = PRESET_RECIPES.find(r => r.id === id);
  if (!rec) return;

  document.getElementById('recipe-modal-title').textContent = rec.title;
  document.getElementById('recipe-modal-time').textContent = `⏱️ ${rec.time}`;
  document.getElementById('recipe-modal-diff').textContent = `📊 ${rec.difficulty}`;
  document.getElementById('recipe-modal-servings').textContent = `🍽️ ${rec.servings}`;

  document.getElementById('recipe-modal-ingredients').innerHTML = rec.allIngredients.map(i => `<li>${escapeHtml(i)}</li>`).join('');
  document.getElementById('recipe-modal-steps').innerHTML = rec.steps.map(s => `<li class="mb-1">${escapeHtml(s)}</li>`).join('');
  document.getElementById('recipe-modal-tip').textContent = rec.tip;

  document.getElementById('modal-recipe-detail').classList.remove('hidden');
}

function closeRecipeModal() {
  document.getElementById('modal-recipe-detail').classList.add('hidden');
}

// ==========================================
// MODULE 7: INDIAN KITCHEN REDUCTION TIPS
// ==========================================
const PRESET_TIPS = [
  { id: 'tip-1', category: 'Storage', title: 'Dhaniya & Green Chilli Paper Wrap Hack', text: 'Thoroughly dry fresh coriander (dhaniya) and green chillies. Wrap them in dry paper towels inside an airtight container. Keeps fresh for up to 3 weeks!' },
  { id: 'tip-2', category: 'Leftovers', title: 'Repurpose Sour Dahi into Kadhi or Dhokla', text: 'Never throw away souring curd! Sour dahi makes the most authentic, tangy Punjabi Kadhi, Dhokla, or Bhature dough.' },
  { id: 'tip-3', category: 'Portion', title: 'Atta Dough Portion Control', text: 'Measure flour per person (approx 2 roties = 50g flour) before kneading to prevent leftover dough balls from drying out in the fridge.' },
  { id: 'tip-4', category: 'Storage', title: 'Boil Leftover Dal Before Refrigeration', text: 'In Indian summer weather, bring leftover dal to a complete boil before cooling and storing in the fridge to prevent souring.' },
  { id: 'tip-5', category: 'Shopping', title: 'Check Spice & Pulses Inventory First', text: 'Always check existing dabba stocks of Toor dal, Chana dal, and spices before grocery trips to avoid buying duplicate pulses.' }
];

function renderTips() {
  const grid = document.getElementById('tips-grid');
  const search = (document.getElementById('tips-search')?.value || '').toLowerCase();
  
  let filtered = PRESET_TIPS.filter(tip => {
    const matchesSearch = tip.title.toLowerCase().includes(search) || tip.text.toLowerCase().includes(search);
    const matchesCat = state.currentTipCategory === 'ALL' || tip.category === state.currentTipCategory;
    return matchesSearch && matchesCat;
  });

  grid.innerHTML = filtered.map(tip => {
    const isBookmarked = state.bookmarkedTips.includes(tip.id);
    const isPracticed = state.practicedTips.includes(tip.id);

    return `
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3 flex flex-col justify-between hover:shadow-md transition">
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${getTipBadgeClass(tip.category)}">${tip.category}</span>
            <button onclick="toggleBookmarkTip('${tip.id}')" class="text-slate-400 hover:text-amber-500">
              <i data-lucide="bookmark" class="w-4 h-4 ${isBookmarked ? 'fill-amber-400 text-amber-500' : ''}"></i>
            </button>
          </div>
          <h4 class="font-bold text-slate-900 text-base mb-1">${escapeHtml(tip.title)}</h4>
          <p class="text-xs text-slate-600 leading-relaxed">${escapeHtml(tip.text)}</p>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
          <button onclick="togglePracticeTip('${tip.id}')" class="w-full py-2 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${isPracticed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
            <i data-lucide="${isPracticed ? 'check-circle' : 'circle'}" class="w-4 h-4"></i>
            <span>${isPracticed ? 'Practiced Today!' : 'Mark as Practiced'}</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function filterTipsCategory(cat) {
  state.currentTipCategory = cat;
  ['all', 'storage', 'portion', 'leftovers', 'shopping'].forEach(c => {
    const btn = document.getElementById(`tip-cat-${c}`);
    if (btn) {
      if (c.toUpperCase() === cat.toUpperCase()) {
        btn.className = "tip-cat-btn active-tip-cat";
      } else {
        btn.className = "tip-cat-btn";
      }
    }
  });
  renderTips();
}

function toggleBookmarkTip(id) {
  if (state.bookmarkedTips.includes(id)) {
    state.bookmarkedTips = state.bookmarkedTips.filter(t => t !== id);
  } else {
    state.bookmarkedTips.push(id);
  }
  saveState();
  renderTips();
}

function togglePracticeTip(id) {
  if (state.practicedTips.includes(id)) {
    state.practicedTips = state.practicedTips.filter(t => t !== id);
  } else {
    state.practicedTips.push(id);
    triggerToast('💡 Awesome! You practiced an Indian kitchen food waste reduction tip today.');
  }
  saveState();
  renderTips();
}

function getTipBadgeClass(cat) {
  switch(cat) {
    case 'Storage': return 'bg-emerald-100 text-emerald-800';
    case 'Portion': return 'bg-purple-100 text-purple-800';
    case 'Leftovers': return 'bg-teal-100 text-teal-800';
    case 'Shopping': return 'bg-blue-100 text-blue-800';
    default: return 'bg-slate-100 text-slate-800';
  }
}

// ==========================================
// MODULE 8: WASTE REDUCTION GOALS & BADGES
// ==========================================
const ALL_BADGES = [
  { id: 'b-1', name: 'Kitchen Beginner', desc: 'Logged 3+ wasted items', icon: '🌱', req: (s) => s.wasteLogs.length >= 3 },
  { id: 'b-2', name: 'Waste Fighter', desc: 'Practiced 2+ reduction tips', icon: '⚡', req: (s) => s.practicedTips.length >= 2 },
  { id: 'b-3', name: 'Zero-Waste Hero', desc: 'Maintained 7-day streak', icon: '🏆', req: (s) => true },
  { id: 'b-4', name: 'Desi Leftover Master', desc: 'Made recipes from leftovers', icon: '🍱', req: (s) => s.selectedLeftovers.length >= 1 }
];

function renderGoals() {
  const grid = document.getElementById('goals-grid');
  const currentTotal = state.wasteLogs.reduce((acc, l) => acc + (parseFloat(l.cost) || 0), 0);

  grid.innerHTML = state.goals.map(g => {
    const isCompleted = currentTotal <= g.target;
    const pct = Math.min(100, Math.round((currentTotal / g.target) * 100));

    return `
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md">${g.timeframe} Target</span>
            <h4 class="font-bold text-slate-900 text-lg mt-1">${escapeHtml(g.title)}</h4>
          </div>
          <span class="text-xl font-extrabold text-slate-800">₹${currentTotal.toFixed(2)} / ₹${g.target}</span>
        </div>

        <div>
          <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div class="h-3 rounded-full ${pct >= 100 ? 'bg-amber-500' : 'bg-emerald-500'}" style="width: ${pct}%"></div>
          </div>
          <div class="flex justify-between text-xs text-slate-500 mt-1">
            <span>Progress</span>
            <span>${pct}% of limit used</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  renderBadges();
}

function renderBadges() {
  const grid = document.getElementById('badges-grid');
  grid.innerHTML = ALL_BADGES.map(b => {
    const unlocked = b.req(state);
    return `
      <div class="p-4 rounded-xl border text-center space-y-2 transition ${unlocked ? 'bg-emerald-50/50 border-emerald-200 text-slate-900' : 'bg-slate-50 border-slate-200 opacity-50 grayscale'}">
        <div class="text-3xl">${b.icon}</div>
        <h5 class="font-bold text-sm text-slate-900">${b.name}</h5>
        <p class="text-xs text-slate-500">${b.desc}</p>
        <span class="inline-block text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${unlocked ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'}">
          ${unlocked ? 'Unlocked' : 'Locked'}
        </span>
      </div>
    `;
  }).join('');
}

function openGoalModal() {
  document.getElementById('modal-add-goal').classList.remove('hidden');
}

function closeGoalModal() {
  document.getElementById('modal-add-goal').classList.add('hidden');
  document.getElementById('form-add-goal').reset();
}

function handleGoalAddSubmit(e) {
  e.preventDefault();
  const newGoal = {
    id: 'goal-' + Date.now(),
    title: document.getElementById('goal-title').value.trim(),
    target: parseFloat(document.getElementById('goal-target').value) || 500,
    timeframe: document.getElementById('goal-timeframe').value
  };

  state.goals.push(newGoal);
  saveState();
  closeGoalModal();
  renderGoals();

  if (typeof confetti === 'function') {
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  }
}

// ==========================================
// MODULE 9: AWARENESS RESOURCES & CALCULATOR
// ==========================================
function updateCalculator() {
  const people = parseInt(document.getElementById('calc-people').value) || 4;
  const spend = parseInt(document.getElementById('calc-spend').value) || 2500;
  const wastedPct = parseInt(document.getElementById('calc-percent').value) || 20;

  document.getElementById('calc-people-val').textContent = `${people} ${people === 1 ? 'Person' : 'People'}`;
  document.getElementById('calc-spend-val').textContent = `₹${spend.toLocaleString()}`;
  document.getElementById('calc-percent-val').textContent = `${wastedPct}%`;

  const annualSpend = spend * 52;
  const annualMoneySaved = Math.round(annualSpend * (wastedPct / 100));
  const annualWeightSaved = Math.round(people * 50 * (wastedPct / 20));
  const annualCo2Saved = Math.round(annualWeightSaved * 2.2);

  document.getElementById('calc-out-money').textContent = `₹${annualMoneySaved.toLocaleString()}`;
  document.getElementById('calc-out-weight').textContent = `${annualWeightSaved.toLocaleString()} kg`;
  document.getElementById('calc-out-co2').textContent = `${annualCo2Saved.toLocaleString()} kg CO₂e`;
}

// ==========================================
// UTILITY HELPERS
// ==========================================
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function triggerToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 border border-slate-700 flex items-center gap-2';
  toast.innerHTML = `<span>${msg}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
