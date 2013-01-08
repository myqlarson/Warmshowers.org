/**
 * Created with JetBrains PhpStorm.
 * User: rfay
 * Date: 1/7/13
 * Time: 10:01 AM
 * To change this template use File | Settings | File Templates.
 */

// TODO: Consider using anon functions instead of named where appropriate

// TODO: figure out where this goes
var infoWindow = new google.maps.InfoWindow();
var markers = {};
var markerCluster;

// TODO: Consider using LatLng instead of the independent minlat etc.
function addHostMarkersByLocation(ne, sw, center, callbackFunction) {
  // TODO: Set the limit to something reasonable.
  $.post('/services/rest/hosts/by_location',
    {minlat: sw.lat(), maxlat: ne.lat(), minlon: sw.lng(), maxlon: ne.lng(), centerlat: center.lat(), centerlon: center.lng(), limit: 2000 }, callbackFunction);

}

function addMarkersToMap(map, json) {
  var parsed = JSON.parse(json);

  for (var i = 0; i < parsed.accounts.length;  i++) {
    var host = parsed.accounts[i];
    if (markers[host.uid]) { continue; }

    var latLng = new google.maps.LatLng(host.latitude, host.longitude);

    // Creating a marker and putting it on the map
    var marker = new google.maps.Marker({
      position: latLng,
      map: map,
      title: host.name + "\n" + host.city + ', ' + host.province,
      html: host.themed_html
    });
    google.maps.event.addListener(marker, 'click', function() {
      // This was crazy to figure out. I kept getting the html from the last
      // host loaded. http://you.arenot.me/2010/06/29/google-maps-api-v3-0-multiple-markers-multiple-infowindows/
      // comment 3 finally helped me out.
      infoWindow.setContent(this.html);
      infoWindow.open(map, this);
    });
    markers[host.uid] = marker;
    markerCluster.addMarker(marker);
  };
}


// TODO: It would be SO nice to just get the *changed* markers.
function updateOnBoundsChange(map) {
  var mapBounds = map.getBounds();
  var ne = mapBounds.getNorthEast();
  var sw = mapBounds.getSouthWest();
  addHostMarkersByLocation(ne, sw, map.getCenter(), function(json) {
    addMarkersToMap(map, json);
  });
}

function initialize() {
  // Imitate behavior of existing stuff; this has to be fixed up later.
  var defaultLocation = {latitude: 40, longitude: -105};
  var mapCenter = defaultLocation;


  var mapOptions = {
    center: new google.maps.LatLng(mapCenter.latitude, mapCenter.longitude),
    zoom: 8,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  var map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);
  markerCluster = new MarkerClusterer(map);

  google.maps.event.addListener(map, 'idle', function() {
    updateOnBoundsChange(map);
  });

  google.maps.event.addDomListener(window, 'load', initialize);

}
