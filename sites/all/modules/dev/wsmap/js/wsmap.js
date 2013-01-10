/**
 * @file wsmap.js
 *
 * Turns a div#wsmap_map on the page into a Google map.
 * Google Javascript Maps API v3
 *
 * Used the basic techniques as in various blogs.
 * The MarkerClusterer is used for clustering:
 * http://google-maps-utility-library-v3.googlecode.com/svn/trunk/markerclusterer/
 */

// Basic pseudoglobal variables
var infoWindow = new google.maps.InfoWindow();
var markers = {};
var markerPositions = [];
var markerImages = {};
var markerCluster;
var defaultLocation;

var adventure_cycling_overlay;
var mapwidth; // Integer percent
var userInfo; // If map is to center on a user, set here.
var map;
var base_path; // Base path for icons, etc.

// This is used to determine a one-off zoom setting for large countries.
// Most countries work with the area calculation done in the code.
var specificZoomSettings = {  // Handle countries that don't quite fit the calculation
  us:4, ca:5, ru:3, cn:4
};

// Was unable to use Drupal.behaviors here because any AHAH action re-fired
// the behavior. Yuck.
$(document).ready(function () {
  wsmap_initialize();
});

function wsmap_initialize() {

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


  // If we're centering on a particular user, change the defaultLocation
  // to be that user and zoom of 10.
  if (userInfo && userInfo.uid) {
    defaultLocation = {
      latitude:userInfo.latitude,
      longitude: userInfo.longitude,
      zoom:10
    };
    // zoomToUser(userInfo.uid, userInfo.latitude, userInfo.longitude, 10);
  }

  var mapOptions = {
    center:new google.maps.LatLng(defaultLocation.latitude, defaultLocation.longitude),
    zoom:defaultLocation.zoom,
    mapTypeId:google.maps.MapTypeId.TERRAIN
  };

  map = new google.maps.Map(document.getElementById("wsmap_map"), mapOptions);
  markerCluster = new MarkerClusterer(map, [], {maxZoom:6 });

  google.maps.event.addListener(map, 'idle', function () {
    mapBounds = map.getBounds();
    var ne = mapBounds.getNorthEast();
    var sw = mapBounds.getSouthWest();
    var center = map.getCenter();

    // Note that the actual limit here is set by the Drupal variable.
    $.post('/services/rest/hosts/by_location',
      {minlat:sw.lat(), maxlat:ne.lat(), minlon:sw.lng(), maxlon:ne.lng(), centerlat:center.lat(), centerlon:center.lng(), limit:2000 }, function(json) {
        addMarkersToMap(map, json);

        // If we have a user location as the center, put up an infoWindow.
        if (userInfo) {
          var content = userInfo.account.fullname;
          if (userInfo.account.notcurrentlyavailable == "1") {
            content = Drupal.t('Member is not currently available. Approximate location shown');
          }
          infoWindow.setContent(content);
          infoWindow.setPosition(mapOptions.center);
          infoWindow.open(map);
        }
    });
  });

  // google.maps.event.addDomListenerOnce(window, 'load', Drupal.behaviors.wsmap);
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
        markerImages[markerCount] = new google.maps.MarkerImage(base_path + '/markerIcons/largeTDBlueIcons/marker' + markerCount + '.png');
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
  // Ajax GET request for autocompletion
  url = '/location_country_locator_service' + '/' + countryCode;
  $.get(url, "", function(data) {
    var res = Drupal.parseJson(data);
    var area = parseFloat(res.area) / 1000;
    var basecalc = Math.log(area) / Math.log(4);
    var mapCountry = res.country_code;
    var zoom = specificZoomSettings[mapCountry];

    if (!zoom) {
      zoom = Math.round(10 - basecalc);
    }
    zoomToSpecific(res.country, res.latitude, res.longitude, zoom);
  });
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
  map.panTo(new google.maps.LatLng(latitude, longitude));
}


/**
 * Load the adventure cycling overlay
 *
 * @param kmzfile
 */
function loadAdvCycling(kmzfile) {
  if (!adventure_cycling_overlay) {
    adventure_cycling_overlay = new google.maps.KmlLayer(kmzfile, {preserveViewport:true});
  }
  adventure_cycling_overlay.setMap(map);
}
function unloadAdvCycling() {
  if (adventure_cycling_overlay) {
    adventure_cycling_overlay.setMap(null);
  }
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

