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
        let ladder = [];
        for( let i = 0; i < steps; i = i+1) {
            const element = _.size(ladder) > 0 ?
                {
                    amount: _.sumBy(ladder, 'amount') * 2
                } :
                {
                    amount: guess
                };
            ladder.push(
                element
            )
        }
        return ladder;
    };

    const computeLadderHelper = (base, steps) => {
        let initialLadder = computeLadder(base, steps);
        // check guess
        let totalExposure = _.sumBy(initialLadder, 'amount');

        if(totalExposure > maxInvestment) {
            // revise and recurse - base bet is too big cut it in half
            const revision = base / 2;
            console.log("Revising because total exposure was greater than max: ", revision);
            return computeLadderHelper(revision, steps);
        } else if ( maxInvestment - totalExposure > (base / steps)  ) {
            const revision = base * 1.25;
            console.log("Revising because base is not accurate enough within tolerance: ", revision, (base/steps) / 100);
            // revise and recurse - base bet is too small multiply it by 1.25
            return computeLadderHelper(revision, steps);
        } else {
            return initialLadder;
        }
    };

    // make a basic guess
    const initialBaseGuess = maxInvestment / steps;
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