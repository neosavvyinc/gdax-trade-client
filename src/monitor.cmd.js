#!/usr/bin/env node

const commander = require('commander');

const fs = require('fs');
const gdax = require('./gdax');
const Gdax = require('gdax');
const ExtendedClient = require('./authenticated');
const math = require('./math');
const _ = require('lodash');

const {
    PRODUCT_ID_REGEX
} = require('./constants');

const AuthUtils = require('./authentication.util');
const { output } = require('./logging.util');

    commander.version('0.1.0')

    /**
     * Sandbox is default environment without this flag - safety first!
     */
    .option('-r --real', 'Real Trading Mode - Default is Sandbox. Safety First.')

    /**
     * Authentication
     */
    .option('-f --auth-file [authFile]', 'Authentication File with key, secret and passphrase')

    .option('-k --key [key]', 'Authentication Key from GDAX')
    .option('-s --secret [secret]', 'Authentication Secret from GDAX')
    .option('-p --passphrase [passphrase]', 'Authentication Passphrase from GDAX')

    /**
     * Output Modes
     */
    .option('--table', 'Tabular Output Mode')
    .option('--json', 'JSON Output Mode')

    .option('-m --monitor <product>', 'Product ID to Monitor', /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD)/i)
    .option('-d --data <point>', 'Data Point Type to Capture', /^(price|trade|portfolio)/i)
    .parse(process.argv);


if(commander.monitor && commander.data) {
    const product = commander.monitor;
    const dataPoint = commander.data;

    console.log(`Monitoring ${dataPoint} for ${product}`);

    switch(dataPoint){
        case "price":
            console.log(`Monitoring Price for ${product}`);
            monitorPrice(product,
                AuthUtils.getAuthenticatedClient(false, commander.real, commander.authFile));
            break;
        case "trade":
            console.log(`Monitoring Trades for ${product}`);
            break;
        default:
            commander.help();
            break;
    }
}

function monitorPrice(product, authedClient) {
    const websocket = new Gdax.WebsocketClient(
        [product],
        'wss://ws-feed.gdax.com', // FIXME: Make this work for real/fake
        authedClient,
        {
            channels: ['ticker']
        }
    );

    websocket.on('message', (data) => {
        if(data.type === "ticker") {
            output('table', [data]);
        }
    });
}

function monitorPortfolio(product, authedClient) {
    const websocket = new Gdax.WebsocketClient(
        [product],
        'wss://ws-feed.gdax.com', // FIXME: Make this work for real/fake
        authedClient,
        {
            channels: ['ticker']
        }
    );

    websocket.on('message', (data) => {
        if(data.type === "ticker") {
            output('table', [data]);
        }
    });
}