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

module.exports = {
    calculatePricesForScale,
    log10Form,
    linearForm,
    calculateLinearScale,
    calculateLog10Scale
};