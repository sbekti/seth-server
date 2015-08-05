var socket = new SockJS('/ws');
var deviceId = null;
var deviceName = null;
var markers = [];
var polyline = null;
var lastSeen = null;

$('.ui-slider-handle').draggable();

L.mapbox.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6IlhHVkZmaW8ifQ.hAMX5hSW-QnTeRCMAy9A8Q';

var map = L.mapbox.map('map', null, {
    attributionControl: false,
    legendControl: {
      position: 'topright'
    }
  })
  .setView([51.505, -0.09], 2);

L.control.layers({
  'Mapbox OSM Bright 2': L.mapbox.tileLayer('mapbox.osm-bright').addTo(map),
  'Mapbox Streets': L.mapbox.tileLayer('mapbox.streets'),
  'Mapbox Streets Satellite': L.mapbox.tileLayer('mapbox.streets-satellite'),
  'Mapbox Satellite': L.mapbox.tileLayer('mapbox.satellite'),
  'Mapbox Light': L.mapbox.tileLayer('mapbox.light'),
  'Mapbox Dark': L.mapbox.tileLayer('mapbox.dark'),
  'Mapbox Pirates': L.mapbox.tileLayer('mapbox.pirates'),
  'Mapbox Comic': L.mapbox.tileLayer('mapbox.comic'),
  'Mapbox Wheatpaste': L.mapbox.tileLayer('mapbox.wheatpaste'),
  'OpenStreetMap': L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png'),
  'Stamen Toner': L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png'),
  'Stamen Watercolor': L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.png')
}, null, {
  position: 'topleft'
}).addTo(map);

var mainIcon = L.mapbox.marker.icon({
  'marker-size': 'large',
  'marker-symbol': 'danger',
  'marker-color': '#aa0000'
});

var customIcon = L.divIcon({
  'className': 'custom-icon',
  'iconSize': null
});

var polylineOptions = {
  color: '#000'
};

function getCurrentUnixTimestamp() {
  return Math.floor(Date.now() / 1000);
}

function updateLastSeenInfo(location) {
  lastSeen = location.createdAt;
  $('#device-last-seen').html($.timeago(lastSeen));
  $('#device-battery').html(location.charge + '%' + ' (' + location.voltage + ' V)');
  $('#device-signal').html(location.signal * 2 - 144 + ' dBm');
}

function updateSliderInfo() {
  var minValue = $('#slider-range').slider('values', 0);
  var maxValue = $('#slider-range').slider('values', 1);

  var minCaption = moment.utc(minValue, 'X').format('DD/MM/YY hh:mm:ss UTC');
  var maxCaption = maxValue == getCurrentUnixTimestamp() ? 'Now' : moment.utc(maxValue, 'X').format('DD/MM/YY hh:mm:ss UTC');

  $('#slider-info').html(minCaption + ' - ' + maxCaption);
}

function requestLowerBound() {
  var data = {
    event: 'lowerbound',
    payload: {
      deviceId: deviceId
    }
  };

  socket.send(JSON.stringify(data));
}

function requestUpperBound() {
  var data = {
    event: 'upperbound',
    payload: {
      deviceId: deviceId
    }
  };

  socket.send(JSON.stringify(data));
}

function requestLastKnownPosition() {
  var data = {
    event: 'lastknown',
    payload: {
      deviceId: deviceId
    }
  };

  socket.send(JSON.stringify(data));
}

function requestLocations() {
  var minValue = $('#slider-range').slider('values', 0);
  var maxValue = $('#slider-range').slider('values', 1);

  var data = {
    event: 'location',
    payload: {
      deviceId: deviceId,
      start: minValue,
      end: maxValue
    }
  };

  socket.send(JSON.stringify(data));
}

function createPopup(location) {
  return '<table class="table-popup"><tbody><tr><td>Fix</td><td>' + moment.utc(moment.utc(location.timestamp).unix(), 'X').format('DD/MM/YY hh:mm:ss UTC') + '</td></tr><tr><td>Lat/Lng</td><td>' + location.latitude + ', ' + location.longitude + '</td></tr><tr><td>Altitude</td><td>' + location.altitude + ' m</td></tr><tr><td>Speed/Course</td><td>' + location.speed + ' km/h / ' + location.course + '&deg;</td></tr><tr><td>Sat/HDOP</td><td>' + location.satellites + ' / ' + location.hdop + '</td></tr><td>Charge</td><td>' + location.charge + '% (' + location.voltage + ' V)</td></tr><tr><td>Signal</td><td>' + (location.signal * 2 - 114) + ' dBm</td></tr></tbody></table>';
}

$('#slider-range').slider({
  range: true,
  min: 0,
  max: getCurrentUnixTimestamp(),
  values: [75, Date.now() / 1000],
  slide: function(event, ui) {
    updateSliderInfo();
    requestLocations();
  },
  create: function(event, ui) {
    updateSliderInfo();
  },
  stop: function(event, ui) {
    requestLocations();
  }
});

setInterval(function() {
  if (lastSeen) $('#device-last-seen').html($.timeago(lastSeen));

  var currentValue = $('#slider-range').slider('values', 1);
  var currentMax = $('#slider-range').slider('option', 'max');
  var nextMax = getCurrentUnixTimestamp();

  $('#slider-range').slider('option', 'max', nextMax);

  if (currentValue == currentMax) {
    var currentValue = $('#slider-range').slider('values', 1, nextMax);
    updateSliderInfo();
  }
}, 1000);

$('#form-login').submit(function(e) {
  e.preventDefault();

  var username = $('#input-username').val();
  var password = $('#input-password').val();

  if (!username) return;
  if (!password) return;

  var data = {
    event: 'authenticate',
    payload: {
      username: username.toLowerCase(),
      password: password
    }
  };

  socket.send(JSON.stringify(data));
});

socket.onopen = function() {
  $('#modal-login').modal({
    backdrop: 'static',
    keyboard: false
  });
};

socket.onmessage = function(e) {
  var data = JSON.parse(e.data);
  console.log(data);

  if (data.event == 'authenticate') {
    if ((data.payload.status == 'success') && (data.payload.deviceId)) {
      deviceId = data.payload.deviceId;
      deviceName = data.payload.deviceName;
      $('#device-name').html(deviceName);
      map.legendControl.addLegend(document.getElementById('legend').innerHTML);
      requestLowerBound();
      requestUpperBound();
      $('#modal-login').modal('hide');
    } else {
      $('#alert-login').removeClass('hidden');
      $('#alert-login').html(data.payload.message);
    }
  } else if (data.event == 'location') {
    var locations = data.payload.locations;

    for (var i = 0; i < markers.length; ++i) {
      var marker = markers[i];
      map.removeLayer(marker);
    }

    if (polyline) map.removeLayer(polyline);
    markers = [];
    var lines = [];

    for (var i = 0; i < locations.length; ++i) {
      var location = locations[i];

      if ((!location.latitude) || (!location.longitude)) continue;

      var marker = L.marker([location.latitude, location.longitude], {
        icon: i == locations.length - 1 ? mainIcon : customIcon
      });

      marker.bindPopup(createPopup(location));
      marker.addTo(map);
      markers.push(marker);
      lines.push(marker.getLatLng());
    }

    polyline = L.polyline(lines, polylineOptions);
    polyline.addTo(map);

    if (markers.length > 0) {
      map.setView(markers[markers.length - 1].getLatLng(), 14);
    }
  } else if (data.event == 'lowerbound') {
    var location = data.payload.location;

    var minValue = moment.utc(location.timestamp).unix();
    var maxValue = getCurrentUnixTimestamp();

    $('#slider-range').slider('option', 'min', minValue);
    $('#slider-range').slider('option', 'max', maxValue);
    $('#slider-range').slider('values', 0, maxValue - 1);
    $('#slider-range').slider('values', 1, maxValue);
    updateSliderInfo();

    $('.slider-container').removeClass('hidden');
    requestLocations();
  } else if (data.event == 'upperbound') {
    var location = data.payload.location;
    updateLastSeenInfo(location);
    requestLastKnownPosition();
  } else if (data.event == 'update') {
    var location = data.payload.location;
    updateLastSeenInfo(location);

    if ((!location.latitude) || (!location.longitude)) {
      return;
    }

    var maxValue = $('#slider-range').slider('values', 1);
    if (maxValue != getCurrentUnixTimestamp()) return;

    var lastMarker = markers[markers.length - 1];
    lastMarker.setIcon(customIcon);

    var marker = L.marker([location.latitude, location.longitude], {
      icon: mainIcon
    });

    marker.bindPopup(createPopup(location));
    marker.addTo(map);
    markers.push(marker);
    polyline.addLatLng(marker.getLatLng());
  } else if (data.event == 'lastknown') {
    var location = data.payload.location;

    if ((!location.latitude) || (!location.longitude)) {
      return;
    }

    $('#slider-range').slider('values', 0, moment.utc(location.timestamp).unix());
    requestLocations();
  }
};
