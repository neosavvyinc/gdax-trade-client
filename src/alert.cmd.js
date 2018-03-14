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

function list(val) {
    return val.split(',');
}

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
    .option('-d --decreasing <decreasing>', 'Decreasing Threshold', list)
    .option('-i --increasing <increasing>', 'Increasing Threshold', list)
    .parse(process.argv);

if(commander.authFile) {
    config = AuthUtils.getCredentials(commander.authFile);
}

if(commander.alert && (commander.decreasing || commander.increasing)) {
    const product = commander.alert;
    const decreasingThresholds = commander.decreasing || [];
    const increasingThresholds = commander.increasing || [];

    const decreasingFunctions = _.map(decreasingThresholds, (decreasingThreshold) => {
        console.log("creating monitor decreasing function: ", decreasingThreshold);
        return (price, rawData) => {
            if (parseFloat(price) <= parseFloat(decreasingThreshold)) {
                sendAlert(`${product} just dropped below ${decreasingThreshold} better go trade!`);
            } else {
                output('table', [rawData]);
            }
        }
    });

    const increasingFunctions = _.map(increasingThresholds, (increasingThreshold) => {
        return (price, rawData) => {
            if (parseFloat(price) >= parseFloat(increasingThreshold)) {
                sendAlert(`${product} just traded above ${increasingThreshold} better go trade!`);
            } else {
                output('table', [rawData]);
            }
        }
    });

    console.log(`Monitoring ${commander.decreasing} for ${product}`);
    console.log(`Monitoring ${commander.increasing} for ${product}`);
    monitorPrice(product,
        AuthUtils.getAuthenticatedClient(false, commander.real, commander.authFile),
        decreasingFunctions.concat(increasingFunctions)
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

function monitorPrice(product, authedClient, priceCheckFunctions) {
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
            _.forEach(priceCheckFunctions, (f) => {
                f(data.price, data);
            });
        }
    });
}