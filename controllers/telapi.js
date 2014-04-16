/**
 * Created by andrew on 4/16/14.
 */
var Client = require('telapi').client;
var Domain = require('domain');
var PhoneUtils = require('node-phonenumber').PhoneNumberUtil.getInstance();
var utils = require('../utils');

module.exports = {

    /*
     Installs routes used in this controller
     */
    install: function (app) {
        app.post('/api/authenticate', this.authenticate);
        app.post('/api/process_csv', this.process_csv);
    },

    /*
     Authenticates the session by taking an account_sid and auth_token and validating them with TelAPI. Resulting
     account information is stored in the session for future reference and validation.
     */
    authenticate: function (req, res) {

        var client = new Client(
            req.body.account_sid, // AccountSID taken from Request Body
            req.body.auth_token   // AuthToken taken from Request Body
        );

        /*
         Call TelAPI to retrieve account info.
         */
        client.get('account', null,
            function (response) {
                /*
                 TelAPI returned account info. But if account is not 'active' then do not allow them to continue.
                 */
                if (response && response.status === 'active') {
                    req.session.account = response;
                    res.send({account: response});
                } else {
                    res.send({errors: 'Account not active!'});
                }
            },
            function (error) {
                /*
                 Failed to contact TelAPI or TelAPI returned error case
                 */
                res.send({errors: [error.toString()]});
            }
        );

    },

    /*
     Request body contains a 'data' field that holds a Base64 binary string in the text/csv format. Parses the
     CSV into JSON objects. Validates the phone numbers that are passed in. Then returns the results to the client.
     */
    process_csv: function (req, res) {
        var result = {};                                            // Prepare result payload
        var error = function (err) {
            result.errors = result.errors ? result.errors : [];     // Function used to accumulate error conditions
            result.errors.push(err.toString());
        }
        if (!req.body.data) {                                       // CSV Data is required
            error('Invalid CSV Upload');
        }
        if (!req.body.auth_token) {                                 // Authorization Token required
            error('Authorization Token Required');
        }
        if (!req.body.account_sid) {                                // Account SID is required
            error('AccountSID Required');
        }

        if (result.errors && result.errors.length > 0) {            // If error conditions exist then return with errors
            res.send(result);
        } else {

            var domain = Domain.create();                           // Setup error handling domain

            domain.on('error', function (e) {                       // Setup means of safe escape in case of error
                error(e);
                res.send(result);
            });

            domain.run(function () {
                result.items = [];                                                                     // Initialize array of resulting items
                var field_wrapper = req.body.field_wrapper ? req.body.field_wrapper : '"';          // Allow for overridden field wrapper, default is double quote
                var field_delimiter = req.body.field_delimiter ? req.body.field_delimiter : ',';    // Allow for overridden field delimiter, default is comma

                var csv_data = new Buffer(req.body.data, 'base64').toString();                      // Convert from Base64 to String

                var lines = csv_data.replaceAll('\r\n', '\n').split('\n');                           // Remove \r\n and replace with \n then split

                lines.forEach(function (line) {                                                       // Iterate through lines

                    var fields = line.split(field_delimiter);                                       // Split lines by field_delimiter

                    fields.forEach(function (field, index) {
                        fields[index] = field.replaceAll(field_wrapper, '');                       // Adjust fields to remove field wrapper
                    });

                    result.items.push({
                        name: fields[0],
                        number: fields[1],
                        valid: PhoneUtils.isValidNumber(PhoneUtils.parse(fields[1]))
                    });

                });

                res.send(result);

            });


        }
    }
}