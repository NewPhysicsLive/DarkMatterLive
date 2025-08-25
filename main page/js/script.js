/* script.js */

document.documentElement.classList.add("loading");
window.addEventListener("load", () => {
  // when all CSS, images, fonts, scripts are done, show the page
  document.documentElement.classList.remove("loading");
});


document.addEventListener("DOMContentLoaded", function () {
  // toggle each category on click (useful for touch / mobile)
  document.querySelectorAll(".nav-dropdown .category-btn").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      const li = btn.parentElement;
      const isOpen = li.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");

      // close siblings so only one subpanel is open at a time (optional)
      Array.from(li.parentElement.children).forEach((sib) => {
        if (sib !== li) {
          sib.classList.remove("open");
          const b = sib.querySelector(".category-btn");
          if (b) b.setAttribute("aria-expanded", "false");
        }
      });
    });
  });

  // close panels when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-dropdown")) {
      document.querySelectorAll(".nav-dropdown .open").forEach((el) => {
        el.classList.remove("open");
        const b = el.querySelector(".category-btn");
        if (b) b.setAttribute("aria-expanded", "false");
      });
      document
        .querySelectorAll(".nav-dropdown.menu-open")
        .forEach((nd) => nd.classList.remove("menu-open"));
    }
  });

  // pressing Escape closes everything
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".nav-dropdown .open").forEach((el) => {
        el.classList.remove("open");
        const b = el.querySelector(".category-btn");
        if (b) b.setAttribute("aria-expanded", "false");
      });
      document
        .querySelectorAll(".nav-dropdown.menu-open")
        .forEach((nd) => nd.classList.remove("menu-open"));
    }
  });

  // on small screens, clicking the "Choose your model" link toggles the whole menu
  const navModels = document.querySelector(".nav-models");
  const navDropdown = document.querySelector(".nav-dropdown");
  if (navModels && navDropdown) {
    navModels.addEventListener("click", function (e) {
      if (window.matchMedia("(max-width:900px)").matches) {
        e.preventDefault(); // prevent navigation on small screens; keep the link for desktop
        navDropdown.classList.toggle("menu-open");
      }
    });
  }
});

function getSecondLevelDomain(url) {
  try {
    const host = new URL(url).hostname; // e.g. "arxiv.org" or "sub.example.co.uk"
    // remove the final ".something"
    return host.replace(/\.[^.]+$/, ""); // → "arxiv" or "sub.example.co"
  } catch {
    return null;
  }
}

// Set up margins and dimensions
const margin = { top: 60, right: 350, bottom: 80, left: 95 };
const container = d3.select('#plot');
const width = container.node().clientWidth;
const height = container.node().clientHeight;

let superscript = "⁰¹²³⁴⁵⁶⁷⁸⁹",
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

//initial formatting of tick labels
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
const x0 = d3.scaleLog().domain([1e-32, 1e3]).range([margin.left, width - margin.right]);
const y0 = d3.scaleLog().domain([1e-40, 1e-0]).range([height - margin.bottom, margin.top]);

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


//white filling background
dataLayer
  .append("rect")
  .attr("x", margin.left)
  .attr("y", margin.top)
  .attr("width", width - margin.left - margin.right)
  .attr("height", height - margin.top - margin.bottom)
  .attr("fill", "white")
  .attr("pointer-events", "all");

  
const hiddenPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
hiddenPath.style.visibility = "hidden";
document.body.appendChild(hiddenPath);

function computeAreaFromPath(areaGenerator, data) {
  // Create a temporary path element to measure pixel area
  const pathStr = areaGenerator(data);
  if (!pathStr) return 0;

  hiddenPath.setAttribute("d", pathStr);

  // Use the path to compute polygon area in pixel space
  const length = hiddenPath.getTotalLength();
  if (length === 0) return 0;

  // Approximate area by sampling along the path
  const samples = 100; // more samples = better accuracy
  const points = [];
  for (let i = 0; i <= samples; i++) {
    const p = hiddenPath.getPointAtLength((i / samples) * length);
    points.push([p.x, p.y]);
  }

  // Compute signed polygon area
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    area += x0 * y1 - x1 * y0;
  }
  return Math.abs(area) / 2;
}

function computeLineLength(data, xScale, yScale) {
  let length = 0;
  for (let i = 0; i < data.length - 1; i++) {
    const x1 = xScale(data[i].x);
    const y1 = yScale(data[i].y);
    const x2 = xScale(data[i + 1].x);
    const y2 = yScale(data[i + 1].y);

    const dx = x2 - x1;
    const dy = y2 - y1;

    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

function getZIndex(selection) {
  const node = selection.node();
  return Array.prototype.indexOf.call(node.parentNode.children, node);
}

function setZIndex(selection, index) {
  const node = selection.node();
  const parent = node.parentNode;
  const children = parent.children;

  if (index >= children.length) {
    parent.appendChild(node); // move to top
  } else {
    parent.insertBefore(node, children[index]); // move to target position
  }
}

function groupByCategory(data, key) {
  const map = d3.group(data, (d) =>
    d.categories[key] !== undefined && d.categories[key] !== null
      ? d.categories[key]
      : "Unspecified"
  );
  return Array.from(map, ([group, items]) => ({ group, items }));
}



//building all the plots from the plotData
function plotBuilder(plotData) {
  for (const element of plotData) {
    if (element.url) {
      d3.csv(element.url, d3.autoType) // autoType will convert numeric strings to numbers
        .then((data) => {
          // data is now an array of { x: Number, y: Number } objects\
          
          
          if (element.area.color) {
            dataLayer
              .append("path")
              .datum(data)
              .attr("class", "area")
              .attr("fill", `${element.area.color}`)
              .attr("d", areaGen)
              .attr("id", `${element.id}-area`);
          }
          if (element.line.color) {
            dataLayer
              .append("path")
              .datum(data)
              .attr("fill", "none")
              .attr("stroke", `${element.line.color}`)
              .attr("class", "line")
              .attr("stroke-width", element.line.width)
              .attr("stroke-dasharray", element.line.dash || null)
              .attr("d", line)
              .attr("id", `${element.id}-line`);
          }
          if (element.text.elementName) {
            dataLayer
              .append("text")
              .attr("class", "element-label")
              .attr("id", `${element.id}-text`)
              .append("textPath")
              .attr("href", `#${element.id}-area`) // ← match the path’s id
              .attr("startOffset", "40%") // ← halfway along the path
              .attr("text-anchor", "middle") // ← center the text there
              .text(element.text.elementName);
          }
          
          if (element.area.color) {
            dataLayer.select(`#${element.id}-area`).node().__originalIndex__ =
              getZIndex(dataLayer.select(`#${element.id}-area`));
          }

          dataLayer.select(`#${element.id}-line`).node().__originalIndex__ =
            getZIndex(dataLayer.select(`#${element.id}-line`));

          dataLayer
            .select(`#${element.id}-line`)
            .attr("pointer-events", "stroke")
            .on("mouseover", function (event, d) {
              if (!event.relatedTarget) return;

              if (element.area.color) {

                dataLayer
                  .select(`#${element.id}-area`)
                  .transition()
                  .delay(200)
                  .duration(200)
                  .on("start", function () {
                    dataLayer.select(`#${element.id}-area`).raise(); // z-order change after the delay
                  });
              }

              d3.select(this)
                .transition()
                .delay(200)
                .duration(200)
                .on("start", function () {
                  d3.select(this).raise(); // z-order change after the delay
                })
                .attr("stroke-width", element.line.width * 2);
                           

            })
            .on("mouseout", function (event, d) {
              if (!event.relatedTarget) return;
              // 3) Revert styling

              if (element.area.color) {
                dataLayer
                  .select(`#${element.id}-area`)
                  .transition()
                  .duration(200)
                  .on("end", function () {
                    if (
                      typeof dataLayer.select(`#${element.id}-area`).node()
                        .__originalIndex__ === "number"
                    ) {
                      setZIndex(
                        dataLayer.select(`#${element.id}-area`),
                        dataLayer.select(`#${element.id}-area`).node()
                          .__originalIndex__
                      );
                    }
                  });
              }

              d3.select(this)
                .transition()
                .duration(200)
                .on("end", function () {
                  if (typeof this.__originalIndex__ === "number") {
                    setZIndex(d3.select(this), this.__originalIndex__);
                  }
                })
                .attr("stroke-width", element.line.width);
              
            });

            dataLayer
              .select(`#${element.id}-area`)
              .on("mouseover", function (event, d) {
                if (!event.relatedTarget) return;

                d3.select(this)
                  .transition()
                  .delay(200)
                  .duration(200)
                  .on("start", function () {
                    d3.select(this).raise(); // z-order change after the delay
                  });


                dataLayer
                  .select(`#${element.id}-line`)
                  .transition()
                  .delay(200)
                  .duration(200)
                  .on("start", function () {
                    dataLayer.select(`#${element.id}-line`).raise(); // z-order change after the delay
                  })
                  .attr("stroke-width", element.line.width * 2);

              })
              .on("mouseout", function (event, d) {
                if (!event.relatedTarget) return;

                d3.select(this)
                  .transition()
                  .duration(200)
                  .on("end", function () {
                    if (typeof this.__originalIndex__ === "number") {
                      setZIndex(d3.select(this), this.__originalIndex__);
                    }
                  });
                // 3) Revert styling
                
                dataLayer
                  .select(`#${element.id}-line`)
                  .transition()
                  .duration(200)
                  .on("end", function () {
                    if (
                      typeof dataLayer.select(`#${element.id}-line`).node()
                      .__originalIndex__ === "number"
                    ) {
                      setZIndex(
                        dataLayer.select(`#${element.id}-line`),
                        dataLayer.select(`#${element.id}-line`).node().__originalIndex__
                      );
                    }
                  })
                  .attr("stroke-width", element.line.width);
                
              }); 

            dataLayer
              .selectAll(`#${element.id}-line, #${element.id}-area`)
              .each(function (d) {
                const el = this;
                tippy(el, {
                  trigger: "mouseenter",
                  followCursor: "initial",
                  interactive: true,
                  interactiveBorder: 10,
                  delay: [200, 200],
                  hideOnClick: false,
                  appendTo: document.body,
                  content: "Loading…",
                  allowHTML: true,
                  onShow(instance) {
                    // only fetch once
                    if (instance.props.content === "Loading…") {
                      fetch(
                        `http://localhost:3000/preview?url=${encodeURIComponent(
                          element.paperUrls[0]
                        )}`
                      )
                        .then((r) => r.json())
                        .then((meta) => {
                          const fullTitle = meta.title || "";

                          instance.setContent(`
                <div class="wordbreaker" style="max-width:250px; font-family: sans-serif; display: flex; align-items: center;
                  justify-content: start;flex-direction: column;gap:0.5rem">
                  <p style="margin:0; padding:0;">${fullTitle}  <span class="no-break"> [ <a href="${
                            element.paperUrls[0]
                          }" target="_blank"
                          rel="noopener noreferrer">${getSecondLevelDomain(
                            element.paperUrls[0]
                          )}</a> ] </span> </p>
                </div>
              `);
                        });
                    }
                  },
                });
              });
        })
        .catch((err) => console.error(err));
    } else {
      console.log("no data provided");
      return 0;
    }
  } 
}

const colorSet = [
  "#1f77b4", // Blue
  "#ff7f0e", // Orange
  "#2ca02c", // Green
  "#d62728", // Red
  "#9467bd", // Purple
  "#8c564b", // Brown
  "#e377c2", // Pink
  "#7f7f7f", // Gray
  "#bcbd22", // Olive
  "#17becf", // Cyan
];


/* 
Example plotData structure:

curveType: "excluded" or "projection", // type of the plot
    categories: {
      detectionType: "Direct detection" or "Indirect detection",
      experimentType: "Collider experiments" or "Cosmological measurements" or "Astrophysical observations" or "Precision experiments/Laboratory?",
      timeType: "Past constraints" or "Recent constraints" or "Planned/future constraints",
      assumption: "None" or "Dark Matter" or "Other",
    }, // category for grouping 


*/

// Define the plot data

const plotData = [
  {
    labelName: "BaBar", // label for the legend
    longName: "BaBar", // long name for possible reference
    id: "babar",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "gray", dash: null, width: 2 }, // line style
    area: { color: "lightgray" }, // area style
    paperUrls: ["https://arxiv.org/abs/1406.2980"], // URL to the source paper
    url: "data/BaBar.csv", // URL to the data file
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "AFM test", // label for the legend
    longName: "AFM test of Coulomb force", // long name for possible reference
    id: "afm-test",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2008.02209"],
    url: "data/AxionLimits-csv/AFM.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Laboratory",
      timeType: "new",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "ALPS", // label for the legend
    longName: "ALPS", // long name for possible reference
    id: "alps",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1004.1313"],
    url: "data/AxionLimits-csv/ALPS.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "AMAILS", // label for the legend
    longName: "AMAILS", // long name for possible reference
    id: "amails",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2305.00890"],
    url: "data/AxionLimits-csv/AMAILS.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Arias et al. (2012)", // label for the legend
    longName: "Arias et al. (2012) (Cosmology)", // long name for possible reference
    id: "arias2012",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1201.5902"],
    url: "data/AxionLimits-csv/Cosmology_Arias.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Cosmology",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Caputo et al. (2020)", // label for the legend
    longName: "Caputo et al. (2020) (HeII reionisation)", // long name for possible reference
    id: "Caputo2020",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2002.05165"],
    url: "data/AxionLimits-csv/Cosmology_Caputo_HeII_.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Witte et al. (2020)", // label for the legend
    longName: "Witte et al. (2020) (inhomogeneous plasma)", // long name for possible reference
    id: "witte2020",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2003.13698"],
    url: "data/AxionLimits-csv/Cosmology_Witte_inhomogeneous.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Crab Nebula", // label for the legend
    longName: "Crab Nebula", // long name for possible reference
    id: "crab-nebula",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/0810.5501"],
    url: "data/AxionLimits-csv/Crab.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "CROWS", // label for the legend
    longName: "CROWS", // long name for possible reference
    id: "crows",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1310.8098"],
    url: "data/AxionLimits-csv/CROWS.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "DAMIC", // label for the legend
    longName: "DAMIC", // long name for possible reference
    id: "damic",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1907.12628"],
    url: "data/AxionLimits-csv/DAMIC.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "DarkSide-50", // label for the legend
    longName: "DarkSide-50", // long name for possible reference
    id: "darkside-50",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2207.11968"],
    url: "data/AxionLimits-csv/DarkSide.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Dark SRF", // label for the legend
    longName: "Dark SRF", // long name for possible reference
    id: "dark-srf",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2301.11512"],
    url: "data/AxionLimits-csv/DarkSRF.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Haloscopes 1", // label for the legend
    longName: "Haloscopes 1", // long name for possible reference
    id: "haloscopes1",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2105.04565"],
    url: "data/AxionLimits-csv/DP_Combined_AxionSearchesRescaled.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Haloscopes 2", // label for the legend
    longName: "Haloscopes 2", // long name for possible reference
    id: "haloscopes2",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2105.04565"],
    url: "data/AxionLimits-csv/DP_Combined_DarkMatterSearches.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Earth", // label for the legend
    longName: "Earth", // long name for possible reference
    id: "earth",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2110.02875"],
    url: "data/AxionLimits-csv/Earth.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "FUNK", // label for the legend
    longName: "FUNK", // long name for possible reference
    id: "funk",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2003.13144"],
    url: "data/AxionLimits-csv/FUNK.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "G33.4-8.0", // label for the legend
    longName: "G33.4-8.0", // long name for possible reference
    id: "g33",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1903.12190"],
    url: "data/AxionLimits-csv/GasClouds.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Globular Clusters", // label for the legend
    longName: "Globular Clusters", // long name for possible reference
    id: "globular-clusters",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2306.13335"],
    url: "data/AxionLimits-csv/GlobularClusters.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Hinode", // label for the legend
    longName: "Hinode", // long name for possible reference
    id: "hinode",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2211.00022"],
    url: "data/AxionLimits-csv/HINODE.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "INTEGRAL", // label for the legend
    longName: "INTEGRAL", // long name for possible reference
    id: "integral",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: [
      "https://arxiv.org/abs/2406.19445",
      "https://arxiv.org/abs/2412.00180",
    ],
    url: "data/AxionLimits-csv/INTEGRAL.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Jupiter", // label for the legend
    longName: "Jupiter", // long name for possible reference
    id: "jupiter",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2312.06746"],
    url: "data/AxionLimits-csv/Jupiter.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "JWST", // label for the legend
    longName: "JWST", // long name for possible reference
    id: "jwst",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2402.17140"],
    url: "data/AxionLimits-csv/JWST.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Leo T", // label for the legend
    longName: "Leo T", // long name for possible reference
    id: "leo-t",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1903.12190"],
    url: "data/AxionLimits-csv/LeoT.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "ADMX", // label for the legend
    longName: "ADMX", // long name for possible reference
    id: "admx",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1903.12190"],
    url: "data/AxionLimits-csv/LSW_ADMX.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "UWA", // label for the legend
    longName: "UWA", // long name for possible reference
    id: "uwa",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1410.5244"],
    url: "data/AxionLimits-csv/LSW_UWA.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "MuDHI", // label for the legend
    longName: "MuDHI", // long name for possible reference
    id: "mudhi",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2110.10497"],
    url: "data/AxionLimits-csv/MuDHI.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Cas A", // label for the legend
    longName: "Cas A", // long name for possible reference
    id: "cas-a",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2012.05427"],
    url: "data/AxionLimits-csv/NeutronStarCooling.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Planck + unWISE", // label for the legend
    longName: "Planck + unWISE CMB", // long name for possible reference
    id: "planck-unwise",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2406.02546"],
    url: "data/AxionLimits-csv/Planck_unWISE.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Plimpton-Lawton", // label for the legend
    longName: "Plimpton-Lawton experiment", // long name for possible reference
    id: "plimpton-lawton",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2008.02209"],
    url: "data/AxionLimits-csv/PlimptonLawton.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "SENSEI", // label for the legend
    longName: "SENSEI", // long name for possible reference
    id: "sensei",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2004.11378"],
    url: "data/AxionLimits-csv/SENSEI.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "SHIPS", // label for the legend
    longName: "SHIPS", // long name for possible reference
    id: "ships",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1502.04490"],
    url: "data/AxionLimits-csv/Planck_unWISE.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "SNIPE", // label for the legend
    longName: "SNIPE Hunt", // long name for possible reference
    id: "snipe",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2306.11575"],
    url: "data/AxionLimits-csv/SNIPE.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Solar", // label for the legend
    longName: "Solar", // long name for possible reference
    id: "solar",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2304.12907"],
    url: "data/AxionLimits-csv/Solar.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Spectroscopy", // label for the legend
    longName: "Spectroscopy", // long name for possible reference
    id: "spectroscopy",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1008.3536"],
    url: "data/AxionLimits-csv/Spectroscopy.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "SPring-8", // label for the legend
    longName: "SPring-8", // long name for possible reference
    id: "spring-8",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1301.6557"],
    url: "data/AxionLimits-csv/SPring-8.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "SuperCDMS", // label for the legend
    longName: "SuperCDMS", // long name for possible reference
    id: "supercdms",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1911.11905"],
    url: "data/AxionLimits-csv/SuperCDMS.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "SuperMAG", // label for the legend
    longName: "SuperMAG Combined", // long name for possible reference
    id: "supermag-combined",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: [
      "https://arxiv.org/abs/2106.00022",
      "https://arxiv.org/pdf/2408.16045",
      "https://arxiv.org/pdf/2108.08852",
    ],
    url: "data/AxionLimits-csv/SuperMAG_Combined.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "TEXONO", // label for the legend
    longName: "TEXONO", // long name for possible reference
    id: "texono",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1804.10777"],
    url: "data/AxionLimits-csv/TEXONO.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Tokyo", // label for the legend
    longName: "Tokyo-dish", // long name for possible reference
    id: "tokyo",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2003.13144"],
    url: "data/AxionLimits-csv/Tokyo-Dish.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "XENON1T S2", // label for the legend
    longName: "XENON1T S2", // long name for possible reference
    id: "xenon1t-s2",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1907.11485"],
    url: "data/AxionLimits-csv/Xenon1T.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "XENON1T S2S1", // label for the legend
    longName: "XENON1T S2S1", // long name for possible reference
    id: "xenon1t-s2s1",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2006.09721"],
    url: "data/AxionLimits-csv/Xenon1T_S1S2.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "XENON1T SE", // label for the legend
    longName: "XENON1T SE", // long name for possible reference
    id: "xenon1t-se",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2112.12116"],
    url: "data/AxionLimits-csv/XENON1T_SE.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "XENON1T Solar S2", // label for the legend
    longName: "XENON1T Solar S2", // long name for possible reference
    id: "xenon1t-solar-s2",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2006.13929"],
    url: "data/AxionLimits-csv/XENON1T_Solar_S2.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "XENONnT", // label for the legend
    longName: "XENONnT", // long name for possible reference
    id: "xenonnt",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2207.11330"],
    url: "data/AxionLimits-csv/XENONnT.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "SHiP", // label for the legend
    longName: "SHiP", // long name for possible reference
    id: "ship",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/2504.06692v1"],
    url: "data/Rescaled/SHiP_rescaled.csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "HIKE", // label for the legend
    longName: "HIKE", // long name for possible reference
    id: "hike",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/2311.08231"],
    url: "data/HIKE.csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "CHARM", // label for the legend
    longName: "CHARM", // long name for possible reference
    id: "charm",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1204.3583"],
    url: "data/CHARM.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "NA64(e)", // label for the legend
    longName: "NA64(e)", // long name for possible reference
    id: "na64e",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/1204.3583"],
    url: "data/NA64(e).csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "DarkQuest (2023)", // label for the legend
    longName: "DarkQuest (2023)", // long name for possible reference
    id: "darkquest-2023",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/2203.08322"],
    url: "data/DarkQuest(2023).csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "DarkQuest (2026+)", // label for the legend
    longName: "DarkQuest (2026+)", // long name for possible reference
    id: "arkquest-2026",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/2203.08322"],
    url: "data/DarkQuest(2026).csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "FACET", // label for the legend
    longName: "FACET", // long name for possible reference
    id: "facet",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/2201.00019"],
    url: "data/FACET.csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "FASER (57fb)", // label for the legend
    longName: "FASER (57fb)", // long name for possible reference
    id: "faser-57",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2410.10363"],
    url: "data/FASER(58fb).csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "NA62", // label for the legend
    longName: "NA62", // long name for possible reference
    id: "na62",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2502.04241"],
    url: "data/NA62.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "E774", // label for the legend
    longName: "E774", // long name for possible reference
    id: "e774",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1802.03794"],
    url: "data/E774.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "E141", // label for the legend
    longName: "E141", // long name for possible reference
    id: "e141",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1802.03794"],
    url: "data/E141.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Orsay", // label for the legend
    longName: "Orsay", // long name for possible reference
    id: "orsay",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1802.03794"],
    url: "data/Orsay.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "E137", // label for the legend
    longName: "E137", // long name for possible reference
    id: "e137",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1802.03794"],
    url: "data/E137.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "A1", // label for the legend
    longName: "A1", // long name for possible reference
    id: "a1",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1404.5502"],
    url: "data/A1_rescaled.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "FASER (Run 3)", // label for the legend
    longName: "FASER (Run 3)", // long name for possible reference
    id: "faser-run3",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/1811.12522"],
    url: "data/FASER(Run3).csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "FASER (Run 3)3", // label for the legend
    longName: "FASER (Run 3)3", // long name for possible reference
    id: "faser-run33",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/2203.05090"],
    url: "data/FASER(Run3)3.csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "FASER (HL-LHC)", // label for the legend
    longName: "FASER (HL-LHC)", // long name for possible reference
    id: "faser-hl-lhc",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/1811.12522"],
    url: "data/FASER(HL-LHC).csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "FASER (HL-LHC)3", // label for the legend
    longName: "FASER (HL-LHC)3", // long name for possible reference
    id: "faser-hl-lhc4",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/2203.05090"],
    url: "data/FASER(HL-LHC)3.csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "LHCb", // label for the legend
    longName: "LHCb", // long name for possible reference
    id: "lhcb",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1910.06926"],
    url: "data/LHCb_rescaled.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "(g-2)e", // label for the legend
    longName: "(g-2)e", // long name for possible reference
    id: "g-2-e",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: [
      "https://arxiv.org/abs/0811.1030",
      "https://arxiv.org/abs/1209.2558",
    ],
    url: "data/g-2e_updated_rescaled.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "nu-Cal", // label for the legend
    longName: "nu-Cal", // long name for possible reference
    id: "nu-cal",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1311.3870"],
    url: "data/nu-Cal.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "Mu3e (Phase 1)", // label for the legend
    longName: "Mu3e (Phase 1)", // long name for possible reference
    id: "mu3e-phase1",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/1411.1770"],
    url: "data/Mu3e(Phase1)_rescaled.csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "Mu3e (Phase 2)", // label for the legend
    longName: "Mu3e (Phase 2)", // long name for possible reference
    id: "mu3e-phase2",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/1411.1770"],
    url: "data/Mu3e(Phase2)_rescaled.csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "NA48/2", // label for the legend
    longName: "NA48/2", // long name for possible reference
    id: "na48-2",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1504.00607"],
    url: "data/NA48-2_rescaled.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "KLOE combined", // label for the legend
    longName: "KLOE combined", // long name for possible reference
    id: "kloe",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1603.06086"],
    url: "data/KLOE_combined_rescaled.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "SN1987A", // label for the legend
    longName: "SN1987A", // long name for possible reference
    id: "sn1987a",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1611.03864"],
    url: "data/SN1987A.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
  {
    labelName: "LDMX combined", // label for the legend
    longName: "LDMX combined", // long name for possible reference
    id: "ldmx-combined",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/1807.01730"],
    url: "data/LDMX_combined.csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "MESA", // label for the legend
    longName: "MESA", // long name for possible reference
    id: "mesa",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/1908.07921"],
    url: "data/MESA.csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "Gamma Factory (20MeV)", // label for the legend
    longName: "Gamma Factory (20MeV)", // long name for possible reference
    id: "gamma-factory-20mev",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/2105.10289"],
    url: "data/Gamma Factory (20MeV).csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "Gamma Factory (200MeV)", // label for the legend
    longName: "Gamma Factory (200MeV)", // long name for possible reference
    id: "gamma-factory-200mev",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/2105.10289"],
    url: "data/Gamma Factory (200MeV).csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "Gamma Factory (1600MeV)", // label for the legend
    longName: "Gamma Factory (1600MeV)", // long name for possible reference
    id: "gamma-factory-1600mev",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/2105.10289"],
    url: "data/Gamma Factory (1600MeV).csv",
    curveType: "projection", // type of the plot
    categories: { experimentType: "Collider", assumption: "None" }, // category for grouping
  },
  {
    labelName: "CMS", // label for the legend
    longName: "CMS", // long name for possible reference
    id: "cms",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2309.16003"],
    url: "data/CMS_rescaled.csv",
    curveType: "excluded", // type of the plot
    categories: {
      detectionType: "Direct detection",
      experimentType: "Collider",
      timeType: "old",
      assumption: null,
    }, // category for grouping
  },
];

const curvePriority = {
  excluded: 0,
  projection: 1,
  line: 2,
};

Promise.all(
  plotData.map((el) => {
    return new Promise((resolve, reject) => {
      if (!el.url) return resolve({ ...el, _size: 0 });
      d3.csv(el.url, d3.autoType)
        .then((data) => {
          let size;
          if (el.curveType === "excluded" || el.curveType === "projection") {
            size = computeAreaFromPath(areaGen, data);
          } else if (el.curveType === "line") {
            size = computeLineLength(data, x0, y0);
          }
          resolve({ ...el, _data: data, _size: size || 0 });
        })
        .catch(reject);
    });
  })
).then((dataWithSizes) => {
  dataWithSizes.sort((a, b) => {
    const typeDiff = curvePriority[a.curveType] - curvePriority[b.curveType];
    if (typeDiff !== 0) return typeDiff;
    return b._size - a._size; // biggest first
  });

  plotBuilder(dataWithSizes);

  if (hiddenPath.parentNode) {
    hiddenPath.parentNode.removeChild(hiddenPath);
  }
});


plotData.forEach((el, i) => {
  el.line.color = colorSet[i % colorSet.length];

  if (el.area.color != null) {
    const c = d3.color(colorSet[i % colorSet.length]);
    c.opacity = 0.8; // make area color more transparent
    el.area.color = c.formatRgb();
  }
});


//plotBuilder(plotData);

// const legendX = width - margin.right + 50;
// const legendY = margin.top;
// const legendHeight = height - margin.top - margin.bottom;
// const legendWidth  = 300;   // adjust to your needs
// const itemHeight = 25;
// const swatchSize = 30;

// const legend_wrapper = svg
//   .append("foreignObject")
//   .attr("class", "legend-fo")
//   .attr("x", legendX) // place to the right of plot
//   .attr("y", legendY)
//   .style("width", `${legendWidth}px`)
//   .style("height", `${legendHeight}px`)
//   .style("overflow-x", "hidden")
//   .append("xhtml:div") // enter the XHTML namespace
//   .style("width", "100%")
//   .style("height", "100%")
//   .style("padding", "0")
//   .style("margin", "0")
//   .style("overflow-x", "hidden")
//   .style("overflow-y", "scroll");


// const legendSvg = legend_wrapper
//   .append("svg")
//   .style("width", "100%")
//   .style("height", itemHeight * plotData.length)
//   .attr("class", "legend");

// const experimentSorted = groupByCategory(plotData, "experimentType");
// console.log("Grouped by experimentType:", experimentSorted);

// const experimentGroups = legendSvg
//   .selectAll(".legend-group")
//   .data(experimentSorted)
//   .enter()
//   .append("g")
//   .attr("class", "legend-group")
//   .attr("expanded", "false");

// experimentGroups
//   .append("text")
//   .text((d) => d.group)
//   .attr("class", "legend-group-title")
//   .attr("x", 0)
//   .attr("y", (d, i) => i * itemHeight+16) // stack group headers
//   .style("font-weight", "bold")
//   .style("cursor", "pointer")
//   .on("click", function (event, d) {
//     const parent = d3.select(this.parentNode);
//     const expanded = parent.classed("expanded");
//     parent.classed("expanded", !expanded);
//     parent
//       .selectAll(".legend-item")
//       .style("display", expanded ? "none" : "flex");
//   });

// let paper_num = 0;

// experimentGroups.each(function (groupData, groupIndex) {
//   const parentG = d3.select(this);

//   const items = parentG
//     .selectAll(".legend-item")
//     .data(groupData.items)
//     .enter()
//     .append("g")
//     .attr("class", "legend-item")
//     .attr(
//       "transform",
//       (d, i) =>
//         `translate(0, ${(groupIndex + 1) * itemHeight + i * itemHeight})`
//     )
//     .style("display", "none"); // hidden until expanded

//   // --- area swatch
//   items
//     .filter((d) => d.area.color)
//     .append("rect")
//     .attr("width", swatchSize)
//     .attr("height", 16)
//     .attr("y", 0)
//     .attr("fill", (d) => d.area.color);

//   // --- line style
//   items
//     .append("line")
//     .attr("x1", 0)
//     .attr("x2", swatchSize)
//     .attr("y1", 8)
//     .attr("y2", 8)
//     .attr("stroke", (d) => d.line.color)
//     .attr("stroke-width", (d) => d.line.width)
//     .attr("stroke-dasharray", (d) => d.line.dash || null);

//   // --- text labels
//   const text = items
//     .append("text")
//     .attr("x", swatchSize + 6)
//     .attr("y", 8)
//     .attr("dy", "0.35em");

//   text.append("tspan").text((d) => `${d.labelName} `);

//   // --- paper references
//   text
//     .selectAll("a")
//     .data((d) => d.paperUrls)
//     .enter()
//     .append("a")
//     .attr("xlink:href", (url) => url)
//     .attr("target", "_blank")
//     .append("tspan")
//     .text(function (d, i) {
//       paper_num++;
//       return `${i > 0 ? ", " : ""}[${paper_num}]`;
//     })
//     .style("text-decoration", "none")
//     .style("cursor", "pointer");

//   // --- checkboxes
//   items.each(function (d) {
//     const node = this;
//     let labelWidth = node.getBBox().width;
//     console.log("Label width:", labelWidth);
//     const data = d;

//     d3.select(node)
//       .append("foreignObject")
//       .attr("x", labelWidth + 6)
//       .attr("y", 2)
//       .attr("width", 15)
//       .attr("height", 15)
//       .append("xhtml:div")
//       .attr("style", "width:100%; height:100%; margin:0; padding:0")
//       .append("input")
//       .attr("style", "width:15px; height:15px; margin:0; padding:0")
//       .attr("type", "checkbox")
//       .attr("id", (d) => `${d.id}-hidden`)
//       .attr("class", "hidden-box")
//       .property("checked", true)
//       .on("change", function () {
//         const isChecked = d3.select(this).property("checked");

//         dataLayer
//           .select(`#${data.id}-line`)
//           .style("display", isChecked ? "block" : "none");

//         dataLayer
//           .select(`#${data.id}-area`)
//           .style("display", isChecked ? "block" : "none");

//         dataLayer
//           .select(`#${data.id}-text`)
//           .style("display", isChecked ? "block" : "none");
//       });
//   });
// });


// === config ===
const legendX = width - margin.right + 50;
const legendY = margin.top;
const legendHeight = height - margin.top - margin.bottom;
const legendWidth  = 300;
const itemHeight   = 25;  // row height for title/items
const swatchSize   = 30;

const groupKey = "experimentType"; // e.g. "timeType", "assumption", "detectionType", etc.
const grouped = groupByCategory(plotData, groupKey);

// scrollable wrapper
const legend_wrapper = svg
  .append("foreignObject")
  .attr("class", "legend-fo")
  .attr("x", legendX)
  .attr("y", legendY)
  .style("width", `${legendWidth}px`)
  .style("height", `${legendHeight}px`)
  .style("overflow-x", "hidden")
  .append("xhtml:div")
  .style("width", "100%")
  .style("height", "100%")
  .style("padding", "0")
  .style("margin", "0")
  .style("overflow-y", "auto");

/* // Add select element (HTML, not SVG)
const select = legend_wrapper
  .append("select")
  .attr("id", "grouping-select")
  .style("position", "absolute")
  .style("top", "10px")
  .style("left", "10px");

// Add options
const groupingOptions = [
  { value: "experimentType", label: "Experiment Type" },
  { value: "detectionType", label: "Detection Type" },
  { value: "channelType", label: "Channel Type" },
];

select
  .selectAll("option")
  .data(groupingOptions)
  .enter()
  .append("option")
  .attr("value", (d) => d.value)
  .text((d) => d.label)
  .on("change", (e) => {
    const key = e.target.value;
    const groupedData = groupByCategory(plotData, key);
    renderLegend(groupedData);
  }); */

const legendSvg = legend_wrapper
  .append("svg")
  .style("width", "100%")
  .attr("class", "legend");

legendSvg
  .append("g")
  .attr("class", "legend-group-select-all")
  .append("text")
  .attr("class", "legend-group-select-all-text")
  .attr("x", 0)
  .attr("y", 16) // baseline; avoids clipping at y=0
  .text("Select All")
  .style("font-weight", "600")
  .style("font-size", "1em")

selectAllWidth = legendSvg.select(".legend-group-select-all-text").node().getBBox().width;

legendSvg
  .select(".legend-group-select-all")
  .append("foreignObject")
  .attr("x", selectAllWidth + 6)
  .attr("y", 2)
  .attr("width", 15)
  .attr("height", 15)
  .append("xhtml:div")
  .attr("style", "width:100%; height:100%; margin:0; padding:0")
  .append("input")
  .attr("style", "width:15px; height:15px; margin:0; padding:0")
  .attr("type", "checkbox")
  .attr("class", "hidden-box")
  .property("checked", true)
  .on("change", function () {
      const isChecked = d3.select(this).property("checked");
      d3.selectAll(".hidden-box").each(function(d) {
          d3.select(this).property("checked", isChecked);
          this.dispatchEvent(new Event("change", { bubbles: true }));
        });
    });

// === groups (accordion sections) ===
const groups = legendSvg
  .selectAll(".legend-group")
  .data(grouped, d => d.group)
  .enter()
  .append("g")
  .attr("class", "legend-group")
  .attr("expanded", "false"); // collapsed by default


// --- group title (click to toggle) ---
groups.append("text")
  .attr("class", "legend-group-title")
  .attr("x", 0)
  .attr("y", 48) // baseline; avoids clipping at y=0
  .text(d => d.group)
  .style("font-weight", "600")
  .style("font-size", "1.2em")
  .style("cursor", "pointer")
  .on("click", function () {
    const g = d3.select(this.parentNode);
    const isExpanded = g.attr("expanded") === "true";
    g.attr("expanded", String(!isExpanded));
    updateLegendLayout();
  });


const items = groups
  .selectAll(".legend-item")
  .data((d) => d.items)
  .enter()
  .append("g")
  .attr("class", "legend-item")
  .attr("transform", (d, i) => `translate(0, ${(i + 1) * itemHeight + 32})`);

// swatch (if area has fill color)
items.filter(d => d.area.color)
  .append("rect")
  .attr("width", swatchSize)
  .attr("height", 16)
  .attr("y", 4)
  .attr("fill", d => d.area.color);

// line symbol
items.append("line")
  .attr("x1", 0)
  .attr("x2", swatchSize)
  .attr("y1", 12)
  .attr("y2", 12)
  .attr("stroke", d => d.line.color)
  .attr("stroke-width", d => d.line.width)
  .attr("stroke-dasharray", d => d.line.dash || null);

// text label
const text = items.append("text")
  .attr("x", swatchSize + 6)
  .attr("y", 12)
  .attr("dy", "0.35em");

text.append("tspan").text(d => `${d.labelName} `);

let paper_num = 0;
text
  .selectAll("a")
  .data((d) => d.paperUrls)
  .enter()
  .append("a")
  .attr("xlink:href", (url) => url)
  .attr("target", "_blank")
  .append("tspan")
  .text((d, i) => {
    paper_num++;
    return `${i > 0 ? ", " : ""}[${paper_num}]`;
  })
  .style("text-decoration", "none")
  .style("cursor", "pointer");

// checkboxes at end of text (need proper width measurement)
items.each(function (d) {
  const node = this;
  const labelWidth = node.getBBox().width;

  d3.select(node)
    .append("foreignObject")
    .attr("x", labelWidth + 6)
    .attr("y", 6)
    .attr("width", 15)
    .attr("height", 15)
    .append("xhtml:div")
    .attr("style", "width:100%; height:100%; margin:0; padding:0")
    .append("input")
    .attr("style", "width:15px; height:15px; margin:0; padding:0")
    .attr("type", "checkbox")
    .attr("id", (d) => `${d.id}-hidden`)
    .attr("class", "hidden-box")
    .property("checked", true)

    .on("change", function () {
      const isChecked = d3.select(this).property("checked");
      dataLayer
        .select(`#${d.id}-line`)
        .style("display", isChecked ? "block" : "none");
      dataLayer
        .select(`#${d.id}-area`)
        .style("display", isChecked ? "block" : "none");
      dataLayer
        .select(`#${d.id}-text`)
        .style("display", isChecked ? "block" : "none");
    });
});

let firstRun = true;
function updateLegendLayout() {
  let yOffset = 0;

  legendSvg.selectAll(".legend-group").each(function () {
    const g = d3.select(this);
    const isExpanded = g.attr("expanded") === "true";

    // Move group
    const t = firstRun ? g : g.transition().duration(250);
    t.attr("transform", `translate(0, ${yOffset})`);

    // Items: fade in/out instead of show/hide instantly
    g.selectAll(".legend-item")
      .transition()
      .duration(250)
      .style("opacity", isExpanded ? 1 : 0)
      .on("end", function (_, i, nodes) {
        // hide from layout only after fade-out finishes
        if (!isExpanded) d3.select(this).style("display", "none");
      })
      .style("display", isExpanded ? "block" : null);

    // Height calculation
    const itemCount = g.selectAll(".legend-item").size();
    const groupHeight = (isExpanded ? 1.3 + itemCount : 1) * itemHeight;
    yOffset += groupHeight;
  });

  // Adjust legend height
  const tSvg = firstRun ? legendSvg : legendSvg.transition().duration(250);
  tSvg.style("height", yOffset + 40 + "px");

  firstRun = false;
}

// initial layout
updateLegendLayout();



/* const item = legendSvg
  .selectAll(".legend-item")
  .data(plotData)
  .enter()
  .append("g")
  .attr("class", "legend-item")
  .attr("transform", (d, i) => `translate(0, ${i * itemHeight})`);

item
  .filter((d) => d.area.color) // only those entries
  .append("rect")
  .attr("width", swatchSize)
  .attr("height", 16)
  .attr("y", 0) // vertical centering
  .attr("fill", (d) => d.area.color);

item
  .append("line")
  .attr("x1", 0)
  .attr("x2", swatchSize)
  .attr("y1", 8)
  .attr("y2", 8)
  .attr("stroke", (d) => d.line.color)
  .attr("stroke-width", (d) => d.line.width)
  .attr("stroke-dasharray", (d) => d.line.dash || null);

const text = item.append("text")
  .attr("x", swatchSize + 6)
  .attr("y", 8)
  .attr("dy", "0.35em")

text.append("tspan").text((d) => `${d.labelName} `);

paper_num=0

text
  // 1) pretend we already have a bunch of <a>’s under each text
  .selectAll("a")
  // 2) bind each d.paperUrls array to that pretend selection
  .data((d) => d.paperUrls)
  // 3) for each array‐element that has no <a> yet, append one
  .enter()
  .append("a")
  .attr("xlink:href", (url) => url)
  .attr("target", "_blank")
  .append("tspan")
  .text(function (d, i) {
    paper_num++;
    return `${i > 0 ? ", " : ""}[${paper_num}]`;
  })
  .style("text-decoration", "none")
  .style("cursor", "pointer");


item.each(function (d) {
  const node = this; // `this` is the DOM element
  let labelWidth = node.getBoundingClientRect().width;
  const data = d;
  
  d3.select(node)
    .append("foreignObject")
    .attr("x", labelWidth + 6)
    .attr("y", 2)
    .attr("width", 15)
    .attr("height", 15)
    .append("xhtml:div")
    .attr("style", "width:100%; height:100%; margin:0; padding:0")
    .append("input")
    .attr("style", "width:15px; height:15px; margin:0; padding:0")
    .attr("type", "checkbox")
    .attr("id", (d) => `${d.id}-hidden`)
    .attr("class", "hidden-box")
    .property("checked", true)
    .on("change", function (d) {
      const isChecked = d3.select(this).property("checked");

      // assume you want to hide/show a sibling with class '.detail'
      dataLayer.select(`#${data.id}-line`)
        .style("display", isChecked ? "block" : "none");

      dataLayer
        .select(`#${data.id}-area`)
        .style("display", isChecked ? "block" : "none");
      dataLayer
        .select(`#${data.id}-text`)
        .style("display", isChecked ? "block" : "none");
    });
}); */





d3.selectAll('.legend-item a')
  .each(function(d) {
    const el = this;
    tippy(el, {
      content: 'Loading…',
      allowHTML: true,
      onShow(instance) {
        // only fetch once
        if (instance.props.content === 'Loading…') {
          fetch(
            `http://localhost:3000/preview?url=${encodeURIComponent(
              d
            )}`
          )
            .then((r) => r.json())
            .then((meta) => {
              const fullTitle = meta.title || "";
              const maxTitleChars = 120; // “specific number of symbols”
              const shortTitle =
                fullTitle.length > maxTitleChars
                  ? fullTitle.slice(0, maxTitleChars).trim() + "…"
                  : fullTitle;

              const fullDesc = meta.description || "";
              const maxChars = 240; // “specific number of symbols”
              const shortDesc =
                fullDesc.length > maxChars
                  ? fullDesc.slice(0, maxChars).trim() + "…"
                  : fullDesc;

              instance.setContent(`
                <div class="wordbreaker" style="max-width:250px; font-family: sans-serif; display: flex; align-items: center;
                  justify-content: start;flex-direction: column;gap:0.5rem">
                  ${
                    meta.image
                      ? `<img src="${meta.image[0].url}"
                               alt="${meta.siteName} logo"
                               style="width:50%; height:auto;margin:0; padding:0;"/>`
                      : ""
                  }
                  <strong style="margin:0; padding:0;">${shortTitle}</strong>
                  ${
                    meta.authors && meta.authors.length
                      ? `<em>By ${meta.authors.join(", ")}</em>`
                      : ""
                  }
                  <p class="wordbreaker" style="margin:0; padding:0;">${shortDesc}</p>
                </div>
              `);
            });
        }
      }
    });
  });


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
  
//Adding plot title
svg
  .append("text")
  .attr("class", "plot-title")
  .attr("x", (width - margin.left - margin.right) / 2 + margin.left)
  .attr("y", margin.top - 25)
  .attr("text-anchor", "middle")
  .text("Dark Photon into invisible final states (BC1)");

//Adding plot labels with TeX content
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
      "\\varepsilon",
      {
        throwOnError: false,
      }
    )
  );
  
// Zoom behavior
const zoom = d3.zoom()
  .scaleExtent([0.1, 1e4])
  .on('zoom', ({ transform }) => {

    //changed axes
    const zx = transform.rescaleX(x0);
    const zy = transform.rescaleY(y0);

    //supplementary variables for checking the values of zoom
    const [xMin, xMax] = zx.domain();
    const spanRatioX = xMax / xMin; 
    const [yMin, yMax] = zy.domain();
    const spanRatioY = yMax / yMin; 

    let xTicks, xFormat, yTicks, yFormat;

    //zoom behavior to x axis (very messy, but I dont have idea how to make it work better)
    if (spanRatioX > 50) {
      // Wide view → only decades, 10ⁿ labels
      xFormat = (d) => {
        const e = Math.floor(Math.log10(d));
        if (d / Math.pow(10, e) === 1) {
          return `10${toSuperscript(e)}`;
        } else return "";
      }; // others blank
    } else if (spanRatioX > 5) {
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
    } else if ((xMax < 0.01) && spanRatioX > 2) {
      xTicks = 6; // number of ticks
      xFormat = (d) => {
        const e = Math.floor(Math.log10(d));
        const m = d / Math.pow(10, e);
        const supExp = toSuperscript(e);
        // label only exact decades or 2×,5×
        if (m === 1) return `10${supExp}`;
        return `${m.toFixed(0)}×10${supExp}`;
      };
    } else if (xMax < 0.01 && xMax - xMin < 0.01 && spanRatioX > 1.05) {
      xTicks = 6; // number of ticks
      xFormat = (d) => {
        const e = Math.floor(Math.log10(d));
        const m = d / Math.pow(10, e);
        const supExp = toSuperscript(e);
        // label only exact decades or 2×,5×
        if (m === 1) return `10${supExp}`;
        return `${m.toFixed(2)}×10${supExp}`;
      };
    } else if (xMax < 0.01 && xMax - xMin < 0.01 && spanRatioX > 1.001) {
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
      xTicks = 6; // let D3 pick ~6 linear ticks
      xFormat = d3.format(",.2~f"); // e.g. “1234.56”
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

    //zoom behavior to y axis
    if (spanRatioY > 50) {
      // Wide view → only decades, 10ⁿ labels
      yFormat = (d) => {
        const e = Math.floor(Math.log10(d));
        if (d / Math.pow(10, e) === 1) {
          return `10${toSuperscript(e)}`;
        } else return "";
      }; // others blank
    } else if (spanRatioY > 5) {
      // Medium zoom → decades + first‐digit ticks (2×10ⁿ, 5×10ⁿ)
      yFormat = (d) => {
        const e = Math.floor(Math.log10(d));
        const m = d / Math.pow(10, e);
        const supExp = toSuperscript(e);
        // label only exact decades or 2×,5×
        if (m === 1) return `10${supExp}`;
        if (m === 2 || m === 5) return `${m}×10${supExp}`;
        return ""; // others blank
      };
    } else if (spanRatioY > 3) {
      // Medium zoom → decades + first‐digit ticks (2×10ⁿ, 5×10ⁿ)
      yFormat = (d) => {
        yTicks = 4;
        const e = Math.floor(Math.log10(d));
        const m = d / Math.pow(10, e);
        const supExp = toSuperscript(e);
        // label only exact decades or 2×,5×
        if (m === 1) return `10${supExp}`;
        return `${m.toFixed(0)}×10${supExp}`;
      };
    } else {
      // Medium zoom → decades + first‐digit ticks (2×10ⁿ, 5×10ⁿ)
      yTicks = 3; // number of ticks
      yFormat = d3.format(".4~e"); // e.g. “1234.56”
    }

    svg.select('.y-axis').call(
      yAxis
        .scale(zy)
        .ticks(yTicks)
        .tickFormat(yFormat)
        .tickSize(7));
      
    svg.select(".y-axis-right").call(
      yAxisRight
      .scale(zy)
      .ticks(yTicks)
      .tickSize(7)
    );

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

function downloadSVG(svgSelector, filename = "plot.svg") {
  const original = document.querySelector(svgSelector);
  const clone = original.cloneNode(true);

  // 1) Strip out any embedded <style> or <link> tags
  clone
    .querySelectorAll('style, link[rel="stylesheet"]')
    .forEach((el) => el.remove());

  // 2) Now inline your CSS rules as <style> in the clone’s <defs>
  const cssText = `
    /* grab whatever axis rules you need from your stylesheet */
    .axis path, .axis line { stroke: #000; }
    .axis text { font-family: sans-serif; font-size: 12px; fill: #333; }
  `;
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = cssText;
  defs.appendChild(style);
  clone.insertBefore(defs, clone.firstChild);

  // 3) Serialize & download
  let source = new XMLSerializer().serializeToString(clone);
  if (!source.startsWith("<?xml")) {
    source = '<?xml version="1.0" standalone="no"?>\n' + source;
  }
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Usage: pass your SVG’s CSS selector:
document.getElementById("saveSvgBtn").addEventListener("click", () => {
  downloadSVG(".svg-content", "BC2.svg");
});
