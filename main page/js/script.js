/* script.js */

document.documentElement.classList.add("loading");
window.addEventListener("load", () => {
  // when all CSS, images, fonts, scripts are done, show the page
  document.documentElement.classList.remove("loading");
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

          dataLayer
            .select(`#${element.id}-line`)
            .attr("pointer-events", "stroke")
            .on("mouseover", function (event, d) {
              if (!event.relatedTarget) return;

              d3.select(this)
                .raise()
                .transition()
                .delay(200)
                .duration(100)
                .attr("stroke-width", element.line.width * 2);
            })
            .on("mouseout", function (event, d) {
              if (!event.relatedTarget) return;
              // 3) Revert styling
              d3.select(this)
                .transition()
                .duration(100)
                .attr("stroke-width", element.line.width);
            });

            dataLayer
              .select(`#${element.id}-area`)
              .on("mouseover", function (event, d) {
                if (!event.relatedTarget) return;

                d3.select(this)
                  .raise()
                  .transition()
                  .delay(200)
                  .duration(100);

                dataLayer
                  .select(`#${element.id}-line`)
                  .raise()
                  .transition()
                  .delay(200)
                  .duration(100)
                  .attr("stroke-width", element.line.width * 2);

              })
              .on("mouseout", function (event, d) {
                if (!event.relatedTarget) return;
                // 3) Revert styling
                dataLayer
                  .select(`#${element.id}-line`)
                  .transition()
                  .duration(100)
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



const plotData = [
  {
    labelName: "BaBar", // label for the legend
    longName: "BaBar", // long name for possible reference
    id: "babar",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "gray", dash: null, width: 2 }, // line style
    area: { color: "lightgray" }, // area style
    paperUrls: ["https://arxiv.org/abs/2505.14229"], // URL to the source paper
    url: "data/BaBar.csv", // URL to the data file
  },
  {
    labelName: "Relic Density",
    longName: "Relic Density",
    id: "relic-density",
    text: { elementName: null },
    line: { color: "black", dash: null, width: 3 },
    area: { color: null },
    paperUrls: ["https://arxiv.org/abs/2305.13953"],
    url: "data/Relic Density.csv",
  },
  {
    labelName: "CMS",
    longName: "CMS",
    id: "cms",
    text: { elementName: "CMS" },
    line: { color: "green", dash: null, width: 2 },
    area: { color: "lightgreen" },
    paperUrls: ["https://arxiv.org/abs/2107.13021"],
    url: "data/CMS.csv",
  },
  {
    labelName: "NA64", // label for the legend
    longName: "NA64", // long name for possible reference
    id: "na64",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgb(26, 255, 0)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: ["https://link.springer.com/article/10.1007/JHEP11(2021)153"],
    url: "data/NA64.csv",
  },
  {
    labelName: "Belle 2", // label for the legend
    longName: "Belle 2", // long name for possible reference
    id: "belle2",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgb(255, 0, 255)", dash: "20,7", width: 2 },
    area: { color: null },
    paperUrls: [
      "https://link.springer.com/article/10.1140/epjc/s10052-024-13480-4",
    ],
    url: "data/Belle 2.csv",
  },
  {
    labelName: "HL-LHC", // label for the legend
    longName: "HL-LHC", // long name for possible reference
    id: "hl-lhc",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgb(5, 133, 46)", dash: null, width: 2 },
    area: { color: null },
    paperUrls: [
      "https://www.worldscientific.com/doi/10.1142/S0218301324500186",
    ],
    url: "data/HL-LHC.csv",
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
  },
  {
    labelName: "Dark SRF", // label for the legend
    longName: "Dark SRF", // long name for possible reference
    id: "Dark-SRF",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/2301.11512"],
    url: "data/AxionLimits-csv/DarkSRF.csv",
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
  },
  {
    labelName: "TEXONO", // label for the legend
    longName: "TEXONO", // long name for possible reference
    id: "texono",
    text: { elementName: null }, // text to be placed on the plot
    line: { color: "rgba(5, 58, 133, 1)", dash: null, width: 2 },
    area: { color: "rgba(57, 130, 232, 1)" },
    paperUrls: ["https://arxiv.org/abs/1301.6557"],
    url: "data/AxionLimits-csv/SPring-8.csv",
  },
];

plotBuilder(plotData);

const legendX = width - margin.right + 50;
const legendY = margin.top;
const legendHeight = height - margin.top - margin.bottom;
const legendWidth  = 300;   // adjust to your needs
const itemHeight = 25;
const swatchSize = 30;

const legend_wrapper = svg
  .append("foreignObject")
  .attr("class", "legend-fo")
  .attr("x", legendX) // place to the right of plot
  .attr("y", legendY)
  .style("width", `${legendWidth}px`)
  .style("height", `${legendHeight}px`)
  .style("overflow-x", "none")
  .append("xhtml:div") // enter the XHTML namespace
  .style("width", "100%")
  .style("height", "100%")
  .style("padding", "0")
  .style("margin", "0")
  .style("overflow-x", "none")
  .style("overflow-y", "scroll");


const legendSvg = legend_wrapper
  .append("svg")
  .style("width", "100%")
  .style("height", itemHeight * plotData.length)
  .attr("class", "legend");

const item = legendSvg
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
});





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
      "y=\\varepsilon^2\\alpha_\\mathrm{D} (m_\\chi / m_{A'})^4",
      {
        throwOnError: false,
      }
    )
  );
  
// Zoom behavior
const zoom = d3.zoom()
  .scaleExtent([0.2, 1e4])
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
