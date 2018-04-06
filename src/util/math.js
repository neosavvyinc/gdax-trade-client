const _ = require('lodash');

function calculateLog10Scale(steps) {
    const scale = _.map(new Array(steps), (s, idx) => {
        return idx + 1
    });

    return _.reduce(scale, (acc, s) => {
        acc[s] = Math.log10(s);
        return acc;
    }, {});
}

function calculateLinearScale(steps) {
    const scale = _.map(new Array(steps), (s, idx) => {
        return idx + 1
    });

    return _.reduce(scale, (acc, s) => {
        acc[s] = s;
        return acc;
    }, {});
}

const linearForm = (low, high, s, idx, size) => (low + (s * size));
const log10Form = (low, high, s, idx, size) => (low + (s * idx * size));

function calculatePricesForScale(low, high, scale, form = linearForm) {
    const scaleSize = Number(_.size(scale));
    const distance = high - low;
    const size = distance / scaleSize;
    return _.map(scale, (s, idx) => {
        return form(low, high, s, idx, size)
    });
}


/*
http://forexop.com/martingale-trading-system-overview/
https://en.wikipedia.org/wiki/Taleb_distribution
 */
function calculateMartingalePriceLadder(maxInvestment, steps) {

    const computeLadder = (guess, steps) => {
        console.log("Computing for ", guess);
        console.log("Computing for ", steps);
        let ladder = [];
        for( let i = 0; i < steps; i = i+1) {
            ladder.push(
                {
                    amount: Math.pow(guess, i)
                }
            )
        }
        return ladder;
    };

    const computeLadderHelper = (base, steps) => {
        console.log("base: ", base);
        console.log("stes: ", steps);

        let initialLadder = computeLadder(base, steps);
        console.log("initialLadder: ", initialLadder);
        // check guess
        let totalExposure = _.sumBy(initialLadder, 'amount');
        console.log("totalExposure: ", totalExposure);
        if(totalExposure > maxInvestment) {
            // revise and recurse - base bet is too big cut it in half
            const revision = base / 2;
            console.log("revision - max investment too high: ", revision);
            return computeLadderHelper(revision, steps);
        } else if ( maxInvestment - totalExposure < base / steps ) {
            const revision = base * 1.25;
            // revise and recurse - base bet is too small multiply it by 1.25
            console.log("revision - max investment too low: ", revision);
            return computeLadderHelper(revision, steps);
        } else {
            console.log("no revisions it's just right");
            return initialLadder;
        }
    };

    // make a basic guess
    const initialBaseGuess = maxInvestment / steps;
    console.log("initialGuess: ", initialBaseGuess);
    return computeLadderHelper(initialBaseGuess, steps);
}

module.exports = {
    calculatePricesForScale,
    log10Form,
    linearForm,
    calculateLinearScale,
    calculateLog10Scale,
    calculateMartingalePriceLadder
};