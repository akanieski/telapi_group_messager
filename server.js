/**
 * Created by andrew on 4/14/14.
 */

var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var app = express();
var utils = require('./utils.js');

app.use(express.static(__dirname + '/public')); 	// set the static files location /public/img will be /img for users
app.use(morgan('dev')); 					        // log every request to the console
app.use(bodyParser()); 						        // pull information from html in POST
app.use(methodOverride()); 					        // simulate DELETE and PUT
app.use(cookieParser())                             // Used to maintain sessions
app.use(session({                                   // Session initialization settings
    secret: 'telapi demo project',
    cookie: { maxAge: 60000 }}));
// Install Controllers
require('./controllers/telapi.js').install(app);

app.listen(8080 | process.env.PORT);
console.log('TelAPI Group Messager started on port ' + (8080 | process.env.PORT)); 			// shoutout to the user