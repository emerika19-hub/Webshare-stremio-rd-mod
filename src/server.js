#!/usr/bin/env node

const { serveHTTP } = require("stremio-addon-sdk");
const addonInterface = require("./addon");

// Použití portu z proměnných prostředí (důležité pro Heroku)
const port = process.env.PORT || 7000;

// Spuštění HTTP serveru na všech rozhraních (0.0.0.0 je kritické pro Heroku)
console.log(`Starting HTTP server on port ${port}`);
serveHTTP(addonInterface, { 
    port: port,
    host: '0.0.0.0',
    cache: {
        max: 1000,
        maxAge: 24 * 60 * 60 * 1000 // 24 hodiny
    }
});

// Základní hlášení pro debugging
console.log(`Addon běží na http://127.0.0.1:${port}/manifest.json`);

// Log pro kontrolu prostředí
console.log('Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DYNO: process.env.DYNO,
    VERCEL: process.env.VERCEL
});

// Pro publikování addonu do centrálního adresáře Stremio, odkomentujte následující řádek
// const { publishToCentral } = require("stremio-addon-sdk");
// publishToCentral("https://vas-addon.herokuapp.com/manifest.json");
