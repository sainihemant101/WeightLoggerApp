// ===========================
// CONFIGURATION
// ===========================

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw9Le-s5KRGm8HOuMcOX9WJJxoE-AVp4GrDMgPU7nOgTi-y8BQzVYmzFSeHXcX_X5TO/exec";

let allData = [];
let filteredData = []; // Only Rank 1 entries
let currentRange = 7;
let trendChart = null;

// ===========================
// LOAD DATA ON PAGE OPEN
// ===========================

window.onload = function () {
  fetchData();
};

function fetchData() {
  fetch(APPS_SCRIPT_URL)
    .then((res) => res.json())
    .then((response) => {
      if (response.status === "success") {
        allData = response.data;

        // Filter only Rank 1 entries
        filteredData = allData.filter((row) => Number(row.rank) === 1);

        renderAll(currentRange);
      } else {
        showError("Could not load data.");
      }
    })
    .catch(() => showError("Could not connect. Check your internet."));
}

// ===========================
// RENDER EVERYTHING
// ===========================

function renderAll(days) {
  const rangeData = filterByDays(filteredData, days);
  renderChart(rangeData, days);
  renderAverages(filteredData);
  renderTable(filteredData);
}

// ===========================
// FILTER DATA BY LAST N DAYS
// ===========================

function filterByDays(data, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);

  return data.filter((row) => {
    const rowDate = parseDate(row.date);
    return rowDate >= cutoff;
  });
}

// ===========================
// DATE PARSER (dd/mm/yyyy)
// ===========================

function parseDate(dateStr) {
  const parts = String(dateStr).split("/");
  return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
}

// ===========================
// RENDER TREND CHART
// Daily average of all Rank 1 entries per day
// ===========================

function renderChart(data, days) {
  // Group Rank 1 entries by date and average their weights
  const grouped = {};
  data.forEach((row) => {
    const dateKey = row.date;
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(parseFloat(row.weight));
  });

  // Sort dates ascending
  const labels = Object.keys(grouped).sort(
    (a, b) => parseDate(a) - parseDate(b)
  );
  const weights = labels.map((date) => {
    const vals = grouped[date];
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(3);
  });

  const ctx = document.getElementById("trendChart").getContext("2d");

  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Avg Weight (kg)",
          data: weights,
          borderColor: "#4f8ef7",
          backgroundColor: "rgba(79, 142, 247, 0.1)",
          borderWidth: 2.5,
          pointBackgroundColor: "#4f8ef7",
          pointRadius: 4,
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.parsed.y} kg`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#888888", maxTicksLimit: 7 },
          grid: { color: "#1e1e1e" },
        },
        y: {
          ticks: { color: "#888888" },
          grid: { color: "#2a2a2a" },
        },
      },
    },
  });
}

// ===========================
// RENDER AVERAGES
// Average of daily averages for each period
// ===========================

function renderAverages(data) {
  [7, 15, 30, 90].forEach((days) => {
    const periodData = filterByDays(data, days);

    // Group by date and get daily averages first
    const grouped = {};
    periodData.forEach((row) => {
      const dateKey = row.date;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(parseFloat(row.weight));
    });

    const dailyAvgs = Object.values(grouped).map(
      (vals) => vals.reduce((a, b) => a + b, 0) / vals.length
    );

    const avg = dailyAvgs.length
      ? (dailyAvgs.reduce((a, b) => a + b, 0) / dailyAvgs.length).toFixed(3)
      : "--";

    document.getElementById(`avg-${days}`).innerText = avg;
  });
}

// ===========================
// RENDER TABLE
// Show only Rank 1 entries, most recent first
// ===========================

function renderTable(data) {
  const tbody = document.getElementById("data-table-body");

  if (!data.length) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center text-muted">No data yet.</td></tr>';
    return;
  }

  // Sort by date descending then time of day
  const timeOrder = { Morning: 1, Afternoon: 2, Evening: 3, Night: 4 };
  const sorted = [...data].sort((a, b) => {
    const dateDiff = parseDate(b.date) - parseDate(a.date);
    if (dateDiff !== 0) return dateDiff;
    return (timeOrder[a.time] || 99) - (timeOrder[b.time] || 99);
  });

  tbody.innerHTML = sorted
    .map(
      (row) => `
    <tr>
      <td>${row.date}</td>
      <td>${row.time}</td>
      <td>${parseFloat(row.weight).toFixed(3)}</td>
      <td>${row.rank}</td>
    </tr>
  `
    )
    .join("");
}

// ===========================
// DAY RANGE SELECTOR
// ===========================

function setRange(days, btn) {
  currentRange = days;
  document
    .querySelectorAll(".day-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderAll(days);
}

// ===========================
// ERROR DISPLAY
// ===========================

function showError(message) {
  document.getElementById(
    "data-table-body"
  ).innerHTML = `<tr><td colspan="4" class="text-center text-danger">${message}</td></tr>`;
}
