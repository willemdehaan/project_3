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

// Load the data and draw the chart
d3.csv("combined_hr.csv", (row) => ({
  hr: +row[" hr"],
  time: row.time,
  a1c_type: row.a1c_type,
  participant_id: row.participant_id,
  gender: row.Gender,
})).then(drawHeartRateTrend);

function drawHeartRateTrend(data) {
  const width = 850;
  const height = 350;
  const margin = { top: 40, right: 160, bottom: 40, left: 50 };
  const parseTime = d3.timeParse("%H:%M");

  const participantSelect = d3.select("#participant-select");
  const genderSelect = d3.select("#gender-select");

  const participantIds = Array.from(
    new Set(data.map((d) => d.participant_id).filter((id) => id !== "all")),
  ).sort((a, b) => +a - +b); // numeric sort

  // Then add sorted numeric participant IDs
  participantIds.forEach((id) => {
    participantSelect.append("option").attr("value", id).text(id);
  });

  const genders = Array.from(
    new Set(data.map((d) => d.gender).filter((g) => g)),
  ).sort();

  genders.forEach((g) => {
    genderSelect.append("option").attr("value", g).text(g);
  });

  // Initial preprocessing
  data = data
    .filter((d) => d.time && d.hr && !isNaN(d.hr))
    .map((d) => ({
      ...d,
      parsedTime: parseTime(d.time.trim()),
    }))
    .filter((d) => d.parsedTime);

  participantSelect.on("change", () => {
    const selectedId = participantSelect.property("value");
    if (selectedId !== "all") {
      genderSelect.property("disabled", true);
      genderSelect.property("value", "all");
    } else {
      genderSelect.property("disabled", false);
    }
    render();
  });

  genderSelect.on("change", () => {
    const selectedGender = genderSelect.property("value");
    if (selectedGender !== "all") {
      participantSelect.property("disabled", true);
      participantSelect.property("value", "all");
    } else {
      participantSelect.property("disabled", false);
    }
    render();
  });

  render();

  function render() {
    const selectedId = participantSelect.property("value");
    const selectedGender = genderSelect.property("value");

    let filteredData = data;

    if (selectedId !== "all") {
      filteredData = filteredData.filter(
        (d) => d.participant_id === selectedId,
      );
    }

    if (selectedGender !== "all") {
      filteredData = filteredData.filter((d) => d.gender === selectedGender);
    }
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

    //       svg.append("defs").html(`
    //   <marker id="arrow-start" markerWidth="6" markerHeight="6" refX="0" refY="3" orient="auto">
    //     <path d="M6,0 L0,3 L6,6" fill="gray" />
    //   </marker>
    //   <marker id="arrow-end" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
    //     <path d="M0,0 L6,3 L0,6" fill="gray" />
    //   </marker>
    // `);

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

    // Add x-axis title
    // Calculate available width excluding legend width (160px)
    const legendWidth = 160;
    const availableWidth = width - legendWidth;

    svg
      .append("text")
      .attr(
        "transform",
        `translate(${availableWidth / 2},${height - margin.bottom + 35})`, // Adjusted padding for label
      )
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Time of Day");

    // Add y-axis title
    svg
      .append("text")
      .attr("transform", `rotate(-90)`)
      .attr("x", -height / 2)
      .attr("y", margin.left - 35)
      .style("text-anchor", "middle")
      .style("font-size", "14px")
      .text("Heart Rate (bpm)");

    const legend = svg
      .append("g")
      .attr("transform", `translate(${width - 140},${margin.top})`);

    const items = [
      { color: "lightblue", label: "Non-diabetic Range", opacity: 0.4 },
      { color: "steelblue", label: "Non-diabetic Mean", opacity: 1 },
      { color: "lightsalmon", label: "Prediabetec Range", opacity: 0.4 },
      { color: "darkorange", label: "Prediabetec Mean", opacity: 1 },
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

    if (participantSelect.property("value") === "all") {
      const startTime = parseTime("04:00");
      const endTime = parseTime("08:00");
      const midTime = new Date((startTime.getTime() + endTime.getTime()) / 2);

      const xStart = x(startTime);
      const xEnd = x(endTime);
      const yTop = y.range()[1]; // top of the plot area
      const yBottom = y.range()[0]; // bottom of the plot area

      // Draw vertical dashed line at 4 a.m.
      svg
        .append("line")
        .attr("x1", xStart)
        .attr("x2", xStart)
        .attr("y1", yTop)
        .attr("y2", yBottom)
        .attr("stroke", "gray")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");

      // Draw vertical dashed line at 8 a.m.
      svg
        .append("line")
        .attr("x1", xEnd)
        .attr("x2", xEnd)
        .attr("y1", yTop)
        .attr("y2", yBottom)
        .attr("stroke", "gray")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");

      // Add annotation text above the chart
      svg
        .append("text")
        .attr("x", x(midTime))
        .attr("y", margin.top - 10)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "gray")
        .text(
          "Dawn Phenomenon: Elevated HR from 4–8am for pre-diabetic participants. ",
        );
    }

    const tooltip = d3.select("#tooltip");

    // Append circles for normal data
    svg
      .selectAll(".dot-normal")
      .data(normalData)
      .enter()
      .append("circle")
      .attr("class", "dot-normal")
      .attr("cx", (d) => x(d.time))
      .attr("cy", (d) => y(d.mean))
      .attr("r", 6)
      .attr("fill", "transparent")
      .attr("stroke", "transparent")
      .attr("pointer-events", "all")
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(
            `<strong>A1C Type:</strong> Normal<br/>
        <strong>Time:</strong> ${d3.timeFormat("%H:%M")(d.time)}<br/>
        <strong>Heart Rate:</strong> ${d.mean.toFixed(1)}`,
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(300).style("opacity", 0);
      });

    // Append circles for prediabetes data
    svg
      .selectAll(".dot-pre")
      .data(preData)
      .enter()
      .append("circle")
      .attr("class", "dot-pre")
      .attr("cx", (d) => x(d.time))
      .attr("cy", (d) => y(d.mean))
      .attr("r", 6)
      .attr("fill", "transparent")
      .attr("stroke", "transparent")
      .attr("pointer-events", "all")
      .on("mouseover", (event, d) => {
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(
            `<strong>A1C Type:</strong> Prediabetes<br/>
        <strong>Time:</strong> ${d3.timeFormat("%H:%M")(d.time)}<br/>
        <strong>Heart Rate:</strong> ${d.mean.toFixed(1)}`,
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(300).style("opacity", 0);
      });
  }
}
