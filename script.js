const debugElem = document.querySelector('.debug');
const cityElem = document.querySelector('.city');
const placeholderElem = document.querySelector('#placeholder');

const wallpapers = [
  '0 night',
  '1 twilight start',
  '2 sunrise',
  '3 morning',
  '4 noon',
  '5 afternoon',
  '6 sunset',
  '7 twilight end'
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
    cityElem.hidden = !properties.show_city.value;
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
  before.style.backgroundImage = `url("wallpapers/${wallpapers[mod(index - 1, wallpapers.length)]}.jpg")`;

  const clone = after.cloneNode();
  clone.style.backgroundImage = `url("wallpapers/${wallpapers[index]}.jpg")`;
  clone.dataset.id = index;
  if (!initial) {
    initial = false;
    clone.classList.add('slow-fade-in');
  }
  after.parentNode.replaceChild(clone, after);
  placeholderElem.style.opacity = 0;
}

async function render() {
  const data = await getSunsetSunrise();
  if (data.length === 0) return;

  const { sunrise, sunset, civil_twilight_begin, civil_twilight_end } = data.results;

  const sunriseStart = moment.utc(sunrise).subtract(30, 'minutes');
  const sunriseEnd = moment.utc(sunrise).add(30, 'minutes');
  const sunsetStart = moment.utc(sunset).subtract(30, 'minutes');
  const sunsetEnd = moment.utc(sunset).add(30, 'minutes');

  const currTime = moment.utc();

  if (currTime.isBefore(moment.utc(civil_twilight_begin))) {
    setWallpaper(0);
  } else if (currTime.isBefore(sunriseStart)) {
    setWallpaper(1);
  } else if (currTime.isBefore(sunriseEnd)) {
    setWallpaper(2);
  } else if (currTime.isBefore(sunriseEnd.add(1, 'hour'))) {
    setWallpaper(3);
  } else if (currTime.isBefore(sunsetStart.subtract(1, 'hour'))) {
    setWallpaper(4);
  } else if (currTime.isBefore(sunsetStart)) {
    setWallpaper(5);
  } else if (currTime.isBefore(sunsetEnd)) {
    setWallpaper(6);
  } else if (currTime.isBefore(moment.utc(civil_twilight_end))) {
    setWallpaper(7);
  } else {
    setWallpaper(0);
  }

  cityElem.innerText = `${geoLocation.city}, ${geoLocation.country}`;
}

(function loop() {
  render();
  setTimeout(loop, 60 * 1000 * 10); // every 10 minutes
})();
