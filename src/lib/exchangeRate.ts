/**
 * Simple exchange rate service
 */

const CACHE_KEY = 'wabi_exchange_rates';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

interface RateCache {
  timestamp: number;
  rates: Record<string, number>;
}

export async function getExchangeRate(from: string, to: string = 'TWD'): Promise<number> {
  if (from === to) return 1;

  try {
    // Try to get from cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data: RateCache = JSON.parse(cached);
      if (Date.now() - data.timestamp < CACHE_DURATION && data.rates[from]) {
        // Since we fetch rates for TWD, we need to invert if needed
        // The API we'll use returns 1 [BASE] = X [TARGET]
        // If we fetch for [from], and target is TWD, we get 1 [from] = X [TWD]
        return data.rates[from];
      }
    }

    // Refresh rates
    // Using a public API that doesn't require a key for basic usage
    // This returns 1 USD = X ...
    const response = await fetch(`https://open.er-api.com/v6/latest/${from}`);
    const data = await response.json();
    
    if (data.result === 'success' && data.rates[to]) {
      const rate = data.rates[to];
      
      // Update cache (optional: could store more rates here)
      const newCache: RateCache = {
        timestamp: Date.now(),
        rates: {
          ...JSON.parse(localStorage.getItem(CACHE_KEY) || '{"rates":{}}').rates,
          [from]: rate
        }
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(newCache));
      
      return rate;
    }
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
  }

  // Fallbacks if API fails
  const fallbacks: Record<string, number> = {
    'USD': 32.5,
    'JPY': 0.21,
    'EUR': 35.0,
    'TWD': 1
  };
  
  return fallbacks[from] || 1;
}
