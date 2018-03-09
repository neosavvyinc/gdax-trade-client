const Gdax = require('gdax');
const ExtendedClient = require('./authenticated');
const fs = require('fs');

const {
    apiURI,
    sandboxURI,
    wsApiURI,
    sandboxWsApiURI
} = require('./constants');

function determineURI(real = false) {
    return real ? apiURI : sandboxURI;
}

function getAuthenticatedClient(base = false, real = false, authFile) {
    const configFile = getCredentials(authFile);
    const credentials = configFile && configFile.gdax ? configFile.gdax : {};
    if(credentials.key && credentials.secret && credentials.passphrase) {
        if(base) {
            return new Gdax.AuthenticatedClient(
                credentials.key,
                credentials.secret,
                credentials.passphrase,
                determineURI(real)
            );
        } else {
            return new ExtendedClient(
                credentials.key,
                credentials.secret,
                credentials.passphrase,
                determineURI(real)
            );
        }
    } else {
        console.log("You must provide an auth-file or key, secret, and passphrase parameters");
        commander.help();
        process.exit(1)
    }
}

function getCredentials(authFile) {
    if(authFile) {
        try {
            const fileContents = fs.readFileSync(authFile);
            const authFileContents = JSON.parse(fileContents);
            return authFileContents;
        } catch (error) {
            console.log("An Error Occurred Reading the file: ", authFile);
            console.log("Error: ", error);
            process.exit(1);
        }
    } else {
        return {
            "key": null,
            "secret": null,
            "passphrase": null
        }
    }
}

module.exports = {
    getAuthenticatedClient,
    getCredentials
};