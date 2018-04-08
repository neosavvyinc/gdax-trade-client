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

`node src/trade.cmd.js --auth-file your_name.sandbox.json --list products`

The above command supports listing all the products in the default JSON output format. If you prefer a more friendly format in the console try the tabular format.

`node src/trade.cmd.js --auth-file your_name.sandbox.json --list products --table`

### Account Information Commands

Show your balances at Coinbase and GDAX

`node src/trade.cmd.js --auth-file your_name.sandbox.json --list coinbase-accounts --table`   
`node src/trade.cmd.js --auth-file your_name.sandbox.json --list gdax-accounts --table`

### Order Management Commands

*Important note: If you want to execute your commands against production you must provide `-r` to each command. 
Additionally all orders are placed as Limit Orders only as Maker Orders to avoid fees.* 

View Your Open Orders

`node src/trade.cmd.js --auth-file your_name.sandbox.json --list orders --table`    

Cancel All Orders

`node src/trade.cmd.js --auth-file your_name.sandbox.json --cancel ALL --table`

Cancel All Active Orders By Product
    
`node src/trade.cmd.js --auth-file your_name.sandbox.json --cancel ETH-USD --table`

Place an Order as a Buy Side Limit Order

`node src/trade.cmd.js --auth-file adam_parrish.sandbox.json --buy-limit BTC-USD --amount 1 --limit-price 900`

Place an Order as a Sell Side Limit Order

`node src/trade.cmd.js --auth-file adam_parrish.sandbox.json --sell-limit BTC-USD --amount 1 --limit-price 1900`

Place a Scale In Order to Buy via Martingale Price Ladder

`gtrade  -f ./adam_parrish.json -r --scale-in BTC-USD --buy-source-amount 10000 --entry-price 5000 --logarithmic-steps 8`

which will produce the following buy orders to provide more opportunities to sell as a price is declining:

```
orange:gdax-trade-client adamparrish$ gtrade --table -f ./adam_parrish.json -r --scale-in BTC-USD --buy-source-amount 10000 --entry-price 5000 --logarithmic-steps 15 --lower-bound 0.6
Submitting BUY orders for
Currency:     BTC-USD
With Entry Price:  5000
side   product_id  post_only  size       price      cost
-----  ----------  ---------  ---------  ---------  -----------------
"buy"  "BTC-USD"   true       "0.00334"  "5000.00"            16.6855
"buy"  "BTC-USD"   true       "0.01017"  "4919.73"            50.0565
"buy"  "BTC-USD"   true       "0.03123"  "4809.15"           150.1694
"buy"  "BTC-USD"   true       "0.09629"  "4678.90"           450.5081
"buy"  "BTC-USD"   true       "0.29809"  "4534.02"          1351.5244
"buy"  "BTC-USD"   true       "0.92623"  "4377.48"          4054.5731
-----  ----------  ---------  ---------  ---------  -----------------
                                                    6073.516845703125

price            size          product_id  side   stp   type     time_in_force  post_only  created_at                     fill_fees             filled_size   executed_value        status     settled
---------------  ------------  ----------  -----  ----  -------  -------------  ---------  -----------------------------  --------------------  ------------  --------------------  ---------  -------
"5000.00000000"  "0.00334000"  "BTC-USD"   "buy"  "dc"  "limit"  "GTC"          true       "2018-04-08T17:47:22.569224Z"  "0.0000000000000000"  "0.00000000"  "0.0000000000000000"  "pending"  false

price            size          product_id  side   stp   type     time_in_force  post_only  created_at                     fill_fees             filled_size   executed_value        status     settled
---------------  ------------  ----------  -----  ----  -------  -------------  ---------  -----------------------------  --------------------  ------------  --------------------  ---------  -------
"4919.73000000"  "0.01017000"  "BTC-USD"   "buy"  "dc"  "limit"  "GTC"          true       "2018-04-08T17:47:22.622521Z"  "0.0000000000000000"  "0.00000000"  "0.0000000000000000"  "pending"  false

price            size          product_id  side   stp   type     time_in_force  post_only  created_at                     fill_fees             filled_size   executed_value        status     settled
---------------  ------------  ----------  -----  ----  -------  -------------  ---------  -----------------------------  --------------------  ------------  --------------------  ---------  -------
"4534.02000000"  "0.29809000"  "BTC-USD"   "buy"  "dc"  "limit"  "GTC"          true       "2018-04-08T17:47:22.627123Z"  "0.0000000000000000"  "0.00000000"  "0.0000000000000000"  "pending"  false

price            size          product_id  side   stp   type     time_in_force  post_only  created_at                    fill_fees             filled_size   executed_value        status     settled
---------------  ------------  ----------  -----  ----  -------  -------------  ---------  ----------------------------  --------------------  ------------  --------------------  ---------  -------
"4809.15000000"  "0.03123000"  "BTC-USD"   "buy"  "dc"  "limit"  "GTC"          true       "2018-04-08T17:47:22.63499Z"  "0.0000000000000000"  "0.00000000"  "0.0000000000000000"  "pending"  false

price            size          product_id  side   stp   type     time_in_force  post_only  created_at                     fill_fees             filled_size   executed_value        status     settled
---------------  ------------  ----------  -----  ----  -------  -------------  ---------  -----------------------------  --------------------  ------------  --------------------  ---------  -------
"4377.48000000"  "0.92623000"  "BTC-USD"   "buy"  "dc"  "limit"  "GTC"          true       "2018-04-08T17:47:22.636251Z"  "0.0000000000000000"  "0.00000000"  "0.0000000000000000"  "pending"  false

price            size          product_id  side   stp   type     time_in_force  post_only  created_at                     fill_fees             filled_size   executed_value        status     settled
---------------  ------------  ----------  -----  ----  -------  -------------  ---------  -----------------------------  --------------------  ------------  --------------------  ---------  -------
"4678.90000000"  "0.09629000"  "BTC-USD"   "buy"  "dc"  "limit"  "GTC"          true       "2018-04-08T17:47:22.647323Z"  "0.0000000000000000"  "0.00000000"  "0.0000000000000000"  "pending"  false

```


### Accesing GDAX - For Real

When you are ready to access the real production / non-sandbox you have to provide a real production auth-file and the `-r` flag like this

`node src/trade.cmd.js --auth-file adam_parrish.json --buy-limit BTC-USD --amount 1 --limit-price 900 -r`

The above command will submit a REAL limit order to GDAX