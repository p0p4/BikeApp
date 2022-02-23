'use strict'

const map = L.map('map');

L.tileLayer('https://cdn.digitransit.fi/map/v1/{id}/{z}/{x}/{y}@2x.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
    maxZoom: 19,
    tileSize: 512,
    zoomOffset: -1,
    id: 'hsl-map'
}).addTo(map);

function addMarker(crd, text) {
    return L.marker([crd.latitude, crd.longitude],).addTo(map).
        bindPopup(text);
}

navigator.geolocation.getCurrentPosition(position => 
    {
    const crd = position.coords;
    map.setView([crd.latitude, crd.longitude], 17);

    const currentLocation = addMarker(crd, "I'm here.");
    currentLocation.openPopup();

}, e => {
    console.error(e);
}, {
    timeout: 5000,
    maximumAge: 0,
    enableHighAccuracy: true
})