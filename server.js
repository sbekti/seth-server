var express = require('express');
var app = express();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var sockjs = require('sockjs');

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/api/v1/location', function(req, res) {
  var data = req.body;
  console.log(data);
  res.send(OK);
});

var echo = sockjs.createServer({
  sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js'
});

echo.on('connection', function(conn) {
  conn.on('data', function(message) {
    console.log(message);
    conn.write(message);
  });

  conn.on('close', function() {
    console.log('A connection was closed.');
  });
});

echo.installHandlers(http, {
  prefix: '/echo'
});

http.listen(5000, '0.0.0.0');
