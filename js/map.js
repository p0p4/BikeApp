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

navigator.geolocation.getCurrentPosition(position => 
  {
  const crd = position.coords;
  map.setView([crd.latitude, crd.longitude], 17);
  L.marker([crd.latitude, crd.longitude]).addTo(map).bindPopup("I'm here").openPopup()._icon.classList.add("markerRed");

  route(crd, 'lol');
}, e => {
    console.error(e);
}, {
    timeout: 5000,
    maximumAge: 0,
    enableHighAccuracy: true
})

const route = async (fromPlace, toPlace) => {
  const response = await fetch('https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql', {
    method: 'POST',
    body: JSON.stringify({
      query: `
      query {
          plan(
            fromPlace: "Meitsi::${fromPlace.latitude},${fromPlace.longitude}",
            toPlace: "Kasarmitori, Helsinki::60.165246,24.949128",
            numItineraries: 2,
            transportModes: [{mode: BUS}, {mode: WALK}],
          ) {
            itineraries{
              walkDistance
              duration
              legs {
                mode
                startTime
                endTime
                from {
                  lat
                  lon
                  name
                  bikeRentalStation {
                    stationId
                    name
                  }
                }
                to {
                  lat
                  lon
                  name
                  bikeRentalStation {
                    stationId
                    name
                  }
                }
                distance
                legGeometry {
                  length
                  points
                }
              }
            }
          }
        }`
    }),
    headers: {'Content-Type': 'application/json'}
  });
  const body = await response.json();
  console.log(body.data.plan.itineraries[0]);

  itinerary_features.clearLayers();
  body.data.plan.itineraries[0].legs.forEach(function(leg) 
  {
    const polylineWalk = L.polyline([], 
      {
        color: 'gray',
        weight: 3
      }).addTo(itinerary_features);

    const polylineBike = L.polyline([], 
      {
        color: '#fbbd1a',
        weight: 6
      }).addTo(itinerary_features);

    const points = polyline.decode(leg.legGeometry.points);

    points.forEach(function(_point, i) 
    {
      const drawRoute = (polylineLeg) => {
        polylineLeg.addLatLng(L.latLng(points[i][0], points[i][1]));
      }
      leg.mode === 'BUS' ? drawRoute(polylineBike) : drawRoute(polylineWalk)
    });
  });
}