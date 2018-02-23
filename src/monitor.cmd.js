#!/usr/bin/env node

const commander = require('commander');

const fs = require('fs');
const gdax = require('./gdax');
const MetricsDAO = require('./metrics_data.dao');
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
    .option('-d --data <point>', 'Data Point Type to Capture', /^(price|portfolio)/i)
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
        case "portfolio":
            console.log(`Monitoring Portfolio`);
            monitorPortfolio(product,
                AuthUtils.getAuthenticatedClient(false, commander.real, commander.authFile));
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
            MetricsDAO.savePriceInfo({
                product_id: data.product_id,
                price: data.price,
                open_24h: data.open_24h,
                volume_24h: data.volume_24h,
                low_24h: data.low_24h,
                high_24h: data.high_24h,
                volume_30d: data.volume_30d,
                best_bid: data.best_bid,
                best_ask: data.best_ask,
                time: data.time
            })
        }
    });
}

function monitorPortfolio(product, authedClient) {
    const websocket = new Gdax.WebsocketClient(
        ['BTC-USD', 'ETH-USD', 'BCH-USD', 'LTC-USD'],
        'wss://ws-feed.gdax.com', // FIXME: Make this work for real/fake
        authedClient,
        {
            channels: ['ticker']
        }
    );

    const calculatePortfolioBalance = (priceTickInfo, accounts, ignoreUsd = false) => {
        const accountsWithUSDValues = _.map(accounts, (a) => {
            if( a.currency !== 'USD' ) {
                const nonUsdResult = _.merge({}, a, {dollarValue: Number(a.balance) * Number(priceTickInfo.price)});
                return nonUsdResult
            } else if ( a.currency === 'USD' && !ignoreUsd) {
                const usdResult = _.merge({}, a, {dollarValue: Number(a.balance)});
                return usdResult;
            } else {
                const usdResult = _.merge({}, a, {dollarValue: 0});
                return usdResult
            }
        });
        return accountsWithUSDValues;
    };

    websocket.on('message', async (data) => {
        if(data.type === "ticker") {
            const shapeOfPriceTick = [
                "product_id",
                "price",
                "open_24h",
                "volume_24h",
                "low_24h",
                "high_24h",
                "volume_30d",
                "best_bid",
                "best_ask",
                "time"
            ];
            if(_.every(shapeOfPriceTick, _.partial(_.has, data))){
                const accounts = await authedClient.getAccounts();
                const portfolioInfo = calculatePortfolioBalance(accounts);
                console.log("Accounts: ", portfolioInfo);
                MetricsDAO.savePortfolioInfo(portfolioInfo);
            }

        }
    });
}