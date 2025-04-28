const axios = require('axios');

const RD_API_URL = 'https://api.real-debrid.com/rest/1.0';

const realdebrid = {
    /**
     * Kontroluje, zda je poskytnutý Real-Debrid API klíč platný
     * @param {string} apiKey - Real-Debrid API klíč
     * @returns {Promise<boolean>} - Zda je klíč platný
     */
    validateApiKey: async (apiKey) => {
        if (!apiKey) return false;
        
        try {
            const response = await axios.get(`${RD_API_URL}/user`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            return response.status === 200;
        } catch (error) {
            console.error('Chyba při validaci Real-Debrid API klíče:', error.message);
            return false;
        }
    },

    /**
     * Získá přímý odkaz ke stažení z Real-Debrid po odeslání webshare odkazu
     * @param {string} url - Webshare URL
     * @param {string} apiKey - Real-Debrid API klíč
     * @returns {Promise<string|null>} - Direct download URL nebo null při chybě
     */
    getDirectLink: async (url, apiKey) => {
        try {
            // Krok 1: Ověřit URL
            const checkResponse = await axios.post(`${RD_API_URL}/unrestrict/check`, 
                `link=${encodeURIComponent(url)}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (!checkResponse.data.supported) {
                console.error('Odkaz není podporován Real-Debrid');
                return null;
            }

            // Krok 2: Získat přímý odkaz
            const unrestrictResponse = await axios.post(`${RD_API_URL}/unrestrict/link`, 
                `link=${encodeURIComponent(url)}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (unrestrictResponse.data && unrestrictResponse.data.download) {
                return unrestrictResponse.data.download;
            } else {
                console.error('Real-Debrid nevrátil odkaz ke stažení');
                return null;
            }
        } catch (error) {
            console.error('Chyba při získávání odkazu z Real-Debrid:', error.message);
            return null;
        }
    }
};

module.exports = realdebrid;