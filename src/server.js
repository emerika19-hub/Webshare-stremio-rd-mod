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

console.log(`Starting server on ${hostname}:${port}`);

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

// Vytvoříme express HTTP server pro zpracování požadavků
const app = express();

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
        uptime: process.uptime()
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
});

// Zpracování streamů pomocí addonInterface
app.get('/:resource/:type/:id/:extra?.json', (req, res, next) => {
    const { resource, type, id } = req.params;
    const extra = req.params.extra ? JSON.parse(decodeURIComponent(req.params.extra)) : {};
    
    console.log(`Request for ${resource}/${type}/${id}`);
    
    if (resource === 'stream') {
        addonInterface.methods[resource]({ type, id, extra })
            .then(result => {
                res.setHeader('Content-Type', 'application/json');
                res.send(result);
            })
            .catch(err => {
                console.error('Error serving stream:', err);
                res.status(500).send({ error: 'An error occurred' });
            });
    } else {
        next();
    }
});

// Fallback pro všechny ostatní požadavky
app.use((req, res) => {
    res.status(404).send({ error: 'Not found' });
});

// Spustíme server
const server = http.createServer(app);
server.listen(port, hostname, () => {
    console.log(`Server běží na portu ${port}`);
    console.log(`Adresa pro Stremio: http://localhost:${port}/manifest.json`);
});

// Zachytávání chyb
process.on('uncaughtException', (err) => {
  console.error('Neošetřená výjimka:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Neošetřené promise rejection:', reason);
});
