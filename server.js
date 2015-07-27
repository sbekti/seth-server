var http = require('http');
var sockjs = require('sockjs');

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

  setInterval(function() {
    conn.write('Hello?')
  }, 1000);
});

var server = http.createServer();

echo.installHandlers(server, {
  prefix: '/echo'
});

server.listen(5000, '0.0.0.0');
