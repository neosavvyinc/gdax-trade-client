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
        output(mode, accounts, undefined, ['id', 'primary', 'active', 'wire_deposit_information']);
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
        product,
        tradePairs,
        mode = 'json') {

    let summary = false;
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

                const updatedTradePairs = await Aigle.map(tradePairs, async (pair) => {

                    let buyOrderId = pair.buyOrderId;
                    let sellOrderId = pair.sellOrderId;
                    let buyMode = _.get(pair, "buyMode" , true);
                    let monitorSellMode = _.get(pair, "monitorSellMode", false);
                    let orderSubmitted = _.get(pair, "orderSubmitted", false);
                    let sellOrderSubmitted = _.get(pair, "sellOrderSubmitted", false);

                    if(_.isUndefined(pair.profit)) {
                        const profit = (pair.sell.price * pair.sell.size) - (pair.buy.price * pair.buy.size);
                        //console.log("Profit for order: ", profit);
                        pair.profit = profit;
                    }

                    if(buyMode && !orderSubmitted) {
                        console.log(`Found Entry Price, submitting order at ${pair.buy.price}`);
                        pair.orderSubmitted = true;
                        pair.buyOrderId = await client.placeOrder(pair.buy);
                        //output('table', [pair.buyOrderId]);
                        pair.buyMode = false;
                    } else {
                        if(!monitorSellMode) {
                            // console.log("Monitoring Sell Mode");
                            // console.log("BuyOrderId: ", buyOrderId);
                            if( !_.isUndefined(buyOrderId) && !_.isUndefined(buyOrderId.id))
                            {
                                const buyOrder = await client.getOrder(buyOrderId.id);
                                if(buyOrder.status === "rejected") {
                                    console.log("Failed to buy at params");
                                }
                                if(buyOrder.settled === true && !sellOrderSubmitted) {
                                    console.log("Sending Sell Order");
                                    pair.sellOrderSubmitted = true;
                                    pair.sellOrderId = await client.placeOrder(pair.sell);
                                    output(mode, [sellOrderId]);
                                    pair.monitorSellMode = true;
                                }
                            }
                        } else if (monitorSellMode) {
                            if(!_.isUndefined(sellOrderId) && !_.isUndefined(sellOrderId.id)) {
                                const sellOrder = await client.getOrder(sellOrderId.id);
                                if (sellOrder.status === "rejected") {
                                    pair.monitorSellMode = false;
                                    pair.sellOrderSubmitted = false;
                                }
                                if (sellOrder.settled === true) {
                                    console.log(`Order by id: ${sellOrder.id} complete with $${pair.profit} USD`);
                                }
                            }
                        } else {
                            console.log("Unhandled....");
                        }
                    }

                    return pair;
                });

                // Functional no-no we are modifying the heck out of this state.
                tradePairs = updatedTradePairs;
                if(!summary) {
                    output(mode, tradePairs, "profit", ["buyOrderId"]);
                    summary = true;
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

const positionHelper = {
    tradesByAccount: async (client, accounts) => {
        return await Aigle.map(accounts, async (a) => {
            const accountHistory = await client.getAccountHistory(a.id);

            const trades = _.reduce(accountHistory, (acc, ah) => {
                if (ah.type === 'match') {
                    acc = acc.concat(ah)
                }
                return acc;
            }, []);
            return {currency: a.currency, trades}
        });
    },
    calculateUsdLookupInfo: (tradesByAccount) => {
        const usdInformation = _.find(tradesByAccount, {currency: "USD"});
        return _.map(usdInformation.trades, (t) => {
            const info = {
                tradeId: t.details.trade_id,
                currencyPair: t.details.product_id,
                usdAmount: t.amount,
                orderType: t.amount > 0 ? 'sell' : 'buy'
            };
            return info;
        });
    },
    findRelevantTrades: (usdLookupInfo, tradeFills, productPosition) => {
        const tradesWithInfo = _.map(tradeFills.trades, (trade) => {
            const foundTrade = _.find(usdLookupInfo, {tradeId: trade.details.trade_id});
            const usdAmount = foundTrade ? foundTrade.usdAmount: 0;
            return {
                ...trade,
                usdCost: Math.abs(usdAmount),
                [`${_.toLower(tradeFills.currency)}Limit`]: Math.abs(usdAmount / Number(trade.amount))
            }
        });
        const relevantTrades = _.filter(tradesWithInfo, (twi) => {
            if( parseFloat(twi.amount) <= 0 ) {
                return false;
            }
            if(productPosition <= 0 ) {
                return false
            } else {
                productPosition = productPosition - parseFloat(twi.amount);
                return true;
            }
        });
        return relevantTrades;
    }

}

async function listCostBasis(client, mode = 'json', product) {
    const accounts = await client.getAccounts();
    const positions = await client.listPositions();
    let productPosition = parseFloat(positions.accounts[product].balance);

    if(productPosition) {

        const tradesByAccount = await positionHelper.tradesByAccount(client, accounts);
        const usdLookupInfo = positionHelper.calculateUsdLookupInfo(tradesByAccount);

        _.forEach(tradesByAccount, (t) => {
            if(t.currency == product){
                const relevantTrades = positionHelper.findRelevantTrades(usdLookupInfo, t, productPosition);
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

async function showPositions(client, mode = 'json', product, price, filterFunction) {
    const accounts = await client.getAccounts();
    const positions = await client.listPositions();

    let productPosition = parseFloat(positions.accounts[product].balance);

    if(productPosition) {

        const tradesByAccount = await positionHelper.tradesByAccount(client, accounts);
        const usdLookupInfo = positionHelper.calculateUsdLookupInfo(tradesByAccount);

        _.forEach(tradesByAccount, (t) => {
            if(t.currency == product){
                const relevantTrades = _(positionHelper.findRelevantTrades(usdLookupInfo, t, productPosition))
                    .filter((p) => {
                        return filterFunction(p.btcLimit, price);
                    })
                    .map((t) => {
                        return {
                            ...t,
                            amount: parseFloat(t.amount)
                        }
                    })
                    .value();

                const usdCost = _(relevantTrades).map((twi) => { return Number(twi.usdCost)}).sum();
                const size = _(relevantTrades).map((twi) => { return Number(twi.amount)}).sum();
                const sellValue = price * size;

                console.log("Cost: ", usdCost);
                console.log("Size: ", size);
                console.log("Sell Value: ", sellValue);
                console.log("Unrealized Gain: ", sellValue - usdCost);

                output(mode, relevantTrades, ["amount", "usdCost"], ["details", "type", "id"]);
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
    showPositions
};
