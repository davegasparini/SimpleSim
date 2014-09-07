// resources
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var initializationCONTR = require('./controllers/initializationCONTR');
var mongoose = require('mongoose');

console.log("start");

// establish db connection
mongoose.connect('mongodb://localhost/simDB');

// manage incoming connections
io.sockets.on('connection', function(socket) {initializationCONTR.initialize(io,socket)} );


// app configuration settings
app.set('port', process.env.PORT || 80);
// set templating language to EJS rather than JADE.
app.set('view engine', 'ejs');
// create a path for public resources (CSS, JS, IMG)
app.use(express.static(path.join(__dirname, 'public')));
// render EJS file set for the default index page.
app.get('/', function(req, res) {
    res.render('default');
});


// start listening on the server. use callback to confirm in console.
server.listen(app.get('port'), function() {
    console.log("Express server listening on port " + app.get('port'));
});