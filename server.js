/**
 * AuraFin Enterprise REST API & Web Server
 * Serves the AuraFin web platform and provides programmatic REST API endpoints
 * for financial analytics, live FX market rates, and AI advisory intelligence.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend assets
app.use(express.static(__dirname));

// Live Exchange Rate Cache (1 Hour TTL)
let ratesCache = {
  timestamp: 0,
  data: null
};

/**
 * Helper to fetch live FX rates from public ExchangeRate API
 */
function fetchExchangeRates() {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    if (ratesCache.data && (now - ratesCache.timestamp < 3600000)) {
      return resolve(ratesCache.data);
    }

    https.get('https://open.er-api.com/v6/latest/USD', (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.result === 'success') {
            ratesCache = {
              timestamp: now,
              data: {
                base: 'USD',
                rates: {
                  USD: 1,
                  INR: parsed.rates.INR || 83.5,
                  EUR: parsed.rates.EUR || 0.92,
                  GBP: parsed.rates.GBP || 0.78,
                  JPY: parsed.rates.JPY || 155.2,
                  CAD: parsed.rates.CAD || 1.36,
                  AUD: parsed.rates.AUD || 1.51
                },
                last_updated: parsed.time_last_update_utc
              }
            };
            resolve(ratesCache.data);
          } else {
            throw new Error('Exchange rate API error');
          }
        } catch (e) {
          resolve(getFallbackRates());
        }
      });
    }).on('error', () => resolve(getFallbackRates()));
  });
}

function getFallbackRates() {
  return {
    base: 'USD',
    rates: { USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.78, JPY: 155.2, CAD: 1.36, AUD: 1.51 },
    last_updated: new Date().toUTCString(),
    fallback: true
  };
}

// --- API ENDPOINTS ---

/**
 * GET /api/v1/health
 * API Health Check & System Info
 */
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'AuraFin AI Financial Advisor REST API',
    version: '1.1.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/v1/market-rates
 * Fetch Live FX Currency Exchange Rates
 */
app.get('/api/v1/market-rates', async (req, res) => {
  try {
    const rates = await fetchExchangeRates();
    res.json({ success: true, marketData: rates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/analyze
 * Comprehensive Financial Metrics Engine REST API
 */
app.post('/api/v1/analyze', (req, res) => {
  const { income = 10000, needs = 5000, wants = 2000, currentAllocation, targetAllocation, netWorth = 150000 } = req.body;

  const totalExpenses = Number(needs) + Number(wants);
  const monthlySurplus = Number(income) - totalExpenses;
  const savingsRatePct = Math.round((monthlySurplus / (Number(income) || 1)) * 100);
  const monthsCovered = Math.round(((Number(netWorth) * 0.2) / (totalExpenses || 1)) * 10) / 10;

  // Health Score Calculation
  let overallScore = 50;
  if (savingsRatePct >= 20) overallScore += 25;
  else if (savingsRatePct >= 10) overallScore += 15;

  if (monthsCovered >= 6) overallScore += 25;
  else if (monthsCovered >= 3) overallScore += 15;

  // FIRE Calculation (25x annual expenses rule)
  const annualExpenses = totalExpenses * 12;
  const fireTargetNumber = annualExpenses * 25;
  const fireProgressPct = Math.min(100, Math.round((Number(netWorth) / (fireTargetNumber || 1)) * 100));
  const annualSurplus = monthlySurplus * 12;
  const remainingFireGoal = Math.max(0, fireTargetNumber - Number(netWorth));
  const yearsToFire = annualSurplus > 0 ? Math.round((remainingFireGoal / annualSurplus) * 10) / 10 : 99;

  res.json({
    success: true,
    metrics: {
      income: Number(income),
      monthlyExpenses: totalExpenses,
      monthlySurplus,
      savingsRatePct,
      monthsEmergencyFund: monthsCovered,
      healthScore: overallScore
    },
    fireAnalytics: {
      fireTargetNumber,
      fireProgressPct,
      yearsToIndependence: yearsToFire
    }
  });
});

/**
 * Fallback route serving main web app
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 AuraFin Server & REST API running on port ${PORT}`);
  console.log(`📍 Web App: http://localhost:${PORT}`);
  console.log(`📡 REST API Health: http://localhost:${PORT}/api/v1/health`);
  console.log(`📊 Live Market Rates API: http://localhost:${PORT}/api/v1/market-rates`);
});
