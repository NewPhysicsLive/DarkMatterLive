d3.xml("../BC2.svg").then((data) => {
  // inject into page
  d3.select("#plot-container").node().append(data.documentElement);
  const svg = d3.select("#plot-container svg");
  wireUpZoom(svg);
});

function wireUpZoom(svg) {
  // grab its viewBox to know the width/height
  const vb = svg.attr("viewBox").split(" ").map(Number);
  const [, , width, height] = vb;
  const margin = { top: 20, right: 20, bottom: 60, left: 80 };

  // We need scales that map your original data-domain to the viewBox
  // (you can hard-code the domain, or parse it from the SVG ticks)
  const x = d3
    .scaleLog()
    .domain([1, 1e6])
    .range([margin.left, width - margin.right]);
  const y = d3
    .scaleLog()
    .domain([1e-15, 1e-1])
    .range([height - margin.bottom, margin.top]);

  const xAxis = d3.axisBottom(x).ticks(10, ",.1e");
  const yAxis = d3.axisLeft(y).ticks(10, ",.1e");

  // Append new axis groups on top of the imported SVG
  const axes = svg.append("g").attr("class", "dynamic-axes");
  axes
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(xAxis);
  axes
    .append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis);

  // Create the zoom behavior
  const zoom = d3
    .zoom()
    .scaleExtent([1, 1e8])
    .translateExtent([
      [margin.left, margin.top],
      [width - margin.right, height - margin.bottom],
    ])
    .on("zoom", ({ transform }) => {
      const zx = transform.rescaleX(x);
      const zy = transform.rescaleY(y);

      // update the new axes
      svg.select(".x-axis").call(xAxis.scale(zx));
      svg.select(".y-axis").call(yAxis.scale(zy));

      // apply the transform to the plot content
      // assume your data is inside a <g id="data-layer"> in the SVG
      svg.select("#data-layer").attr("transform", transform);
    });

  // attach zoom to the SVG
  svg.call(zoom);
}
