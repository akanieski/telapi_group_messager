/**
 * Created by andrew on 4/16/14.
 */
var Client = require('telapi').client;
var Domain = require('domain');
var PhoneUtils = require('node-phonenumber').PhoneNumberUtil.getInstance();
var utils = require('../utils');
var ejs = require('ejs');
var flow = require('flow');
var moment = require('moment');


Controller = {

    /*
     Installs routes used in this controller
     */
    install: function (app) {
        app.post('/api/authenticate', this.authenticate);
        app.post('/api/process_csv', this.process_csv);
        app.post('/api/send_messages', this.send_messages);
        app.post('/api/get_responses', this.get_responses);
        app.get('/api/validate_number/:number', this.validate_number);
    },

    /*
     Validate number provided
     */
    validate_number: function (req, res) {
        res.send(PhoneUtils.isValidNumber(PhoneUtils.parse(req.params.number)));
    },

    /*
     Hard Coded User Account
     */
    account: {
        username: 'demo',
        password: 'd3m0',
        account_sid: 'AC5c8890843f0747111c5f42ee94e4356a',
        auth_token: '5eec398377a6418c9d7ca69221a376f2',
        number: '+12133483046'
    },

    /*
     Authenticates the session by taking an account_sid and auth_token and validating them with TelAPI. Resulting
     account information is stored in the session for future reference and validation.
     */
    authenticate: function (req, res) {
        var result = {};                                            // Prepare result payload
        var error = function (err) {
            result.errors = result.errors ? result.errors : [];     // Function used to accumulate error conditions
            result.errors.push(err.toString());
        }

        /*
         The following code checks to see if the username/password provided matches the hard coded user account
         */
        if (req.body.username !== Controller.account.username)
            error('Invalid Username');
        else if (req.body.password !== Controller.account.password)
            error('Invalid Password');

        if (result.errors) {
            res.send(result);
        } else {
            var client = new Client(
                /*
                 In a real environment you would take these creds from the request body or pull them directly from the user's
                 profile information.
                 */
                // req.body.account_sid, // AccountSID taken from Request Body
                // req.body.auth_token   // AuthToken taken from Request Body
                req.body.account_sid ? req.body.account_sid : Controller.account.account_sid,
                req.body.auth_token ? req.body.auth_token : Controller.account.auth_token
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
                        result.account = response;
                        res.send(result);
                    } else {
                        error('Account not active!');
                        res.send(result);
                    }
                },
                function (error) {
                    /*
                     Failed to contact TelAPI or TelAPI returned error case
                     */
                    error(error.toString());
                    res.send(result);
                }
            );
        }
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

        /*
         Warning following code should be removed if using for other purposes than demoing
         */
        req.body.account_sid = req.body.account_sid ? req.body.account_sid : Controller.account.account_sid;
        req.body.auth_token = req.body.auth_token ? req.body.auth_token : Controller.account.auth_token;

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
    },

    /*
     Request body contains list of 'items' that contain 'names' and 'numbers'. It will iterate through that list and
     using the TelAPI send SMS messages. The message sent is also passed into the request body.message. It will use EJS
     to embed the item's name.
     */
    send_messages: function (req, res) {

        var result = {};                                            // Prepare result payload

        var error = function (err) {
            result.errors = result.errors ? result.errors : [];     // Function used to accumulate error conditions
            result.errors.push(err.toString());
        }

        // Basic validation
        if (!req.body.items || req.body.items.length === 0)
            error('Recipients list is empty or missing.');
        if (!req.body.message)
            error('Message content is missing.');

        if (result.errors) {
            res.send(result);                                       // If errors exist then return errors
        } else {

            var client = new Client(
                /*
                 In a real environment you would take these creds from the request body or pull them directly from the user's
                 profile information.
                 */
                // req.body.account_sid, // AccountSID taken from Request Body
                // req.body.auth_token   // AuthToken taken from Request Body
                req.body.account_sid ? req.body.account_sid : Controller.account.account_sid,
                req.body.auth_token ? req.body.auth_token : Controller.account.auth_token
            );


            flow.exec(
                function () {
                    var next = this;                                      // 'this' in this context comes form the flow
                    // library. if next is called it moves to the
                    // function in the flow. If you have multiple
                    // async functions then you use next.MULTI()
                    req.body.items.forEach(function (item, i) {
                        var item_done = next.MULTI();
                        /*
                         Call TelAPI to send SMS Messages
                         */
                        client.create('sms_messages', {
                                To: item.number,
                                From: Controller.account.number,
                                Body: ejs.render(req.body.message, item)
                            },
                            function (response) {
                                /*
                                 TelAPI returned account info. But if account is not 'active' then do not allow them to continue.
                                 */
                                console.log('Message Sent');
                                item.from = Controller.account.number;
                                item.result = response;
                                item_done();
                            },
                            function (error) {
                                /*
                                 Failed to contact TelAPI or TelAPI returned error case
                                 */
                                console.log('Message Failed');
                                console.log(error);
                                item.errors = item.errors ? item.errors : [];
                                item.errors.push(error.toString());
                                item_done();
                            }
                        );

                    });
                },
                /*
                 At this point messages were attempted to be sent. Lets collect any responses
                 */
                function () {
                    req.body.date_sent = moment().utc().toDate();                     // keep track of current time. when fetching results
                    // we don't want SMS messages sent to the our TelAPI
                    // number that were sent before our current datetime
                    // Call existing get_responses logic
                    Controller.get_responses(req, res);
                }
            );

        }

    },

    /*
     request body expects a date_sent as well as a list of items that it can merge into responses
     */
    get_responses: function (req, res) {

        var client = new Client(
            /*
             In a real environment you would take these creds from the request body or pull them directly from the user's
             profile information.
             */
            // req.body.account_sid, // AccountSID taken from Request Body
            // req.body.auth_token   // AuthToken taken from Request Body
            req.body.account_sid ? req.body.account_sid : Controller.account.account_sid,
            req.body.auth_token ? req.body.auth_token : Controller.account.auth_token
        );

        /*
         Call TelAPI to retrieve SMS Responses
         */
        client.get('sms_messages', {
                PageSize: 100,
                DateSent: moment(req.body.date_sent).toDate()
            },
            function (response) {
                /*
                 TelAPI returned response
                 */
                console.log('Responses Fetched');
                req.body.items.forEach(function (item) {
                    item.responses = [];
                    response.sms_messages.forEach(function (msg) {
                        if (msg.sid === item.result.sid) {
                            item.result = msg;
                        } else if (moment(msg.date_sent).toDate() > moment(req.body.date_sent).toDate() && msg.from.trim().indexOf(item.number.trim()) > -1) {
                            item.responses.push(msg);
                        }
                    });
                });
                res.send(req.body);
            },
            function (error) {
                /*
                 Failed to contact TelAPI or TelAPI returned error case
                 */
                console.log('Message Failed');
                console.log(error);
                res.send(req.body);
            }
        );

    }

};
module.exports = Controller;