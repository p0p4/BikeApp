'use strict'

const options = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 0
};

function success(pos) {
  const crd = pos.coords;

  console.log('Your current position is:');
  console.log(`Latitude : ${crd.latitude}`);
  console.log(`Longitude: ${crd.longitude}`);
  console.log(`More or less ${crd.accuracy} meters.`);

  getWeather(crd).then(function(weather){
    console.log(weather.hourly[0].temp);
    console.log(weather.hourly[1].temp);
    document.querySelector('#temp').innerHTML = `${weather.current.temp}`;
    document.querySelector('#main').innerHTML = `${weather.current.weather[0].main}`;
    document.querySelector('#description').innerHTML = `${weather.current.weather[0].description}`;
  });
}

function error(err) {
  console.warn(`ERROR(${err.code}): ${err.message}`);
}

function getWeather (crd) {
  const proxy = 'https://api.allorigins.win/get?url=';
  const key = '2c6ab1bfb47205e78b859594f1986b0e';
  const search = `https://api.openweathermap.org/data/2.5/onecall?lat=${crd.latitude}&lon=${crd.longitude}&appid=${key}&units=metric`;
  const url = proxy + encodeURIComponent(search);

  return fetch(url).then(function(response) {
    return response.json();
  }).then(function (data) {
    const weather = JSON.parse(data.contents);
    console.log(weather);
    return weather;
  });
}

navigator.geolocation.getCurrentPosition(success, error, options);