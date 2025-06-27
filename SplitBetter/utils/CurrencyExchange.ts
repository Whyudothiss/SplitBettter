// const BASE_URL = 'https://api.exchangerate.host';

// export const currencyService = {
//   async getConversionRate(from: string, to: string): Promise<number> {
//     const url = `${BASE_URL}/convert?from=${from}&to=${to}&amount=1`;
//     const response = await fetch(url);
//     const data = await response.json();

//     if (!data || typeof data.result !== 'number') {
//       throw new Error('Invalid response format: missing result');
//     }

//     return data.result; // This is the rate from 'from' to 'to'
//   },

//   async convertCurrency(amount: number, from: string, to: string): Promise<number> {
//     const rate = await this.getConversionRate(from, to);
//     return amount * rate;
//   },
// };

// currencyService.js (or .ts)
export const currencyService = {
    // Fetch the conversion rate from an API (e.g., ExchangeRate-API or similar)
    getConversionRate: async (fromCurrency: string, toCurrency: string): Promise<number> => {
      try {
        // Example API URL (replace with your actual API URL)
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
        
        // Check if the response is valid
        if (!response.ok) {
          throw new Error(`Failed to fetch conversion rate: ${response.statusText}`);
        }
  
        // Parse the response as JSON
        const data = await response.json();
  
        // Check if the 'rates' object and target currency are available in the response
        if (!data || !data.rates || !data.rates[toCurrency]) {
          throw new Error(`Conversion rate not found for ${fromCurrency} to ${toCurrency}`);
        }
  
        // Return the conversion rate for the target currency
        return data.rates[toCurrency];
      } catch (error) {
        // Log the error and rethrow it to be handled by the calling function
        console.error('Error fetching conversion rate:', error);
        throw error;  // Rethrow error so it can be handled by the calling component
      }
    },
  
    // Convert a given amount from one currency to another
    convertCurrency: async (amount: number, fromCurrency: string, toCurrency: string): Promise<number> => {
      try {
        // Get the conversion rate
        const rate = await currencyService.getConversionRate(fromCurrency, toCurrency);
  
        // If the rate is valid, return the converted amount
        if (rate) {
          const convertedAmount = amount * rate;
          return convertedAmount;
        }
  
        // If no rate found, throw an error
        throw new Error('Invalid conversion rate');
      } catch (error) {
        // Log the error and rethrow it to be handled by the calling function
        console.error('Currency conversion error:', error);
        throw error;  // Rethrow error to be handled in the calling component
      }
    }
  };
  