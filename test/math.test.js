import {describe, it} from 'mocha';
import {expect} from 'chai';
import _ from 'lodash';
import {
    calculateLog10Scale,
    calculateLinearScale,
    calculatePricesForScale,
    log10Form,
    calculateMartingalePriceLadder
} from "../src/util/math";

describe('math', () => {

    describe('scaling', function() {

        /*
         Sample 10 Step Linear Scale:
         {
         1: 1,
         2: 2,
         3: 3,
         4: 4,
         5: 5,
         6: 6,
         7: 7,
         8: 8,
         9: 9,
         10: 10
         }
         */
        it('should help me calculate linear scaling factors', function() {
            const linear1 = calculateLinearScale(1);
            const linear2 = calculateLinearScale(2);
            const linear3 = calculateLinearScale(3);
            const linear10 = calculateLinearScale(10);

            expect(linear1).to.deep.equal({1: 1});
            expect(linear2).to.deep.equal({1: 1, 2: 2});
            expect(linear3).to.deep.equal({1: 1, 2: 2, 3: 3});
            expect(linear10).to.deep.equal({
                1: 1,
                2: 2,
                3: 3,
                4: 4,
                5: 5,
                6: 6,
                7: 7,
                8: 8,
                9: 9,
                10: 10
            });
        });

        /*
         Sample 10 Step Log 10 Scale:
         {
         1: 0,
         2: 0.3010299956639812,
         3: 0.47712125471966244,
         4: 0.6020599913279624,
         5: 0.6989700043360189,
         6: 0.7781512503836436,
         7: 0.8450980400142568,
         8: 0.9030899869919435,
         9: 0.9542425094393249,
         10: 1
         }
         */
        it('should help me calculate logarithmic scaling factors', function() {
            const logScale1 = calculateLog10Scale(1);
            const logScale2 = calculateLog10Scale(2);
            const logScale3 = calculateLog10Scale(3);
            const logScale10 = calculateLog10Scale(10);

            expect(logScale1).to.deep.equal({1: 0});
            expect(logScale2).to.deep.equal({1: 0, 2: 0.3010299956639812});
            expect(logScale3).to.deep.equal({1: 0, 2: 0.3010299956639812, 3: 0.47712125471966244});
            expect(logScale10).to.deep.equal({
                1: 0,
                2: 0.3010299956639812,
                3: 0.47712125471966244,
                4: 0.6020599913279624,
                5: 0.6989700043360189,
                6: 0.7781512503836436,
                7: 0.8450980400142568,
                8: 0.9030899869919435,
                9: 0.9542425094393249,
                10: 1
            });
        });

        it('should help me calculate linear prices based on a 1-10 scale', function() {
            const linearPrices = calculatePricesForScale(0, 10, calculateLinearScale(10));
            expect(linearPrices).to.deep.equal([
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8,
                9,
                10
            ]);
        });

        it('should help me calculate prices on a 1-10 scale between 1000 and 2000', function() {
            const linearPrices = calculatePricesForScale(1000, 2000, calculateLinearScale(10));
            expect(linearPrices).to.deep.equal([
                1100,
                1200,
                1300,
                1400,
                1500,
                1600,
                1700,
                1800,
                1900,
                2000
            ]);
        });

        it('should help me calculate prices on a 1-10 Log 10 scale between 1000 and 2000', function() {
            const logPrices = calculatePricesForScale(1000, 2000, calculateLog10Scale(10),
                (low, high, s, idx, size) => {return low + (s * idx * size)});
            expect(logPrices).to.deep.equal([
                1000,
                1060.2059991327963,
                1143.1363764158987,
                1240.823996531185,
                1349.4850021680095,
                1466.890750230186,
                1591.5686280099799,
                1722.4719895935548,
                1858.8182584953925,
                2000
            ]);
        });

        it('should help me calculate prices on a 1-10 Log 10 scale between 1000 and 2000', function() {
            const logPrices = calculatePricesForScale(7900, 7500, calculateLog10Scale(10), log10Form);
            expect(logPrices).to.deep.equal([
                7900
                ,7875.917600346882
                ,7842.745449433641
                ,7803.670401387526
                ,7760.205999132796
                ,7713.2436999079255
                ,7663.372548796008
                ,7611.011204162578
                ,7556.472696601843
                ,7500
            ]);
        });

    });


    describe.only('martingale', function(){

        it('should help calculate a simple 3 step ladder with $100 max investment', function() {
            const ladderResult = calculateMartingalePriceLadder(100, 3);
            expect(ladderResult.length).to.equal(3);
            expect(ladderResult).to.deep.equal(
                [
                    { amount: 8.333333333333334 },
                    { amount: 16.666666666666668 },
                    { amount: 50 }
                ]
            )
        });

        it('should help calculate a simple 10 step ladder with $10000 max investment', function() {
            const maxInvestment = 10000;
            const ladderResult = calculateMartingalePriceLadder(maxInvestment, 10);
            expect(ladderResult.length).to.equal(10);
            expect(ladderResult).to.deep.equal(
                [
                    { amount: 0.48828125},
                    { amount: 0.9765625},
                    { amount: 2.9296875},
                    { amount: 8.7890625},
                    { amount: 26.3671875},
                    { amount: 79.1015625},
                    { amount: 237.3046875},
                    { amount: 711.9140625},
                    { amount: 2135.7421875},
                    { amount: 6407.2265625}
                ]
            );
            expect(maxInvestment - _.sumBy(ladderResult, 'amount')).to.be.below(1000/10)
            console.log(_.sumBy(ladderResult, 'amount'));
        });
    })
});