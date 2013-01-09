/**
 * @file wsmap.js
 *
 * Turns a div#wsmap_map on the page into a Google map.
 *
 */

// Basic pseudoglobal variables
var infoWindow = new google.maps.InfoWindow();
var markers = {};
var markerPositions = [];
var markerImages = {};
var markerCluster;
var defaultLocation;

var advcycl; // Overlay for advcycling stuff
var mapwidth; // Integer percent
var userInfo; // If map is to center on a user, set here.

var specificZoomSettings = {  // Handle countries that don't quite fit the calculation
  us:6, ca:5, ru:3, cn:4
};


Drupal.behaviors.wsmap = function () {

  // Grab necessary settings into globals.
  mapdata_source = Drupal.settings.wsmap.mapdata_source;
  loggedin = Drupal.settings.wsmap.loggedin;
  mapwidth = Drupal.settings.wsmap.mapwidth; // Integer percent
  base_path = Drupal.settings.wsmap.base_path;
  userInfo = Drupal.settings.wsmap.userInfo;
  chunkSize = Drupal.settings.wsmap.maxresults;
  defaultLocation = Drupal.settings.wsmap.defaultLocation;

  // If we have a map-submit (go) button with some information configured,
  // Go to that location, but do not submit.
  $('#edit-map-submit').click(function (event) {
    event.preventDefault();
    var country = $('#edit-country').val();
    var city = $('#edit-city').val();
    var location = city.split('|');
    if (!city) {
      setMapLocationToCountry(country);
    }
    else {
      zoomToSpecific(location[0], location[1], location[2], 8);
    }
  });


  if (userInfo && userInfo.uid) {
    zoomToUser(userInfo.uid, userInfo.latitude, userInfo.longitude, 10);
  }

  var mapOptions = {
    center:new google.maps.LatLng(defaultLocation.latitude, defaultLocation.longitude),
    zoom:defaultLocation.zoom,
    mapTypeId:google.maps.MapTypeId.TERRAIN
  };

  var map = new google.maps.Map(document.getElementById("wsmap_map"), mapOptions);
  markerCluster = new MarkerClusterer(map, [], {maxZoom:8 });

  google.maps.event.addListener(map, 'idle', function () {
    var mapBounds = map.getBounds();
    var ne = mapBounds.getNorthEast();
    var sw = mapBounds.getSouthWest();
    addHostMarkersByLocation(ne, sw, map.getCenter(), function (json) {
      addMarkersToMap(map, json);
    });
  });

  google.maps.event.addDomListener(window, 'load', Drupal.behaviors.wsmap);
}

function addHostMarkersByLocation(ne, sw, center, callbackFunction) {
  // Note that the actual limit is set by the Drupal variable.
  $.post('/services/rest/hosts/by_location',
    {minlat:sw.lat(), maxlat:ne.lat(), minlon:sw.lng(), maxlon:ne.lng(), centerlat:center.lat(), centerlon:center.lng(), limit:2000 }, callbackFunction);

}

function addMarkersToMap(map, json) {
  var parsed = JSON.parse(json);

  for (var i = 0; i < parsed.accounts.length; i++) {
    var host = parsed.accounts[i];
    if (markers[host.uid]) {
      continue;
    }

    host.themed_html = host.name;

    var latLng = new google.maps.LatLng(host.latitude, host.longitude);

    // Creating a marker and putting it on the map
    var marker = new google.maps.Marker({
      position:latLng,
      map:map,
      title:host.name + "\n" + host.city + ', ' + host.province,
      html:host.themed_html,
      zIndex:1
    });

    if (!markerPositions[host.position]) {
      markerPositions[host.position] = [host.uid];
    }
    // Handle the case where this host is in the exact same location as the
    // a previous host.
    else {
      // This one will hide under the first one (diff color, etc.)
      marker.setZIndex(0);
      markerPositions[host.position].push(host.uid);
      markers[markerPositions[host.position][0]].html += host.themed_html;
      markerCount = markerPositions[host.position].length;
      if (!markerImages[markerCount]) {
        markerImages[markerCount] = new google.maps.MarkerImage('/markerIcons/largeTDBlueIcons/marker' + markerCount + '.png');
      }
      markers[markerPositions[host.position][0]].setIcon(markerImages[markerCount]);
      markers[markerPositions[host.position][0]].setZIndex(1);
    }

    google.maps.event.addListener(marker, 'click', function () {
      // This was crazy to figure out. I kept getting the html from the last
      // host loaded. http://you.arenot.me/2010/06/29/google-maps-api-v3-0-multiple-markers-multiple-infowindows/
      // comment 3 finally helped me out.
      infoWindow.setContent(this.html);
      infoWindow.open(map, this);
    });
    markers[host.uid] = marker;
    markerCluster.addMarker(marker);
  }
  ;
}

function setMapLocationToCountry(countryCode) {
  getMapLocationForCountry(countryCode, zoomCallback);
}

function getMapLocationForCountry(countryCode, func_to_call) {

  // Ajax GET request for autocompletion
  url = '/location_country_locator_service' + '/' + countryCode;
  $.get(url, "", func_to_call);

}


/**
 * Zoom to named place and put a marker there
 * @param placename
 * @param latitude
 * @param longitude
 * @param zoom
 * @return
 */
function zoomToSpecific(placename, latitude, longitude, zoom) {
  map.setZoom(zoom);

  var templistener = GEvent.addListener(map, "moveend", function () {
    GEvent.removeListener(templistener);

    var loadMarkersListener = GEvent.addListener(map, 'loadMarkersComplete', function (numLoaded) {
      GEvent.removeListener(loadMarkersListener);

      map.openInfoWindow(map.getCenter(), document.createTextNode(placename), {maxWidth:220});

    });
    loadMarkers();
  });

  map.panTo(new GLatLng(latitude, longitude));


}


function zoomToUser(uid, latitude, longitude, zoom) {
  map.setZoom(zoom);

  var templistener = GEvent.addListener(map, "moveend", function () {
    GEvent.removeListener(templistener);

    var loadMarkersListener = GEvent.addListener(map, "loadMarkersComplete", function (numLoaded) {
      GEvent.removeListener(loadMarkersListener);
      var host = hosts[uid];


      if (!host) {
        host = {
          marker:new GMarker(map.getCenter(), redIcon),
          location:map.getCenter(),
          na:1
        };
        clusterer.AddMarker(host.marker, Drupal.t('Unvailable member'));
      }
      var txt = makePopupHtml(host);

      host.marker.openInfoWindowHtml(txt, { maxWidth:220 });
    });

    loadMarkers();
  });
  map.panTo(new GLatLng(latitude, longitude));

}


/**
 * Set map start position based on cookie or member location (from Drupal)
 * TODO: Do we need this anymore?
 */
function mapStartPosition() {

//  var cookie = $.cookie('mapStatus');
//  if (cookie) {
//    defaultLocation = JSON.parse(cookie);
//    return;
//  }
  return Drupal.settings.wsmap.defaultLocation;
}


function loadAdvCycling(kmzfile) {
  advcycl = new GGeoXml(kmzfile);
  map.addOverlay(advcycl);
}
function unloadAdvCycling() {
  map.removeOverlay(advcycl);
}

function toggleMap() { //expand and contract map
  if ($('#mapholder').css("width") == '100%') {  //if fully expanded
    $('#sidebar-left').css("display", "block");
    $('#expandText').html(Drupal.t('Expand Map'));
    $('#mapholder').animate({width:'' + mapwidth + '%'}, {duration:1000});
    $('#nearby-hosts').css("display", "block");
  } else {
    $('#sidebar-left').css("display", "none");
    $('#expandText').html(Drupal.t('Collapse Map'));
    $('#nearby-hosts').css("display", "none");
    $('#mapholder').animate({width:"100%"}, {duration:1000});
  }
  setTimeout("map.checkResize();loadMarkers();", 1000); //this is necessary due to animate function
}

