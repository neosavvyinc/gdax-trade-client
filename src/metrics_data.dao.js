const { Pool, Client } = require('pg');
const moment = require('moment');

const pool = Pool({
    user: 'trademon',
    host: 'localhost',
    database: 'trademon_db',
    password: 'trademon',
    port: 5432,
});

async function savePriceInfo(priceInfo) {
    const client = await pool.connect();

    try {
        // await client.query('BEGIN');
        const { priceInfoRows } = await client.query(
            'INSERT INTO price_history(product_id, price, open_24h, volume_24h, low_24h, high_24h, volume_30d, best_bid, best_ask, time) ' +
            'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
            [
                priceInfo.product_id,
                priceInfo.price,
                priceInfo.open_24h,
                priceInfo.volume_24h,
                priceInfo.low_24h,
                priceInfo.high_24h,
                priceInfo.volume_30d,
                priceInfo.best_bid,
                priceInfo.best_ask,
                new Date(priceInfo.time)
            ]
        );


    } catch (e) {
        console.log('Error executing insert of price info: ', e.stack);
        throw e
    } finally {
        client.release();
    }

}

async function saveHourly(priceInfo) {
    const client = await pool.connect();

    try {
        // await client.query('BEGIN');
        console.log("inserting: ", moment.unix(priceInfo.time).toDate())
        const { priceInfoRows } = await client.query(
            'INSERT INTO hourly_candles(product_id, open_price, close_price, volume, low, high, time) ' +
            'VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [
                priceInfo.product_id,
                priceInfo.open,
                priceInfo.close,
                priceInfo.volume,
                priceInfo.low,
                priceInfo.high,
                moment.unix(priceInfo.time).toDate()
            ]
        );


    } catch (e) {
        console.log('Error executing insert of price info: ', e.stack);
        throw e
    } finally {
        client.release();
    }

}


async function savePortfolioInfo(portfolioInfo) {
    console.log(`Saving portfolio for price tick: ${JSON.stringify(portfolioInfo)}`);
    console.log("portfolioInfoTime: ", portfolioInfo.time);
    const client = await pool.connect();

    try {
        const { priceInfoRows } = await client.query(
            'INSERT INTO portfolio_history(' +
            'dollar_value, btc_value, eth_value, ltc_value, bch_value, timestamp, total_value) ' +
            'VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [
                portfolioInfo.dollar_value,
                portfolioInfo.btc_value,
                portfolioInfo.eth_value,
                portfolioInfo.ltc_value,
                portfolioInfo.bch_value,
                new Date(portfolioInfo.time),
                portfolioInfo.total_value
            ]
        );


    } catch (e) {
        console.log('Error executing insert of price info: ', e.stack);
    } finally {
        client.release();
    }

}

module.exports = {
    savePriceInfo,
    savePortfolioInfo,
    saveHourly
};