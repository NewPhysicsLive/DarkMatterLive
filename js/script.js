/* script.js */
// Set up margins and dimensions
const margin = { top: 60, right: 20, bottom: 80, left: 80 };
const container = d3.select('#plot');
const width = container.node().clientWidth;
const height = container.node().clientHeight;

var superscript = "⁰¹²³⁴⁵⁶⁷⁸⁹",
    formatPower = function(d) { return (d + "").split("").map(function(c) { return superscript[c]; }).join("");
 };

// Create SVG with viewBox for responsiveness
const svg = container.append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`)
  .classed('svg-content', true);

// Define scales (logarithmic x, linear y)
const x0 = d3.scaleLog().domain([1, 1e6]).range([margin.left, width - margin.right]);
const y0 = d3.scaleLog().domain([1e-15, 1e-1]).range([height - margin.bottom, margin.top]);

// Create axis generators
const xAxis = d3.axisBottom(x0)
      .ticks(10, function(d) { return 10 + formatPower(Math.round(Math.log(d) / Math.LN10)); })
      .tickSize(7);
const yAxis = d3.axisLeft(y0)
      .ticks(10, function(d) { return 10 + "⁻" + formatPower(Math.round(Math.log(d) / Math.LN10)); })
      .tickSize(7);

const xAxisTop = d3.axisTop(x0)
      .ticks(10)
      .tickFormat("")
      .tickSize(7);
const yAxisRight = d3.axisRight(y0)
      .ticks(10)
      .tickFormat("")
      .tickSize(7);


// Append axes groups
const xAxisG = svg.append('g')
  .attr('class', 'x-axis')
  .attr('transform', `translate(0,${height - margin.bottom})`)
  .call(xAxis);

const yAxisG = svg.append('g')
  .attr('class', 'y-axis')
  .attr('transform', `translate(${margin.left},0)`)
  .call(yAxis);

const xAxisGtop = svg.append('g')
  .attr('class', 'x-axis-top')
  .attr('transform', `translate(0,${margin.top})`)
  .call(xAxisTop);

const yAxisGright = svg.append('g')
  .attr('class', 'y-axis-right')
  .attr('transform', `translate(${width-margin.right},0)`)
  .call(yAxisRight);

// Add X axis label\svg.append('text')

/* svg.append('text')
  .attr('class', 'axis-label')
  .attr('x', width / 2)
  .attr('y', height - margin.bottom / 3)
  .attr('text-anchor', 'middle')
  .text('Mass of DM');

// Add Y axis label\svg.append('text')
svg.append("text")
  .attr("class", "axis-label")
  .attr("transform", `translate(${margin.left / 3}, ${height / 2}) rotate(-90)`)
  .attr("text-anchor", "middle")
  .text("Coupling"); */

svg
  .append("text")
  .attr("class", "plot-title")
  .attr("x", width / 2 + 20)
  .attr("y", margin.top - 25)
  .attr("text-anchor", "middle")
  .text("Dark Photon into invisible final states (BC2)");

const foX = xAxisG.append('foreignObject')
  .attr('x', width/2-60)
  .attr('y', 40)
  .attr('width', 220)
  .attr('class', 'axis-label') 
  .attr('text-anchor', 'middle')
  .attr('height', 30);
  // DOMParser to turn that string into actual nodes
foX.append("xhtml:div").html(
  katex.renderToString("\\mathrm{Mass\\,of\\,DM},\\,m_{\\chi}\\,[\\mathrm{GeV}]", {
    throwOnError: false,
  })
);

const foY = yAxisG
  .append("foreignObject")
  .attr("x", -height/2-100)
  .attr("y", -margin.left)
  .style("transform", "rotate(-90deg)")
  .attr("width", 200)
  .attr("class", "axis-label")
  .attr("text-anchor", "middle")
  .attr("height", 50);
// DOMParser to turn that string into actual nodes
foY
  .append("xhtml:div")
  .html(
    katex.renderToString(
      "y=\\varepsilon^2\\alpha_\\mathrm{D} (m_\\chi / m_{A'})^4",
      {
        throwOnError: false,
      }
    )
  );



// Clip path for plotting area
svg.append('clipPath')
  .attr('id', 'clip')
  .append('rect')
    .attr('x', margin.left)
    .attr('y', margin.top)
    .attr('width', width - margin.left - margin.right)
    .attr('height', height - margin.top - margin.bottom);

// Container for data
const plotArea = svg.append('g')
  .attr('clip-path', 'url(#clip)');

/* // Example data: random log-distributed x vs sinusoidal
const data = d3.range(200).map(d => ({
  x: 1e-3 * Math.pow(1e14, Math.random()),
  y: 0.5 + 0.5 * Math.sin(d / 10)
}));

const A = 1e-5, B = 0.0005;
const [xMin, xMax] = x0.domain();
const expData = d3.range(500).map((d) => {
  const logMin = Math.log10(xMin);
  const logMax = Math.log10(xMax);
  const x = Math.pow(10, logMin + (d / 499) * (logMax - logMin));
  return { x, y: A * Math.exp(B * x) };
});


const exampleData = d3.range(500).map((d) => {
  const logMin = Math.log10(xMin);
  const logMax = Math.log10(xMax);
  const x = Math.pow(10, logMin + (d / 499) * (logMax - logMin));
  return { x, y: A / (Math.pow(x * Math.pow(Math.random(), 1/5) + 1, 2)) };
});
console.log(exampleData[0]); */

// Line generator
const line = d3.line()
  .x(d => x0(d.x))
  .y(d => y0(d.y));

const areaGen = d3.area()
  .x(d => x0(d.x))
  .y0(y0(0.2))
  .y1(d => y0(d.y));

/* const expLineGen = d3.line()
  .x(d => x0(d.x))
  .y(d => y0(d.y));

plotArea.append('path')
  .datum(data.sort((a, b) => d3.ascending(a.x, b.x)))
  .attr('class', 'area')
  .attr('fill', 'lightsteelblue')
  .attr('d', areaGen);

plotArea.append("path")
  .datum(exampleData)
  .attr("class", "area")
  .attr("fill", "lightsteelblue")
  .attr("d", areaGen);

// Draw initial line
plotArea.append('path')
  .datum(data.sort((a, b) => d3.ascending(a.x, b.x)))
  .attr('fill', 'none')
  .attr('stroke', 'steelblue')
  .attr('stroke-width', 1.5)
  .attr('d', line);

plotArea.append('path')
  .datum(expData)
  .attr('fill', 'none')
  .attr('stroke', 'crimson')
  .attr('stroke-width', 2)
  .attr('stroke-dasharray', '5 3')
  .attr('d', expLineGen);

plotArea.append("path")
  .datum(exampleData)
  .attr("fill", "none")
  .attr("stroke", "blue")
  .attr("stroke-width", 2)
  .attr("stroke-dasharray", "5 3")
  .attr("d", line); */

let babar_data;

d3.csv("../data/BaBar.csv", d3.autoType) // autoType will convert numeric strings to numbers
  .then((data) => {
    // data is now an array of { x: Number, y: Number } objects\
    babar_data = data;

    plotArea
      .append("path")
      .datum(babar_data)
      .attr("fill", "none")
      .attr("stroke", "gray")
      .attr("class", "line")
      .attr("stroke-width", 2)
      .attr("d", line);

    plotArea
      .append("path")
      .datum(babar_data)
      .attr("class", "area")
      .attr("fill", "lightgray")
      .attr("d", areaGen);

  })
  .catch((err) => console.error(err));


let relic_density_data;

d3.csv("../data/Relic Density.csv", d3.autoType) // autoType will convert numeric strings to numbers
  .then((data) => {
    // data is now an array of { x: Number, y: Number } objects\
    relic_density_data = data;
    
    plotArea
      .append("path")
      .datum(relic_density_data)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("class", "line")
      .attr("stroke-width", 3)
      .attr("d", line);

  })
  .catch((err) => console.error(err));


let cms_data;

d3.csv("../data/CMS.csv", d3.autoType) // autoType will convert numeric strings to numbers
  .then((data) => {
    // data is now an array of { x: Number, y: Number } objects\
    cms_data = data;

    plotArea
      .append("path")
      .datum(cms_data)
      .attr("fill", "none")
      .attr("stroke", "green")
      .attr("class", "line")
      .attr("stroke-width", 2)
      .attr("d", line) 

    
    plotArea
      .append("path")
      .datum(cms_data)
      .attr("class", "area")
      .attr("fill", "lightgreen")
      .attr("d", areaGen)
      .attr("id", "cms-area");

    plotArea
      .append("text")
      .attr("class", "line-label")
      .append("textPath")
      .attr("href", "#cms-area") // ← match the path’s id
      .attr("startOffset", "50%") // ← halfway along the path
      .attr("text-anchor", "middle") // ← center the text there
      .text("CMS");
      
  })
  .catch((err) => console.error(err));

let na64_data;

d3.csv("../data/NA64.csv", d3.autoType) // autoType will convert numeric strings to numbers
  .then((data) => {
    // data is now an array of { x: Number, y: Number } objects\
    na64_data = data;

    plotArea
      .append("path")
      .datum(na64_data)
      .attr("fill", "none")
      .attr("stroke", "rgb(26, 255, 0)")
      .attr("stroke-width", 2)
      .attr("class", "line")
      .attr("stroke-dasharray", "20 7")
      .attr("d", line);

  })
  .catch((err) => console.error(err));


let belle2_data;

d3.csv("../data/Belle 2.csv", d3.autoType) // autoType will convert numeric strings to numbers
  .then((data) => {
    // data is now an array of { x: Number, y: Number } objects\
    belle2_data = data;

    plotArea
      .append("path")
      .datum(belle2_data)
      .attr("fill", "none")
      .attr("stroke", "rgb(255, 0, 255)")
      .attr("stroke-width", 2)
      .attr("class", "line")
      .attr("stroke-dasharray", "20 7")
      .attr("d", line);

  })
  .catch((err) => console.error(err));

  let hllhc_data;

  d3.csv("../data/HL-LHC.csv", d3.autoType) // autoType will convert numeric strings to numbers
    .then((data) => {
      // data is now an array of { x: Number, y: Number } objects\
      hllhc_data = data;

      plotArea
        .append("path")
        .datum(hllhc_data)
        .attr("fill", "none")
        .attr("stroke", "rgb(5, 133, 46)")
        .attr("class", "line")
        .attr("stroke-width", 2)
        .attr("d", line);

    })
    .catch((err) => console.error(err));    

// Zoom behavior
const zoom = d3.zoom()
  .scaleExtent([0.5, 1e8])
  .translateExtent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
  .on('zoom', ({ transform }) => {
    const zx = transform.rescaleX(x0);
    const zy = transform.rescaleY(y0);

    svg.select('.x-axis').call(xAxis.scale(zx));
    svg.select(".x-axis-top").call(xAxisTop.scale(zx));
    svg.select('.y-axis').call(yAxis.scale(zy));
    svg.select(".y-axis-right").call(yAxisRight.scale(zy));

    const zoomedLine = d3.line()
      .x((d) => zx(d.x))
      .y((d) => zy(d.y));

    const zoomedArea = d3.area()
      .x(d => zx(d.x))
      .y0(d => zy(0.2))      // same baseline as before, but scaled
      .y1(d => zy(d.y));

    plotArea.selectAll('path.line')
            .attr('d', d => zoomedLine(d));

    plotArea.selectAll('path.area')
            .attr('d', d => zoomedArea(d));
  });

// Attach zoom to svg
svg.call(zoom);
