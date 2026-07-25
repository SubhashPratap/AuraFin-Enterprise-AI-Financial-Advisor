/**
 * AuraFin Live Market Data & Currency Exchange Rate API Client
 * Connects to live financial APIs to provide real-time FX exchange rates
 * and market indices in the AuraFin platform interface.
 */

const MarketApi = (() => {
  let liveRates = {
    USD: 1,
    INR: 83.5,
    EUR: 0.92,
    GBP: 0.78,
    JPY: 155.2
  };
  let lastUpdated = null;

  /**
   * Fetch live FX exchange rates from public API or internal REST endpoint
   */
  async function fetchLiveRates() {
    try {
      // Try local REST API endpoint first, fallback to direct open API
      let response = await fetch('/api/v1/market-rates').catch(() => null);

      if (!response || !response.ok) {
        response = await fetch('https://open.er-api.com/v6/latest/USD');
      }

      if (response && response.ok) {
        const data = await response.json();
        const rates = data.marketData?.rates || data.rates;
        if (rates) {
          liveRates = {
            USD: 1,
            INR: rates.INR || 83.5,
            EUR: rates.EUR || 0.92,
            GBP: rates.GBP || 0.78,
            JPY: rates.JPY || 155.2
          };
          lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          updateMarketTickerUI();
          return liveRates;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch live FX rates, using standard baseline rates:', err);
    }
    updateMarketTickerUI();
    return liveRates;
  }

  /**
   * Render Live Market Rates Ticker Badge in the Top Header
   */
  function updateMarketTickerUI() {
    const badge = document.getElementById('live-market-badge');
    if (!badge) return;

    badge.innerHTML = `
      <i class="fa-solid fa-chart-line market-pulse-icon"></i>
      <span class="market-label">FX LIVE:</span>
      <span class="rate-item">$1 = ₹${liveRates.INR.toFixed(1)} INR</span>
      <span class="rate-divider">•</span>
      <span class="rate-item">€${liveRates.EUR.toFixed(2)} EUR</span>
      <span class="rate-divider">•</span>
      <span class="rate-item">£${liveRates.GBP.toFixed(2)} GBP</span>
      ${lastUpdated ? `<span class="update-time">(${lastUpdated})</span>` : ''}
    `;
  }

  /**
   * Convert value between currencies based on live rates
   */
  function convert(amount, fromSymbol, toSymbol) {
    const symbolToCode = { '$': 'USD', '₹': 'INR', '€': 'EUR', '£': 'GBP' };
    const fromCode = symbolToCode[fromSymbol] || 'USD';
    const toCode = symbolToCode[toSymbol] || 'USD';

    // Convert to USD base first, then to target currency
    const amountInUSD = amount / (liveRates[fromCode] || 1);
    return Math.round(amountInUSD * (liveRates[toCode] || 1));
  }

  return {
    fetchLiveRates,
    convert,
    getRates: () => liveRates
  };
})();

// Auto-initialize market rates on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  MarketApi.fetchLiveRates();
  // Refresh rates every 5 minutes
  setInterval(MarketApi.fetchLiveRates, 300000);
});
