const debugElem = document.querySelector('.debug');
const cityElem = document.querySelector('#city');
const sunsetSunriseElem = document.querySelector('#sunset-sunrise');
const sunriseElem = document.querySelector('#sunrise-time');
const sunsetElem = document.querySelector('#sunset-time');

const wallpapers = [
  '0_night',
  '1_dawn',
  '2_sunrise',
  '3_early_morning',
  '4_day',
  '5_golden_hour',
  '6_sunset',
  '7_dusk'
];

let initial = true;
let geoLocation;

// start utils
function debounce(callback, wait) {
  let timeout;
  return (...args) => {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => callback.apply(context, args), wait);
  };
}

async function get(api) {
  const response = await fetch(api);
  if (response.ok) {
    return response.json();
  }
  logError(`Failed to GET from ${api}`);
}

function logError(error) {
  logElem = document.createElement('p');
  logElem.innerText = error;
  debugElem.appendChild(logElem);
  setTimeout(() => {
    debugElem.innerHTML = '';
  }, 5000);
}
// end utils

window.wallpaperPropertyListener = {
  applyUserProperties: properties => {
    if (properties.city) {
      updateCity(properties.city.value)
    }
    if (properties.show_city) {
      cityElem.hidden = !properties.show_city.value;
    }
    if (properties.show_sunset_and_sunrise_times) {
      sunsetSunriseElem.hidden = !properties.show_sunset_and_sunrise_times.value;
    }
  }
}

const updateCity = debounce(async (city) => {
  const data = await get(`https://nominatim.openstreetmap.org/search/${city}?format=json&addressdetails=1&limit=1`);
  try {
    geoLocation = { lat: data[0].lat, lon: data[0].lon, city: data[0].address.city, country: data[0].address.country };
    initial = true; // force immediate transition without fade
    render();
  } catch (e) {
    logError(`Could not find city "${city}"`);
  }
}, 2000);

async function getSunsetSunrise() {
  try {
    return await get(`https://api.sunrise-sunset.org/json?lat=${geoLocation.lat}&lng=${geoLocation.lon}&date=${moment().format('YYYY-MM-DD')}&formatted=0`);
  } catch (e) {
    // geoLocation not initialized
    return [];
  }
}

function setWallpaper(index) {
  const before = document.querySelector('#before');
  const after = document.querySelector('#after');

  if (index === after.dataset.id) return; // return if wallpaper already the same

  const mod = (n, m) => ((n % m) + m) % m; // wrap arround modulo
  before.style.backgroundImage = `url(wallpapers/${wallpapers[mod(index - 1, wallpapers.length)]}.jpg)`;

  const clone = after.cloneNode();
  clone.style.backgroundImage = `url(wallpapers/${wallpapers[index]}.jpg)`;
  clone.dataset.id = index;
  if (!initial) {
    initial = false;
    clone.classList.add('slow-fade-in');
  }
  after.parentNode.replaceChild(clone, after);
  document.querySelector('#placeholder').style.opacity = 0;
}

async function render() {
  const data = await getSunsetSunrise();
  if (data.length === 0) return;

  const { sunrise, sunset, civil_twilight_begin, civil_twilight_end, solar_noon } = data.results;

  const now = moment().add(10, 'minutes'); // account for 10 min transitions
  if (now.isBefore(moment(civil_twilight_begin))) {
    setWallpaper(0); // night
  } else if (now.isBefore(moment(sunrise))) {
    setWallpaper(1); // dawn
  } else if (now.isBefore(moment(sunrise).add(30, 'minutes'))) {
    setWallpaper(2); // sunrise
  } else if (now.isBefore(moment(solar_noon))) {
    setWallpaper(3); // early morning
  } else if (now.isBefore(moment(sunset).subtract(30, 'minutes'))) {
    setWallpaper(4); // day
  } else if (now.isBefore(moment(sunset))) {
    setWallpaper(5); // golden hour
  } else if (now.isBefore(moment(sunset).add(30, 'minutes'))) {
    setWallpaper(6); // sunset
  } else if (now.isBefore(moment(civil_twilight_end))) {
    setWallpaper(7); // dusk
  } else {
    setWallpaper(0);
  }

  cityElem.innerText = `${geoLocation.city}, ${geoLocation.country}`;
  sunriseElem.innerText = moment(sunrise).format('h:mm A');
  sunsetElem.innerText = moment(sunset).format('h:mm A');
}

(function loop() {
  render();
  setTimeout(loop, 60 * 1000 * 10); // every 10 minutes
})();
