#!/usr/bin/env node

// Získáme Stremio addon SDK
const { serveHTTP } = require("stremio-addon-sdk");
const addonInterface = require("./addon");
const express = require("express");
const http = require('http');

// Port je kriticky důležitý pro cloudové platformy
const port = process.env.PORT || 10000;

// Určete hostname pro poslech
const hostname = process.env.HOST || '0.0.0.0';

// Detekce produkčního prostředí
const isProduction = process.env.NODE_ENV === 'production';
const publicUrl = process.env.PUBLIC_URL || (isProduction ? 'https://webshare-stremio-rd-mod.onrender.com' : `http://localhost:${port}`);

console.log(`Starting server on ${hostname}:${port}`);
console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
console.log(`Public URL: ${publicUrl}`);

// HTML pro hlavní stránku s dynamickou URL
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
    <code>${publicUrl}/manifest.json</code><br><br>
    <a href="stremio://addon/${publicUrl}/manifest.json" class="btn">Nainstalovat do Stremio</a>
    
    <div style="margin-top: 20px; padding: 10px; background-color: #f8f9fa; border-radius: 4px;">
        <p><strong>Server info:</strong></p>
        <ul>
            <li>Verze: 0.3.0</li>
            <li>Stav: Online</li>
            <li>API endpoint: <a href="${publicUrl}/manifest.json">${publicUrl}/manifest.json</a></li>
        </ul>
    </div>
</body>
</html>
`;

// Vytvoříme express HTTP server pro zpracování požadavků
const app = express();

// Povolení CORS pro všechny požadavky (důležité pro Stremio)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Přidáme middleware pro zpracování požadavků na kořenovou URL
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(landingHTML);
});

app.get('/index.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(landingHTML);
});

app.get('/health', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send({
        status: 'ok',
        version: '0.3.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get('/healthz', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send({
        status: 'ok'
    });
});

// Stremio addon endpoints
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(addonInterface.manifest);
    console.log('Manifest requested and served');
});

// Zpracování streamů pomocí addonInterface
app.get('/:resource/:type/:id/:extra?.json', (req, res, next) => {
    const { resource, type, id } = req.params;
    let extra;
    
    try {
        extra = req.params.extra ? JSON.parse(decodeURIComponent(req.params.extra)) : {};
    } catch (e) {
        console.error('Error parsing extra params:', e);
        extra = {};
    }
    
    console.log(`Request for ${resource}/${type}/${id} with extra:`, extra);
    
    if (resource === 'stream') {
        // Přidat config z query parametrů, pokud existují
        if (req.query.config) {
            try {
                extra.config = JSON.parse(decodeURIComponent(req.query.config));
            } catch (e) {
                console.error('Error parsing config:', e);
            }
        }
        
        addonInterface.methods[resource]({ type, id, extra })
            .then(result => {
                res.setHeader('Content-Type', 'application/json');
                res.send(result);
                console.log(`Stream response sent for ${type}/${id} with ${result.streams ? result.streams.length : 0} streams`);
            })
            .catch(err => {
                console.error('Error serving stream:', err);
                res.status(500).send({ error: 'An error occurred', message: err.message });
            });
    } else {
        next();
    }
});

// Fallback pro všechny ostatní požadavky
app.use((req, res) => {
    res.status(404).send({ 
        error: 'Not found',
        message: 'The requested resource was not found',
        availableEndpoints: [
            '/',
            '/manifest.json',
            '/stream/:type/:id.json'
        ]
    });
});

// Spustíme server
const server = http.createServer(app);
server.listen(port, hostname, () => {
    console.log(`Server běží na portu ${port}`);
    console.log(`Adresa pro Stremio: ${publicUrl}/manifest.json`);
});

// Zachytávání chyb
process.on('uncaughtException', (err) => {
  console.error('Neošetřená výjimka:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Neošetřené promise rejection:', reason);
});
