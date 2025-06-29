const API_KEY = 'efbd0e2783ba9dd21b2cb4bb';
const BASE_URL = 'https://v6.exchangerate-api.com/v6';

interface ExchangeRateResponse {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: Record<string, number>;
}

interface ConversionResult {
  convertedAmount: number;
  conversionRate: number;
  originalAmount: number;
  originalCurrency: string;
  targetCurrency: string;
}

export default class CurrencyExchange {
  private static cache: Map<string, { rate: number; timestamp: number }> = new Map();
  private static readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

  /**
   * Get exchange rate from one currency to another
   */
  static async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    // If currencies are the same, rate is 1
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const cacheKey = `${fromCurrency}-${toCurrency}`;
    const cachedData = this.cache.get(cacheKey);
    
    // Check if we have cached data that's still valid
    if (cachedData && (Date.now() - cachedData.timestamp) < this.CACHE_DURATION) {
      return cachedData.rate;
    }

    try {
      const response = await fetch(`${BASE_URL}/${API_KEY}/latest/${fromCurrency}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ExchangeRateResponse = await response.json();
      
      if (data.result !== 'success') {
        throw new Error('API request failed');
      }

      const rate = data.conversion_rates[toCurrency];
      
      if (!rate) {
        throw new Error(`Exchange rate not found for ${toCurrency}`);
      }

      // Cache the result
      this.cache.set(cacheKey, {
        rate,
        timestamp: Date.now()
      });

      return rate;
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      
      // If we have cached data (even if expired), use it as fallback
      if (cachedData) {
        console.warn('Using expired cached exchange rate as fallback');
        return cachedData.rate;
      }
      
      throw error;
    }
  }

  /**
   * Convert amount from one currency to another
   */
  static async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ConversionResult> {
    try {
      const conversionRate = await this.getExchangeRate(fromCurrency, toCurrency);
      const convertedAmount = amount * conversionRate;

      return {
        convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
        conversionRate,
        originalAmount: amount,
        originalCurrency: fromCurrency,
        targetCurrency: toCurrency
      };
    } catch (error) {
      console.error('Currency conversion failed:', error);
      throw new Error('Failed to convert currency. Please try again.');
    }
  }

  /**
   * Get multiple exchange rates for a base currency
   */
  static async getMultipleRates(baseCurrency: string, targetCurrencies: string[]): Promise<Record<string, number>> {
    try {
      const response = await fetch(`${BASE_URL}/${API_KEY}/latest/${baseCurrency}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ExchangeRateResponse = await response.json();
      
      if (data.result !== 'success') {
        throw new Error('API request failed');
      }

      const rates: Record<string, number> = {};
      
      targetCurrencies.forEach(currency => {
        if (currency === baseCurrency) {
          rates[currency] = 1;
        } else if (data.conversion_rates[currency]) {
          rates[currency] = data.conversion_rates[currency];
        }
      });

      return rates;
    } catch (error) {
      console.error('Error fetching multiple exchange rates:', error);
      throw error;
    }
  }

  /**
   * Clear the exchange rate cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size (for debugging)
   */
  static getCacheSize(): number {
    return this.cache.size;
  }
}