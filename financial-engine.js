/**
 * AuraFin Financial Engine
 * Enterprise-grade financial calculation algorithms:
 * - Risk Capacity & Tolerance Assessment
 * - Strategic Asset Allocation Engine
 * - Portfolio Drift & Rebalancing Optimizer
 * - Stochastic Monte Carlo Wealth Projection Engine (1,000 simulations)
 * - Financial Health Index Scoring (0-100)
 * - FIRE & Retirement Goal Calculators
 */

const FinancialEngine = (() => {

  // --- Asset Class Standard Models ---
  const ASSET_CLASSES = {
    us_equity: { name: 'US Equities (S&P 500 / Total Mkt)', expReturn: 0.095, stdDev: 0.16, color: '#3b82f6' },
    intl_equity: { name: 'International & Emerging Equities', expReturn: 0.085, stdDev: 0.18, color: '#6366f1' },
    govt_bonds: { name: 'Government & Sovereign Debt', expReturn: 0.045, stdDev: 0.06, color: '#10b981' },
    corp_bonds: { name: 'Investment Grade Corporate Bonds', expReturn: 0.055, stdDev: 0.08, color: '#14b8a6' },
    real_estate: { name: 'REITs & Real Assets', expReturn: 0.075, stdDev: 0.14, color: '#f59e0b' },
    gold_commodities: { name: 'Gold & Commodities', expReturn: 0.05, stdDev: 0.15, color: '#ec4899' },
    cash: { name: 'Cash & Short-Term Money Market', expReturn: 0.035, stdDev: 0.01, color: '#94a3b8' }
  };

  // --- Risk Profile Matrix ---
  const RISK_PROFILES = {
    conservative: {
      label: 'Conservative Wealth Preserver',
      equityPct: 20,
      bondPct: 60,
      goldPct: 10,
      cashPct: 10,
      targetAllocation: { us_equity: 12, intl_equity: 8, govt_bonds: 40, corp_bonds: 20, gold_commodities: 10, cash: 10 },
      expReturn: 0.052,
      stdDev: 0.055,
      maxDrawdownEst: '-8% to -12%'
    },
    mod_conservative: {
      label: 'Moderately Conservative Income & Growth',
      equityPct: 40,
      bondPct: 45,
      goldPct: 5,
      cashPct: 10,
      targetAllocation: { us_equity: 26, intl_equity: 14, govt_bonds: 30, corp_bonds: 15, gold_commodities: 5, cash: 10 },
      expReturn: 0.064,
      stdDev: 0.082,
      maxDrawdownEst: '-12% to -18%'
    },
    moderate: {
      label: 'Balanced Moderate Growth',
      equityPct: 60,
      bondPct: 30,
      goldPct: 5,
      cashPct: 5,
      targetAllocation: { us_equity: 40, intl_equity: 20, govt_bonds: 20, corp_bonds: 10, gold_commodities: 5, cash: 5 },
      expReturn: 0.076,
      stdDev: 0.110,
      maxDrawdownEst: '-18% to -25%'
    },
    growth: {
      label: 'Aggressive Capital Growth',
      equityPct: 80,
      bondPct: 15,
      goldPct: 0,
      cashPct: 5,
      targetAllocation: { us_equity: 52, intl_equity: 28, govt_bonds: 10, corp_bonds: 5, gold_commodities: 0, cash: 5 },
      expReturn: 0.087,
      stdDev: 0.142,
      maxDrawdownEst: '-25% to -35%'
    },
    agg_growth: {
      label: 'Maximum Capital Accumulation',
      equityPct: 95,
      bondPct: 0,
      goldPct: 0,
      cashPct: 5,
      targetAllocation: { us_equity: 62, intl_equity: 33, govt_bonds: 0, corp_bonds: 0, gold_commodities: 0, cash: 5 },
      expReturn: 0.094,
      stdDev: 0.165,
      maxDrawdownEst: '-35% to -48%'
    }
  };

  /**
   * Assess Investor Risk Profile from Question Responses
   */
  function assessRiskProfile(answers) {
    let score = 0;
    score += (answers.horizon || 3) * 4;
    score += (answers.tolerance || 3) * 5;
    score += (answers.capacity || 3) * 4;
    score += (answers.experience || 3) * 3;
    score += (answers.reaction || 3) * 4;

    if (score <= 35) return { key: 'conservative', score, ...RISK_PROFILES.conservative };
    if (score <= 52) return { key: 'mod_conservative', score, ...RISK_PROFILES.mod_conservative };
    if (score <= 70) return { key: 'moderate', score, ...RISK_PROFILES.moderate };
    if (score <= 85) return { key: 'growth', score, ...RISK_PROFILES.growth };
    return { key: 'agg_growth', score, ...RISK_PROFILES.agg_growth };
  }

  /**
   * Calculate Comprehensive Financial Health Score (0-100)
   */
  function calculateHealthScore(state) {
    const monthlyIncome = state.income || 1;
    const monthlyExpenses = (state.needs || 0) + (state.wants || 0);
    const netSavings = monthlyIncome - monthlyExpenses;
    const savingsRate = Math.max(0, netSavings / monthlyIncome);
    
    // 1. Savings Rate Sub-score (0-100)
    let savingsScore = Math.min(100, (savingsRate / 0.20) * 100);

    // 2. Emergency Reserve Sub-score (0-100)
    const liquidCash = state.liquidCash || state.savings || 0;
    const monthlyNeedExp = state.needs || (monthlyExpenses * 0.7);
    const monthsCovered = monthlyNeedExp > 0 ? (liquidCash / monthlyNeedExp) : 0;
    let emergencyScore = 0;
    if (monthsCovered >= 6) emergencyScore = 100;
    else if (monthsCovered >= 3) emergencyScore = 70 + ((monthsCovered - 3) / 3) * 30;
    else emergencyScore = (monthsCovered / 3) * 70;

    // 3. Debt-to-Income (DTI) Sub-score (0-100)
    const monthlyDebt = state.monthlyDebt || (state.needs * 0.2) || 0;
    const dtiRatio = monthlyDebt / monthlyIncome;
    let dtiScore = 100;
    if (dtiRatio > 0.45) dtiScore = 20;
    else if (dtiRatio > 0.35) dtiScore = 50;
    else if (dtiRatio > 0.20) dtiScore = 80;
    else dtiScore = 100;

    // 4. Portfolio Allocation Alignment (0-100)
    const drift = calculatePortfolioDrift(state.currentAllocation, state.targetAllocation);
    let allocationScore = Math.max(30, 100 - (drift.totalDriftPct * 2));

    // 5. Goals On-Track Score (0-100)
    let goalsScore = 80;
    if (state.goals && state.goals.length > 0) {
      const avgProgress = state.goals.reduce((acc, g) => acc + Math.min(100, (g.current / g.target) * 100), 0) / state.goals.length;
      goalsScore = avgProgress;
    }

    // Weighted Overall Score
    const overallScore = Math.round(
      (emergencyScore * 0.25) +
      (savingsScore * 0.25) +
      (dtiScore * 0.20) +
      (allocationScore * 0.15) +
      (goalsScore * 0.15)
    );

    return {
      overallScore: Math.min(100, Math.max(10, overallScore)),
      metrics: {
        savingsRatePct: Math.round(savingsRate * 100),
        savingsScore: Math.round(savingsScore),
        monthsCovered: Number(monthsCovered.toFixed(1)),
        emergencyScore: Math.round(emergencyScore),
        dtiRatioPct: Math.round(dtiRatio * 100),
        dtiScore: Math.round(dtiScore),
        allocationDriftPct: Number(drift.totalDriftPct.toFixed(1)),
        allocationScore: Math.round(allocationScore),
        goalsScore: Math.round(goalsScore)
      }
    };
  }

  /**
   * Calculate Portfolio Allocation Drift & Rebalancing Trade Orders
   */
  function calculatePortfolioDrift(currentAlloc = {}, targetAlloc = {}) {
    const defaultTarget = RISK_PROFILES.moderate.targetAllocation;
    const target = Object.keys(targetAlloc).length ? targetAlloc : defaultTarget;
    
    const currentSum = Object.values(currentAlloc).reduce((a, b) => a + Number(b), 0) || 100;
    const normalizedCurrent = {};
    let totalDrift = 0;
    const details = [];

    Object.keys(ASSET_CLASSES).forEach(assetKey => {
      const currPct = Number(currentAlloc[assetKey] || 0);
      const currNormalized = (currPct / currentSum) * 100;
      const targPct = Number(target[assetKey] || 0);
      const diffPct = currNormalized - targPct;
      
      normalizedCurrent[assetKey] = Number(currNormalized.toFixed(1));
      totalDrift += Math.abs(diffPct);

      let action = 'HOLD';
      if (diffPct > 3) action = 'SELL / REBALANCE OUT';
      else if (diffPct < -3) action = 'BUY / REBALANCE IN';

      details.push({
        assetKey,
        name: ASSET_CLASSES[assetKey].name,
        currentPct: Number(currNormalized.toFixed(1)),
        targetPct: targPct,
        diffPct: Number(diffPct.toFixed(1)),
        action
      });
    });

    return {
      totalDriftPct: totalDrift / 2,
      isRebalanceNeeded: (totalDrift / 2) > 5,
      details
    };
  }

  /**
   * Run Stochastic Monte Carlo Simulation (1,000 paths)
   */
  function runMonteCarloSimulation(params) {
    const {
      initialPortfolio = 50000,
      monthlyContribution = 1000,
      years = 20,
      annualReturn = 0.08,
      annualStdDev = 0.12,
      inflationRate = 0.025,
      numSimulations = 1000
    } = params;

    const realReturn = (1 + annualReturn) / (1 + inflationRate) - 1;
    const monthlyReturn = realReturn / 12;
    const monthlyStdDev = annualStdDev / Math.sqrt(12);
    const months = years * 12;

    const simulationResults = [];
    const yearlyTrajectories = Array.from({ length: years + 1 }, () => []);

    for (let sim = 0; sim < numSimulations; sim++) {
      let currentVal = initialPortfolio;
      yearlyTrajectories[0].push(currentVal);

      for (let m = 1; m <= months; m++) {
        const u1 = Math.random() || 0.00001;
        const u2 = Math.random() || 0.00001;
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

        const randReturn = monthlyReturn + monthlyStdDev * z;
        currentVal = (currentVal + monthlyContribution) * (1 + randReturn);

        if (m % 12 === 0) {
          const yearIndex = m / 12;
          yearlyTrajectories[yearIndex].push(currentVal);
        }
      }
      simulationResults.push(currentVal);
    }

    const percentileTrajectories = {
      p10: [],
      p50: [],
      p90: [],
      labels: []
    };

    for (let y = 0; y <= years; y++) {
      percentileTrajectories.labels.push(`Year ${y}`);
      const yearValues = yearlyTrajectories[y].sort((a, b) => a - b);
      
      const p10Idx = Math.floor(numSimulations * 0.10);
      const p50Idx = Math.floor(numSimulations * 0.50);
      const p90Idx = Math.floor(numSimulations * 0.90);

      percentileTrajectories.p10.push(Math.round(yearValues[p10Idx]));
      percentileTrajectories.p50.push(Math.round(yearValues[p50Idx]));
      percentileTrajectories.p90.push(Math.round(yearValues[p90Idx]));
    }

    const sortedFinal = simulationResults.sort((a, b) => a - b);
    const medianFinal = sortedFinal[Math.floor(numSimulations * 0.50)];
    const p10Final = sortedFinal[Math.floor(numSimulations * 0.10)];
    const p90Final = sortedFinal[Math.floor(numSimulations * 0.90)];

    return {
      percentileTrajectories,
      summary: {
        medianFinal: Math.round(medianFinal),
        pessimisticP10: Math.round(p10Final),
        optimisticP90: Math.round(p90Final),
        totalContributed: Math.round(initialPortfolio + (monthlyContribution * 12 * years)),
        expectedInflationAdjValue: Math.round(medianFinal)
      }
    };
  }

  /**
   * FIRE (Financial Independence, Retire Early) Calculation
   */
  function calculateFIRE(state) {
    const annualExpenses = (state.needs + state.wants) * 12;
    const fireTargetNumber = annualExpenses * 25;
    const currentWealth = state.netWorth || (state.savingsGoalTotal || 25000);
    const monthlySavings = state.income - (state.needs + state.wants);
    const expAnnualReturn = 0.07;

    let current = currentWealth;
    let monthsToFire = 0;
    const maxMonths = 600;

    while (current < fireTargetNumber && monthsToFire < maxMonths && monthlySavings > 0) {
      current = (current + monthlySavings) * (1 + (expAnnualReturn / 12));
      monthsToFire++;
    }

    const yearsToFire = Number((monthsToFire / 12).toFixed(1));
    const fireProgressPct = Math.min(100, Math.round((currentWealth / fireTargetNumber) * 100));

    return {
      annualExpenses,
      fireTargetNumber: Math.round(fireTargetNumber),
      currentWealth,
      yearsToFire: monthsToFire >= maxMonths ? '30+' : yearsToFire,
      fireProgressPct
    };
  }

  return {
    ASSET_CLASSES,
    RISK_PROFILES,
    assessRiskProfile,
    calculateHealthScore,
    calculatePortfolioDrift,
    runMonteCarloSimulation,
    calculateFIRE
  };

})();
