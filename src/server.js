#!/usr/bin/env node

// Získáme Stremio addon SDK
const { serveHTTP } = require("stremio-addon-sdk");
const addonInterface = require("./addon");

// HTML pro hlavní stránku
const landingHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Webshare Stremio Addon</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; }
        .btn { display: inline-block; background: #3498db; color: white; padding: 10px 15px; 
               text-decoration: none; border-radius: 4px; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Webshare Stremio Addon s Real-Debrid podporou</h1>
    <p>Tento addon umožňuje streamování filmů a seriálů z Webshare.cz s podporou Real-Debrid.</p>
    <p>Pro instalaci do Stremio použijte následující URL:</p>
    <code id="manifest-url">MANIFEST_URL</code><br><br>
    <a id="install-btn" class="btn" href="#">Nainstalovat do Stremio</a>
    
    <script>
        const baseUrl = window.location.origin;
        const manifestUrl = baseUrl + '/manifest.json';
        document.getElementById('manifest-url').textContent = manifestUrl;
        document.getElementById('install-btn').href = 'stremio://addon/' + manifestUrl;
    </script>
</body>
</html>
`;

// Upravený addonInterface s vlastním landingPage
const addonWithLanding = {
    ...addonInterface,
    landingTemplate: landingHTML
};

// Port je kriticky důležitý pro Heroku
const port = process.env.PORT || 7000;

// Použijeme serveHTTP z SDK - nejjednodušší a nejspolehlivější způsob
serveHTTP(addonWithLanding, { 
    port: port,
    host: '0.0.0.0',  // Důležité pro Heroku
    static: __dirname + '/public', // Pro statické soubory
    logRequests: true, // Pro lepší debugování
    cache: { max: 1000, maxAge: 3600 * 1000 } // Nastavení cache
});

console.log(`Server běží na portu ${port}`);
console.log(`Adresa pro Stremio: http://localhost:${port}/manifest.json`);

// Zachytávání chyb
process.on('uncaughtException', (err) => {
  console.error('Neošetřená výjimka:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Neošetřené promise rejection:', reason);
});
