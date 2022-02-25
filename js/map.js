'use strict'

const map = L.map('map');
const itinerary_features = L.layerGroup().addTo(map);
const bikeStations = L.layerGroup().addTo(map);

L.tileLayer('https://cdn.digitransit.fi/map/v1/{id}/{z}/{x}/{y}@2x.png', {
  attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
  maxZoom: 19,
  tileSize: 512,
  zoomOffset: -1,
  id: 'hsl-map'
}).addTo(map);

const query = (fromPlace, toPlace, modes, itinerary) => {
  return `
  {
    plan(
      fromPlace: "${fromPlace.name}::${fromPlace.latitude},${fromPlace.longitude}",
      toPlace: "Kasarmitori, Helsinki::${toPlace}",
      numItineraries: 1,
      transportModes: [${modes}],
    ) {
      itineraries{
        ${itinerary}
      }
    }
  }`;                 //unfinished query design for testing purposes
}

const fetchRoute = async (query) => {
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
    let color, weight;
    if (leg.mode === 'BUS') { color = '#027ac9'; weight = 8; }
    else if (leg.mode === 'BYCICLE') { color = '#fbbd1a'; weight = 6; }
    else if (leg.mode === 'WALK') { color = 'gray'; weight = 3; }

    const polylineLeg = L.polyline([],
      {
        color: color,
        weight: weight
      }).addTo(itinerary_features);

    const points = polyline.decode(leg.legGeometry.points);

    points.forEach(function (_point, i) {
      polylineLeg.addLatLng(L.latLng(points[i][0], points[i][1]));
    });
  });
}

navigator.geolocation.getCurrentPosition(position => {
  const crd = position.coords;
  map.setView([crd.latitude, crd.longitude], 17);
  L.marker([crd.latitude, crd.longitude]).addTo(map).bindPopup("I'm here").openPopup()._icon.classList.add("markerRed");

  fetchRoute(query(
    crd,
    '60.165246,24.949128',
    '{mode: BUS}, {mode: WALK}',
    ` legs {
      mode
      legGeometry {
        points
      }
    }`
  ));
}, (e) => {
  console.error(e);
}, {
  timeout: 5000,
  maximumAge: 0,
  enableHighAccuracy: true
});