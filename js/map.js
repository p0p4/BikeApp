'use strict'

const map = L.map('map');
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

let userMarker, userArea;
map.on('locationfound', e => {
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
  /*
    if (originMarker) {
      map.setView(e.latlng);
    }*/                     //toggle still needed
})
  .on('locationerror', e => {
    console.log(e);
  });

const locate = () => {
  map.locate();
}
locate();
setInterval(locate, 5000);

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

let originMarker, destinMarker;
const initRoute = (origin, destination, modes) => {
  fetchTransit(query(
    origin,
    destination,
    modes,
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

  markers.clearLayers();
  originMarker = L.marker([origin.lat, origin.lon], {
    draggable: true
  }).bindPopup(`<b>Origin:</b><br>${origin.name}`).addTo(markers);
  originMarker.on('click', () => {
    originMarker.openPopup();
  })._icon.classList.add("markerRed");

  destinMarker = L.marker([destination.lat, destination.lon], {
    draggable: true
  }).bindPopup(`<b>Destination:</b><br>${destination.name}`).addTo(markers);
  destinMarker.on('click', () => {
    destinMarker.openPopup();
  })._icon.classList.add("markerGreen");

  map.setView([origin.lat, origin.lon], 17);
}

const add2coords = async (address) => {
  const url = `https://api.digitransit.fi/geocoding/v1/search?text=
    ${address}&boundary.circle.lat=60.160959094315416&boundary.circle.lon=24.95634747175871&boundary.circle.radius=17&size=1
    &focus.point.lat=${map.getCenter().lat}&focus.point.lon=${map.getCenter().lng}`;
  try {
    const response = await fetch(url);
    const json = await response.json();
    const coords = {
      name: json.features[0].properties.label,
      lat: json.features[0].geometry.coordinates[1],
      lon: json.features[0].geometry.coordinates[0]
    }
    console.log(coords);
    return coords;
  } catch (e) {
    console.log(e);
  }
}

window.onload = () => {
  const form = document.getElementById('form');
  const inputOrigin = document.getElementById('inputOrigin');
  const inputDestin = document.getElementById('inputDestin');
  form.onsubmit = (event) => {
    event.preventDefault();
    navigator.geolocation.getCurrentPosition(async (position) => {
      let origin;
      if (inputOrigin.value !== '') {
        origin = await add2coords(inputOrigin.value);
      } else {
        origin = {
          name: 'Home',
          lat: position.coords.latitude,
          lon: position.coords.longitude
        }
      }
      const destination = await add2coords(inputDestin.value);
      const modes = '{mode: BUS}, {mode: WALK}';

      initRoute(origin, destination, modes);
    }, (e) => {
      console.error(e);
    }, {
      timeout: 5000,
      maximumAge: 0,
      enableHighAccuracy: true
    });
  }
}