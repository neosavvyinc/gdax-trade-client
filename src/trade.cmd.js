#!/usr/bin/env node
const commander = require('commander');

const gdax = require('./api/gdax');
const math = require('./util/math');
const _ = require('lodash');
const pjson = require('../package.json');

const AuthUtils = require('./util/authentication.util');

commander.version(pjson.version)
    /**
     * Sandbox is default environment without this flag - safety first!
     */
    .option('-r --real', 'Real Trading Mode - Default is Sandbox. Safety First.')

    /**
     * Authentication
     */
    .option('-f --auth-file [authFile]', 'Authentication File with key, secret and passphrase')

    /**
     * Public API Functions
     */
    .option('-l --list <type>',
        'List By Object Type',
        /^(coinbase-accounts|orders|products|gdax-accounts|positions|cost-basis)$/i)
    .option('--ignore-usd')

    /**
     * In Flight Order Management
     */
    .option('-c --cancel <type>',
        'Cancel By Product Id or All',
        /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD|ALL)/i)

    /**
     * Trading Interface
     */
    .option('-q --quote <product>',
        'Get Price Quote for a Product',
        /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD|ALL)/i)
    .option('--buy-limit <symbol>',
        'Buy or Sell a Currency Pair as Limit Order',
        /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD)/i)
    .option('--sell-limit <symbol>',
        'Buy or Sell a Currency Pair as Limit Order',
        /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD)/i)
    .option('--amount <amt>',
        'Amount of Currency to Buy or Sell',
        parseFloat)
    .option('--buy-source-amount <amt>',
        'Amount of Currency to Buy in Source Currency',
        parseFloat)
    .option('--sell-source-amount <amt>',
        'Amount of Currency to Sell in Source Currency',
        parseFloat)
    .option('--limit-price <lmtPrice>',
        'Limit Price when Buying or Selling of a whole Unit',
        parseFloat)

    /**
     * Output Modes
     */
    .option('--table', 'Tabular Output Mode')
    .option('--json', 'JSON Output Mode')

    /**
     * Daemon Mode - for basic automated trading
     */
    .option('--execute-two-leg <product>',
        'Listen to Prices for Currency Pair',
        /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD)$/,
        'BTC-USD')
    .option('--entry-price <entryPrice>',
        'Entry Threshold')
    .option('--exit-price <exitPrice>',
        'Exit Threshold ')
    .option('--lower-bound <lowerBound>',
        'Lower Bound Threshold ')
    .option('--upper-bound <upperBound>',
        'Upper Bound ')
    .option('--logarithmic-steps <steps>', 'Scale logarithmically this number of times', 1)
	.parse(process.argv);


function determineOutputMode() {
    if(commander.table) {
        return 'table';
    } else if ( commander.json ) {
        return 'json';
    } else {
        return 'json';
    }
}


const authedClient = AuthUtils.getAuthenticatedClient(false, commander.real, commander.authFile);
if(commander.list) {
    switch (commander.list) {
        case "coinbase-accounts":
            gdax.listCoinbaseAccounts(authedClient, determineOutputMode());
            break;
        case "gdax-accounts":
            gdax.listGdaxAccounts(authedClient, determineOutputMode(), commander.ignoreUsd);
            break;
        case "orders":
            gdax.listOrders(authedClient, determineOutputMode());
            break;
        case "products":
            gdax.listProducts(authedClient, determineOutputMode());
            break;
        case "positions":
            gdax.listPositions(authedClient, determineOutputMode());
            break;
        case "cost-basis":
            gdax.listCostBasis(authedClient, determineOutputMode());
            break;
    }
}


if(commander.cancel) {
    let currencyPair = commander.cancel;
    switch(currencyPair) {
        case "ALL":
            gdax.cancelAllOrders(
                AuthUtils.getAuthenticatedClient(true, commander.real, commander.authFile),
                determineOutputMode()
            );
            break;
        case "BTC-USD":
        case "BCH-USD":
        case "ETH-USD":
        case "LTC-USD":
            gdax.cancelForProduct(
                AuthUtils.getAuthenticatedClient(true, commander.real, commander.authFile),
                currencyPair,
                determineOutputMode()
            );
            break;
        default:
            console.log("Please provide a selection");
            commander.help();
            process.exit();
            break;
    }
}

if(commander.buyLimit) {
    console.log("buying...");
    if(commander.buySourceAmount) {
        const calculatedAmount = Number(commander.buySourceAmount / commander.limitPrice).toFixed(5);
        console.log("Submitting a BUY order for");
        console.log("Currency:    ", commander.buyLimit);
        console.log("Amount:      ", calculatedAmount);
        console.log("Limit Price: ", commander.limitPrice);
        console.log("Cost:        ", calculatedAmount * commander.limitPrice);

        gdax.buyLimit(
            authedClient,
            commander.buyLimit,
            calculatedAmount,
            commander.limitPrice,
            determineOutputMode())
    } else {
        console.log("Submitting a BUY order for");
        console.log("Currency:    ", commander.buyLimit);
        console.log("Amount:      ", commander.amount);
        console.log("Limit Price: ", commander.limitPrice);
        console.log("Cost:        ", commander.amount * commander.limitPrice);

        gdax.buyLimit(
            authedClient,
            commander.buyLimit,
            commander.amount,
            commander.limitPrice,
            determineOutputMode())
    }
}

if(commander.sellLimit) {
    if(commander.sellSourceAmount) {
        const calculatedAmount = Number(commander.sellSourceAmount / commander.limitPrice).toFixed(5);
        console.log("Submitting a SELL order for");
        console.log("Currency:    ", commander.sellLimit);
        console.log("Amount:      ", calculatedAmount);
        console.log("Limit Price: ", commander.limitPrice);
        console.log("Cost:        ", calculatedAmount * commander.limitPrice);

        gdax.sellLimit(
            authedClient,
            commander.sellLimit,
            calculatedAmount,
            commander.limitPrice,
            determineOutputMode());
    } else {
        console.log("Submitting a SELL order for");
        console.log("Currency:    ", commander.sellLimit);
        console.log("Amount:      ", commander.amount);
        console.log("Limit Price: ", commander.limitPrice);
        console.log("Cost:        ", commander.amount * commander.limitPrice);

        gdax.sellLimit(
            authedClient,
            commander.sellLimit,
            commander.amount,
            commander.limitPrice,
            determineOutputMode());
    }
}

if(
    commander.executeTwoLeg &&
    commander.entryPrice &&
    commander.exitPrice &&
    commander.buySourceAmount &&
    commander.logarithmicSteps
) {
    let orderCount = 0;
    const product = commander.executeTwoLeg;
    const logarithmicSteps = Number(commander.logarithmicSteps);
    const logScale = math.calculateLog10Scale(logarithmicSteps);
    const buySourceAmount = commander.buySourceAmount;
    const entryPrice = Number(commander.entryPrice).toFixed(5);
    const exitPrice = Number(commander.exitPrice).toFixed(5);
    const lowerBound = commander.lowerBound ? Number(commander.lowerBound) : 0.9775;
    const upperBound = commander.upperBound ? Number(commander.upperBound) : 1.005;

    const buyPrices = math.calculatePricesForScale(Number(entryPrice), Number(entryPrice) * lowerBound, logScale, math.log10Form);
    const sellPrices = math.calculatePricesForScale(Number(exitPrice), Number(exitPrice) * upperBound, logScale, math.log10Form);

    const buyParams = {
        side: 'buy',
        product_id: product,
        post_only: true
    };

    const sellParams = {
        side: 'sell',
        product_id: product,
        post_only: true
    };

    const twoLegPairs = _.map(buyPrices, (b, idx) => {
        const targetAmount = Number((buySourceAmount / logarithmicSteps) / b).toFixed(5);
        return {
            buy: _.merge({}, buyParams, {
                size: targetAmount,
                price: Number(b).toFixed(2)
            }),
            sell: _.merge({}, sellParams, {
                size: targetAmount,
                price: Number(sellPrices[idx]).toFixed(2)
            })
        };
    });


    const orders = _.map(twoLegPairs, (pair) => {
        const profit = (pair.sell.price * pair.sell.size) - (pair.buy.price * pair.buy.size);
        console.log("Profit for order: ", profit);
        const trade = gdax.executeTwoLegTrade(
            AuthUtils.getCredentials(commander.authFile),
            AuthUtils.getAuthenticatedClient(false, commander.real, commander.authFile),
            profit,
            product,
            pair.buy,
            pair.sell);

        return {
            profit, trade,
            sell: pair.sell,
            buy: pair.buy
        }
    });

    gdax.output(determineOutputMode(), orders, "profit");
}
