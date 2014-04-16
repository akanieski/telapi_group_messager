/**
 * Created by andrew on 4/16/14.
 */

var assert = require("assert");


describe('CSV Parsing', function () {

    it('should return items parsed from sample.csv', function (done) {
        require('fs').readFile(require('path').resolve('./public/sample.csv'), function (err, content) {
            var data = new Buffer(content, 'binary').toString('base64');
            var controller = require('../controllers/telapi');
            controller.process_csv({
                session: {},
                body: {
                    account_sid: 'AC5c8890843f0747111c5f42ee94e4356a',
                    auth_token: '5eec398377a6418c9d7ca69221a376f2',
                    data: data
                }
            }, {
                send: function (payload) {
                    assert.equal(true, payload.items && payload.items.length > 0);
                    assert.equal(true, !payload.errors || payload.errors.length === 0);
                    done();
                }
            });
        });
    });

    it('should return invalid items parsed from sample_bad.csv', function (done) {
        require('fs').readFile(require('path').resolve('./public/sample_bad.csv'), function (err, content) {
            var data = new Buffer(content, 'binary').toString('base64');
            var controller = require('../controllers/telapi');
            controller.process_csv({
                session: {},
                body: {
                    account_sid: 'AC5c8890843f0747111c5f42ee94e4356a',
                    auth_token: '5eec398377a6418c9d7ca69221a376f2',
                    data: data
                }
            }, {
                send: function (payload) {
                    var failed = [];
                    (payload.items ? payload.items : []).forEach(function(item, i){
                       if (!item.valid)
                           failed.push(payload.items[i]);
                    });
                    assert.equal(true, failed.length > 0);
                    assert.equal(true, !payload.errors || payload.errors.length === 0);
                    done();
                }
            });
        });
    });

});