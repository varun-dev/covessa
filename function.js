window.function = async function (city) {
  if (city.value === undefined) return undefined;
  const response = await fetch(`https://goweather.herokuapp.com/weather/${city.value}`);
  const data = await response.json();
  return `${data.temperature} - ${data.description}`;
}
