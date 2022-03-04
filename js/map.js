'use strict'

const map = L.map('map', {
  zoomControl: false,
  minZoom: 11,
  maxBounds: [
    //S-W
    [60.05, 24.48],
    //N-E
    [60.42, 25.42]]
});
L.control.zoom({
  position: 'bottomright'
}).addTo(map);

const itinerary_features = L.featureGroup().addTo(map);
const bikeStations = L.featureGroup().addTo(map);
const userMarkers = L.featureGroup().addTo(map);
const markers = L.featureGroup().addTo(map);

const osm = L.tileLayer('https://cdn.digitransit.fi/map/v1/{id}/{z}/{x}/{y}@2x.png', {
  attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
  maxZoom: 19,
  tileSize: 512,
  zoomOffset: -1,
  id: 'hsl-map'
});
osm.addTo(map);

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
})
  .on('locationerror', e => {
    console.log(e);
  });

const locate = () => {
  map.locate();
}
const toggleTrack = () => {               //button still needed
  track ? track = false : track = true;
}

map.setView([60.196431, 24.936256], 12);

const query = (origin, destination, modes, itinerary) => {
  return `
  {
    plan(
      fromPlace: "${origin.name}::${origin.lat},${origin.lon}",
      toPlace: "${destination.name}::${destination.lat},${destination.lon}",
      numItineraries: 1,
      transportModes: [${modes}],
    ) {
      itineraries{
        ${itinerary}
      }
    }
  }`;
}

const fetchTransit = async (query) => {
  const url = 'https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        query: query
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    const body = await response.json();
    console.log(body);
    drawRoute(body);
  } catch (e) {
    console.log(e);
  }
}

const drawRoute = (body) => {
  itinerary_features.clearLayers();
  body.data.plan.itineraries[0].legs.forEach(function (leg) {
    let color, weight, dash = '';
    if (leg.mode === 'BUS') { color = '#027ac9'; weight = 8; }
    else if (leg.mode === 'BYCICLE') { color = '#fbbd1a'; weight = 6; }
    else if (leg.mode === 'WALK') { color = 'gray'; weight = 4; dash = '1, 8' }

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
  });
}

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

const form = document.getElementById('form');
const inputOrigin = document.getElementById('inputOrigin');
const inputDestin = document.getElementById('inputDestin');
const initRoute = (origin, destination) => {
  fetchTransit(query(
    origin,
    destination,
    '{mode: BUS}, {mode: WALK}',        //BUS included for testing purposes only
    `legs {
      mode
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
      legGeometry {
        points
      }
    }`
  ));
  console.log('Origin: ' + origin.name);
  console.log('Destination: ' + destination.name);

  inputOrigin.value = origin.name;
  inputDestin.value = destination.name;
}

const coordAddress = async (input) => {
  let url;
  if (input.lat) url = `https://api.digitransit.fi/geocoding/v1/reverse?point.lat=${input.lat}&point.lon=${input.lng}&size=1`;
  else url = `https://api.digitransit.fi/geocoding/v1/search?text=${input}
    &boundary.circle.lat=60.160959094315416&boundary.circle.lon=24.95634747175871&boundary.circle.radius=17&size=1
    &focus.point.lat=${map.getCenter().lat}&focus.point.lon=${map.getCenter().lng}`;
  try {
    const response = await fetch(url);
    const json = await response.json();
    const output = {
      name: json.features[0].properties.label,
      lat: json.features[0].geometry.coordinates[1],
      lon: json.features[0].geometry.coordinates[0]
    }
    return output;
  } catch (e) {
    console.log(e);
  }
}

window.onload = () => {
  locate();
  setInterval(locate, 5000);
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (inputOrigin.value !== '') {
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
  }
}

map.on('click', async (e) => {
  const coords = await coordAddress(e.latlng);
  const popup = L.popup()
    .setLatLng(e.latlng)
    .openOn(map);

    const div = document.createElement('div');
    const button = document.createElement('button');
    const button2 = document.createElement('button');
    div.innerHTML = ('<b>Set marker:<b><br>');
    button.innerHTML = "Origin";
    button2.innerHTML = "Destination";

    button.onclick = () => {
      setOrigin(coords);
      origin = coords;
      if (destinMarker) initRoute(origin, destination);
      map.closePopup();
    }
    button2.onclick = () => {
      setDestination(coords);
      destination = coords;
      if (originMarker) initRoute(origin, destination);
      map.closePopup();
    }
    div.appendChild(button);
    div.appendChild(button2);
    popup.setContent(div);
});