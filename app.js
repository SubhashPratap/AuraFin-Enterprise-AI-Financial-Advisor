/**
 * AuraFin Enterprise Application Controller
 * Manages State, UI Views, Chart.js instances, Event Routing, and Data Persistence
 */

let state = {
  currency: '$',
  income: 7000,
  needs: 3300,
  wants: 1500,
  liquidCash: 16000,
  netWorth: 125000,
  apiKey: localStorage.getItem('aura_gemini_key') || '',
  model: localStorage.getItem('aura_gemini_model') || 'gemini-1.5-flash',
  
  riskAnswers: { horizon: 5, reaction: 4, experience: 3, capacity: 4, tolerance: 4 },
  riskProfile: null,
  
  currentAllocation: {
    us_equity: 45,
    intl_equity: 25,
    govt_bonds: 10,
    corp_bonds: 5,
    gold_commodities: 5,
    cash: 10
  },
  
  targetAllocation: {},
  
  goals: [
    { id: 1, name: 'Emergency Capital Reserve', target: 20000, current: 16000 },
    { id: 2, name: 'Vehicle Replacement Fund', target: 15000, current: 8000 },
    { id: 3, name: 'Property Down Payment', target: 100000, current: 25000 }
  ]
};

// Preset Personas Data
const PRESETS = {
  young_pro: {
    name: 'Alex (Early Accumulator)',
    income: 7000, needs: 3300, wants: 1500, liquidCash: 16000, netWorth: 85000,
    riskAnswers: { horizon: 5, reaction: 4, experience: 3, capacity: 4, tolerance: 4 },
    currentAllocation: { us_equity: 45, intl_equity: 25, govt_bonds: 10, corp_bonds: 5, gold_commodities: 5, cash: 10 },
    goals: [
      { id: 1, name: 'Emergency Reserve', target: 20000, current: 16000 },
      { id: 2, name: 'Tech & Mobility Reserve', target: 15000, current: 8000 },
      { id: 3, name: 'House Down Payment', target: 100000, current: 25000 }
    ]
  },
  mid_career: {
    name: 'Sarah & Marcus (Family Mid-Career)',
    income: 12000, needs: 6000, wants: 2500, liquidCash: 35000, netWorth: 320000,
    riskAnswers: { horizon: 4, reaction: 3, experience: 3, capacity: 3, tolerance: 3 },
    currentAllocation: { us_equity: 35, intl_equity: 15, govt_bonds: 25, corp_bonds: 15, gold_commodities: 5, cash: 5 },
    goals: [
      { id: 1, name: 'Children College Fund', target: 80000, current: 45000 },
      { id: 2, name: 'Retirement Independence', target: 500000, current: 210000 },
      { id: 3, name: 'Family Vacation Reserve', target: 12000, current: 9000 }
    ]
  },
  pre_retire: {
    name: 'Robert (Pre-Retirement Preserver)',
    income: 15000, needs: 6500, wants: 3000, liquidCash: 75000, netWorth: 850000,
    riskAnswers: { horizon: 2, reaction: 1, experience: 4, capacity: 5, tolerance: 2 },
    currentAllocation: { us_equity: 15, intl_equity: 10, govt_bonds: 45, corp_bonds: 20, gold_commodities: 5, cash: 5 },
    goals: [
      { id: 1, name: 'Retirement Safety Cushion', target: 1000000, current: 780000 },
      { id: 2, name: 'Healthcare Reserve Fund', target: 50000, current: 42000 },
      { id: 3, name: 'Legacy & Estate Trust', target: 200000, current: 110000 }
    ]
  }
};

// Global Chart Instances
let dashboardAllocChart = null;
let portfolioCompareChart = null;
let monteCarloChart = null;

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
  loadStateFromLocalStorage();
  initNavigation();
  initRiskQuiz();
  initBudgetCalculator();
  initGoals();
  initPortfolioSliders();
  initMonteCarloLab();
  initChatCopilot();
  initSettingsModal();
  initCurrencySelector();
  initPresetSwitcher();
  initReportExport();

  // Primary Data Compute & Initial Chart Renders
  updateAllMetricsAndCharts();
});

// --- Local Storage Management ---
function saveStateToLocalStorage() {
  try {
    localStorage.setItem('aurafin_app_state', JSON.stringify({
      currency: state.currency,
      income: state.income,
      needs: state.needs,
      wants: state.wants,
      liquidCash: state.liquidCash,
      netWorth: state.netWorth,
      riskAnswers: state.riskAnswers,
      currentAllocation: state.currentAllocation,
      goals: state.goals
    }));
  } catch (e) {
    console.warn('Unable to persist to LocalStorage:', e);
  }
}

function loadStateFromLocalStorage() {
  try {
    const saved = localStorage.getItem('aurafin_app_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to parse saved state:', e);
  }
}

// --- Navigation Handling ---
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabPages = document.querySelectorAll('.tab-page');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabTarget = item.getAttribute('data-tab');

      navItems.forEach(n => n.classList.remove('active'));
      tabPages.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      document.getElementById(`tab-${tabTarget}`).classList.add('active');

      // Trigger chart resize / re-renders on tab switch
      setTimeout(() => {
        if (tabTarget === 'dashboard' && dashboardAllocChart) dashboardAllocChart.resize();
        if (tabTarget === 'portfolio' && portfolioCompareChart) portfolioCompareChart.resize();
        if (tabTarget === 'simulation' && monteCarloChart) monteCarloChart.resize();
      }, 50);
    });
  });
}

// --- Currency Selector ---
function initCurrencySelector() {
  const select = document.getElementById('currency-select');
  select.value = state.currency || '$';

  select.addEventListener('change', (e) => {
    state.currency = e.target.value;
    saveStateToLocalStorage();
    updateAllMetricsAndCharts();
  });
}

// --- Presets Loader ---
function initPresetSwitcher() {
  const buttons = document.querySelectorAll('.preset-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const presetKey = btn.getAttribute('data-preset');
      const presetData = PRESETS[presetKey];

      if (presetData) {
        state.income = presetData.income;
        state.needs = presetData.needs;
        state.wants = presetData.wants;
        state.liquidCash = presetData.liquidCash;
        state.netWorth = presetData.netWorth;
        state.riskAnswers = { ...presetData.riskAnswers };
        state.currentAllocation = { ...presetData.currentAllocation };
        state.goals = JSON.parse(JSON.stringify(presetData.goals));

        document.getElementById('header-persona-name').textContent = presetData.name;
        document.getElementById('input-income').value = state.income;
        document.getElementById('input-needs').value = state.needs;
        document.getElementById('input-wants').value = state.wants;
        document.getElementById('input-liquid').value = state.liquidCash;

        updateRiskAnswersUI();
        saveStateToLocalStorage();
        updateAllMetricsAndCharts();
      }
    });
  });
}

// --- Recalculation & Metrics Master Dispatcher ---
function updateAllMetricsAndCharts() {
  // 1. Calculate Risk Profile
  state.riskProfile = FinancialEngine.assessRiskProfile(state.riskAnswers);
  state.targetAllocation = state.riskProfile.targetAllocation;

  // 2. Health Score & Calculations
  const health = FinancialEngine.calculateHealthScore(state);
  const drift = FinancialEngine.calculatePortfolioDrift(state.currentAllocation, state.targetAllocation);
  const fire = FinancialEngine.calculateFIRE(state);
  const curr = state.currency;

  // 3. Update Dashboard Stats
  document.getElementById('disp-net-worth').textContent = formatMoney(state.netWorth);
  
  const netSavings = state.income - state.needs - state.wants;
  const savingsRatePct = Math.round((netSavings / state.income) * 100);
  document.getElementById('disp-savings').textContent = formatMoney(netSavings);
  document.getElementById('disp-savings-pct').textContent = `${savingsRatePct}% Savings Rate`;

  document.getElementById('disp-health-score').textContent = `${health.overallScore} / 100`;
  document.getElementById('disp-health-rating').textContent = `Rating: ${health.overallScore >= 80 ? 'Excellent' : health.overallScore >= 60 ? 'Solid' : 'Needs Review'}`;

  document.getElementById('disp-emergency-months').textContent = `${health.metrics.monthsCovered} Mos`;
  document.getElementById('disp-emergency-sub').textContent = `Target: 6.0 Months`;

  const driftBadge = document.getElementById('drift-status-badge');
  driftBadge.textContent = `Drift: ${drift.totalDriftPct}% (${drift.isRebalanceNeeded ? 'Rebalance Advised' : 'Aligned'})`;
  driftBadge.className = `action-badge ${drift.isRebalanceNeeded ? 'sell' : 'buy'}`;

  // Cashflow sub-bar
  const needsPct = Math.round((state.needs / state.income) * 100);
  const wantsPct = Math.round((state.wants / state.income) * 100);
  document.getElementById('disp-needs-pct').textContent = `${needsPct}%`;
  document.getElementById('disp-wants-pct').textContent = `${wantsPct}%`;
  document.getElementById('disp-savings-rate-pct').textContent = `${savingsRatePct}%`;
  document.getElementById('cashflow-bar-fill').style.width = `${Math.min(100, Math.max(0, savingsRatePct))}%`;

  // Risk Badge
  const riskBadge = document.getElementById('risk-score-badge');
  riskBadge.textContent = `Score: ${state.riskProfile.score}/100 (${state.riskProfile.label})`;

  // 50/30/20 & FIRE Values
  document.getElementById('rule-needs-val').textContent = formatMoney(state.income * 0.5);
  document.getElementById('rule-wants-val').textContent = formatMoney(state.income * 0.3);
  document.getElementById('rule-savings-val').textContent = formatMoney(state.income * 0.2);

  document.getElementById('fire-years-disp').textContent = `${fire.yearsToFire} Years`;
  document.getElementById('fire-progress-fill').style.width = `${fire.fireProgressPct}%`;
  document.getElementById('fire-curr-wealth').textContent = formatMoney(state.netWorth);
  document.getElementById('fire-target-num').textContent = formatMoney(fire.fireTargetNumber);

  // 4. Render Components & Charts
  renderGoals();
  renderTradeOrdersTable(drift);
  renderDashboardAllocChart();
  renderPortfolioCompareChart();
  runAndRenderMonteCarlo();
}

// --- Dashboard Input Handlers ---
function initBudgetCalculator() {
  document.getElementById('recalc-dashboard-btn').addEventListener('click', () => {
    state.income = Math.max(1, Number(document.getElementById('input-income').value) || 1);
    state.needs = Math.max(0, Number(document.getElementById('input-needs').value) || 0);
    state.wants = Math.max(0, Number(document.getElementById('input-wants').value) || 0);
    state.liquidCash = Math.max(0, Number(document.getElementById('input-liquid').value) || 0);

    saveStateToLocalStorage();
    updateAllMetricsAndCharts();
  });
}

// --- Risk Quiz Handlers ---
function initRiskQuiz() {
  const quizCards = document.querySelectorAll('.quiz-options');
  quizCards.forEach(card => {
    const factor = card.getAttribute('data-factor');
    const buttons = card.querySelectorAll('.quiz-option-btn');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        state.riskAnswers[factor] = Number(btn.getAttribute('data-val'));
        saveStateToLocalStorage();
        updateAllMetricsAndCharts();
      });
    });
  });
}

function updateRiskAnswersUI() {
  const quizCards = document.querySelectorAll('.quiz-options');
  quizCards.forEach(card => {
    const factor = card.getAttribute('data-factor');
    const val = state.riskAnswers[factor] || 3;
    const buttons = card.querySelectorAll('.quiz-option-btn');

    buttons.forEach(b => {
      b.classList.remove('selected');
      if (Number(b.getAttribute('data-val')) === val) {
        b.classList.add('selected');
      }
    });
  });
}

// --- Goals Manager ---
function initGoals() {
  const goalForm = document.getElementById('goal-form');
  goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('goal-name').value;
    const target = Number(document.getElementById('goal-target').value);
    const current = Number(document.getElementById('goal-current').value);

    state.goals.push({
      id: Date.now(),
      name,
      target,
      current
    });

    saveStateToLocalStorage();
    updateAllMetricsAndCharts();
    goalForm.reset();
  });
}

function renderGoals() {
  const container = document.getElementById('goals-container');
  container.innerHTML = '';
  document.getElementById('goals-count-badge').textContent = `${state.goals.length} Active Goals`;

  state.goals.forEach(g => {
    const pct = Math.min(100, Math.round((g.current / g.target) * 100));
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.innerHTML = `
      <div class="goal-header">
        <span class="goal-title">${escapeHtml(g.name)}</span>
        <span class="text-success font-weight-bold" style="font-size: 13px;">${pct}%</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${pct}%"></div>
      </div>
      <div class="goal-stats">
        <span>Accumulated: ${formatMoney(g.current)}</span>
        <span>Target: ${formatMoney(g.target)}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// --- Portfolio Sliders & Trade Order Table ---
function initPortfolioSliders() {
  const container = document.getElementById('alloc-sliders-container');
  container.innerHTML = '';

  Object.keys(FinancialEngine.ASSET_CLASSES).forEach(key => {
    const asset = FinancialEngine.ASSET_CLASSES[key];
    const val = state.currentAllocation[key] || 0;

    const div = document.createElement('div');
    div.className = 'slider-group';
    div.innerHTML = `
      <div class="slider-header">
        <span>${asset.name}</span>
        <span id="val-alloc-${key}">${val}%</span>
      </div>
      <input type="range" class="alloc-range-slider" data-key="${key}" min="0" max="100" step="1" value="${val}" />
    `;
    container.appendChild(div);
  });

  document.querySelectorAll('.alloc-range-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const key = e.target.getAttribute('data-key');
      const val = Number(e.target.value);
      state.currentAllocation[key] = val;
      document.getElementById(`val-alloc-${key}`).textContent = `${val}%`;

      saveStateToLocalStorage();
      updateAllMetricsAndCharts();
    });
  });

  document.getElementById('reset-alloc-btn').addEventListener('click', () => {
    state.currentAllocation = { ...state.targetAllocation };
    initPortfolioSliders();
    saveStateToLocalStorage();
    updateAllMetricsAndCharts();
  });

  document.getElementById('apply-rebalance-btn').addEventListener('click', () => {
    state.currentAllocation = { ...state.targetAllocation };
    initPortfolioSliders();
    saveStateToLocalStorage();
    updateAllMetricsAndCharts();
    alert('✅ Portfolio Rebalance Model Executed Successfully! Allocation aligned to target.');
  });
}

function renderTradeOrdersTable(drift) {
  const tbody = document.getElementById('trade-orders-tbody');
  tbody.innerHTML = '';

  drift.details.forEach(d => {
    const tr = document.createElement('tr');
    let badgeClass = 'hold';
    if (d.action.includes('BUY')) badgeClass = 'buy';
    else if (d.action.includes('SELL')) badgeClass = 'sell';

    tr.innerHTML = `
      <td style="font-weight: 600;">${d.name}</td>
      <td>${d.currentPct}%</td>
      <td>${d.targetPct}%</td>
      <td style="color: ${d.diffPct > 0 ? 'var(--accent-gold)' : d.diffPct < 0 ? 'var(--accent-blue)' : 'inherit'};">${d.diffPct > 0 ? '+' : ''}${d.diffPct}%</td>
      <td><span class="action-badge ${badgeClass}">${d.action}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Monte Carlo Lab Controls ---
function initMonteCarloLab() {
  const sliders = ['sim-initial', 'sim-monthly', 'sim-years', 'sim-return', 'sim-volatility', 'sim-inflation'];
  sliders.forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener('input', () => {
      updateSimSliderLabels();
      runAndRenderMonteCarlo();
    });
  });

  document.getElementById('run-sim-btn').addEventListener('click', () => {
    runAndRenderMonteCarlo();
  });
}

function updateSimSliderLabels() {
  const curr = state.currency;
  document.getElementById('val-sim-initial').textContent = `${curr}${Number(document.getElementById('sim-initial').value).toLocaleString()}`;
  document.getElementById('val-sim-monthly').textContent = `${curr}${Number(document.getElementById('sim-monthly').value).toLocaleString()}`;
  document.getElementById('val-sim-years').textContent = `${document.getElementById('sim-years').value} Years`;
  document.getElementById('val-sim-return').textContent = `${document.getElementById('sim-return').value}%`;
  document.getElementById('val-sim-volatility').textContent = `${document.getElementById('sim-volatility').value}%`;
  document.getElementById('val-sim-inflation').textContent = `${document.getElementById('sim-inflation').value}%`;
}

function runAndRenderMonteCarlo() {
  updateSimSliderLabels();

  const params = {
    initialPortfolio: Number(document.getElementById('sim-initial').value),
    monthlyContribution: Number(document.getElementById('sim-monthly').value),
    years: Number(document.getElementById('sim-years').value),
    annualReturn: Number(document.getElementById('sim-return').value) / 100,
    annualStdDev: Number(document.getElementById('sim-volatility').value) / 100,
    inflationRate: Number(document.getElementById('sim-inflation').value) / 100,
    numSimulations: 1000
  };

  const results = FinancialEngine.runMonteCarloSimulation(params);

  document.getElementById('sim-p10-val').textContent = formatMoney(results.summary.pessimisticP10);
  document.getElementById('sim-p50-val').textContent = formatMoney(results.summary.medianFinal);
  document.getElementById('sim-p90-val').textContent = formatMoney(results.summary.optimisticP90);

  renderMonteCarloChart(results.percentileTrajectories);
}

// --- Chart.js Rendering Logic ---
function renderDashboardAllocChart() {
  const ctx = document.getElementById('dashboard-alloc-chart').getContext('2d');
  
  const labels = [];
  const data = [];
  const colors = [];

  Object.keys(FinancialEngine.ASSET_CLASSES).forEach(k => {
    const asset = FinancialEngine.ASSET_CLASSES[k];
    const val = state.currentAllocation[k] || 0;
    if (val > 0) {
      labels.push(asset.name);
      data.push(val);
      colors.push(asset.color);
    }
  });

  if (dashboardAllocChart) dashboardAllocChart.destroy();

  dashboardAllocChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#141d2f'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#94a3b8', font: { family: 'DM Sans', size: 11 } }
        }
      },
      cutout: '70%'
    }
  });
}

function renderPortfolioCompareChart() {
  const ctx = document.getElementById('portfolio-compare-chart').getContext('2d');
  
  const labels = [];
  const currentData = [];
  const targetData = [];

  Object.keys(FinancialEngine.ASSET_CLASSES).forEach(k => {
    const asset = FinancialEngine.ASSET_CLASSES[k];
    labels.push(asset.name.split(' ')[0]);
    currentData.push(state.currentAllocation[k] || 0);
    targetData.push(state.targetAllocation[k] || 0);
  });

  if (portfolioCompareChart) portfolioCompareChart.destroy();

  portfolioCompareChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Current Allocation %',
          data: currentData,
          backgroundColor: '#3b82f6',
          borderRadius: 4
        },
        {
          label: 'Target Benchmark %',
          data: targetData,
          backgroundColor: '#10b981',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, max: 100 }
      },
      plugins: {
        legend: { labels: { color: '#f8fafc', font: { family: 'DM Sans' } } }
      }
    }
  });
}

function renderMonteCarloChart(trajectories) {
  const ctx = document.getElementById('monte-carlo-chart').getContext('2d');

  if (monteCarloChart) monteCarloChart.destroy();

  monteCarloChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trajectories.labels,
      datasets: [
        {
          label: 'P90 Optimistic (90th Percentile)',
          data: trajectories.p90,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: '+1',
          tension: 0.3
        },
        {
          label: 'P50 Median Expected Path',
          data: trajectories.p50,
          borderColor: '#10b981',
          borderWidth: 3,
          tension: 0.3
        },
        {
          label: 'P10 Pessimistic (10th Percentile)',
          data: trajectories.p10,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          fill: false,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { 
          ticks: { 
            color: '#94a3b8',
            callback: (val) => `${state.currency}${(val/1000).toFixed(0)}k` 
          }, 
          grid: { color: 'rgba(255,255,255,0.05)' } 
        }
      },
      plugins: {
        legend: { labels: { color: '#f8fafc', font: { family: 'DM Sans' } } }
      }
    }
  });
}

// --- AI Chat Copilot ---
function initChatCopilot() {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    appendChatMessage(query, 'user');
    input.value = '';

    appendChatMessage('Analyzing portfolio context & running generative advisory models...', 'bot');
    const container = document.getElementById('chat-messages');
    const loadingMsg = container.lastChild;

    try {
      const reply = await AiAdvisor.queryAdvisor(query, state);
      container.removeChild(loadingMsg);
      appendChatMessage(reply, 'bot');
    } catch (err) {
      container.removeChild(loadingMsg);
      appendChatMessage(`⚠️ Advisory Engine Error: ${err.message}. Displaying local analysis brief.`, 'bot');
      const fallback = await AiAdvisor.queryAdvisor(query, { ...state, apiKey: '' });
      appendChatMessage(fallback, 'bot');
    }
  });
}

function askQuickQuestion(qText) {
  const input = document.getElementById('chat-input');
  input.value = qText;
  document.getElementById('chat-form').dispatchEvent(new Event('submit'));
}

function appendChatMessage(text, sender) {
  const container = document.getElementById('chat-messages');
  const msg = document.createElement('div');
  msg.className = `msg ${sender}`;

  const icon = sender === 'user' ? `<i class="fa-solid fa-user-tie"></i>` : `<i class="fa-solid fa-robot"></i>`;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  msg.innerHTML = `
    <div class="msg-avatar">${icon}</div>
    <div class="msg-bubble">
      ${formatMarkdownText(text)}
      <div class="msg-time">${time}</div>
    </div>
  `;

  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function formatMarkdownText(str) {
  let formatted = escapeHtml(str);
  // Bold
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  // Headers
  formatted = formatted.replace(/### (.*?)\n/g, '<h4 style="margin: 8px 0 4px; color: var(--accent-gold);">$1</h4>');
  // Lists
  formatted = formatted.replace(/• (.*?)\n/g, '<div style="margin-left: 10px;">• $1</div>');
  return formatted;
}

// --- Export Advisory Report ---
function initReportExport() {
  document.getElementById('export-report-btn').addEventListener('click', () => {
    const health = FinancialEngine.calculateHealthScore(state);
    const drift = FinancialEngine.calculatePortfolioDrift(state.currentAllocation, state.targetAllocation);
    const fire = FinancialEngine.calculateFIRE(state);
    const curr = state.currency;

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AuraFin Fiduciary Advisory Audit Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
          h1 { color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
          .section { margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
          .metric { font-size: 20px; font-weight: bold; color: #059669; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>AuraFin AI Wealth Management — Fiduciary Advisory Audit</h1>
        <p><b>Date:</b> ${new Date().toLocaleDateString()} | <b>Account Persona:</b> ${state.riskProfile ? state.riskProfile.label : 'Primary Account'}</p>
        
        <div class="section">
          <h2>1. Executive Summary & Health Index</h2>
          <p>Overall Financial Health Score: <span class="metric">${health.overallScore} / 100</span></p>
          <ul>
            <li>Monthly Net Income: ${curr}${state.income.toLocaleString()}</li>
            <li>Net Savings Rate: ${health.metrics.savingsRatePct}% (Net Surplus: ${curr}${(state.income - state.needs - state.wants).toLocaleString()})</li>
            <li>Emergency Buffer: ${health.metrics.monthsCovered} months of expenses (${curr}${state.liquidCash.toLocaleString()})</li>
            <li>Debt-to-Income Ratio: ${health.metrics.dtiRatioPct}%</li>
          </ul>
        </div>

        <div class="section">
          <h2>2. Portfolio Allocation & Rebalancing Audit</h2>
          <p>Drift Index: <b>${drift.totalDriftPct}%</b> (${drift.isRebalanceNeeded ? 'Rebalance Advised' : 'Within Tolerance'})</p>
          <table>
            <thead>
              <tr><th>Asset Class</th><th>Current %</th><th>Target %</th><th>Drift %</th><th>Trade Action</th></tr>
            </thead>
            <tbody>
              ${drift.details.map(d => `<tr><td>${d.name}</td><td>${d.currentPct}%</td><td>${d.targetPct}%</td><td>${d.diffPct}%</td><td>${d.action}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>3. FIRE Independence Roadmap</h2>
          <p>FIRE Target Capital (25x Annual Expenses): <b>${curr}${fire.fireTargetNumber.toLocaleString()}</b></p>
          <p>Projected Timeline to Independence: <b>${fire.yearsToFire} Years</b> (${fire.fireProgressPct}% complete)</p>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    win.document.write(reportHtml);
    win.document.close();
    win.print();
  });
}

// --- Settings Modal ---
function initSettingsModal() {
  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('open-settings-btn');
  const closeBtn = document.getElementById('close-settings-btn');
  const cancelBtn = document.getElementById('cancel-settings-btn');
  const saveBtn = document.getElementById('save-settings-btn');
  const resetBtn = document.getElementById('reset-data-btn');
  const keyInput = document.getElementById('gemini-api-key');
  const modelSelect = document.getElementById('gemini-model-select');

  keyInput.value = state.apiKey || '';
  modelSelect.value = state.model || 'gemini-1.5-flash';

  const updateApiStatusUI = () => {
    const dot = document.getElementById('api-status-dot');
    const txt = document.getElementById('api-status-text');
    if (state.apiKey && state.apiKey.trim() !== '') {
      dot.className = 'status-dot active';
      txt.textContent = `Gemini AI Active (${state.model.includes('pro') ? 'Pro' : 'Flash'})`;
    } else {
      dot.className = 'status-dot';
      txt.textContent = 'Internal AI Engine';
    }
  };

  updateApiStatusUI();

  openBtn.addEventListener('click', () => modal.classList.add('active'));
  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  cancelBtn.addEventListener('click', () => modal.classList.remove('active'));

  saveBtn.addEventListener('click', () => {
    state.apiKey = keyInput.value.trim();
    state.model = modelSelect.value;
    localStorage.setItem('aura_gemini_key', state.apiKey);
    localStorage.setItem('aura_gemini_model', state.model);
    updateApiStatusUI();
    modal.classList.remove('active');
  });

  resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all financial data to defaults?')) {
      localStorage.removeItem('aurafin_app_state');
      location.reload();
    }
  });
}

// --- Utility Helpers ---
function formatMoney(num) {
  return `${state.currency}${Number(num || 0).toLocaleString('en-US')}`;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
