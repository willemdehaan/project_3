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



