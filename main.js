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

    // Create the brush
    const brush = d3
      .brushX() // Brush for horizontal selection
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ]); // Define the extent (brushable area)

    // Define the zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([1, 10]) // Set zoom limits
      .on("zoom", zoomed); // Attach the zoom event handler

    // Attach the brush to the container
    svg.append("g").attr("class", "brush").call(brush);

    // Handle brush events
    brush.on("start", () => {
      // Disable pan or other behaviors during the brush interaction
    });

    brush.on("brush", () => {
      // Update chart appearance during brushing
      // (Optional) Highlight the brush area, etc.
    });

    brush.on("end", (event) => {
      if (!event.selection) return; // No selection (nothing dragged)

      // Get the brush selection (the range that was selected)
      const [x0, x1] = event.selection;

      // Update the zoom domain based on the brush extent
      const newDomain = [x.invert(x0), x.invert(x1)];
      x.domain(newDomain);

      // Re-render the chart with the new domain
      render(); // Call render to update the chart and axes

      // Reset the brush position after the action (optional)
      svg.select(".brush").call(brush.move, null); // Reset brush position
    });

    // Zoom handler
    function zoomed(event) {
      // Apply the zoom transform (scaling and translation)
      const transform = event.transform;

      // Update the x-scale with the current zoom transform
      x.range(
        [margin.left, width - margin.right].map((d) => transform.applyX(d)),
      );

      // Update the chart and axes
      render();
    }

    // Attach the zoom behavior to the chart
    svg.call(zoom);
  }
}
