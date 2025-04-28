const axios = require('axios');

const RD_API_URL = 'https://api.real-debrid.com/rest/1.0';

// Přidán custom User-Agent a timeout pro lepší stabilitu HTTP požadavků
const axiosConfig = {
    timeout: 15000, // 15 sekund timeout
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
};

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
                ...axiosConfig,
                headers: {
                    ...axiosConfig.headers,
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
        if (!url || !apiKey) {
            console.error('Chybí URL nebo API klíč pro Real-Debrid');
            return null;
        }

        const MAX_RETRIES = 2;
        let attempts = 0;

        while (attempts < MAX_RETRIES) {
            attempts++;
            try {
                // Krok 1: Ověřit URL
                console.log(`Real-Debrid: Kontrola URL (pokus ${attempts})`);
                const checkResponse = await axios.post(`${RD_API_URL}/unrestrict/check`, 
                    `link=${encodeURIComponent(url)}`, {
                    ...axiosConfig,
                    headers: {
                        ...axiosConfig.headers,
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });

                if (!checkResponse.data || !checkResponse.data.supported) {
                    console.error('Odkaz není podporován Real-Debrid:', url);
                    return null;
                }

                // Krok 2: Získat přímý odkaz
                console.log('Real-Debrid: Získávání přímého odkazu');
                const unrestrictResponse = await axios.post(`${RD_API_URL}/unrestrict/link`, 
                    `link=${encodeURIComponent(url)}`, {
                    ...axiosConfig,
                    headers: {
                        ...axiosConfig.headers,
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });

                if (unrestrictResponse.data && unrestrictResponse.data.download) {
                    const directUrl = unrestrictResponse.data.download;
                    
                    // Ověření, že URL je dostupná
                    try {
                        console.log('Real-Debrid: Ověření přímého odkazu');
                        const verifyResponse = await axios.head(directUrl, {
                            ...axiosConfig,
                            validateStatus: function (status) {
                                // Akceptujeme i 302 přesměrování
                                return status >= 200 && status < 400;
                            }
                        });
                        
                        // Zkontrolujeme MIME typ (pokud je k dispozici)
                        const contentType = verifyResponse.headers['content-type'];
                        
                        // Přidáme informace o streamu
                        let streamInfo = {
                            url: directUrl,
                            // Pokud máme informace o kvalitě, přidáme je
                            quality: unrestrictResponse.data.streamable === 1 ? 'streamable' : undefined,
                            // Nastavení MIME typu pro lepší kompatibilitu se Stremio
                            contentType: contentType || 
                                (directUrl.toLowerCase().endsWith('.mp4') ? 'video/mp4' : 'video/x-matroska')
                        };
                        
                        console.log(`Real-Debrid: Získán odkaz: ${directUrl.substring(0, 50)}...`);
                        return streamInfo;
                    } catch (verifyError) {
                        console.error('Ověření Real-Debrid odkazu selhalo:', verifyError.message);
                        // Budeme to zkusit znovu, pokud jsou ještě pokusy k dispozici
                    }
                } else {
                    console.error('Real-Debrid nevrátil odkaz ke stažení');
                }
            } catch (error) {
                console.error(`Chyba při získávání odkazu z Real-Debrid (pokus ${attempts}):`, error.message);
            }
            
            if (attempts < MAX_RETRIES) {
                // Počkáme před dalším pokusem (exponential backoff)
                const delay = attempts * 2000;
                console.log(`Čekání ${delay}ms před dalším pokusem`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        console.error(`Vyčerpány všechny pokusy (${MAX_RETRIES}) pro získání Real-Debrid odkazu`);
        return null;
    }
};

module.exports = realdebrid;