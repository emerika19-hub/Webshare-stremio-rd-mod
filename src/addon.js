const { addonBuilder } = require("stremio-addon-sdk")
const needle = require('needle')
const webshare = require('./webshare')
const realdebrid = require('./realdebrid')
const { findShowInfo } = require("./meta")

// Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/manifest.md
const manifest = {
	"id": "community.coffei.webshare",
	"version": "0.2.0",
	"catalogs": [],
	"resources": ["stream"],
	"types": [
		"movie",
		"series"
	],
	"name": "Webshare.cz with Real-Debrid",
	"description": "Simple webshare.cz search and streaming with Real-Debrid support.",
	"idPrefixes": [
		"tt"
	],
	"behaviorHints": { "configurable": true, "configurationRequired": true },
	"config": [
		{
			"key": "login",
			"type": "text",
			"title": "Webshare.cz login - username or email",
			"required": true
		},
		{
			"key": "password",
			"type": "password",
			"title": "Webshare.cz password",
			"required": true
		},
		{
			"key": "realdebrid_api",
			"type": "password",
			"title": "Real-Debrid API Key (volitelné)",
			"required": false
		},
		{
			"key": "use_realdebrid",
			"type": "select",
			"title": "Použít Real-Debrid pro streamování",
			"options": ["ano", "ne"],
			"default": "ne",
			"required": false
		}
	]
}
const builder = new addonBuilder(manifest)

builder.defineStreamHandler(async function (args) {
	const info = await findShowInfo(args.type, args.id)
	if (info) {
		const config = args.config || {}
		const wsToken = await webshare.login(config.login, config.password)
		const streams = await webshare.search(info, wsToken)
		const streamsWithUrl = await webshare.addUrlToStreams(streams, wsToken)

		// Pokud je nakonfigurováno použití Real-Debrid, pokusíme se získat přímé odkazy
		if (config.realdebrid_api && config.use_realdebrid === 'ano') {
			const rdApiKey = config.realdebrid_api;
			const isValidKey = await realdebrid.validateApiKey(rdApiKey);
			
			if (isValidKey) {
				console.log('Real-Debrid API klíč je platný, použijeme Real-Debrid pro streamování');
				
				// Pro každý stream se pokusíme získat Real-Debrid odkaz
				const rdStreams = await Promise.all(
					streamsWithUrl.map(async (stream) => {
						if (!stream.url) return stream;
						
						const rdUrl = await realdebrid.getDirectLink(stream.url, rdApiKey);
						if (rdUrl) {
							return {
								...stream,
								url: rdUrl,
								name: `🚀 RD ${stream.name}` // Označení Real-Debrid streamů
							};
						}
						return stream;
					})
				);
				
				return { streams: rdStreams };
			} else {
				console.log('Real-Debrid API klíč není platný, použijeme standardní odkazy Webshare');
			}
		}

		return { streams: streamsWithUrl }
	}
	return { streams: [] }
})

module.exports = builder.getInterface()