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
        output(mode, accounts);
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
                if(buyMode && !orderSubmitted) {
                    console.log(`Found Entry Price, submitting order at ${entryTradeParams.price}`);
                    orderSubmitted = true;
                    buyOrderId = await client.placeOrder(entryTradeParams);
                    output('table', [buyOrderId]);
                    buyMode = false;
                } else {
                    if(!monitorSellMode) {
                        const buyOrder = await client.getOrder(buyOrderId.id);
                        if(buyOrder.status === "rejected") {
                            console.log("Failed to buy at params");
                        }
                        if(buyOrder.settled === true && !sellOrderSubmitted) {
                            sellOrderSubmitted = true;
                            sellOrderId = await client.placeOrder(exitTradeParams);
                            output('table', [sellOrderId]);
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

async function listCostBasis(client, mode = 'json') {
    const accounts = await client.getAccounts();

    // { currency: 'BTC', trades: [] }
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
        if(t.currency !== 'USD'){

            const tradesWithInfo = _.map(t.trades, (trade) => {
                const foundTrade = _.find(usdLookupInfo, {tradeId: trade.details.trade_id});
                const usdAmount = foundTrade ? foundTrade.usdAmount: 0;
                return {
                    ...trade,
                    usdCost: Math.abs(usdAmount),
                    [`${_.toLower(t.currency)}Limit`]: Math.abs(usdAmount / Number(trade.amount))
                }
            });
            const usdCosts = _.map(tradesWithInfo, (twi) => { return Number(twi.usdCost)});
            const currencyAmounts =  _.map(tradesWithInfo, (twi) => { return Number(twi.amount)});
            const costBasis = _.sum(usdCosts) / _.sum(currencyAmounts);
            console.log(`Cost Basis for ${t.currency}: ${costBasis}`);
            output(mode, tradesWithInfo);
        }
    });
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
};
