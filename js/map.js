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

let userPos, userArea;
map.on('locationfound', e => {
  if (userPos) {
    map.removeLayer(userPos);
    map.removeLayer(userArea);
}
userArea = L.circle(e.latlng, {
  radius: e.accuracy / 2,
  opacity: 0.05
}).addTo(userMarkers);
userArea.bindPopup('You\'re within this area');

userPos = L.circleMarker(e.latlng, {
  radius: 8,
  fillColor: 'white',
  fillOpacity: 100
}).addTo(userMarkers);
userPos.bindPopup('Your location');
console.log(e);
})
.on('locationerror', e => {
  console.log(e);
});

const locate = () => {
  map.locate();
}
setInterval(locate, 5000);

const query = (fromPlace, toPlace, modes, itinerary) => {
  return `
  {
    plan(
      fromPlace: "${fromPlace.name}::${fromPlace.lat},${fromPlace.lon}",
      toPlace: "Kasarmitori, Helsinki::${toPlace.lat},${toPlace.lon}",
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

    points.forEach(function (_point, i) {
      polylineLeg.addLatLng(L.latLng(points[i][0], points[i][1])).bindPopup(`Route method: <b>${leg.mode}</b>`);
      polylineLeg.on('click', e => {
        polylineLeg.openPopup();
      })
    });
  });
}

let originMarker, destinationMarker;
const routeInit = () => {
  navigator.geolocation.getCurrentPosition(position => {
    console.log(position);
    const userPos = {
      lat: position.coords.latitude,
      lon: position.coords.longitude
    }
    map.setView([userPos.lat, userPos.lon], 17);

    const destination = {
      lat: '60.165246',
      lon: '24.949128'
    }

    fetchRoute(query(
      userPos,
      destination,
      '{mode: BUS}, {mode: WALK}',
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
    
    originMarker = L.marker([userPos.lat, userPos.lon]).bindPopup('Origin marker').addTo(markers);
    originMarker.on('click', e => {
      originMarker.openPopup();
    })._icon.classList.add("markerRed");

    destinationMarker = L.marker([destination.lat, destination.lon]).bindPopup('Destination marker').addTo(markers);
    destinationMarker.on('click', e => {
      destinationMarker.openPopup();
    })._icon.classList.add("markerGreen");
  
  }, (e) => {
    console.error(e);
  }, {
    timeout: 5000,
    maximumAge: 0,
    enableHighAccuracy: true
  });
}

routeInit();