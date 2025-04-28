#!/usr/bin/env node

// Získáme potřebné moduly
const addonInterface = require("./addon");
const express = require("express");
const http = require('http');

// Port je kriticky důležitý pro cloudové platformy
const port = process.env.PORT || 10000;

// Generuje HTML stránku s dynamicky vloženou URL
function generateHTML(req) {
    // Detekujeme aktuální URL ze samotného požadavku
    const host = req.headers.host || 'localhost:10000';
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const baseUrl = `${protocol}://${host}`;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Webshare Stremio Addon</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 20px; 
                background-color: #f5f5f5;
                color: #333;
            }
            h1 { 
                color: #2c3e50; 
                border-bottom: 2px solid #3498db;
                padding-bottom: 10px;
            }
            .container {
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .btn { 
                display: inline-block; 
                background: #3498db; 
                color: white; 
                padding: 10px 15px; 
                text-decoration: none; 
                border-radius: 4px; 
                font-weight: bold; 
                margin: 10px 0;
            }
            .btn:hover {
                background: #2980b9;
            }
            code {
                background: #f8f8f8;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 2px 5px;
                font-family: monospace;
            }
            .feature {
                margin: 15px 0;
                padding-left: 20px;
                border-left: 3px solid #3498db;
            }
            .info-box {
                margin-top: 20px; 
                padding: 15px; 
                background-color: #f8f9fa; 
                border-radius: 6px;
                border-left: 4px solid #3498db;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Webshare Stremio Addon s Real-Debrid podporou</h1>
            
            <p>Tento addon umožňuje streamování filmů a seriálů z Webshare.cz s volitelnou podporou Real-Debrid pro rychlejší stahování.</p>
            
            <h2>Instalace do Stremio</h2>
            <p>Pro instalaci tohoto addonu do Stremio klikněte na tlačítko níže:</p>
            
            <a href="stremio://addon/${baseUrl}/manifest.json" class="btn">Nainstalovat do Stremio</a>
            
            <p>Nebo přidejte následující URL do Stremio ručně v sekci Addons > Přidat Addon:</p>
            <code>${baseUrl}/manifest.json</code>
            
            <h2>Funkce</h2>
            <div class="feature">
                <strong>Podpora Real-Debrid:</strong> Možnost využít Real-Debrid službu pro rychlejší a stabilnější streamování.
            </div>
            
            <div class="feature">
                <strong>Konfigurovatelné nastavení:</strong> Možnost zapnout/vypnout použití Real-Debrid.
            </div>
            
            <div class="feature">
                <strong>Označené streamy:</strong> Streamy používající Real-Debrid jsou označeny ikonou 🚀.
            </div>
            
            <h2>Nastavení</h2>
            <p>Po instalaci addonu budete požádáni o:</p>
            <ul>
                <li>Přihlašovací údaje k Webshare.cz</li>
                <li>Volitelně API klíč Real-Debrid</li>
                <li>Zda chcete používat Real-Debrid pro streamování</li>
            </ul>
            
            <div class="info-box">
                <p><strong>Server info:</strong></p>
                <ul>
                    <li>Verze: 0.3.0</li>
                    <li>Stav: Online</li>
                    <li>API endpoint: <a href="${baseUrl}/manifest.json">${baseUrl}/manifest.json</a></li>
                    <li>Aktuální čas serveru: ${new Date().toISOString()}</li>
                </ul>
            </div>
        </div>
    </body>
    </html>
    `;
}

// Vytvoříme express HTTP server
const app = express();

// Povolení CORS pro všechny požadavky (důležité pro Stremio)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Přidáme middleware pro zpracování požadavků na kořenovou URL
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(generateHTML(req));
});

app.get('/index.html', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(generateHTML(req));
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
    res.send({ status: 'ok' });
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
    let extra = {};
    
    try {
        if (req.params.extra) {
            extra = JSON.parse(decodeURIComponent(req.params.extra));
        }
    } catch (e) {
        console.error('Error parsing extra params:', e);
    }
    
    console.log(`Request for ${resource}/${type}/${id}`);
    
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
        message: 'The requested resource was not found' 
    });
});

// Spustíme server
const server = http.createServer(app);
server.listen(port, '0.0.0.0', () => {
    console.log(`Server běží na portu ${port}`);
});

// Zachytávání chyb
process.on('uncaughtException', (err) => {
  console.error('Neošetřená výjimka:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Neošetřené promise rejection:', reason);
});
