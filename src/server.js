#!/usr/bin/env node

const addonInterface = require("./addon");
const http = require('http');
const fs = require('fs');
const path = require('path');

// Port je kriticky důležitý pro Heroku
const port = process.env.PORT || 7000;

// Cesty k souborům
const indexPath = path.join(__dirname, 'public', 'index.html');
let indexHtml;

// Načteme HTML soubor do paměti
try {
  indexHtml = fs.readFileSync(indexPath, 'utf8');
} catch (err) {
  console.error('Chyba při načítání index.html:', err);
  indexHtml = '<h1>Webshare Stremio Addon je online!</h1><p>Pro použití ve Stremio přidejte tuto URL s /manifest.json</p>';
}

// Vytvoříme základní HTTP server pro maximální kompatibilitu
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  // Logování požadavku
  console.log(`Přijat požadavek: ${req.method} ${pathname}`);
  
  if (pathname === '/' || pathname === '/index.html') {
    // Servírování hlavní HTML stránky
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(indexHtml);
    return;
  }
  
  // Necháme Stremio addon zpracovat své požadavky (manifest.json, stream, atd.)
  addonInterface.middleware(req, res, () => {
    // Fallback pro nerozeznané požadavky
    if (pathname === '/health' || pathname === '/status') {
      // Health check endpoint pro Heroku
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'ok' }));
    } else {
      // Pro ostatní požadavky přesměrujeme na hlavní stránku
      res.statusCode = 302;
      res.setHeader('Location', '/');
      res.end();
    }
  });
});

// Posloucháme na všech rozhraních (0.0.0.0) - KRITICKÉ pro Heroku
server.listen(port, '0.0.0.0', () => {
  console.log(`Server běží na portu ${port}`);
  console.log(`Addon URL: http://localhost:${port}/manifest.json`);
});

// Zachytávání nekritických chyb bez pádu serveru
process.on('uncaughtException', (err) => {
  console.error('Zachycena neošetřená výjimka:', err);
});
