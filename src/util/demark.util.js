const _ = require('lodash');

/**
 * @param currentCandle Should be the 0th candle in an array or stream of candles
 * @param marketCandle Should be the 1st candle in an array or stream of candles
 * @param currentComparisonCandle Should be the 4th candle in an array or stream of candles
 * @param marketComparisonCandle Should be the 5th candle in an array or stream of candles
 * @returns {boolean}
 */
function isCandleBearish(currentCandle, marketCandle, currentComparisonCandle, marketComparisonCandle) {
    return currentCandle.close < currentComparisonCandle.close &&
        marketCandle.close > marketComparisonCandle.close;
}

/**
 *
 * @param currentCandle Should be the 0th candle in an array or stream of candles
 * @param marketCandle Should be the 1st candle in an array or stream of candles
 * @param currentComparisonCandle Should be the 4th candle in an array or stream of candles
 * @param marketComparisonCandle Should be the 5th candle in an array or stream of candles
 * @returns {boolean}@returns {boolean}
 */
function isCandleBullish(currentCandle, marketCandle, currentComparisonCandle, marketComparisonCandle) {
    return currentCandle.close > currentComparisonCandle.close &&
        marketCandle.close < marketComparisonCandle.close;
}


/**
 * Bearish Price Flip - occurs when the market records a close greater
 * than the close four bars earlier, immediately followed by a close less
 * than the close four bars earlier.
 * @param candles
 */
function findCandlesSinceBearishFlip(candles) {
   // is close of current candle greater than 4 candles previous
   // is previousClose less than current minus 5
    let currentCandleIndex = 0;
    let bearishFound = false;

    const candleDataLength = candles.length;

    return _.reduce(candles, (acc, currentCandle) => {
        if(bearishFound) {
            return acc;
        }

        const indicesNeeded = (currentCandleIndex + 5);
        if( indicesNeeded < candleDataLength ){
            const isBearishPriceFlip = isCandleBearish(
                currentCandle,
                candles[currentCandleIndex + 1],
                candles[currentCandleIndex + 4],
                candles[currentCandleIndex + 5]
            );
            bearishFound = isBearishPriceFlip ? true : false;

            const updatedCandle = _.merge({}, {isBearishPriceFlip}, currentCandle);
            currentCandleIndex=currentCandleIndex+1;
            return acc.concat(updatedCandle);
        }
        else {
            return acc;
        }
    }, []);
}

/**
 * Bullish Price Flip - occurs when the market records a close less than
 * the close four bars before, immediately followed by a close greater
 * than the close four bars earlier.
 * @param candles
 * @returns {*}
 */
function findCandlesSinceBullishFlip(candles) {
    let currentCandleIndex = 0;
    let bullishPriceFound = false;

    const candleDataLength = candles.length;

    return _.reduce(candles, (acc, currentCandle) => {
        if(bullishPriceFound) {
            return acc;
        }

        const indicesNeeded = (currentCandleIndex + 5);
        if( indicesNeeded < candleDataLength ){
            const bullishPriceFlip = isCandleBullish(
                currentCandle,
                candles[currentCandleIndex + 1],
                candles[currentCandleIndex + 4],
                candles[currentCandleIndex + 5]
            );
            bullishPriceFound = bullishPriceFlip ? true : false;

            const updatedCandle = _.merge({}, {isBullishPriceFlip: bullishPriceFlip}, currentCandle);
            currentCandleIndex=currentCandleIndex+1;
            return acc.concat(updatedCandle);
        }
        else {
            return acc;
        }
    }, []);
}

function findRecentCombinedBullishAndBearishCandles(candles) {
    let currentCandleIndex = 0;
    const candleDataLength = candles.length;

    return _.reduce(candles, (acc, currentCandle) => {

        const indicesNeeded = (currentCandleIndex + 5);
        if( indicesNeeded < candleDataLength ){
            const isBearishPriceFlip = isCandleBearish(
                currentCandle,
                candles[currentCandleIndex + 1],
                candles[currentCandleIndex + 4],
                candles[currentCandleIndex + 5]
            );

            const bullishPriceFlip = isCandleBullish(
                currentCandle,
                candles[currentCandleIndex + 1],
                candles[currentCandleIndex + 4],
                candles[currentCandleIndex + 5]
            );

            const updatedCandle = _.merge({}, {
                isBullishPriceFlip: bullishPriceFlip,
                isBearishPriceFlip: isBearishPriceFlip
            }, currentCandle);
            currentCandleIndex=currentCandleIndex+1;
            return acc.concat(updatedCandle);
        }
        else {
            return acc;
        }
    }, []);
}

module.exports =  {
    findCandlesSinceBearishFlip,
    findCandlesSinceBullishFlip,
    findRecentCombinedBullishAndBearishCandles
};