const { Pool, Client } = require('pg')

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

module.exports = {
    savePriceInfo
};