'use strict'

//Location search options
const options = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0
};


function success(pos) {
  const crd = pos.coords;

  sessionStorage.setItem("pos_lat",crd.latitude);     //save location to session storage
  sessionStorage.setItem("pos_lon",crd.longitude);

  document.querySelector('#value').innerHTML = `now`;


  //add weather info to HTML
    getWeather().then(function(weather) {
      document.querySelector('#temp').innerHTML = `Temperature: ${weather.hourly[0].temp} C`;
      document.querySelector(
          '#description').innerHTML = `Description: ${weather.hourly[0].weather[0].description}`;
    });
}

function error(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

//weather api fetch
function getWeather () {
  const proxy = 'https://api.allorigins.win/get?url=';
  const key = '2c6ab1bfb47205e78b859594f1986b0e';
  const search = `https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&appid=${key}&units=metric`;
  const url = proxy + encodeURIComponent(search);

  return fetch(url).then(function(response) {
    return response.json();
  }).then(function (data) {
    return JSON.parse(data.contents);
  });
}

//show weather based on user input
function input (){
  const value = document.querySelector('#myRange').value;

  if (value == 0) {
    document.querySelector('#value').innerHTML = `now`;
  } else {
    document.querySelector('#value').innerHTML = `in ${value}h`;
  }

  getWeather().then(function(weather) {
    document.querySelector('#temp').innerHTML = `Temperature: ${weather.hourly[value].temp} C`;
    document.querySelector(
        '#description').innerHTML = `Description: ${weather.hourly[value].weather[0].description}`;
  });
}


navigator.geolocation.getCurrentPosition(success, error, options);    //get location
const latitude = parseFloat(sessionStorage.getItem("pos_lat"));     //get location from session storage
const longitude = parseFloat(sessionStorage.getItem("pos_lon"));