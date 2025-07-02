/* script.js */
// Set up margins and dimensions
const margin = { top: 60, right: 320, bottom: 80, left: 80 };
const container = d3.select('#plot');
const width = container.node().clientWidth;
const height = container.node().clientHeight;

var superscript = "⁰¹²³⁴⁵⁶⁷⁸⁹",
    formatPower = function(d) { return (d + "").split("").map(function(c) { return superscript[c]; }).join("");
 };

const sup = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴',
  '5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻' };

function toSuperscript(n) {
  return String(n)
    .split("")
    .map(c => sup[c] || c)
    .join("");
}

function powerTickFormatter({ labelEveryMantissa = false } = {}) {
  return function (d) {
    // protect against zero or negative
    if (d <= 0) return d;
    // compute exponent and mantissa
    const exp = Math.floor(Math.log10(d));
    const pow10 = Math.pow(10, exp);
    const mantissa = d / pow10;

    // Case A: exact powers of ten → always label 10^exp
    if (mantissa === 1) {
      return `10${toSuperscript(exp)}`;
    }

    // Case B: only label the main ticks (i.e. mantissa==1) if labelEveryMantissa=false
    if (!labelEveryMantissa) {
      return "";
    }

    // Case C: label first‑digit mantissa ticks, e.g. 2×10⁴
    // Round mantissa to 1 or 2 significant digits if you like:
    const m = Math.round(mantissa * 10) / 10; // e.g. 2, or 2.5
    return `${m}×10${toSuperscript(exp)}`;
  };
}

// Create SVG with viewBox for responsiveness
const svg = container.append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`)
  .classed('svg-content', true)
  .attr("pointer-events", "all");

// Define scales (logarithmic x, logarithmic y)
const x0 = d3.scaleLog().domain([1, 1e6]).range([margin.left, width - margin.right]);
const y0 = d3.scaleLog().domain([1e-15, 1e-1]).range([height - margin.bottom, margin.top]);

// Create axis generators
const xAxis = d3.axisBottom(x0)
      .ticks(10)
      .tickFormat(powerTickFormatter({ labelEveryMantissa: false }))
      .tickSize(7);
const yAxis = d3.axisLeft(y0)
      .ticks(10)
      .tickFormat(powerTickFormatter({ labelEveryMantissa: false }))
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

svg
  .append("text")
  .attr("class", "plot-title")
  .attr("x", (width - margin.left - margin.right) / 2 + margin.left)
  .attr("y", margin.top - 25)
  .attr("text-anchor", "middle")
  .text("Dark Photon into invisible final states (BC2)");

const foX = xAxisG
  .append("foreignObject")
  .attr("x", (width - margin.left-margin.right) / 2 + margin.left - 110)
  .attr("y", 40)
  .attr("width", 220)
  .attr("class", "axis-label")
  .attr("text-anchor", "middle")
  .attr("height", 30);
  // DOMParser to turn that string into actual nodes
foX.append("xhtml:div").html(
  katex.renderToString("\\mathrm{Mass\\,of\\,DM},\\,m_{\\chi}\\,[\\mathrm{GeV}]", {
    throwOnError: false,
  })
);

const foY = yAxisG
  .append("foreignObject")
  .attr("x", -(height - margin.top - margin.bottom) / 2 - margin.top - 100)
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
const clipped = svg.append('g')
  .attr('clip-path', 'url(#clip)');

const dataLayer = clipped.append("g")
  .attr("class", "data-layer");

// Line generator
const line = d3.line()
  .x(d => x0(d.x))
  .y(d => y0(d.y));

const areaGen = d3.area()
  .x(d => x0(d.x))
  .y0(y0(1))
  .y1(d => y0(d.y));


//white background
dataLayer
  .append("rect")
  .attr("x", margin.left)
  .attr("y", margin.top)
  .attr("width", width - margin.left - margin.right)
  .attr("height", height - margin.top - margin.bottom)
  .attr("fill", "white")
  .attr("pointer-events", "all");


function plotBuilder(plotData) {
  for (const element of plotData) {
    if (element.url) {
      d3.csv(element.url, d3.autoType) // autoType will convert numeric strings to numbers
        .then((data) => {
          // data is now an array of { x: Number, y: Number } objects\
          
          if (plotData.area.color) {
            dataLayer
              .append("path")
              .datum(data)
              .attr("class", "area")
              .attr("fill", `${plotData.area.color}`)
              .attr("d", areaGen);
          }
          if (plotData.line.color) {
            dataLayer
              .append("path")
              .datum(data)
              .attr("fill", "none")
              .attr("stroke", `${plotData.line.color}`)
              .attr("class", "line")
              .attr("stroke-width", plotData.line.width)
              .attr("stroke-dasharray", plotData.line.dash || null)
              .attr("d", line);
          }
          if (plotData.text.elementName) {
            dataLayer
              .append("text")
              .attr("class", "element-label")
              .append("textPath")
              .attr("href", `#${plotData.labelName}-area`) // ← match the path’s id
              .attr("startOffset", "40%") // ← halfway along the path
              .attr("text-anchor", "middle") // ← center the text there
              .text(plotData.text.elementName);
          }
        })
        .catch((err) => console.error(err));
    } else {
      console.log("no data provided");
      return 0;
    }
  } 
}


const plotData = [
  {
    labelName: "BaBar", // label for the legend
    longName: "BaBar", // long name for possible reference
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "gray", dash: null, width: 2 }, // line style
    area: { color: "lightgray" }, // area style
    paperUrls: "https://arxiv.org/abs/2305.13953", // URL to the source paper
    url: "data/BaBar.csv", // URL to the data file
  },
  {
    labelName: "Relic Density",
    longName: "Relic Density",
    text: { elementName: null },
    line: { color: "black", dash: null, width: 3 },
    area: { color: null },
    paperUrls: "https://arxiv.org/abs/2305.13953",
    url: "data/Relic Density.csv",
  },
  {
    labelName: "CMS",
    longName: "CMS",
    text: { elementName: "CMS" },
    line: { color: "green", dash: null, width: 2 },
    area: { color: "lightgreen" },
    paperUrls: "https://arxiv.org/abs/2305.13953",
    url: "data/CMS.csv",
  },
  {
    labelName: "NA64", // label for the legend
    longName: "NA64", // long name for possible reference
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgb(26, 255, 0)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: "https://arxiv.org/abs/2305.13953",
    url: "data/NA64.csv",
  },
  {
    labelName: "Belle 2", // label for the legend
    longName: "Belle 2", // long name for possible reference
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgb(255, 0, 255)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: "https://arxiv.org/abs/2305.13953",
    url: "data/Belle 2.csv",
  },
  {
    labelName: "HL-LHC", // label for the legend
    longName: "HL-LHC", // long name for possible reference
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgb(5, 133, 46)", dash: null, width: 2 },
    area: { color: null },
    paperUrls: "https://arxiv.org/abs/2305.13953",
    url: "data/HL-LHC.csv",
  },
];

let babar_data;

d3.csv("data/BaBar.csv", d3.autoType) // autoType will convert numeric strings to numbers
  .then((data) => {
    // data is now an array of { x: Number, y: Number } objects\
    babar_data = data;

    dataLayer
      .append("path")
      .datum(babar_data)
      .attr("fill", "none")
      .attr("stroke", "gray")
      .attr("class", "line")
      .attr("stroke-width", 2)
      .attr("d", line);

    dataLayer
      .append("path")
      .datum(babar_data)
      .attr("class", "area")
      .attr("fill", "lightgray")
      .attr("d", areaGen);

  })
  .catch((err) => console.error(err));


let relic_density_data;

d3.csv("data/Relic Density.csv", d3.autoType) // autoType will convert numeric strings to numbers
  .then((data) => {
    // data is now an array of { x: Number, y: Number } objects\
    relic_density_data = data;
    
    dataLayer
      .append("path")
      .datum(relic_density_data)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("class", "line")
      .attr("stroke-width", 3)
      .attr("d", line);

    dataLayer.selectAll("path.line")
      .attr("pointer-events", "stroke")
      .on("mouseover", function(event, d) {
    // 1) Bring this line to front
        d3.select(this).raise();
    // 2) Highlight it
        d3.select(this)
          .transition().duration(100)
          .attr("stroke-width", 4)
          .attr("opacity", 1);
      })
      .on("mouseout", function(event, d) {
    // 3) Revert styling
        d3.select(this)
          .transition().duration(100)
          .attr("stroke-width", 2)
          .attr("opacity", 0.7);
      });


  })
  .catch((err) => console.error(err));


let cms_data;

d3.csv("data/CMS.csv", d3.autoType) // autoType will convert numeric strings to numbers
  .then((data) => {
    // data is now an array of { x: Number, y: Number } objects\
    cms_data = data;

    dataLayer
      .append("path")
      .datum(cms_data)
      .attr("class", "area")
      .attr("fill", "lightgreen")
      .attr("d", areaGen)
      .attr("id", "cms-area");

    dataLayer
      .append("path")
      .datum(cms_data)
      .attr("fill", "none")
      .attr("stroke", "green")
      .attr("class", "line")
      .attr("stroke-width", 2)
      .attr("d", line) 

    dataLayer
      .append("text")
      .attr("class", "line-label")
      .append("textPath")
      .attr("href", "#cms-area") // ← match the path’s id
      .attr("startOffset", "40%") // ← halfway along the path
      .attr("text-anchor", "middle") // ← center the text there
      .text("CMS");

    dataLayer.selectAll("path.line")
      .on("mouseover", function(event, d) {
    // 1) Bring this line to front
        d3.select(this).raise();
    // 2) Highlight it
        d3.select(this)
          .transition().duration(100)
          .attr("stroke-width", 4)
          .attr("opacity", 1);
      })
      .on("mouseout", function(event, d) {
    // 3) Revert styling
        d3.select(this)
          .transition().duration(100)
          .attr("stroke-width", 2)
          .attr("opacity", 0.7);
      });

      
  })
  .catch((err) => console.error(err));

let na64_data;

d3.csv("data/NA64.csv", d3.autoType) // autoType will convert numeric strings to numbers
  .then((data) => {
    // data is now an array of { x: Number, y: Number } objects\
    na64_data = data;

    dataLayer
      .append("path")
      .datum(na64_data)
      .attr("fill", "none")
      .attr("stroke", "rgb(26, 255, 0)")
      .attr("stroke-width", 2)
      .attr("class", "line")
      .attr("stroke-dasharray", "20 7")
      .attr("d", line);

    dataLayer.selectAll("path.line")
      .on("mouseover", function(event, d) {
    // 1) Bring this line to front
        d3.select(this).raise();
    // 2) Highlight it
        d3.select(this)
          .transition().duration(100)
          .attr("stroke-width", 4)
          .attr("opacity", 1);
      })
      .on("mouseout", function(event, d) {
    // 3) Revert styling
        d3.select(this)
          .transition().duration(100)
          .attr("stroke-width", 2)
          .attr("opacity", 0.7);
      });


  })
  .catch((err) => console.error(err));


let belle2_data;

d3.csv("data/Belle 2.csv", d3.autoType) // autoType will convert numeric strings to numbers
  .then((data) => {
    // data is now an array of { x: Number, y: Number } objects\
    belle2_data = data;

    dataLayer
      .append("path")
      .datum(belle2_data)
      .attr("fill", "none")
      .attr("stroke", "rgb(255, 0, 255)")
      .attr("stroke-width", 2)
      .attr("class", "line")
      .attr("stroke-dasharray", "20 7")
      .attr("d", line);

    dataLayer.selectAll("path.line")
      .on("mouseover", function(event, d) {
    // 1) Bring this line to front
        d3.select(this).raise();
    // 2) Highlight it
        d3.select(this)
          .transition().duration(100)
          .attr("stroke-width", 4)
          .attr("opacity", 1);
      })
      .on("mouseout", function(event, d) {
    // 3) Revert styling
        d3.select(this)
          .transition().duration(100)
          .attr("stroke-width", 2)
          .attr("opacity", 0.7);
      });


  })
  .catch((err) => console.error(err));

  let hllhc_data;

  d3.csv("data/HL-LHC.csv", d3.autoType) // autoType will convert numeric strings to numbers
    .then((data) => {
      // data is now an array of { x: Number, y: Number } objects\
      hllhc_data = data;

      dataLayer
        .append("path")
        .datum(hllhc_data)
        .attr("fill", "none")
        .attr("stroke", "rgb(5, 133, 46)")
        .attr("class", "line")
        .attr("stroke-width", 2)
        .attr("d", line);

      dataLayer.selectAll("path.line")
      .on("mouseover", function(event, d) {
    // 1) Bring this line to front
        d3.select(this).raise();
    // 2) Highlight it
        d3.select(this)
          .transition().duration(100)
          .attr("stroke-width", 4)
          .attr("opacity", 1);
      })
      .on("mouseout", function(event, d) {
    // 3) Revert styling
        d3.select(this)
          .transition().duration(100)
          .attr("stroke-width", 2)
          .attr("opacity", 0.7);
      });


    })
    .catch((err) => console.error(err));
  
const legendData = [
  { name: "BaBar", color: "gray", areaColor: "lightgray", dash: null, paperUrl: "https://arxiv.org/abs/2305.13953" },
  { name: "Relic Density", color: "black", dash: null, paperUrl: "https://arxiv.org/abs/2305.13953" },
  { name: "CMS", color: "green", areaColor: "lightgreen", dash: null, paperUrl: "https://arxiv.org/abs/2305.13953" },
  { name: "NA64", color: "rgb(26, 255, 0)", dash: "20,7", paperUrl: "https://arxiv.org/abs/2305.13953" },
  { name: "Belle 2", color: "rgb(255, 0, 255)", dash: "20,7", paperUrl: "https://arxiv.org/abs/2305.13953" },
  { name: "HL-LHC", color: "rgb(5, 133, 46)", dash: null, paperUrl: "https://arxiv.org/abs/2305.13953" },
];

const legendX = width - margin.right + 50;
const legendY = margin.top;

const legend = svg.append("g")
  .attr("class", "legend")
  .attr("transform", `translate(${legendX},${legendY})`);

const itemHeight = 25;
const swatchSize = 30;
const item = legend
  .selectAll(".legend-item")
  .data(legendData)
  .enter().append("g")
    .attr("class", "legend-item")
    .attr("transform", (d,i) => `translate(0, ${i * itemHeight})`);

item
  .filter((d) => d.areaColor) // only those entries
  .append("rect")
  .attr("width", swatchSize)
  .attr("height", 16)
  .attr("y", 0) // vertical centering
  .attr("fill", (d) => d.areaColor);

item
  .append("line")
  .attr("x1", 0)
  .attr("x2", swatchSize)
  .attr("y1", 8)
  .attr("y2", 8)
  .attr("stroke", (d) => d.color)
  .attr("stroke-width", 2)
  .attr("stroke-dasharray", d => d.dash || null);

const text = item.append("text")
  .attr("x", swatchSize + 6)
  .attr("y", 8)
  .attr("dy", "0.35em")

text.append("tspan")
    .text(d => `${d.name} `);

text.append("a")
    .attr("xlink:href", d => d.paperUrl)  // your URL here
    .attr("target", "_blank")
  .append("tspan")
    .text((d,i) => `[${i+1}]`)
    .style("text-decoration", "underline")
    .style("cursor", "pointer");
  
// Zoom behavior
const zoom = d3.zoom()
  .scaleExtent([0.2, 1e6])
  .on('zoom', ({ transform }) => {

    const zx = transform.rescaleX(x0);
    const zy = transform.rescaleY(y0);

    const zoomFactor = transform.k; // ≥1 means zoomed in
    const [xMin, xMax] = zx.domain();
    const spanRatio = xMax / xMin; 
    
    console.log(`Zoom factor: ${zoomFactor}, xMin: ${xMin}, xMax: ${xMax}, spanRatio: ${spanRatio}`);

    let xTicks, xFormat;

    if (spanRatio > 50) {
      // Wide view → only decades, 10ⁿ labels
      xFormat = (d) => {
        const e = Math.floor(Math.log10(d));
        if (d/Math.pow(10, e) === 1) {
        return `10${toSuperscript(e)}`;
        } else return ""; 
      };  // others blank
      } else if (spanRatio > 5) {
      // Medium zoom → decades + first‐digit ticks (2×10ⁿ, 5×10ⁿ)
      xFormat = (d) => {
        const e = Math.floor(Math.log10(d));
        const m = d / Math.pow(10, e);
        const supExp = toSuperscript(e);
        // label only exact decades or 2×,5×
        if (m === 1) return `10${supExp}`;
        if (m === 2 || m === 5) return `${m}×10${supExp}`;
        return ""; // others blank
      };
      } else if (xMax - xMin < 0.1 && xMax > 0.01) {
        xTicks = 6; // number of ticks
        xFormat = d3.format(".8~f");
      } else if (xMax < 0.01 && spanRatio > 2) {
        xTicks = 6; // number of ticks
        xFormat = (d) => {
          const e = Math.floor(Math.log10(d));
          const m = d / Math.pow(10, e);
          const supExp = toSuperscript(e);
          // label only exact decades or 2×,5×
          if (m === 1) return `10${supExp}`;
          return `${m.toFixed(0)}×10${supExp}`;
        };
      } else if (xMax < 0.01 && xMax - xMin < 0.01 && spanRatio > 1.05) {
        xTicks = 6; // number of ticks
        xFormat = (d) => {
          const e = Math.floor(Math.log10(d));
          const m = d / Math.pow(10, e);
          const supExp = toSuperscript(e);
          // label only exact decades or 2×,5×
          if (m === 1) return `10${supExp}`;
          return `${m.toFixed(2)}×10${supExp}`;
        };
      } else if (xMax < 0.01 && xMax - xMin < 0.01 && spanRatio > 1.001) {
        xTicks = 4; // number of ticks
        xFormat = (d) => {
          const e = Math.floor(Math.log10(d));
          const m = d / Math.pow(10, e);
          const supExp = toSuperscript(e);
          // label only exact decades or 2×,5×
          if (m === 1) return `10${supExp}`;
          return `${m.toFixed(4)}×10${supExp}`;
        };
      } else if (xMax < 0.01 && xMax - xMin < 0.01) {
        xTicks = 3; // number of ticks
        xFormat = (d) => {
          const e = Math.floor(Math.log10(d));
          const m = d / Math.pow(10, e);
          const supExp = toSuperscript(e);
          // label only exact decades or 2×,5×
          if (m === 1) return `10${supExp}`;
          return `${m.toFixed(6)}×10${supExp}`;
        };
      } else {
        // Deep zoom → linear ticks in current window
        xTicks = 6; // number of ticks
        xFormat = d3.format(".2~f"); // e.g. “1234.56”
      }


    svg.select('.x-axis').call(
      xAxis
        .scale(zx)
        .ticks(xTicks)
        .tickFormat(xFormat)
        .tickSize(7));
      
    svg.select(".x-axis-top").call(
      xAxisTop
      .scale(zx)
      .ticks(xTicks)
      .tickSize(7)
    );


    svg.select('.y-axis').call(yAxis.scale(zy));
    svg.select(".y-axis-right").call(yAxisRight.scale(zy));

    const zoomedLine = d3.line()
      .x((d) => zx(d.x))
      .y((d) => zy(d.y));

    const zoomedArea = d3.area()
      .x(d => zx(d.x))
      .y0(d => zy(1))      // same baseline as before, but scaled
      .y1(d => zy(d.y));

    dataLayer.selectAll('path.line')
            .attr('d', d => zoomedLine(d));

    dataLayer.selectAll('path.area')
            .attr('d', d => zoomedArea(d));
  });

dataLayer.call(zoom);

