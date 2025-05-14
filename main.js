// Load the data and draw the chart
d3.csv("combined_hr.csv", (row) => ({
  hr: +row[" hr"],
  time: row.time,
  a1c_type: row.a1c_type,
  participant_id: row.participant_id,
})).then(drawHeartRateTrend);

function drawHeartRateTrend(data) {
  const width = 850;
  const height = 350;
  const margin = { top: 40, right: 160, bottom: 40, left: 50 };
  const parseTime = d3.timeParse("%H:%M");

  const participantSelect = d3.select("#participant-select");

  const participantIds = Array.from(
    new Set(data.map((d) => d.participant_id).filter((id) => id !== "all")),
  ).sort((a, b) => +a - +b); // numeric sort

  // Then add sorted numeric participant IDs
  participantIds.forEach((id) => {
    participantSelect.append("option").attr("value", id).text(id);
  });

  // Initial preprocessing
  data = data
    .filter((d) => d.time && d.hr && !isNaN(d.hr))
    .map((d) => ({
      ...d,
      parsedTime: parseTime(d.time.trim()),
    }))
    .filter((d) => d.parsedTime);

  participantSelect.on("change", () =>
    render(participantSelect.property("value")),
  );
  render("all");

  function render(selectedId) {
    const filteredData =
      selectedId === "all"
        ? data
        : data.filter((d) => d.participant_id === selectedId);

    drawChart(filteredData);
  }

  function drawChart(filteredData) {
    d3.select("#heartrate-a1c").selectAll("svg").remove(); // clear old chart

    const grouped = d3.rollup(
      filteredData,
      (v) => {
        const hrs = v.map((d) => d.hr);
        return {
          mean: d3.mean(hrs),
          min: d3.min(hrs),
          max: d3.max(hrs),
        };
      },
      (d) => d.parsedTime,
      (d) => d.a1c_type,
    );

    const trendData = [];
    grouped.forEach((a1cMap, time) => {
      a1cMap.forEach((stats, a1c_type) => {
        trendData.push({ time, a1c_type, ...stats });
      });
    });

    const normalData = trendData
      .filter((d) => d.a1c_type === "Normal")
      .sort((a, b) => a.time - b.time);
    const preData = trendData
      .filter((d) => d.a1c_type === "Prediabetes")
      .sort((a, b) => a.time - b.time);

    const x = d3
      .scaleTime()
      .domain(d3.extent(trendData, (d) => d.time))
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([
        d3.min(trendData, (d) => d.min),
        d3.max(trendData, (d) => d.max),
      ])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const svg = d3
      .select("#heartrate-a1c")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const area = d3
      .area()
      .x((d) => x(d.time))
      .y0((d) => y(d.min))
      .y1((d) => y(d.max));

    const line = d3
      .line()
      .x((d) => x(d.time))
      .y((d) => y(d.mean));

    svg
      .append("path")
      .datum(normalData)
      .attr("fill", "lightblue")
      .attr("d", area)
      .attr("opacity", 0.4);

    svg
      .append("path")
      .datum(preData)
      .attr("fill", "lightsalmon")
      .attr("d", area)
      .attr("opacity", 0.4);

    svg
      .append("path")
      .datum(normalData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line);

    svg
      .append("path")
      .datum(preData)
      .attr("fill", "none")
      .attr("stroke", "darkorange")
      .attr("stroke-width", 2)
      .attr("d", line);

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(
        d3
          .axisBottom(x)
          .tickFormat(d3.timeFormat("%H:%M"))
          .ticks(d3.timeHour.every(2)),
      );

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    const legend = svg
      .append("g")
      .attr("transform", `translate(${width - 140},${margin.top})`);

    const items = [
      { color: "lightblue", label: "Normal Range", opacity: 0.4 },
      { color: "steelblue", label: "Normal Mean", opacity: 1 },
      { color: "lightsalmon", label: "Prediabetes Range", opacity: 0.4 },
      { color: "darkorange", label: "Prediabetes Mean", opacity: 1 },
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
}
