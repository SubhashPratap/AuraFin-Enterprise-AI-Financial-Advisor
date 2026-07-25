/**
 * AuraFin AI Advisor Module
 * Provides context-aware financial advisory intelligence using Google Gemini API
 * with an enterprise local rule-based advisor fallback.
 */

const AiAdvisor = (() => {

  /**
   * Constructs rich system context from current application state
   * @param {Object} state - Full app state including health, goals, risk, portfolio
   * @returns {String} Formatted institutional context string
   */
  function buildFinancialContext(state) {
    const health = FinancialEngine.calculateHealthScore(state);
    const drift = FinancialEngine.calculatePortfolioDrift(state.currentAllocation, state.targetAllocation);
    const fire = FinancialEngine.calculateFIRE(state);
    const currency = state.currency || '$';

    const goalSummary = (state.goals || []).map(g => 
      `- ${g.name}: Target ${currency}${g.target.toLocaleString()} (Current: ${currency}${g.current.toLocaleString()}, ${Math.round((g.current/g.target)*100)}% complete)`
    ).join('\n') || 'None specified.';

    const currentAllocStr = Object.entries(state.currentAllocation || {})
      .map(([k, v]) => `${k.replace('_', ' ')}: ${v}%`).join(', ') || 'Not set';

    return `
[INSTITUTIONAL CLIENT FINANCIAL PROFILE]
- Currency: ${currency}
- Net Monthly Income: ${currency}${state.income.toLocaleString()}
- Essential Expenses (Needs): ${currency}${state.needs.toLocaleString()}
- Discretionary Expenses (Wants): ${currency}${state.wants.toLocaleString()}
- Net Monthly Surplus: ${currency}${(state.income - state.needs - state.wants).toLocaleString()}
- Total Net Worth: ${currency}${(state.netWorth || 0).toLocaleString()}
- Financial Health Score: ${health.overallScore}/100
- Emergency Buffer: ${health.metrics.monthsCovered} months of expenses
- Debt-to-Income (DTI): ${health.metrics.dtiRatioPct}%
- Investor Risk Profile: ${state.riskProfile ? state.riskProfile.label : 'Moderate Balanced'} (Score: ${state.riskProfile ? state.riskProfile.score : 50}/100)
- Current Portfolio Allocation: ${currentAllocStr}
- Portfolio Drift Index: ${drift.totalDriftPct}% (${drift.isRebalanceNeeded ? 'REBALANCE RECOMMENDED' : 'WITHIN TOLERANCE'})
- FIRE Progress: Target ${currency}${fire.fireTargetNumber.toLocaleString()} (${fire.fireProgressPct}% complete, ~${fire.yearsToFire} years)
- Active Financial Goals:
${goalSummary}

[INSTRUCTIONS]
Act as AuraFin Senior Institutional AI Wealth Advisor. Provide highly structured, actionable, quantitative financial analysis tailored specifically to this client's metrics. Be objective, professional, and clear. Use bullet points and strategic recommendations.
`;
  }

  /**
   * Process user query via Gemini API or Local Advisory Engine
   */
  async function queryAdvisor(userPrompt, state) {
    const context = buildFinancialContext(state);

    if (state.apiKey && state.apiKey.trim() !== '') {
      try {
        return await callGeminiApi(userPrompt, context, state);
      } catch (err) {
        console.warn('Gemini API call failed, falling back to internal advisory engine:', err);
        return getLocalAdvisoryReply(userPrompt, state);
      }
    } else {
      return getLocalAdvisoryReply(userPrompt, state);
    }
  }

  /**
   * Gemini 1.5 REST API Integration
   */
  async function callGeminiApi(userPrompt, context, state) {
    const model = state.model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${state.apiKey.trim()}`;

    const promptText = `${context}\n\n[USER QUERY]\n${userPrompt}`;

    const payload = {
      contents: [{
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `API HTTP Error ${response.status}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Malformed API response structure');
    }
  }

  /**
   * Built-in Enterprise Local Advisory Engine
   * Provides dynamic, context-infused replies when offline or without API key
   */
  function getLocalAdvisoryReply(query, state) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const q = query.toLowerCase();
        const currency = state.currency || '$';
        const health = FinancialEngine.calculateHealthScore(state);
        const drift = FinancialEngine.calculatePortfolioDrift(state.currentAllocation, state.targetAllocation);
        const fire = FinancialEngine.calculateFIRE(state);

        let reply = '';

        if (q.includes('health') || q.includes('score') || q.includes('audit')) {
          reply = `### 📊 Holistic Financial Health Assessment

**Overall Health Index: ${health.overallScore} / 100** Rating: ${health.overallScore >= 80 ? '🌟 Excellent' : health.overallScore >= 60 ? '⚡ Solid' : '⚠️ Action Needed'}

**Key Diagnostic Metrics:**
1. **Emergency Buffer**: ${health.metrics.monthsCovered} Months covered (${health.metrics.monthsCovered >= 6 ? 'Optimal reserve' : 'Below 6-month benchmark'}).
2. **Net Savings Rate**: ${health.metrics.savingsRatePct}% of monthly income (Target: ≥ 20%).
3. **Debt-to-Income Ratio**: ${health.metrics.dtiRatioPct}% (Target: < 30%).
4. **Portfolio Allocation Drift**: ${drift.totalDriftPct}% (${drift.isRebalanceNeeded ? '⚠️ Rebalance advised' : '✅ Well aligned'}).

**Strategic Recommendation:**
- ${health.metrics.monthsCovered < 6 ? `Prioritize accumulating ${currency}${((6 - health.metrics.monthsCovered) * state.needs).toLocaleString()} into liquid high-yield cash reserves.` : 'Maintain regular automatic transfers to index portfolios.'}`;
        }
        else if (q.includes('rebalance') || q.includes('allocation') || q.includes('portfolio') || q.includes('drift')) {
          reply = `### ⚖️ Portfolio Rebalancing Brief

**Current Drift Index:** ${drift.totalDriftPct}% | **Status:** ${drift.isRebalanceNeeded ? 'Action Required' : 'Optimal Alignment'}

**Asset Allocation Breakdown:**
${drift.details.map(d => `• **${d.name}**: Current ${d.currentPct}% vs Target ${d.targetPct}% (${d.diffPct > 0 ? '+' : ''}${d.diffPct}%) → **${d.action}**`).join('\n')}

**Execution Strategy:**
1. Direct new monthly surplus (${currency}${(state.income - state.needs - state.wants).toLocaleString()}) to underweighted asset classes to minimize tax triggers.
2. Maintain annual rebalancing thresholds (+/- 5% drift boundary).`;
        }
        else if (q.includes('fire') || q.includes('retire') || q.includes('freedom')) {
          reply = `### 🚀 FIRE (Financial Independence) Roadmap

- **Target FIRE Capital (25x Annual Expenses):** ${currency}${fire.fireTargetNumber.toLocaleString()}
- **Current Capital Base:** ${currency}${fire.currentWealth.toLocaleString()} (${fire.fireProgressPct}% achieved)
- **Projected Time to Independence:** **~${fire.yearsToFire} years**

**Optimization Levers:**
1. Increasing monthly savings rate by 5% accelerates independence by approximately 3.2 years.
2. Maintain tax-advantaged account contributions (Roth / Traditional IRA / 401k / NPS / PPF).`;
        }
        else if (q.includes('tax') || q.includes('loss') || q.includes('harvest')) {
          reply = `### 🏛️ Tax Optimization & Loss Harvesting Strategy

1. **Tax-Loss Harvesting (TLH):** Realize capital losses in taxable brokerage accounts to offset capital gains and up to $3,000 / ₹50,000 of ordinary income annually.
2. **Asset Location Optimization:** Place high-yield corporate bonds and REITs inside tax-sheltered accounts while holding broad index equity ETFs in taxable accounts.
3. **Automate Dividend Reinvestment (DRIP):** Ensure compounding efficiency without generating premature taxable cash distributions.`;
        }
        else if (q.includes('crash') || q.includes('drop') || q.includes('stress') || q.includes('bear')) {
          reply = `### 📉 Market Stress Test Analysis (-20% Downside Scenario)

**Simulated Portfolio Impact:**
- Estimated Drawdown on Current Allocation: **${state.riskProfile ? state.riskProfile.maxDrawdownEst : '-18% to -25%'}**
- Projected Temporary Portfolio Value Adjustment: ${currency}${Math.round((state.netWorth || 25000) * 0.82).toLocaleString()}

**Action Protocol During Volatility:**
1. **Do NOT panic sell**: Rebalancing during bear markets automatically executes "buy low" principles.
2. **Emergency Buffer Guard**: Your ${health.metrics.monthsCovered}-month cash reserve ensures you do not need to liquidate equity positions at distressed valuations.`;
        }
        else {
          reply = `### 💡 Strategic Advisory Response for: "${query}"

**Client Financial Snapshot Summary:**
- **Income:** ${currency}${state.income.toLocaleString()} | **Savings Rate:** ${health.metrics.savingsRatePct}%
- **Health Score:** ${health.overallScore}/100 | **Risk Profile:** ${state.riskProfile ? state.riskProfile.label : 'Moderate'}

**Recommended Next Steps:**
1. Rebalance any asset classes exceeding a 5% allocation drift index.
2. Maintain continuous dollar-cost averaging into broad-market index funds.
3. Review your target goals timeline annually to adjust risk capacity as target dates approach.`;
        }

        resolve(reply);
      }, 700);
    });
  }

  return {
    buildFinancialContext,
    queryAdvisor
  };

})();
