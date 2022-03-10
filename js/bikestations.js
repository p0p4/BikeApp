'use strict'

function getStations() {
  //fetch bike stations from api
  fetch('https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql', {
    method: 'POST',
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      query: `
    query {
          bikeRentalStations {
          name
          lon
          lat
          bikesAvailable
          spacesAvailable
          }
       }
       `
    }),
    json: true
  }).then(res => res.json()).then(data => {
    console.log(data)


    //add bike stations to map
    for (let i = 0; i < data.data.bikeRentalStations.length; i++) {

      const text = `<b>${data.data.bikeRentalStations[i].name}</b><br>
Bikes available: ${data.data.bikeRentalStations[i].bikesAvailable}<br>
Spaces available: ${data.data.bikeRentalStations[i].spacesAvailable}<br>`;
      const crd = {
        latitude: data.data.bikeRentalStations[i].lat,
        longitude: data.data.bikeRentalStations[i].lon,
      };
      L.circleMarker([crd.latitude, crd.longitude], {
        radius: 6,
        color: '#9B1D20',
        fillColor: '#fbbd1a',
        fillOpacity: 100
      }).addTo(bikeStations).bindPopup(text);
    }
  })
}
getStations();
map.removeLayer(bikeStations);