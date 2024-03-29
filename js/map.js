'use strict'

//####################
//initializing the map
const map = L.map('map', {
  zoomControl: false,
  minZoom: 10,
  tap: false,
  maxBounds: [
    //map bound centre
    //60.16095
    //24.95634
    //south-west
    [60.06095, 24.45634],
    //N-E
    [60.46095, 25.45634]]
});
if (!L.Browser.mobile) {
  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);
}
map.setView([60.196431, 24.936256], 12);      //initialize map position

const accessKey = '8cb8c4f0089d4f25aa4307567cd01383';

//################################
//creating groups for map features
const itinerary_features = L.featureGroup().addTo(map);
const bikeStations = L.featureGroup().addTo(map);
const userMarkers = L.featureGroup().addTo(map);
const markers = L.featureGroup().addTo(map);

//######################################
//giving the open street map a tilelayer
const osm = L.tileLayer('https://cdn.digitransit.fi/map/v2/{id}/{z}/{x}/{y}@2x.png', {
  attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
  maxZoom: 19,
  tileSize: 512,
  zoomOffset: -1,
  id: 'hsl-map-en'
});
osm.addTo(map);

//########################################################
//refreshes / creates the user tracking marker for the map
let userPos, userMarker, userArea, track = false;
map.on('locationfound', e => {
  userPos = e.latlng;
  if (userMarker) {
    map.removeLayer(userMarker);
    map.removeLayer(userArea);
  }
  userArea = L.circle(e.latlng, {
    radius: e.accuracy / 2,
    opacity: 0.05
  }).addTo(userMarkers);
  userArea.bindPopup('You\'re within this area');

  userMarker = L.circleMarker(e.latlng, {
    radius: 8,
    fillColor: 'white',
    fillOpacity: 100
  }).addTo(userMarkers);
  userMarker.bindPopup('Your location');

  if (track) {
    map.setView(e.latlng);
  }
}).on('locationerror', e => {
    console.log(e);
});

const locate = () => {
  map.locate();
}

//################################
//toggles user tracking on the map
const toggleTrack = () => {     
  const toggle = document.getElementById('toggleTrack');
  if (track) {
    track = false;
    toggle.classList.remove('true');
  } else {
    track = true;
    toggle.classList.add('true');
    map.setView(userPos);
  }
  console.log('tracking toggled');
}

//#############################################################
//creates a button on the map for user location tracking toggle
const trackControl = L.Control.extend({
  options: {position: 'bottomright'},

  onAdd : function (map) {
    const container = L.DomUtil.create('div');
    container.className = "leaflet-bar";

    if (!L.Browser.touch) {
        L.DomEvent.disableClickPropagation(container)
        .disableScrollPropagation(container);
    } else {
        L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
    }
    container.innerHTML += `
            <a id="toggleTrack" class="leaflet-control" role="button" href="javascript:toggleTrack()"></a>`;
    return container;
}});
map.addControl(new trackControl());

//#########################################
//toggles bikestation visibility on the map
let hideBikes = true;
const toggleBikes = () => {
  const toggle = document.getElementById('toggleBikes');
  if (!hideBikes) {
    map.removeLayer(bikeStations);
    hideBikes = true;
    toggle.classList.remove('true');
  } else {
    map.addLayer(bikeStations);
    hideBikes = false;
    toggle.classList.add('true');
  }
}

//##########################################################################
//creates a button on the map for bikestation visibility and resfresh toggle
const bikeControl = L.Control.extend({
  options: {position: 'topright'},

  onAdd : function (map) {
    const container = L.DomUtil.create('div');
    container.className = "leaflet-bar";

    if (!L.Browser.touch) {
        L.DomEvent.disableClickPropagation(container)
        .disableScrollPropagation(container);
    } else {
        L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
    }
    container.innerHTML += `
              <a id="toggleBikes" class="leaflet-control" role="button" href="javascript:toggleBikes()"></a>
              <a id="refreshBikes" class="leaflet-control" role="button" href="javascript:getStations()"></a>`;
    return container;
}});
map.addControl(new bikeControl());

//############################################################
//initializes marker creation popup window for map click event
map.on('click', async (e) => {
  const coords = await coordAddress(e.latlng);
  if (!coords) return;
  const popup = L.popup()
    .setLatLng(e.latlng)
    .openOn(map);

    const div = document.createElement('div');
    const btnOrigin = document.createElement('button');
    const btnDestin = document.createElement('button');
    btnOrigin.classList.add('originBtn', 'popupInput');
    btnDestin.classList.add('destinBtn', 'popupInput');
    div.innerHTML = (`<b>${coords.name}</b><br>set:`);
    btnOrigin.innerHTML = "Origin";
    btnDestin.innerHTML = "Destination";

    btnOrigin.onclick = () => {
      setOrigin(coords);
      origin = coords;
      if (destinMarker) initRoute(origin, destination);
      map.closePopup();
      inputOrigin.value = origin.name;
    }
    btnDestin.onclick = () => {
      setDestination(coords);
      destination = coords;
      if (originMarker) initRoute(origin, destination);
      map.closePopup();
      inputDestin.value = destination.name;
    }
    div.appendChild(btnOrigin);
    div.appendChild(btnDestin);
    popup.setContent(div);
});

//###################################
//fetches route data from digitransit
const fetchTransit = async (query) => {
  const url = `https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql?digitransit-subscription-key=${accessKey}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        query: query
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(response.ok);
    const body = await response.json();
    console.log(body);
    return body.data.plan.itineraries[0];
  } catch (err) {
    console.error(err);
  }
}

//###################################
//displays all the fetched route data
const inputOrigin = document.getElementById('inputOrigin');
const inputDestin = document.getElementById('inputDestin');
const routeDuration = document.getElementById('routeDuration');
const routeDistance = document.getElementById('routeDistance');
const displayRoute = (itinerary) => {
  itinerary_features.clearLayers();
  inputOrigin.value = origin.name;
  inputDestin.value = destination.name;
  const durSec = itinerary.duration;
  let disMet = 0;
  //displaying route legs
  itinerary.legs.forEach(function (leg) {
    let color, weight, dash = '';
    if (leg.mode === 'WALK') { color = 'gray'; weight = 4; dash = '1, 8' }
    else { color = '#9B1D20'; weight = 6; }

    const polylineLeg = L.polyline([],
      {
        color: color,
        weight: weight,
        dashArray: dash
      }).addTo(itinerary_features);

    const points = polyline.decode(leg.legGeometry.points);
    points.forEach((_point, i) => {
      polylineLeg.addLatLng(L.latLng(points[i][0], points[i][1])).bindPopup(`Route method: <b>${leg.mode}</b>`);
    });
    disMet += leg.distance;
  });
  //displaying duration
  const h = Math.floor(durSec / 3600);
  const m = Math.floor(durSec % 3600 / 60);
  const s = Math.floor(durSec % 3600 % 60);

  const hDisplay = h > 0 ? h + 'h ' : "";
  const mDisplay = m > 0 ? m + 'min ' : "";
  const sDisplay = (s > 0 && h === 0) ? s + 's ' : "";

  routeDuration.innerText = hDisplay + mDisplay + sDisplay;
  //diplaying distance
  if (disMet >= 1000) {
    routeDistance.innerText = Math.round((disMet / 1000) * 10) / 10 + 'km';
  } else {
    routeDistance.innerText = Math.round(disMet) + 'm';
  }
}

//#####################################
//creates a marker for the route origin
let origin, destination;
let originMarker, destinMarker;
const setOrigin = (coords) => {
  if (originMarker) {
    originMarker.removeFrom(markers);
  }
  originMarker = L.marker([coords.lat, coords.lon], {
    draggable: true
  }).addTo(markers);

  originMarker.on('dragend', async () => {
    const coords = originMarker.getLatLng();
    origin = await coordAddress(coords);
    setOrigin(origin);
    if (destinMarker) initRoute(origin, destination);
  });

  originMarker.bindPopup(`<b>Origin:</b><br>${coords.name}`).on('click', () => {
    originMarker.openPopup();
  })._icon.classList.add('markerRed');
}

//##########################################
//creates a marker for the route destination
const setDestination = (coords) => {
  if (destinMarker) {
    destinMarker.removeFrom(markers);
  }
  destinMarker = L.marker([coords.lat, coords.lon], {
    draggable: true
  }).addTo(markers);

  destinMarker.on('dragend', async () => {
    const coords = destinMarker.getLatLng();
    destination = await coordAddress(coords);
    setDestination(destination);
    if (originMarker) initRoute(origin, destination);
  });

  destinMarker.bindPopup(`<b>Destination:</b><br>${coords.name}`).on('click', () => {
    destinMarker.openPopup();
  })._icon.classList.add('markerGreen');
}

//##############################
//calls route creation functions                        //{mode: BUS}, {mode: WALK} BUS INCLUDED FOR TESTING PURPOSES ONLY!
const initRoute = async (origin, destination) => {      //{mode: BICYCLE, qualifier: RENT}, {mode: WALK} modes for actual use case of app
  const itinerary = await fetchTransit(`
  {
    plan(
      fromPlace: "${origin.name}::${origin.lat},${origin.lon}",
      toPlace: "${destination.name}::${destination.lat},${destination.lon}",
      numItineraries: 1,
      transportModes: [{mode: BUS}, {mode: WALK}],
    ) {
      itineraries{
        duration
        legs {
          mode
          startTime
          endTime
          from {
            lat
            lon
            name
          }
          to {
            lat
            lon
            name
          }
          distance
          legGeometry {
            points
          }
        }
      }
    }
  }`
  );

  displayRoute(itinerary);

  console.log('Origin: ' + origin.name);
  console.log('Destination: ' + destination.name);
}

//####################################################
//takes in coords or location names and gives out both
const coordAddress = async (input) => {
  let url;      //chooses which API is used based on the paramater
  if (input.lat) url = `https://api.digitransit.fi/geocoding/v1/reverse?point.lat=${input.lat}&point.lon=${input.lng}&size=1?&digitransit-subscription-key=${accessKey}`;
  else url = `https://api.digitransit.fi/geocoding/v1/search?text=${input}
    &boundary.circle.lat=60.160959094315416&boundary.circle.lon=24.95634747175871&boundary.circle.radius=20&size=1
    &focus.point.lat=${map.getCenter().lat}&focus.point.lon=${map.getCenter().lng}?&digitransit-subscription-key=${accessKey}`;
  try {
    const response = await fetch(url);
    console.log(response.ok);
    const json = await response.json();
    const output = {
      name: json.features[0].properties.label,
      lat: input.lat ? input.lat : json.features[0].geometry.coordinates[1],
      lon: input.lng ? input.lng : json.features[0].geometry.coordinates[0]
    }
    return output;
  } catch (err) {
    console.error(err);
  }
}

//#####################################################################
//uses user input values to call necessary functions for route creation
const form = document.getElementById('form');
window.onload = () => {
  locate();
  setInterval(locate, 5000);        //sets interval for user position tracking
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (inputOrigin.value !== '') {                 //selects origin based on available coordinates
      origin = await coordAddress(inputOrigin.value);
    } else if (userPos) {
      origin = await coordAddress(userPos);
    } else {
      alert("Can't access current location!");
    }
    destination = await coordAddress(inputDestin.value);

    setOrigin(origin);
    setDestination(destination);

    if (origin && destination) initRoute(origin, destination);

    if (L.Browser.mobile) {
      window.scrollTo(0, 0);    //scrolls to map on mobile and closes the keyboard
      inputOrigin.blur();
      inputDestin.blur();
      if (inputOrigin.value === '') {
        if (!track) toggleTrack();    //moves map view to origin or user position based on input
        map.setView(userPos, 17);
      } else {
        if (track) toggleTrack();
        map.setView([origin.lat, origin.lon], 17);
      }
    } else {
      if (track) toggleTrack();
      map.setView([origin.lat, origin.lon]);
    }
  }
}