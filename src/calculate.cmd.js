#!/usr/bin/env node

const commander = require('commander');
const AWS = require('aws-sdk');


const fs = require('fs');
const gdax = require('./api/gdax');

const _ = require('lodash');
const pjson = require('../package.json');

const {
    PRODUCT_ID_REGEX
} = require('./util/constants');

const AuthUtils = require('./util/authentication.util');
const { output, determineOutputMode } = require('./util/logging.util');

function list(val) {
    return val.split(',');
}

let config, authedClient;

    commander.version(pjson.version)

    /**
     * Sandbox is default environment without this flag - safety first!
     */
    .option('-r --real', 'Real Trading Mode - Default is Sandbox. Safety First.')

    /**
     * Authentication
     */
    .option('-f --auth-file [authFile]', 'Authentication File with key, secret and passphrase')

    .option('-k --key [key]', 'Authentication Key from GDAX')
    .option('-s --secret [secret]', 'Authentication Secret from GDAX')
    .option('-p --passphrase [passphrase]', 'Authentication Passphrase from GDAX')

    /**
     * Output Modes
     */
    .option('--table', 'Tabular Output Mode')
    .option('--json', 'JSON Output Mode')

    .option('-c --cost-basis <product>', 'Calculate Average Cost of Position', PRODUCT_ID_REGEX)
    .option('--list-fills <product>', 'Show Fills', PRODUCT_ID_REGEX)
    .parse(process.argv);

if(commander.authFile) {
    config = AuthUtils.getCredentials(commander.authFile);
    authedClient = AuthUtils.getAuthenticatedClient(false, commander.real, commander.authFile);
}

if(commander.costBasis) {
    const product = commander.costBasis;
    gdax.listCostBasis(authedClient, determineOutputMode(commander), product);
}

if(commander.listFills) {
    const product = commander.listFills;
    gdax.listFills(authedClient, determineOutputMode(commander), product);
}