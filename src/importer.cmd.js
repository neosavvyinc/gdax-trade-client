#!/usr/bin/env node

const commander = require('commander');

const request = require('request');

const MetricsDAO = require('./metrics_data.dao');

const _ = require('lodash');
const moment = require('moment');
const twix = require('twix');

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

    .option('-i --import <product>', 'Product ID to Import', /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD)/i)
    .option('--start <date>', 'Start Date')
    .option('--end <date>', 'End Date')
    .option('--granularity <g>', 'Granularity', /^(60|300|900|3600|21600|86400)/i)
    .parse(process.argv);


if(commander.import && commander.start && commander.end) {
    const product = commander.import;
    const startDate = moment(commander.start);
    const endDate = moment(commander.end);
    const granularity = commander.granularity;

    console.log(`Importing candles from ${startDate} to ${endDate} for ${product} by ${granularity}`);

    const authClient = AuthUtils.getAuthenticatedClient(false, commander.real, commander.authFile);
    // gdax.findCandleData(
    //     authClient, startDate, endDate, product, granularity).then((data) => {
    //     saveCandles(product, data)
    // });

    const months = startDate.twix(endDate).toArray('months');
    const ranges = _.reduce(months, (acc, m) => {
        const updated = {
            prev: acc.curr,
            curr: m
        };
        if(updated.curr && updated.prev) {
            return {
                pairs: acc.pairs.concat({start: updated.prev, end: updated.curr}),
                prev: updated.prev,
                curr: updated.curr
            }
        } else {
            return  {
                pairs: acc.pairs,
                prev: updated.prev,
                curr: updated.curr
            }
        }
    }, { pairs: [] });

    _.forEach(ranges.pairs, (p) => {
        console.log("requesting: ", p);
        const startDateString = p.start.format();
        const endDateString = p.end.format();
        request(
            `https://api.gdax.com/products/BTC-USD/candles?granularity=86400&start=${startDateString}&end=${endDateString}`,
            {
                method: 'GET',
                headers: {
                    'User-Agent': 'Chrome'
                }
            }, (error, res, body) => {
            saveCandles(product, JSON.parse(body));
        });
    });
}

function saveCandles(product, candleData) {
    /**
     * Each candle is
     *
     * time bucket start time
     * low lowest price during the bucket interval
     * high highest price during the bucket interval
     * open opening price (first trade) in the bucket interval
     * close closing price (last trade) in the bucket interval
     * volume volume of trading activity during the bucket interval
     */

    _.forEach(candleData, (candle) => {
        // console.log("candle: ", candle);
        const [time, low, high, open, close, volume] = candle;
        MetricsDAO.saveHourly({
            product_id: product,
            open: open,
            close: close,
            volume: volume,
            low: low,
            high: high,
            time: time
        })
    });

}