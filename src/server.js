#!/usr/bin/env node

const addonInterface = require("./addon");
const http = require('http');
const fs = require('fs');
const path = require('path');

// Port je kriticky důležitý pro Heroku
const port = process.env.PORT || 7000;

// Obsah HTML stránky pro případ, že nelze načíst soubor
const fallbackHtml = `
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

// Vytvoříme základní HTTP server pro maximální kompatibilitu
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    
    console.log(`Požadavek: ${req.method} ${pathname}`);
    
    if (pathname === '/' || pathname === '/index.html') {
      // Servírování hlavní HTML stránky
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      
      // Zkusíme načíst HTML soubor, ale máme fallback pro jistotu
      try {
        const indexPath = path.join(__dirname, 'public', 'index.html');
        if (fs.existsSync(indexPath)) {
          const htmlContent = fs.readFileSync(indexPath, 'utf8');
          res.end(htmlContent);
        } else {
          console.log('index.html nenalezen, používám fallback HTML');
          res.end(fallbackHtml);
        }
      } catch (err) {
        console.error('Chyba při čtení HTML:', err);
        res.end(fallbackHtml);
      }
      return;
    }
    
    // Zpracování Stremio API požadavků
    addonInterface.middleware(req, res, () => {
      // Fallback pro ostatní požadavky
      if (pathname === '/health' || pathname === '/status') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'ok', version: '0.3.0' }));
      } else {
        // Přesměrování na hlavní stránku
        res.statusCode = 302;
        res.setHeader('Location', '/');
        res.end();
      }
    });
  } catch (error) {
    // Zpracování chyb uvnitř serveru
    console.error('Chyba při zpracování požadavku:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Internal Server Error');
  }
});

// Posloucháme na všech rozhraních (0.0.0.0) - KRITICKÉ pro Heroku
server.listen(port, '0.0.0.0', () => {
  console.log(`Server běží na portu ${port}`);
  console.log(`Adresa pro Stremio: http://localhost:${port}/manifest.json`);
});

// Zachytávání chyb na úrovni procesu
process.on('uncaughtException', (err) => {
  console.error('Neošetřená výjimka:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Neošetřené promise rejection:', reason);
});
