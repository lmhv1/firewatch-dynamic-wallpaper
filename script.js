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

async function getSunsetSunrise() {
  const response = await fetch('https://api.sunrise-sunset.org/json?lat=49.2608724&lng=-123.1139529&formatted=0');
  return response.json();
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
    clone.classList.add('fade');
    initial = false;
  }
  after.parentNode.replaceChild(clone, after);
}

function main() {
  getSunsetSunrise().then(data => {
    const { sunrise, sunset, civil_twilight_begin, civil_twilight_end } = data.results;

    const sunriseStart = new Date(new Date(sunrise).getTime() - 30 * 60000);
    const sunriseEnd = new Date(new Date(sunrise).getTime() + 30 * 60000);
    const sunsetStart = new Date(new Date(sunset).getTime() - 30 * 60000);
    const sunsetEnd = new Date(new Date(sunset).getTime() + 30 * 60000);
    const dayThirds = (sunsetStart.getTime() - sunriseEnd.getTime()) / 3;

    // const currTime = new Date('July 3, 2020 4:31:04');
    const currTime = new Date();

    if (currTime < new Date(civil_twilight_begin)) {
      setWallpaper(0);
    } else if (currTime < sunriseStart) {
      setWallpaper(1);
    } else if (currTime < sunriseEnd) {
      setWallpaper(2);
    } else if (currTime < new Date(sunriseEnd.getTime() + dayThirds)) {
      setWallpaper(3);
    } else if (currTime < new Date(sunriseEnd.getTime() + dayThirds * 2)) {
      setWallpaper(4);
    } else if (currTime < sunsetStart) {
      setWallpaper(5);
    } else if (currTime < sunsetEnd) {
      setWallpaper(6);
    } else if (currTime < new Date(civil_twilight_end)) {
      setWallpaper(7);
    } else {
      setWallpaper(0);
    }
  });
}

(function loop() {
  main();
  setTimeout(loop, 60 * 1000 * 10); // every 10 minutes
})();
