var express = require('express');
var app = express();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var path = require('path');
var sockjs = require('sockjs');
var uuid = require('node-uuid');
var models = require('./models');

var connections = {};

app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(express.static('public'));

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/v1/user', function(req, res) {
  if (!req.body.name) {
    res.status(400).end();
    return;
  }

  if (!req.body.username) {
    res.status(400).end();
    return;
  }

  if (!req.body.password) {
    res.status(400).end();
    return;
  }

  models.Device.create({
    name: req.body.name,
    username: req.body.username.toLowerCase(),
    password: req.body.password
  }).then(function(device) {
    res.json(device);
  });
});

app.post('/api/v1/location', function(req, res) {
  console.log(req.body);

  var data = {};

  if ((req.body.date) && (req.body.time)) {
    var day = parseInt(req.body.date.substring(0, 2));
    var month = parseInt(req.body.date.substring(2, 4)) - 1;
    var year = parseInt(req.body.date.substring(4, 8));

    var hours = parseInt(req.body.time.substring(0, 2));
    var minutes = parseInt(req.body.time.substring(2, 4));
    var seconds = parseInt(req.body.time.substring(4, 6));

    data.timestamp = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  }

  if (req.body.id) {
    data.DeviceId = parseInt(req.body.id);
  }

  if (req.body.lat) {
    data.latitude = parseFloat(req.body.lat);
  }

  if (req.body.lng) {
    data.longitude = parseFloat(req.body.lng);
  }

  if (req.body.alt) {
    data.altitude = parseFloat(req.body.alt);
  }

  if (req.body.speed) {
    data.speed = parseFloat(req.body.speed);
  }

  if (req.body.course) {
    data.course = parseFloat(req.body.course);
  }

  if (req.body.sat) {
    data.satellites = parseInt(req.body.sat);
  }

  if (req.body.hdop) {
    data.hdop = req.body.hdop / 100;
  }

  if (req.body.age) {
    data.age = parseFloat(req.body.age);
  }

  if (req.body.charge) {
    data.charge = parseFloat(req.body.charge);
  }

  if (req.body.voltage) {
    data.voltage = parseFloat(req.body.voltage) / 1000;
  }

  if (req.body.signal) {
    data.signal = parseFloat(req.body.signal);
  }

  models.Location.create(data).then(function(location) {
    var connectionsForDeviceId = connections[data.DeviceId];

    for (var uuid in connectionsForDeviceId) {
      if (connectionsForDeviceId.hasOwnProperty(uuid)) {
        var conn = connectionsForDeviceId[uuid];

        var reply = {
          event: 'update',
          payload: {
            location: location
          }
        };

        conn.write(JSON.stringify(reply));
      }
    }
  });

  res.send('OK');
});

var location = sockjs.createServer({
  sockjs_url: 'http://cdn.jsdelivr.net/sockjs/1.0.1/sockjs.min.js'
});

location.on('connection', function(conn) {
  conn.on('data', function(message) {
    var data = JSON.parse(message);
    if (!data.payload) return;

    if (data.event == 'authenticate') {
      if (!data.payload.username) return;
      if (!data.payload.password) return;

      models.Device.findOne({
        where: {
          username: data.payload.username,
          password: data.payload.password
        }
      }).then(function(device) {
        if (device) {
          conn.authenticated = true;
          conn.deviceId = device.id;
          conn.uuid = uuid.v4();

          if (!connections[device.id]) {
            connections[device.id] = {};
          }

          connections[conn.deviceId][conn.uuid] = conn;
          console.log(connections);

          var reply = {
            event: 'authenticate',
            payload: {
              status: 'success',
              deviceId: device.id,
              deviceName: device.name
            }
          };

          conn.write(JSON.stringify(reply));
        } else {
          var reply = {
            event: 'authenticate',
            payload: {
              status: 'error',
              message: 'Invalid username or password.',
              deviceId: null,
              deviceName: null
            }
          };

          conn.write(JSON.stringify(reply));
        }
      });
    } else if (data.event == 'location') {
      if (!conn.authenticated) return;
      if (!data.payload.deviceId) return;
      if (!data.payload.start) return;
      if (!data.payload.end) return;

      models.Location.findAll({
        where: {
          DeviceId: data.payload.deviceId,
          timestamp: {
            between: [new Date(data.payload.start * 1000), new Date(data.payload.end * 1000)]
          }
        },
        order: [
          ['timestamp', 'ASC']
        ]
      }).then(function(locations) {
        var reply = {
          event: 'location',
          payload: {
            status: 'success',
            locations: locations
          }
        };

        conn.write(JSON.stringify(reply));
      });
    } else if (data.event == 'lowerbound') {
      if (!conn.authenticated) return;
      if (!data.payload.deviceId) return;

      models.Location.findOne({
        where: {
          DeviceId: data.payload.deviceId,
          timestamp: {
            not: null
          }
        },
        order: [
          ['timestamp', 'ASC']
        ]
      }).then(function(location) {
        var reply = {
          event: 'lowerbound',
          payload: {
            status: 'success',
            location: location
          }
        };

        conn.write(JSON.stringify(reply));
      });
    } else if (data.event == 'upperbound') {
      if (!conn.authenticated) return;
      if (!data.payload.deviceId) return;

      models.Location.findOne({
        where: {
          DeviceId: data.payload.deviceId
        },
        order: [
          ['createdAt', 'DESC']
        ]
      }).then(function(location) {
        var reply = {
          event: 'upperbound',
          payload: {
            status: 'success',
            location: location
          }
        };

        conn.write(JSON.stringify(reply));
      });
    } else if (data.event == 'lastknown') {
      if (!conn.authenticated) return;
      if (!data.payload.deviceId) return;

      models.Location.findOne({
        where: {
          DeviceId: data.payload.deviceId,
          timestamp: {
            not: null
          }
        },
        order: [
          ['timestamp', 'DESC']
        ]
      }).then(function(location) {
        var reply = {
          event: 'lastknown',
          payload: {
            status: 'success',
            location: location
          }
        };

        conn.write(JSON.stringify(reply));
      });
    }
  });

  conn.on('close', function() {
    if (conn.authenticated) {
      delete connections[conn.deviceId][conn.uuid];
    }
  });
});

location.installHandlers(http, {
  prefix: '/ws'
});

models.sequelize.sync().then(function() {
  http.listen(5000, '0.0.0.0');
});
