const apiURI = 'https://api.gdax.com';
const sandboxURI = 'https://api-public.sandbox.gdax.com';

const wsApiURI = 'wss://ws-feed.gdax.com';
const sandboxWsApiURI = 'wss://ws-feed.sandbox.gdax.com';

const PRODUCT_ID_REGEX = /^(BTC-USD|BCH-USD|ETH-USD|LTC-USD)/i;

module.export = {
    apiURI,
    sandboxURI,
    wsApiURI,
    sandboxWsApiURI,
    PRODUCT_ID_REGEX
};