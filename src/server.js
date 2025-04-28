#!/usr/bin/env node

const addonInterface = require("./addon");
const http = require('http');

// Port je kriticky důležitý pro Heroku
const port = process.env.PORT || 7000;

// Vytvoříme základní HTTP server pro maximální kompatibilitu
const server = http.createServer((req, res) => {
  // Zkusit zpracovat jako Stremio addon požadavek
  addonInterface.middleware(req, res, () => {
    // Fallback pro nerozeznané požadavky
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Webshare Stremio Addon je online! Pro použití ve Stremio přidejte tuto URL končící na /manifest.json');
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

// Pro publikování addonu do centrálního adresáře Stremio, odkomentujte následující řádek
// const { publishToCentral } = require("stremio-addon-sdk");
// publishToCentral("https://vas-addon.herokuapp.com/manifest.json");
