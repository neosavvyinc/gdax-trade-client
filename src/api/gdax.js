const Gdax = require('gdax');
const publicClient = new Gdax.PublicClient();
const _ = require('lodash');
const Aigle = require('aigle');
Aigle.mixin(_);

const { output } = require('../util/logging.util');

async function listProducts(client, mode = 'json') {
    try {
        const products = await client.getProducts();
        output(mode, products);
    } catch (error) {
        console.log(error)
    }
}

async function listCoinbaseAccounts(client, mode = 'json') {
    try {
        const accounts = await client.getCoinbaseAccounts();
        output(mode, accounts, undefined, [ 'primary', 'active', 'wire_deposit_information']);
    } catch (error) {
        console.log(error);
    }
}

async function listGdaxAccounts(client, mode = 'json', ignoreUsd = false) {
    try {
        const accounts = await client.getAccounts();
        const accountsWithUSDValues = await Aigle.map(accounts, async (a) => {
            if( a.currency !== 'USD' ) {
                const ticker = await client.getProductTicker(`${a.currency}-USD`);
                const nonUsdResult = _.merge({}, a, {dollarValue: Number(a.balance) * Number(ticker.price)});
                return nonUsdResult
            } else if ( a.currency === 'USD' && !ignoreUsd) {
                const usdResult = _.merge({}, a, {dollarValue: Number(a.balance)});
                return usdResult;
            } else {
                const usdResult = _.merge({}, a, {dollarValue: 0});
                return usdResult
            }
        });
        output(mode, accountsWithUSDValues, "dollarValue", ["id", "profile_id", ]);
    } catch (error) {
        console.log(error);
    }
}
async function listOrders(client, mode = 'json') {
    try {
        const orders = await client.getOrders();
        output(mode, orders);
    } catch (error) {
        console.log(error)
    }
}


function executeTwoLegTrade(
        auth,
        client,
        profit,
        product,
        entryTradeParams,
        exitTradeParams) {

    let buyOrderId;
    let sellOrderId;
    let buyMode = true;
    let monitorSellMode = false;
    let orderSubmitted = false;
    let sellOrderSubmitted = false;

    const websocket = new Gdax.WebsocketClient(
        [product],
        'wss://ws-feed.gdax.com',
        auth.gdax,
        {
            channels: ['ticker']
        }
    );

    websocket.on('message', async (data) => {
        try {
            if(data.type === 'ticker') {
                if(buyMode) {
                    console.log("Buy Order Execution Report");
                }

                if(buyMode && !orderSubmitted) {
                    orderSubmitted = true;
                    buyOrderId = await client.placeOrder(entryTradeParams);
                    output('table',
                        [buyOrderId],
                        undefined,
                        ['stp', 'type', 'post_only', 'created_at', 'fill_fees', 'filled_size', 'executed_value', 'status', 'settled']);
                    buyMode = false;
                } else {
                    if(!monitorSellMode && buyOrderId && buyOrderId.id) {
                        const buyOrder = await client.getOrder(buyOrderId.id);
                        if(buyOrder.status === "rejected") {
                            console.log("Failed to buy at params");
                        }
                        if(buyOrder.settled === true && !sellOrderSubmitted) {
                            sellOrderSubmitted = true;
                            sellOrderId = await client.placeOrder(exitTradeParams);
                            output('table',
                                [sellOrderId],
                                undefined,
                                ['stp', 'type', 'post_only', 'created_at', 'fill_fees', 'filled_size', 'executed_value', 'status', 'settled']);
                            monitorSellMode = true;
                        }
                    } else {
                        const sellOrder = await client.getOrder(sellOrderId.id);
                        if(sellOrder.status === "rejected") {
                            monitorSellMode = false;
                            sellOrderSubmitted = false;
                        }
                        if(sellOrder.settled === true) {
                            console.log(`Order by id: ${sellOrder.id} complete with $${profit} USD`);
                        }
                    }
                }
            }
        } catch (error) {
            console.log("Error while obtaining order details on a ticker update: ", error);
        }
    });

    websocket.on('error', err => {
            console.log("There was an error on the websocket", err);
    });

    websocket.on('close', () => {
        console.log("Websocket was closed, no longer monitoring orders");
        // May want to notify via text that we are no longer observing price ticks and order state
    });
}

async function cancelAllOrders(client, mode = 'json') {
    try {
        const cancelled = await client.cancelAllOrders();
        output(mode, cancelled);
    } catch (error) {
        console.log(error);
    }
}

async function cancelForProduct(client, product, mode = 'json') {
    try {
        const cancelled = await client.cancelAllOrders({ product_id: product }, _.noop);
        output(mode, cancelled);
    } catch (error) {
        console.log(error);
    }
}

async function placeOrderWrapper(client, product, amount, limitPrice, side, mode = 'json') {
    const params = {
        side: side,
        price: limitPrice, // USD
        size: amount, // BTC, BCH, ETH, LTC
        product_id: product,
        post_only: true
    };
    const orderConfirmation = await client.placeOrder(params);
    output(mode, [orderConfirmation]);
    return orderConfirmation;
}

async function buyLimit(client, product, amount, limitPrice, mode = 'json') {
    return placeOrderWrapper(client, product, amount, limitPrice, 'buy', mode)
}

async function sellLimit(client, product, amount, limitPrice, mode = 'json') {
    return placeOrderWrapper(client, product, amount, limitPrice, 'sell', mode)
}

async function listPositions(client, mode = 'json') {
    const positions = await client.listPositions();
    console.log(positions);
    output(mode, positions.accounts);
}

/**
 * Test Code
 */
function getInitialFills(client) {
    const p = new Promise((resolve, reject) => {
        client.getFills({
            limit: 100
        }, (ignore, resp, fills) => {
            resolve({
                cbAfter: resp.headers['cb-after'],
                cbBefore: resp.headers['cb-before'],
                fills: fills
            });
        });
    });

    return p;
}

/**
 * Test Code
 */
function getOlderFills(client, after) {
    const p = new Promise((resolve, reject) => {
        client.getFills({
            limit: 100,
            after
        }, (ignore, resp, fills) => {
            resolve({
                cbAfter: resp && resp.headers ? resp.headers['cb-after'] : null,
                cbBefore: resp && resp.headers ? resp.headers['cb-before'] : null,
                fills: fills
            });
        });
    });

    return p;
}


/**
 * Test Code
 */
async function listFills(client, mode = 'json') {
    let fills = [];
    let count = 0;
    let result = await getInitialFills(client);
    fills = fills.concat(result.fills);
    while(count < 100) {
        count = count + 1;
        result = await getOlderFills(client, result.cbAfter);
        fills = fills.concat(result.fills);
    }
    output(mode, fills);
}


async function listCostBasis(client, mode = 'json', product) {
    const accounts = await client.getAccounts();
    const positions = await client.listPositions();
    let productPosition = parseFloat(positions.accounts[product].balance);

    if(productPosition) {

        const tradesByAccount = await Aigle.map(accounts, async (a) => {
            const accountHistory = await client.getAccountHistory(a.id);

            const trades = _.reduce(accountHistory, (acc, ah) => {
                if(ah.type === 'match') {
                    acc = acc.concat(ah)
                }
                return acc;
            }, []);
            return { currency: a.currency, trades }
        });

        const usdInformation = _.find(tradesByAccount, {currency: "USD"});
        const usdLookupInfo = _.map(usdInformation.trades, (t) => {
            const info = {
                tradeId: t.details.trade_id,
                currencyPair: t.details.product_id,
                usdAmount: t.amount,
                orderType: t.amount > 0 ? 'sell' : 'buy'
            };
            return info;
        });

        _.forEach(tradesByAccount, (t) => {
            if(t.currency == product){
                const tradesWithInfo = _.map(t.trades, (trade) => {
                    const foundTrade = _.find(usdLookupInfo, {tradeId: trade.details.trade_id});
                    const usdAmount = foundTrade ? foundTrade.usdAmount: 0;
                    return {
                        ...trade,
                        usdCost: Math.abs(usdAmount),
                        [`${_.toLower(t.currency)}Limit`]: Math.abs(usdAmount / Number(trade.amount))
                    }
                });
                const relevantTrades = _.filter(tradesWithInfo, (twi) => {
                    if(productPosition <= 0 ) {
                        return false
                    } else {
                        productPosition = productPosition - parseFloat(twi.amount);
                        return true;
                    }
                });

                const usdCosts = _.map(relevantTrades, (twi) => { return Number(twi.usdCost)});
                const currencyAmounts =  _.map(relevantTrades, (twi) => { return Number(twi.amount)});
                const costBasis = _.sum(usdCosts) / _.sum(currencyAmounts);
                console.log(`\nEstimated cost basis: $${costBasis}\n`);
                output(mode, relevantTrades, "usdCost", ["details", "type", "id"]);
            }
        });
    }
    else {
        throw new Error(`No Position for ${product}`);
    }

}

async function withdrawAll( client, outputMode) {
    const coinbaseAccounts = await client.getCoinbaseAccounts();
    const gdaxAccount = await client.getAccounts();

    console.log("Coinbase Account Balances");
    output(outputMode, coinbaseAccounts,null, ['wire_deposit_information']);

    console.log("GDAX Account Balances");
    output(outputMode, gdaxAccount);

    Aigle.forEach(gdaxAccount, async (a) =>{
        const targetAccount = _.find(coinbaseAccounts, (c) => {
            c.currency === a.currency;
        });
        console.log(`Withdrawing a total of ${a.balance} from GDAX to Coinbase from the ${a.currency} account`);
        const withdrawParamsUSD = {
            amount: a.balance,
            currency: a.currency,
            coinbase_account_id: targetAccount.id,
        };
        await client.withdraw(withdrawParamsUSD);
    });
}

async function depositAll(client, outputMode) {
    const coinbaseAccounts = await client.getCoinbaseAccounts();
    const gdaxAccounts = await client.getAccounts();

    console.log("Coinbase Account Balances");
    output(outputMode, coinbaseAccounts,null, ['wire_deposit_information']);

    console.log("GDAX Account Balances");
    output(outputMode, gdaxAccounts);

    Aigle.forEach(coinbaseAccounts, async (s) =>{
        const targetAccount = _.find(gdaxAccounts, (t) => {
            t.currency === s.currency;
        });
        console.log(`Depositing a total of ${s.balance} from Coinbase to GDAX from the ${s.currency} account`);
        const depositParams = {
            amount: s.balance,
            currency: s.currency,
            coinbase_account_id: s.id,
        };
        await client.deposit(depositParams);
    });
}

async function listAllAccounts(client, outputMode) {
    const coinbaseAccounts = await client.getCoinbaseAccounts();
    const gdaxAccounts = await client.getAccounts();

    console.log("Coinbase Account Balances");
    output(outputMode, coinbaseAccounts,null, ['wire_deposit_information']);

    console.log("GDAX Account Balances");
    output(outputMode, gdaxAccounts);
}

module.exports = {
    output,
    listProducts,
    listCoinbaseAccounts,
    listGdaxAccounts,
    listOrders,
    executeTwoLegTrade,
    cancelAllOrders,
    cancelForProduct,
    buyLimit,
    sellLimit,
    listPositions,
    listCostBasis,
    withdrawAll,
    depositAll,
    listAllAccounts,
    listFills
};
