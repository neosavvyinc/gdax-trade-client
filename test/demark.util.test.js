import {describe, it} from 'mocha';
import {expect} from 'chai';
import {
    findCandlesSinceBearishFlip,
    findCandlesSinceBullishFlip
} from "../src/util/demark.util";

import { data } from './demark.data';

describe('demark', () => {

    describe('findCandlesSinceBearishFlip', function () {

        it.only('should find the most recent candles since a bearish price flip',()=> {
            const bearishCandles = findCandlesSinceBearishFlip(data);
            console.log(bearishCandles);
        });



    });

    describe('findCandlesSinceBullishFlip', function () {

        it.only('should find the most recent candles since a bearish price flip',()=> {
            const bullishCandles = findCandlesSinceBullishFlip(data);
            console.log(bullishCandles);
        });



    });

});