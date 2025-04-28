#!/usr/bin/env node

const { serveHTTP, publishToCentral } = require("stremio-addon-sdk")
const addonInterface = require("./addon")

// Použij PORT z proměnných prostředí, pokud existuje (pro Vercel a další platformy)
// nebo použij výchozí port 7000
const port = process.env.PORT || 7000

// Detekce prostředí Vercel
const isVercel = process.env.VERCEL === '1'

// V produkci na Vercel používáme serverless funkce
if (isVercel) {
  console.log('Běžím na Vercel v serverless módu')
  module.exports = (req, res) => {
    addonInterface.handle(req, res)
  }
} else {
  // Lokální vývojový server
  serveHTTP(addonInterface, { port: port, host: '0.0.0.0' })
  console.log(`Addon běží na http://127.0.0.1:${port}/manifest.json`)
}

// Pro publikování addonu do centrálního adresáře Stremio, odkomentujte následující řádek
// a nahraďte URL adresu skutečnou adresou vašeho nasazeného addonu
// publishToCentral("https://vas-addon-webshare.vercel.app/manifest.json")
