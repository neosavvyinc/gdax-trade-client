#!/usr/bin/env node

const commander = require('commander');
const colors = require('colors');
const moment = require('moment');

const fs = require('fs');
const gdax = require('./api/gdax');
const Gdax = require('gdax');
const ExtendedClient = require('./util/authenticated');
const math = require('./util/math');
const _ = require('lodash');
const pjson = require('../package.json');

const {
    PRODUCT_ID_REGEX
} = require('./util/constants');

const AuthUtils = require('./util/authentication.util');
const { output, determineOutputMode } = require('./util/logging.util');
const {
    findCandlesSinceBearishFlip,
    findCandlesSinceBullishFlip,
    findRecentCombinedBullishAndBearishCandles
} = require('./util/demark.util');

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

    .option('-m --monitor <product>', 'Product ID to Monitor', /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD)/i)
    .option('-t --show-count <product>', 'Calculate Current Tom Demark Indicator', /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD)/i)
    .option('-c --candle-size <size>', 'Candle Size or Timeframe', /^(1m|5m|15m|1h|6h|1d)/i)
    .option('--combined', 'Show Bearish and Bullish Combined')
    .parse(process.argv);


if(commander.monitor) {
    const product = commander.monitor;
    const authedClient = AuthUtils.getAuthenticatedClient(false, commander.real, commander.authFile);
    const websocket = AuthUtils.getAuthenticatedWebSocket(commander.real, authedClient, product);

    websocket.on('message', (data) => {
        if(data.type !== 'heartbeat'){
            output('table', [data]);
        }
    });

    websocket.on('error', (error) => {
        console.log("Error received on websocket", error);
    });

    websocket.on('close', (data) => {
        output('table', [data]);

        // try to re-connect the first time...
        websocket.connect();

        let count = 1;
        // attempt to re-connect every 30 seconds.
        // TODO: maybe use an exponential backoff instead
        const interval = setInterval(() => {
            if (!websocket.socket) {
                count++;

                if (count % 30 === 0) {
                    const time_since = 30 * count;
                    console.log('Websocket Error', `Attempting to re-connect for the ${count} time. It has been ${time_since} seconds since we lost connection.`);
                }
                websocket.connect();
            }
            else {
                clearInterval(interval);
            }
        }, 30000);

    });
}

if(commander.showCount && commander.candleSize) {

    // {60, 300, 900, 3600, 21600, 86400}. Otherwise, your request will be rejected. These values correspond to
    // timeslices representing one minute, five minutes, fifteen minutes, one hour, six hours, and one day, respectively.

    const product = commander.showCount;
    console.log("Product: ", product);
    const publicClient = AuthUtils.getPublicClient(commander.real);


    const candleToMillisMap = {
        '1m': 60,
        '5m': 300,
        '15m': 900,
        '1h': 3600,
        '6h': 21600,
        '1d': 86400,
    }

    let d = new Date();
    const granularity = {
        'start': (new Date(d.getTime() - 1000 * 60 * 50)).toISOString(),
        'end': d.toISOString(),
        'granularity': candleToMillisMap[commander.candleSize]
    };

    gdax.listHistoricRates(publicClient, determineOutputMode(commander), product, granularity).then((rates) => {
        const rateObjs = _.map(rates, r => {
            return {
                time: moment.unix(r[0]),
                low: r[1],
                high: r[2],
                open: r[3],
                close: r[4],
                volume: r[5]
            }
        });


        if(!commander.combined) {
            const bearishPrices = findCandlesSinceBearishFlip(rateObjs);
            const bullishPrices = findCandlesSinceBullishFlip(rateObjs);
            output('table', bearishPrices);
            output('table', bullishPrices);
        } else {
            const combined = findRecentCombinedBullishAndBearishCandles(rateObjs);
            output('table', combined);
        }

    });
}
