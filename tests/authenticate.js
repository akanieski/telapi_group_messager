/**
 * Created by andrew on 4/16/14.
 */

var assert = require("assert");

    describe('Authentication', function () {
        it('should return valid and active account information', function (done) {

            var controller = require('../controllers/telapi');
            controller.authenticate({
                session: {},
                body: {
                    account_sid: 'AC5c8890843f0747111c5f42ee94e4356a',
                    auth_token: '5eec398377a6418c9d7ca69221a376f2'
                }
            }, {
                send: function (payload) {
                    assert.equal('undefined', typeof payload.errors);
                    assert.equal('active', payload.account.status);
                    done();
                }
            });
        });
    });