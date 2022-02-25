'use strict'

fetch('https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql', {
  method: 'POST',
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({
    query: `
    query {
          bikeRentalStations {
          name
          stationId
          lon
          lat
          bikesAvailable
          spacesAvailable
          allowDropoff
          }
       }
       `
  }),
  json: true
})
.then(res => res.json())
.then(data => {
  console.log(data)

  for (let i = 0;i < data.data.bikeRentalStations.length;i++) {

    const text = `${data.data.bikeRentalStations[i].name}<br>
Bikes available: ${data.data.bikeRentalStations[i].bikesAvailable}<br>
Spaces available: ${data.data.bikeRentalStations[i].spacesAvailable}<br>`;
    const crd = {
      latitude: data.data.bikeRentalStations[i].lat,
      longitude: data.data.bikeRentalStations[i].lon,
    };
    L.circleMarker([crd.latitude, crd.longitude], {
      radius: 5,
      color: '#fbbd1a',
      fillColor: 'white',
      fillOpacity: 100
   }).addTo(bikeStations).bindPopup(text);
  }
})