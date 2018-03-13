#!/usr/bin/env node

const commander = require('commander');
const AWS = require('aws-sdk');


const fs = require('fs');
const gdax = require('./api/gdax');
const MetricsDAO = require('./dataAccess/metrics_data.dao');
const Gdax = require('gdax');
const ExtendedClient = require('./util/authenticated');
const math = require('./util/math');
const _ = require('lodash');
const pjson = require('../package.json');

const {
    PRODUCT_ID_REGEX
} = require('./util/constants');

const AuthUtils = require('./util/authentication.util');
const { output } = require('./util/logging.util');

let config;

    commander.version(pjson.version)

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

    .option('-a --alert <product>', 'Product ID to Monitor', /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD)/i)
    .option('-d --decreasing <decreasing>', 'Decreasing Threshold', parseInt)
    .option('-i --increasing <increasing>', 'Increasing Threshold', parseInt)
    .parse(process.argv);

if(commander.authFile) {
    config = AuthUtils.getCredentials(commander.authFile);
}

if(commander.alert && commander.decreasing) {
    const product = commander.alert;
    const decreasingThreshold = commander.decreasing;

    console.log(`Monitoring ${decreasingThreshold} for ${product}`);

    monitorPrice(product,
        AuthUtils.getAuthenticatedClient(false, commander.real, commander.authFile),
        (price, rawData) => {
            if (price < decreasingThreshold) {
                sendAlert(`${product} just dropped below ${decreasingThreshold} better go trade!`);
            } else {
                output('table', [rawData]);
            }
        }
    );
}

if(commander.alert && commander.increasing) {
    const product = commander.alert;
    const increasingThreshold = commander.increasing;

    console.log(`Monitoring ${increasingThreshold} for ${product}`);

    monitorPrice(product,
        AuthUtils.getAuthenticatedClient(false, commander.real, commander.authFile),
        (price, rawData) => {
            if (price > increasingThreshold) {
                sendAlert(`${product} just traded above ${increasingThreshold} better go trade!`);
            } else {
                output('table', [rawData]);
            }
        }
    );
}

let ignoreAlerts = false;
function sendAlert(message) {
    console.log("message ", message);

    AWS.config.region = 'us-east-1';
    AWS.config.update({
        accessKeyId: config.alerts.sns.accessKey,
        secretAccessKey: config.alerts.sns.secret,
    });

    const sns = new AWS.SNS();
    const params = {
        Message: message,
        MessageStructure: 'string',
        PhoneNumber: config.alerts.phoneNumber,
        Subject: 'Trade Decreasing Alert'
    };

    if(!ignoreAlerts) {
        sns.publish(params, function(err, data) {
            if (err) {
                console.log(err, err.stack);
            }
            else {
                console.log(data);
                ignoreAlerts = true;
                setTimeout(() => { ignoreAlerts = false }, 1000 * 30);
            }
        });
    }
}

function monitorPrice(product, authedClient, priceCheck) {
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
            priceCheck(data.price, data);
        }
    });
}