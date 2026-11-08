const form = document.querySelector("#settings-form");
const diceCountInput = document.querySelector("#dice-count");
const sideCountInput = document.querySelector("#side-count");
const simulationCountInput = document.querySelector("#simulation-count");
const rollButton = document.querySelector("#roll-button");
const rollResults = document.querySelector("#roll-results");
const rollTotal = document.querySelector("#roll-total");
const emptyState = document.querySelector("#empty-state");
const resultsContent = document.querySelector("#results-content");
const chart = document.querySelector("#distribution-chart");

function getSettings() {
  return {
    dice: Number(diceCountInput.value),
    sides: Number(sideCountInput.value),
    trials: Number(simulationCountInput.value)
  };
}

function isValidSettings({ dice, sides, trials }) {
  return Number.isInteger(dice) && dice >= 1 && dice <= 6
    && Number.isInteger(sides) && sides >= 2 && sides <= 20
    && Number.isInteger(trials) && trials >= 100 && trials <= 100000;
}

function rollOneDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(dice, sides) {
  return Array.from({ length: dice }, () => rollOneDie(sides));
}

function showRoll(values) {
  const sum = values.reduce((total, value) => total + value, 0);
  rollResults.replaceChildren(...values.map((value, index) => {
    const die = document.createElement("span");
    die.className = "roll-die";
    die.textContent = value;
    die.setAttribute("aria-label", `Die ${index + 1}: ${value}`);
    return die;
  }));
  rollResults.setAttribute("aria-label", `Dice results: ${values.join(", ")}`);
  rollTotal.textContent = sum;
}

function getTheoreticalDistribution(dice, sides) {
  let distribution = [1];
  for (let die = 0; die < dice; die += 1) {
    const next = Array(distribution.length + sides).fill(0);
    for (let sum = 0; sum < distribution.length; sum += 1) {
      for (let face = 1; face <= sides; face += 1) {
        next[sum + face] += distribution[sum] / sides;
      }
    }
    distribution = next;
  }
  return distribution;
}

function runSimulation({ dice, sides, trials }) {
  const firstPossibleSum = dice;
  const lastPossibleSum = dice * sides;
  const counts = Array(lastPossibleSum + 1).fill(0);
  let sumOfResults = 0;

  for (let trial = 0; trial < trials; trial += 1) {
    let sum = 0;
    for (let die = 0; die < dice; die += 1) {
      sum += rollOneDie(sides);
    }
    counts[sum] += 1;
    sumOfResults += sum;
  }

  const theory = getTheoreticalDistribution(dice, sides);
  const possibleSums = Array.from({ length: lastPossibleSum - firstPossibleSum + 1 }, (_, index) => firstPossibleSum + index);
  const mostLikelySum = possibleSums.reduce((best, sum) => theory[sum] > theory[best] ? sum : best, firstPossibleSum);
  const observedMean = sumOfResults / trials;
  const theoreticalMean = dice * (sides + 1) / 2;
  const observedMostLikely = possibleSums.reduce((best, sum) => counts[sum] > counts[best] ? sum : best, firstPossibleSum);

  return {
    counts,
    firstPossibleSum,
    lastPossibleSum,
    mostLikelySum,
    mostLikelyProbability: theory[mostLikelySum],
    observedMean,
    observedMostLikely,
    theoreticalMean,
    theory
  };
}

function renderChart(simulation, trials) {
  const probabilities = [];
  for (let sum = simulation.firstPossibleSum; sum <= simulation.lastPossibleSum; sum += 1) {
    probabilities.push(simulation.counts[sum] / trials, simulation.theory[sum]);
  }
  const maxProbability = Math.max(...probabilities, 0.01);
  const bars = [];

  for (let sum = simulation.firstPossibleSum; sum <= simulation.lastPossibleSum; sum += 1) {
    const observed = simulation.counts[sum] / trials;
    const expected = simulation.theory[sum];
    const group = document.createElement("div");
    group.className = "bar-group";
    group.setAttribute("aria-label", `Sum ${sum}: observed ${(observed * 100).toFixed(2)} percent, theoretical ${(expected * 100).toFixed(2)} percent`);

    const pair = document.createElement("div");
    pair.className = "bar-pair";
    for (const [value, className, label] of [
      [observed, "bar-observed", "Observed"],
      [expected, "bar-expected", "Theory"]
    ]) {
      const bar = document.createElement("span");
      bar.className = `bar ${className}`;
      bar.style.height = `${Math.max(value > 0 ? 1 : 0, (value / maxProbability) * 100)}%`;
      bar.title = `${label}: ${(value * 100).toFixed(2)}%`;
      pair.append(bar);
    }

    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = sum;
    group.append(pair, label);
    bars.push(group);
  }

  chart.replaceChildren(...bars);
  chart.style.gridTemplateColumns = `repeat(${bars.length}, minmax(18px, 1fr))`;
  chart.style.minWidth = `${Math.max(100, bars.length * 22)}px`;
  chart.setAttribute("aria-label", `Observed and theoretical probabilities for sums ${simulation.firstPossibleSum} through ${simulation.lastPossibleSum}`);
}

function displaySimulation(settings) {
  const simulation = runSimulation(settings);
  const difference = simulation.observedMean - simulation.theoreticalMean;

  document.querySelector("#observed-mean").textContent = simulation.observedMean.toFixed(2);
  document.querySelector("#theoretical-mean").textContent = simulation.theoreticalMean.toFixed(2);
  document.querySelector("#mean-comparison").textContent = `${difference >= 0 ? "+" : ""}${difference.toFixed(2)} from theory`;
  document.querySelector("#likely-sum").textContent = simulation.mostLikelySum;
  document.querySelector("#likely-probability").textContent = `${(simulation.mostLikelyProbability * 100).toFixed(1)}% theoretical chance`;
  document.querySelector("#chart-subtitle").textContent = `${settings.trials.toLocaleString()} rolls · observed vs. theoretical`;
  document.querySelector("#simulation-summary").textContent =
    `In ${settings.trials.toLocaleString()} rolls, sum ${simulation.observedMostLikely} appeared most often. The expected average is ${simulation.theoreticalMean.toFixed(2)}; your experimental average was ${simulation.observedMean.toFixed(2)}.`;
  renderChart(simulation, settings.trials);

  emptyState.hidden = true;
  resultsContent.hidden = false;
}

rollButton.addEventListener("click", () => {
  const settings = getSettings();
  if (!diceCountInput.reportValidity() || !sideCountInput.reportValidity()) return;
  showRoll(rollDice(settings.dice, settings.sides));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const settings = getSettings();
  if (!isValidSettings(settings)) return;
  displaySimulation(settings);
});
