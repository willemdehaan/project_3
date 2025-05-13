
console.log('working')
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

Promise.all([
  d3.csv("merged_final_diabetes_df.csv", row => ({
  ...d3.autoType(row),
  hr: +row[" hr"],  
})),

d3.csv("merged_final_df.csv", row => ({
  ...d3.autoType(row),
  hr: +row[" hr"],
}))

]).then(([a1cData, overallData]) => {
  drawA1CChart(a1cData);
  drawOverallChart(overallData);
});

function drawA1CChart(data) {
  const width = 800;
  const height = 300;
  const margin = { top: 40, right: 60, bottom: 40, left: 40 };

  const svg = d3.select("#chart-a1c")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3.scaleLinear().domain([0, 23]).range([margin.left, width - margin.right]);
  const y1 = d3.scaleLinear().domain([d3.min(data, d => d.hr), d3.max(data, d => d.hr)]).nice().range([height - margin.bottom, margin.top]);
  const y2 = d3.scaleLinear().domain([0, d3.max(data, d => d.sugar)]).nice().range([height - margin.bottom, margin.top]);

  const line = d3.line()
    .x(d => x(d.Hour))
    .y(d => y1(d.hr));

  const barWidth = 8;

  const a1cGroups = d3.groups(data, d => d.a1c_type);

  a1cGroups.forEach(([a1c, values], i) => {
    svg.append("path")
      .datum(values)
      .attr("fill", "none")
      .attr("stroke", "darkblue")
      .attr("stroke-dasharray", a1c === "Normal" ? "0" : "4,2")
      .attr("stroke-width", 2)
      .attr("class", "line")
      .attr("d", line);

    svg.selectAll(`.bar-${a1c}`)
      .data(values)
      .enter()
      .append("rect")
      .attr("x", d => x(d.Hour) + (i === 0 ? -barWidth : 0))
      .attr("y", d => y2(d.sugar))
      .attr("width", barWidth)
      .attr("height", d => y2(0) - y2(d.sugar))
      .attr("fill", a1c === "Normal" ? "skyblue" : "salmon")
      .attr("opacity", 0.4)
      .attr("class", "bar");
  });

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(24));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y1));

  svg.append("g")
    .attr("transform", `translate(${width - margin.right},0)`)
    .call(d3.axisRight(y2));
}

function drawOverallChart(data) {
  const width = 800;
  const height = 300;
  const margin = { top: 40, right: 60, bottom: 40, left: 40 };

  const svg = d3.select("#chart-overall")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const x = d3.scaleLinear().domain([0, 23]).range([margin.left, width - margin.right]);
  const y1 = d3.scaleLinear().domain([d3.min(data, d => d.hr), d3.max(data, d => d.hr)]).nice().range([height - margin.bottom, margin.top]);
  const y2 = d3.scaleLinear().domain([0, d3.max(data, d => d.sugar)]).nice().range([height - margin.bottom, margin.top]);

  const line = d3.line()
    .x(d => x(d.Hour))
    .y(d => y1(d.hr));

  svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "darkblue")
    .attr("stroke-width", 2)
    .attr("class", "line")
    .attr("d", line);

  const barWidth = 10;

  svg.selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => x(d.Hour) - barWidth / 2)
    .attr("y", d => y2(d.sugar))
    .attr("width", barWidth)
    .attr("height", d => y2(0) - y2(d.sugar))
    .attr("fill", "red")
    .attr("opacity", 0.4)
    .attr("class", "bar");

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(24));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y1));

  svg.append("g")
    .attr("transform", `translate(${width - margin.right},0)`)
    .call(d3.axisRight(y2));
}


