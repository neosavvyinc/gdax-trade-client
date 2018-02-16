const Table = require('easy-table');
const _ = require('lodash');

function output(mode, data, sumColumn) {
    if(!data || _.isEmpty(data)) {
        return;
    }
    if(mode === 'json') {
        _.forEach(data, (d) => console.log(JSON.stringify(d, null, 4)));
    } else {
        const t = new Table();
        _.forEach(data, (d) => {
            const keys = _.keys(d);
            _.forEach(keys, (k) => {
                if( d[k] === "string" ) {
                    t.cell(k, d[k])
                } else if( typeof d[k] === "number") {
                    t.cell(k, d[k], Table.number(4));
                } else {
                    const str = JSON.stringify(d[k]);
                    t.cell(k, str);
                }
            });
            t.newRow();
        });

        if(sumColumn) {
            t.total(sumColumn);
        }

        console.log(t.toString());
    }
}

module.exports = {
    output
};