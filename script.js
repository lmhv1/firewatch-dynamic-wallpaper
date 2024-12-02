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

const infoContainer = document.querySelector('.info-container');

let geoLocation;
let cachedSunsetSunrise;

// start utils
function debounce(callback, wait) {
  let timeout;
  return (...args) => {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => callback.apply(context, args), wait);
  };
}

// wrapper for fetch to retry 10 times with incrementing delays
async function get(api, n = 10, wait = 1000) {
  try {
    const response = await fetch(api);
    if (!response.ok) {
      throw new Error(response.status);
    }
    return response.json();
  } catch (e) {
    if (n === 1) {
      throw new Error(`Failed to GET from ${api}`);
    }
    setTimeout(async () => {
      return await get(api, n - 1, wait * 2);
    }, wait)
  }
}

function showNotification(error, persist = false) {
  const debugElem = document.querySelector('.debug');
  logElem = document.createElement('p');
  logElem.innerText = error;
  debugElem.appendChild(logElem);
  if (!persist) {
    setTimeout(() => {
      debugElem.innerHTML = '';
    }, 5000);
  }
}
// end utils

window.wallpaperPropertyListener = {
  applyUserProperties: properties => {
    if (properties.city) {
      updateCity(properties.city.value)
    }
    if (properties.show_city) {
      document.querySelector('#city').hidden = !properties.show_city.value;
    }
    if (properties.show_sunset_and_sunrise_times) {
      document.querySelector('#sunset-sunrise').hidden = !properties.show_sunset_and_sunrise_times.value;
    }
    if (properties.info_size) {
      infoContainer.style.transform = `scale(${properties.info_size.value})`;
    }
  },
  setPaused: pauseStatus => {
    if (!pauseStatus) {
      render();
    }
  }
}

const updateCity = debounce(async (city) => {
  try {
    const data = await get(`https://nominatim.openstreetmap.org/search?q=${city}&format=json&addressdetails=1`);

    for (const location of data) {
      const type = location.addresstype;

      if (type) {
        geoLocation = { lat: location.lat, lon: location.lon, city: location.address[type], country: location.address.country, state: location.address.state };
        cachedSunsetSunrise = null; // flush cached times
        render(true); // force immediate transition without fade
        return;
      }
    }
    throw new Error('No city in search results');
  } catch (e) {
    showNotification(`Coudn't find city: ${city}`);
  }
}, 2000);

// returns object with results
// can throw network error from get() or error if api return empty
async function getSunsetSunrise() {
  const data = await get(`https://api.sunrise-sunset.org/json?lat=${geoLocation.lat}&lng=${geoLocation.lon}&date=${moment().format('YYYY-MM-DD')}&formatted=0`);
  if (!data.results) {
    throw new Error('No sunrise sunset data');
  }
  cachedSunsetSunrise = {
    time: moment(),
    data: data,
  };
  return data;
}

function setWallpaper(index, initial) {
  const after = document.querySelector('#after');
  if (index === parseInt(after.dataset.id)) return; // return if wallpaper already the same

  const mod = (n, m) => ((n % m) + m) % m; // wrap arround modulo
  document.querySelector('#before').style.backgroundImage = `url(wallpapers/${wallpapers[mod(index - 1, wallpapers.length)]}.jpg)`;

  const clone = after.cloneNode();
  clone.style.backgroundImage = `url(wallpapers/${wallpapers[mod(index, wallpapers.length)]}.jpg)`;
  clone.dataset.id = index;
  if (!initial) {
    clone.classList.add('slow-fade-in');
  }
  after.parentNode.replaceChild(clone, after);
  document.querySelector('#placeholder').style.opacity = 0;
}

async function render(initial = false) {
  let data;
  if (cachedSunsetSunrise && cachedSunsetSunrise.time.isSame(moment(), 'day')) {
    data = cachedSunsetSunrise.data;
  } else {
    try {
      data = await getSunsetSunrise();
    } catch (e) {
      return; // try again in 10 minutes
    }
  }

  const { sunrise, sunset, civil_twilight_begin, civil_twilight_end, solar_noon } = data.results;
  const now = moment().add(10, 'minutes'); // account for 10 min transitions

  if (now.isBefore(moment(civil_twilight_begin))) {
    setWallpaper(0, initial); // night
  } else if (now.isBefore(moment(sunrise))) {
    setWallpaper(1, initial); // dawn
  } else if (now.isBefore(moment(sunrise).add(30, 'minutes'))) {
    setWallpaper(2, initial); // sunrise
  } else if (now.isBefore(moment(solar_noon))) {
    setWallpaper(3, initial); // early morning
  } else if (now.isBefore(moment(sunset).subtract(30, 'minutes'))) {
    setWallpaper(4, initial); // day
  } else if (now.isBefore(moment(sunset))) {
    setWallpaper(5, initial); // golden hour
  } else if (now.isBefore(moment(sunset).add(30, 'minutes'))) {
    setWallpaper(6, initial); // sunset
  } else if (now.isBefore(moment(civil_twilight_end))) {
    setWallpaper(7, initial); // dusk
  } else {
    setWallpaper(0, initial); // night
  }

  document.querySelector('#city').innerText = getDisplayName();
  document.querySelector('#sunrise-time').innerText = moment(sunrise).format('h:mm A');
  document.querySelector('#sunset-time').innerText = moment(sunset).format('h:mm A');
}

(function loop() {
  render();
  setTimeout(loop, 60 * 1000 * 10); // every 10 minutes
})();

// My poor man's {City}, {State Code || Country} API
function getDisplayName() {
  if (geoLocation.city === 'Washington D.C.') {
    return 'Washington D.C.';
  }
  if (geoLocation.state && (geoLocation.country === 'United States of America' || geoLocation.country === 'Canada')) {
    return `${geoLocation.city}, ${stateCodes[geoLocation.state]}`;
  }
  return `${geoLocation.city}, ${geoLocation.country}`
}

const stateCodes = {
  "Alabama": "AL",
  "Alaska": "AK",
  "Arizona": "AZ",
  "Arkansas": "AR",
  "California": "CA",
  "Colorado": "CO",
  "Connecticut": "CT",
  "Delaware": "DE",
  "Florida": "FL",
  "Georgia": "GA",
  "Hawaii": "HI",
  "Idaho": "ID",
  "Illinois": "IL",
  "Indiana": "IN",
  "Iowa": "IA",
  "Kansas": "KS",
  "Kentucky": "KY",
  "Louisiana": "LA",
  "Maine": "ME",
  "Maryland": "MD",
  "Massachusetts": "MA",
  "Michigan": "MI",
  "Minnesota": "MN",
  "Mississippi": "MS",
  "Missouri": "MO",
  "Montana": "MT",
  "Nebraska": "NE",
  "Nevada": "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  "Ohio": "OH",
  "Oklahoma": "OK",
  "Oregon": "OR",
  "Pennsylvania": "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  "Tennessee": "TN",
  "Texas": "TX",
  "Utah": "UT",
  "Vermont": "VT",
  "Virginia": "VA",
  "Washington": "WA",
  "West Virginia": "WV",
  "Wisconsin": "WI",
  "Wyoming": "WY",
  "Newfoundland and Labrador": "NL",
  "Prince Edward Island": "PE",
  "Nova Scotia": "NS",
  "New Brunswick": "NB",
  "Quebec": "QC",
  "Ontario": "ON",
  "Manitoba": "MB",
  "Saskatchewan": "SK",
  "Alberta": "AB",
  "British Columbia": "BC",
  "Yukon": "YT",
  "Northwest Territories": "NT",
  "Nunavut": "NU"
}