# GDAX Trade Monitoring

# Description

This is a Trade Execution and Monitoring Command Line Utility for GDAX. 

# Usage

This application can be used to execute basic commands against the GDAX Exchange for Crypto Currencies. 

## Getting Started

### Authentication

Create your GDAX API Access / Auth File or you can provide each key as a parameter when invoking the application. 

GDAX API Provides you the ability to create your API Secret and Keys here

[Production Setup](https://www.gdax.com/settings/api)
[Sandbox Setup](https://public.sandbox.gdax.com/settings/api)

```json
{
  "key": "yourAPIKey",
  "secret": "yourGDAXSecret",
  "passphrase": "yourAPIPassphrase"
}
```

Recommandation is to save your production auth file as `your_name.json` and your sandbox file as `your_name.sandbox.json`

### Basic Command Structure

Invoking the command is very easy and follows at a minimum the following for each command. 

`node src/trade.js --auth-file your_name.sandbox.json --list products`

The above command supports listing all the products in the default JSON output format. If you prefer a more friendly format in the console try the tabular format.

`node src/trade.js --auth-file your_name.sandbox.json --list products --table`

### Account Information Commands

Show your balances at Coinbase and GDAX

`node src/trade.js --auth-file your_name.sandbox.json --list coinbase-accounts --table`   
`node src/trade.js --auth-file your_name.sandbox.json --list gdax-accounts --table`

### Order Management Commands

*Important note: If you want to execute your commands against production you must provide `-r` to each command. 
Additionally all orders are placed as Limit Orders only as Maker Orders to avoid fees.* 

View Your Open Orders

`node src/trade.js --auth-file your_name.sandbox.json --list orders --table`    

Cancel All Orders

`node src/trade.js --auth-file your_name.sandbox.json --cancel ALL --table`

Cancel All Active Orders By Product
    
`node src/trade.js --auth-file your_name.sandbox.json --cancel ETH-USD --table`

Place an Order as a Buy Side Limit Order

`node src/trade.js --auth-file adam_parrish.sandbox.json --buy-limit BTC-USD --amount 1 --limit-price 900`

Place an Order as a Sell Side Limit Order

`node src/trade.js --auth-file adam_parrish.sandbox.json --sell-limit BTC-USD --amount 1 --limit-price 1900`


### Accesing GDAX - For Real

When you are ready to access the real production / non-sandbox you have to provide a real production auth-file and the `-r` flag like this

`node src/trade.js --auth-file adam_parrish.json --buy-limit BTC-USD --amount 1 --limit-price 900 -r`

The above command will submit a REAL limit order to GDAX