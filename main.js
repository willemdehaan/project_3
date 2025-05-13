document.querySelectorAll(".collapsible-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const content = this.nextElementSibling;
  
      if (content.style.display === "block") {
        content.style.display = "none";
        this.innerHTML = this.innerHTML.replace("▾", "▸");
      } else {
        content.style.display = "block";
        this.innerHTML = this.innerHTML.replace("▸", "▾");
      }
    });
  });

console.log('main.js is running');

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Load both datasets and normalize " hr" to "hr"
Promise.all([
  d3.csv("merged_final_diabetes_df.csv", row => ({
    ...d3.autoType(row),
    hr: +row[" hr"] // Normalize and cast
  })),
  d3.csv("merged_final_df.csv", row => ({
    ...d3.autoType(row),
    hr: +row[" hr"]
  }))
]).then(([a1cData, overallData]) => {
  drawA1CChart(a1cData);
  drawOverallChart(overallData);
});

// Chart 1: Grouped by A1C type
function drawA1CChart(data) {
  const width = 800;
  const height = 300;
  const margin = { top: 40, right: 60, bottom: 40, left: 50 };

  const svg = d3.select("#chart-a1c")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3.scaleLinear().domain([0, 23]).range([margin.left, width - margin.right]);
  const y1 = d3.scaleLinear().domain(d3.extent(data, d => d.hr)).nice().range([height - margin.bottom, margin.top]);
  const y2 = d3.scaleLinear().domain([0, d3.max(data, d => d.sugar)]).nice().range([height - margin.bottom, margin.top]);

  const line = d3.line()
    .x(d => x(d.Hour))
    .y(d => y1(d.hr));

  const barWidth = 8;
  const grouped = d3.groups(data, d => d.a1c_type);

  grouped.forEach(([a1c, values], i) => {
    // Bars
    svg.selectAll(`.bar-${a1c}`)
      .data(values)
      .enter()
      .append("rect")
      .attr("x", d => x(d.Hour) + (i === 0 ? -barWidth : 0))
      .attr("y", d => y2(d.sugar))
      .attr("width", barWidth)
      .attr("height", d => y2(0) - y2(d.sugar))
      .attr("fill", a1c === "Normal" ? "skyblue" : "salmon")
      .attr("opacity", 0.4);

    // Lines
    svg.append("path")
      .datum(values)
      .attr("fill", "none")
      .attr("stroke", "darkblue")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", a1c === "Normal" ? "0" : "4,2")
      .attr("d", line);
  });

  // Axes
  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(24));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y1));
  svg.append("g").attr("transform", `translate(${width - margin.right},0)`).call(d3.axisRight(y2));
}

// Chart 2: Overall averages
function drawOverallChart(data) {
  const width = 800;
  const height = 300;
  const margin = { top: 40, right: 60, bottom: 40, left: 50 };

  const svg = d3.select("#chart-overall")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3.scaleLinear().domain([0, 23]).range([margin.left, width - margin.right]);
  const y1 = d3.scaleLinear().domain(d3.extent(data, d => d.hr)).nice().range([height - margin.bottom, margin.top]);
  const y2 = d3.scaleLinear().domain([0, d3.max(data, d => d.sugar)]).nice().range([height - margin.bottom, margin.top]);

  const line = d3.line()
    .x(d => x(d.Hour))
    .y(d => y1(d.hr));

  const barWidth = 10;

  // Bars
  svg.selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => x(d.Hour) - barWidth / 2)
    .attr("y", d => y2(d.sugar))
    .attr("width", barWidth)
    .attr("height", d => y2(0) - y2(d.sugar))
    .attr("fill", "red")
    .attr("opacity", 0.4);

  // Line
  svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "darkblue")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Axes
  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(24));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y1));
  svg.append("g").attr("transform", `translate(${width - margin.right},0)`).call(d3.axisRight(y2));
}

function drawHeartRateTrend(data) {
  const width = 850;
  const height = 350;
  const margin = { top: 40, right: 160, bottom: 40, left: 50 };

  const parseTime = d3.timeParse("%H:%M");

  data = data
    .filter(d => d.time && d.hr && !isNaN(d.hr))
    .map(d => ({
      ...d,
      parsedTime: parseTime(d.time.trim()),
    }))
    .filter(d => d.parsedTime); // Keep only rows with valid time parsing

  // Group by parsed time and a1c_type
  const grouped = d3.rollup(
    data,
    v => {
      const hrs = v.map(d => d.hr);
      return {
        mean: d3.mean(hrs),
        min: d3.min(hrs),
        max: d3.max(hrs)
      };
    },
    d => d.parsedTime,
    d => d.a1c_type
  );

  // Flatten the grouped data
  const trendData = [];
  grouped.forEach((a1cMap, time) => {
    a1cMap.forEach((stats, a1c_type) => {
      trendData.push({ time, a1c_type, ...stats });
    });
  });

  // Separate series
  const normalData = trendData.filter(d => d.a1c_type === "Normal").sort((a, b) => a.time - b.time);
  const preData = trendData.filter(d => d.a1c_type === "Prediabetes").sort((a, b) => a.time - b.time);

  // Scales
  const x = d3.scaleTime()
    .domain(d3.extent(trendData, d => d.time))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([
      d3.min(trendData, d => d.min),
      d3.max(trendData, d => d.max)
    ])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const svg = d3.select("#heartrate-a1c")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const area = d3.area()
    .x(d => x(d.time))
    .y0(d => y(d.min))
    .y1(d => y(d.max));

  const line = d3.line()
    .x(d => x(d.time))
    .y(d => y(d.mean));

  // Range areas
  svg.append("path")
    .datum(normalData)
    .attr("fill", "lightblue")
    .attr("d", area)
    .attr("opacity", 0.4);

  svg.append("path")
    .datum(preData)
    .attr("fill", "lightsalmon")
    .attr("d", area)
    .attr("opacity", 0.4);

  // Mean lines
  svg.append("path")
    .datum(normalData)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);

  svg.append("path")
    .datum(preData)
    .attr("fill", "none")
    .attr("stroke", "darkorange")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Axes
  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(
      d3.axisBottom(x)
        .tickFormat(d3.timeFormat("%H:%M"))
        .ticks(d3.timeHour.every(2))
    );

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  // Legend
  const legend = svg.append("g").attr("transform", `translate(${width - 140},${margin.top})`);
  const items = [
    { color: "lightblue", label: "Normal Range", opacity: 0.4 },
    { color: "steelblue", label: "Normal Mean", opacity: 1 },
    { color: "lightsalmon", label: "Prediabetes Range", opacity: 0.4 },
    { color: "darkorange", label: "Prediabetes Mean", opacity: 1 }
  ];

  items.forEach((item, i) => {
    const g = legend.append("g").attr("transform", `translate(0,${i * 20})`);
    g.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", item.color)
      .attr("opacity", item.opacity);
    g.append("text")
      .attr("x", 20)
      .attr("y", 12)
      .text(item.label)
      .attr("font-size", "12px");
  });
}

// Load data and invoke the chart
d3.csv("combined_hr.csv", row => ({
  hr: +row[" hr"],
  time: row.time,
  a1c_type: row.a1c_type
})).then(drawHeartRateTrend);

