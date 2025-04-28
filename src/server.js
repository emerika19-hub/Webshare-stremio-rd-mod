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

// Rozšíříme addonInterface o vlastní obsluhu routy pro kořenový endpoint
const expandedAddonInterface = Object.assign({}, addonInterface);

// Přepíšeme původní middleware funkci, abychom mohli obsloužit i kořenovou cestu
const originalMiddleware = expandedAddonInterface.middleware || ((req, res, next) => { next(); });
expandedAddonInterface.middleware = (req, res, next) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;
        
        // Pouze pro debugging - logujeme všechny požadavky
        console.log(`Požadavek: ${req.method} ${pathname}`);
        
        // Pro kořenový adresář nebo 404 stránku vrátíme naši HTML stránku
        if (pathname === '/' || pathname === '/index.html' || pathname === '/404') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(landingHTML);
            return;
        }
        
        // Health check endpoint pro Render.com
        if (pathname === '/health' || pathname === '/healthz' || pathname === '/healthcheck') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                status: 'ok', 
                version: '0.3.0',
                uptime: process.uptime()
            }));
            return;
        }
        
        // Ostatní cesty necháme zpracovat původním middleware
        originalMiddleware(req, res, next);
    } catch (error) {
        console.error("Error processing request:", error);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end("Internal Server Error");
    }
};

// Port je kriticky důležitý pro cloudové platformy
const port = process.env.PORT || 3000;  // Změna výchozího portu na 3000, který Render používá

// Určete hostname pro poslech
const hostname = process.env.HOST || '0.0.0.0';

console.log(`Starting server on ${hostname}:${port}`);

// Použijeme serveHTTP z SDK
serveHTTP(expandedAddonInterface, { 
    port: port,
    host: hostname,  // Důležité pro cloudové platformy
    logRequests: true, // Pro lepší debugování
    cache: { max: 1000, maxAge: 3600 * 1000 } // Nastavení cache
});

console.log(`Server běží na portu ${port}`);
console.log(`Adresa pro Stremio: http://localhost:${port}/manifest.json`);

// Log pro diagnostiku
console.log('Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    HOST: process.env.HOST
});

// Zachytávání chyb
process.on('uncaughtException', (err) => {
  console.error('Neošetřená výjimka:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Neošetřené promise rejection:', reason);
});
