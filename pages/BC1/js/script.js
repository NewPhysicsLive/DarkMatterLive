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

// Preview server configuration: read from a <meta name="preview-server" content="https://...">
// or from a global `window.PREVIEW_SERVER`. If neither exists, preview fetches are skipped.
function getPreviewServerBase() {
  try {
    const meta = document.querySelector('meta[name="preview-server"]');
    if (meta && meta.content) return meta.content.replace(/\/$/, '');
    if (typeof window !== 'undefined' && window.PREVIEW_SERVER) return String(window.PREVIEW_SERVER).replace(/\/$/, '');
  } catch (e) {
    // ignore
  }
  return null;
}
const PREVIEW_SERVER_BASE = getPreviewServerBase();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeHttpUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(String(value), window.location.href);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch (e) {
    // ignore invalid URLs
  }
  return null;
}

function renderPreviewTooltip(meta, url) {
  const safeUrl = sanitizeHttpUrl(url);
  const safeTitle = escapeHtml(meta?.title || '');
  const safeDescription = escapeHtml(meta?.description || '');
  const safeAuthors = Array.isArray(meta?.authors)
    ? meta.authors.map((author) => escapeHtml(author)).join(', ')
    : '';
  const safeSiteName = escapeHtml(meta?.siteName || 'Preview');
  const safeImageUrl = sanitizeHttpUrl(Array.isArray(meta?.image) && meta.image.length ? meta.image[0].url : null);
  const domainLabel = safeUrl ? escapeHtml(getSecondLevelDomain(safeUrl)) : '';

  return `
    <div class="wordbreaker" style="max-width:250px; font-family: sans-serif; display: flex; align-items: center; justify-content: start; flex-direction: column; gap:0.5rem">
      ${safeImageUrl ? `<img src="${safeImageUrl}" alt="${safeSiteName} logo" style="width:50%; height:auto;margin:0; padding:0;"/>` : ''}
      ${safeTitle ? `<strong style="margin:0; padding:0;">${safeTitle}</strong>` : ''}
      ${safeAuthors ? `<em>By ${safeAuthors}</em>` : ''}
      ${safeDescription ? `<p class="wordbreaker" style="margin:0; padding:0;">${safeDescription}</p>` : ''}
      ${safeUrl ? `<p style="margin:0; padding:0;"><span class="no-break">[ <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${domainLabel}</a> ]</span></p>` : ''}
    </div>
  `;
}

function renderPreviewLinkOnly(url) {
  const safeUrl = sanitizeHttpUrl(url);
  const domain = safeUrl ? escapeHtml(getSecondLevelDomain(safeUrl) || safeUrl) : 'source';
  const href = safeUrl || '#';
  return `<div class="wordbreaker" style="max-width:250px;font-family:sans-serif;display:flex;align-items:center;justify-content:start;flex-direction:column;gap:0.5rem"><p style="margin:0;padding:0;"><a href="${href}" target="_blank" rel="noopener noreferrer">${domain}</a></p></div>`;
}

// Try to load a build-time previews index at /data/previews/index.json (if present).
// This is populated by the CI job that runs `scripts/generate_previews.js`.
let LOCAL_PREVIEWS_INDEX = null;
async function loadLocalPreviewsIndex() {
  if (LOCAL_PREVIEWS_INDEX !== null) return LOCAL_PREVIEWS_INDEX;
  try {
    const r = await fetch('/data/previews/index.json', { cache: 'no-store' });
    if (!r.ok) return (LOCAL_PREVIEWS_INDEX = {});
    const j = await r.json();
    return (LOCAL_PREVIEWS_INDEX = j || {});
  } catch (e) {
    return (LOCAL_PREVIEWS_INDEX = {});
  }
}

async function getLocalPreview(url) {
  try {
    const idx = await loadLocalPreviewsIndex();
    if (!idx) return null;

    // Try several tolerant key variants to improve match rate between
    // runtime page URLs and the build-time index keys.
    const tried = [];

    const variants = [
      url,
      url.replace(/#.*$/, ''), // strip fragment
      url.replace(/\/?$/, '/'), // ensure trailing slash
      url.replace(/\/$/, ''), // remove trailing slash
      url.replace(/^http:\/\//i, 'https://'),
      url.replace(/^https:\/\//i, 'http://'),
    ];

    // Also include encoded forms
    const keys = variants.map((u) => encodeURIComponent(u));

    for (const k of keys) {
      tried.push(k);
      if (idx[k]) {
        const file = '/data/previews/' + idx[k];
        try {
          const r = await fetch(file, { cache: 'no-store' });
          if (!r.ok) continue;
          const j = await r.json();
          // lightweight debug: attach which key matched
          j.__preview_key__ = k;
          return j;
        } catch (e) {
          // try next
          continue;
        }
      }
    }

    // final fallback: try encodeURIComponent(original url) if not already tried
    const origKey = encodeURIComponent(url);
    if (!tried.includes(origKey) && idx[origKey]) {
      try {
        const r2 = await fetch('/data/previews/' + idx[origKey], { cache: 'no-store' });
        if (r2.ok) {
          const j2 = await r2.json();
          j2.__preview_key__ = origKey;
          return j2;
        }
      } catch (e) {
        // ignore
      }
    }

    // nothing matched
    console.debug('[preview] no local preview for', url, 'tried keys', tried);
    return null;
  } catch (e) {
    console.debug('[preview] getLocalPreview error', e);
    return null;
  }
}

// Set up margins and dimensions
const container = d3.select('#plot');
const width = container.node().clientWidth;
const isMobile = (width < 1000);

const padding = (isMobile ? 5 : 20);
const titleHeight = 30;
const axisLabelHeight = 30;
const axisLabelSize = 10;
const tickSize = 7;
const tickLabelSize = {h: 10, w: 25};
const legendWidth = 320;

const margin = {
  top:    (titleHeight + padding),
  right:  (isMobile ? tickSize : (tickSize + padding + legendWidth)),
  bottom: (axisLabelHeight + padding + tickSize + tickLabelSize.h),
  left:   (axisLabelHeight + padding + tickSize + tickLabelSize.w)
};

const ratio_h = (width - margin.right)*(2/3); // height via ratio
const max_height = container.node().clientHeight - (margin.top + margin.bottom);
const height = (ratio_h > max_height ? max_height : ratio_h) + margin.top + margin.bottom;

// Set heigh of svg
document.querySelector('#plot').style.height = `${(isMobile ? height*2 : height)}px`;


// Position buttons releative to center of plot
document.querySelector('.interacting-buttons ul').style.paddingRight = `${(isMobile ? 0 : legendWidth)}px`;

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
  .attr('viewBox', `0 0 ${width} ${(isMobile ? height*2 : height)}`)
  .classed('svg-content', true)
  .attr("pointer-events", "all");

// add a small clickable label inside the plotting axes (bottom-left)
function createInSvgLabel(svgSelection, title, href) {
  try {
    // compute coordinates just inside the left and bottom axes area
    const x = margin.left + 8; // a few px inside left axis
    const y = height - margin.bottom - 8; // a few px above bottom axis

    const g = svgSelection.append('g')
      .attr('class', 'inplot-label')
      .attr('transform', `translate(${x}, ${y})`)
      .style('cursor', 'pointer');

    // background rounded rect
    g.append('rect')
      .attr('x', -6)
      .attr('y', -34)
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', 'rgba(255,255,255,0.9)')
      .attr('stroke', '#ddd')
      .attr('width', 220)
      .attr('height', 40);

    // link text
    const a = g.append('a')
      .attr('href', href)
      .attr('target', '_blank')
      .attr('rel', 'noopener noreferrer');

    const text = a.append('text')
      .attr('x', 0)
      .attr('y', '-1.5em')
      .attr('fill', '#3c096c')
      .style('font-weight', '600')
      .style('font-family', 'Open Sans, sans-serif')
      .style('font-size', '13px');

    const tspan1 = text.append('tspan')
      .attr('x', 0)
      .attr('dy', '0')
      .text(title);

    const tspan2 = text.append('tspan')
      .attr('x', 0)
      .attr('dy', '1.3em')
      .text(href);
  } catch (e) {
    console.warn('Failed to create in-SVG label', e);
  }
}

// Define scales (logarithmic x, logarithmic y)
const x0 = d3.scaleLog().domain([1e-32, 1e3]).range([margin.left, width - margin.right]);
const y0 = d3.scaleLog().domain([1e-40, 1e-0]).range([height - margin.bottom, margin.top]);

// Create axis generators
const xAxis = d3.axisBottom(x0)
      .ticks(10)
      .tickFormat(powerTickFormatter({ labelEveryMantissa: false }))
      .tickSize(tickSize);
const yAxis = d3.axisLeft(y0)
      .ticks(10)
      .tickFormat(powerTickFormatter({ labelEveryMantissa: false }))
      .tickSize(tickSize);

const xAxisTop = d3.axisTop(x0)
      .ticks(10)
      .tickFormat("")
      .tickSize(tickSize);
const yAxisRight = d3.axisRight(y0)
      .ticks(10)
      .tickFormat("")
      .tickSize(tickSize);



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
  .x((d) => x0(d.x))
  .y((d) => y0(d.y));

const areaGen = d3.area()
  .x((d) => x0(d.x))
  .y0((d) => y0(1))
  .y1((d) => y0(d.y));


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

// create the in-plot label (clickable)
createInSvgLabel(svg, 'Dark Matter live', 'https://darkmatter.web.cern.ch/');

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
                    // show a usable link immediately (avoid sticking at "Loading…")
                    const url = element.paperUrls && element.paperUrls[0];
                    instance.setContent(renderPreviewTooltip({ title: element.labelName }, url));

                    // optionally try to fetch richer metadata from the preview service,
                    // but don't rely on it: update tooltip if fetch succeeds, otherwise keep the link
                      (async function () {
                        if (!url) return;
                        // Try local preview index first (fast and serverless)
                        try {
                          const local = await getLocalPreview(url);
                          if (local) {
                            instance.setContent(renderPreviewTooltip(local, url));
                            console.debug('[preview] used local preview', url, local.__preview_key__ || 'unknown');
                            return;
                          }
                        } catch (e) {
                          console.debug('[preview] local preview lookup failed', e);
                        }

                        // Fall back to runtime preview server if configured
                        if (url && PREVIEW_SERVER_BASE) {
                          try {
                            const r = await fetch(`${PREVIEW_SERVER_BASE}/preview?url=${encodeURIComponent(url)}`);
                            if (!r.ok) throw new Error('preview fetch failed');
                            const meta = await r.json();
                            instance.setContent(renderPreviewTooltip(meta, url));
                            console.debug('[preview] used remote preview', url, PREVIEW_SERVER_BASE);
                          } catch (e) {
                            console.debug('[preview] remote preview failed', e);
                          }
                        }
                      })();
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

"curveType": "excluded" or "projection", // type of the plot
    "categories": {
      "detectionType": "Direct detection" or "Indirect detection",
      "experimentType": "Collider experiments" or "Cosmological measurements" or "Astrophysical observations" or "Laboratory experiments",
      "timeType": "Past constraints" or "Recent constraints" or "Planned/future constraints",
      "assumption": "None" or "Dark Matter" or "Other",
    }, // category for grouping 


*/

let plotData = []

const curvePriority = {
  excluded: 0,
  projection: 1,
  line: 2,
};

// === config ===
const legendX = (isMobile ? padding : width - margin.right + padding);
const legendY = (isMobile ? height : 0);
const legendHeight = (isMobile ? height : height - margin.bottom);
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
  .attr("width", legendWidth)
  .attr("height", legendHeight)
  .style("overflow-x", "hidden")
  .append("xhtml:div")
  .style("width", "100%")
  .style("height", "100%")
  .style("padding", "0")
  .style("margin", "0")
  .style("position", "relative")
  .style("overflow-y", "auto");

legend_wrapper
  .append("label")
  .attr("for", "grouping-select")
  .attr("class", "legend-grouping-label")
  .style("position", "absolute")
  .style("top", "5px") // position above the select
  .style("left", "0px")
  .text("Group plots by:");

// Add select element (HTML, not SVG)
const select = legend_wrapper
  .append("select")
  .attr("id", "grouping-select")
  .style("position", "absolute")
  .style("top", "35px")
  .style("left", "0px")
  .property("value", "none");


// Add options
const groupingOptions = [
  { value: "none", label: "All data" },
  { value: "experimentType", label: "Experiment Type" },
  { value: "detectionType", label: "Detection Type" },
  { value: "timeType", label: "Time Frame" },
  { value: "assumption", label: "Assumptions" },
];

select
  .selectAll("option")
  .data(groupingOptions)
  .enter()
  .append("option")
  .attr("value", (d) => d.value)
  .text((d) => d.label);
  // .on("change", (e) => {
  //   const key = e.target.value;
  //   const groupedData = groupByCategory(plotData, key);
  //   renderLegend(groupedData);
  // });


// === Scrollable legend container ===
const legend_scroll = legend_wrapper
  .append("div")
  .style("position", "absolute")
  .style("top", "70px") // below the select
  .style("left", "0px")
  .style("right", "0px")
  .style("bottom", "0px")
  .style("overflow-y", "auto"); // scrollbar only here

// Legend SVG inside scrollable container
const legendSvg = legend_scroll
  .append("svg")
  .style("width", "100%")
  .attr("class", "legend");

/* legendSvg
  .append("g")
  .attr("class", "legend-group-select-all")
  .append("text")
  .attr("class", "legend-group-select-all-text")
  .attr("x", 0)
  .attr("y", 75) // baseline; avoids clipping at y=0
  .text("Select All")
  .style("font-weight", "600")
  .style("font-size", "1em")

const selectAllWidth = legendSvg
  .select(".legend-group-select-all-text")
  .node()
  .getBBox().width;

legendSvg
  .select(".legend-group-select-all")
  .append("foreignObject")
  .attr("x", selectAllWidth + 6)
  .attr("y", 62)
  .attr("width", 15)
  .attr("height", 15)
  .append("xhtml:div")
  .attr("style", "width:100%; height:100%; margin:0; padding:0")
  .append("input")
  .attr("style", "width:15px; height:15px; margin:0; padding:0")
  .attr("type", "checkbox")
  .attr("class", "select-all-checkbox")
  .property("checked", true)
  .on("change", function () {
    const isChecked = d3.select(this).property("checked");
    d3.selectAll(".hidden-box").each(function (d) {
      d3.select(this).property("checked", isChecked);
      this.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }); */


///////////////////////////////////////////
const groupsRoot = legendSvg.append("g").attr("class", "legend-groups-root");

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
  tSvg.style("height", yOffset + 30 + "px");

  firstRun = false;
}

function renderLegend(grouped) {
  groupsRoot.selectAll("*").remove();

  // Groups
  const groups = groupsRoot
    .selectAll(".legend-group")
    .data(grouped, (d) => d.group)
    .enter()
    .append("g")
    .attr("class", "legend-group")
    .attr("expanded", "false"); // collapsed by default

  groups
    .append("text")
    .attr("class", "legend-group-title")
    .attr("x", 0)
    .attr("y", 16) // baseline; avoids clipping at y=0
    .style("font-weight", "400")
    .style("font-size", "1.1em")
    .style("font-family", '"Open Sans", sans-serif')
    .style("cursor", "pointer")
    .each(function(d) {
      // build the title text + caret tspan
      const txt = d3.select(this);
      txt.append('tspan').attr('class','legend-group-title-text').text(d.group);
      txt.append('tspan').attr('class','legend-group-caret').attr('dx', 6).text(' ▸');
    })
    .on("click", function () {
      const g = d3.select(this.parentNode);
      const isExpanded = g.attr("expanded") === "true";
      const newState = !isExpanded;
      g.attr("expanded", String(newState));
      // update caret glyph
      d3.select(this).select('.legend-group-caret').text(newState ? ' ▾' : ' ▸');
      updateLegendLayout();
    });

  groups.each(function () {

    let titleShift = 0;
    const g = d3.select(this);

    const currentKey = select.property("value");
    
    if (currentKey !== "none") {

    titleShift = 36;
    g.append("rect")
    .attr("class", "legend-group-swatch")
    .attr("x", 0)
    .attr("y", 2)
    .attr("width", swatchSize)
    .attr("height", 16)
    .attr("fill", (d) => d.items[0].line.color)
    .attr("opacity", AREA_OPACITY);

  // 2) small line symbol to the right of the swatch (represents the line color/style)
  g.append("line")
    .attr("class", "legend-group-line")
    .attr("x1", 0)
    .attr("x2", swatchSize)
    .attr("y1", 10 )
    .attr("y2", 10 )
    .attr("stroke", (d) => d.items[0].line.color)
    .attr("stroke-width", (d) => d.items[0].line.width);

    }

    const titleWidth = g.select(".legend-group-title").node().getBBox().width + titleShift;

    g.select(".legend-group-title").attr("x", titleShift);

    g.append("foreignObject")
      .attr("x", titleWidth + 6)
      .attr("y", 2) // aligned with your previous y
      .attr("width", 16)
      .attr("height", 16)
      .append("xhtml:div")
      .attr("style", "width:100%; height:100%; margin:0; padding:0")
      .append("input")
      .attr("style", "width:16px; height:16px; margin:0; padding:0")
      .attr("type", "checkbox")
      .attr("class", "group-checkbox hidden-box")
      .property("checked", true)
      .on("change", function () {
        const isChecked = d3.select(this).property("checked");
        const group = d3.select(this.closest(".legend-group"));
        group.selectAll(".legend-item .hidden-box").each(function () {
          d3.select(this).property("checked", isChecked);
          this.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });
  });

  const items = groups
    .selectAll(".legend-item")
    .data((d) => d.items)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${(i + 1) * itemHeight })`);

  // swatch (if area has fill color)
  items
    .filter((d) => d.area.color)
    .append("rect")
    .attr("width", swatchSize)
    .attr("height", 16)
    .attr("y", 4)
    .attr("fill", (d) => d.area.color);

  // line symbol
  items
    .append("line")
    .attr("x1", 0)
    .attr("x2", swatchSize)
    .attr("y1", 12)
    .attr("y2", 12)
    .attr("stroke", (d) => d.line.color)
    .attr("stroke-width", (d) => d.line.width)
    .attr("stroke-dasharray", (d) => d.line.dash || null);

  // text label
  const text = items
    .append("text")
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

  attachPaperPreviews(groupsRoot);

  firstRun = true; // smooth first layout of a fresh build
  updateLegendLayout();

}

function attachPaperPreviews(scopeSelection) {
  scopeSelection.selectAll(".legend-item a").each(function (d) {
    const el = this;
    tippy(el, {
      // show a usable link immediately and then try to fetch richer metadata
      content: (function(){
        const url = d;
        return renderPreviewLinkOnly(url);
      })(),
      allowHTML: true,
      appendTo: document.body,
      onShow(instance) {
        const url = d;
        if (!url) return;
        // Prefer build-time local preview JSON if present (no network needed)
        getLocalPreview(url).then((localMeta) => {
          if (localMeta) {
            const meta = localMeta;
            const fullTitle = meta.title || "";
            const maxTitleChars = 120;
            const shortTitle = fullTitle.length > maxTitleChars ? fullTitle.slice(0, maxTitleChars).trim() + "…" : fullTitle;
            const fullDesc = meta.description || "";
            const maxChars = 240;
            const shortDesc = fullDesc.length > maxChars ? fullDesc.slice(0, maxChars).trim() + "…" : fullDesc;
            instance.setContent(renderPreviewTooltip({
              ...meta,
              title: shortTitle,
              description: shortDesc,
            }, url));
          } else {
            // attempt to fetch preview metadata but don't block the tooltip
            if (PREVIEW_SERVER_BASE) {
              fetch(`${PREVIEW_SERVER_BASE}/preview?url=${encodeURIComponent(url)}`)
                .then((r) => r.json())
                .then((meta) => {
                  const fullTitle = meta.title || "";
                  const maxTitleChars = 120;
                  const shortTitle = fullTitle.length > maxTitleChars ? fullTitle.slice(0, maxTitleChars).trim() + "…" : fullTitle;
                  const fullDesc = meta.description || "";
                  const maxChars = 240;
                  const shortDesc = fullDesc.length > maxChars ? fullDesc.slice(0, maxChars).trim() + "…" : fullDesc;
                  instance.setContent(renderPreviewTooltip({
                    ...meta,
                    title: shortTitle,
                    description: shortDesc,
                  }, url));
                })
                .catch(() => {
                  // preview service not available or failed — keep the immediate link
                });
            } else {
              // no preview server configured; keep the immediate link fallback
            }
          }
        });
      },
    });
  });
//`
}
//"Collider experiments" or "Cosmological measurements" or "Astrophysical observations" or "Laboratory experiments"
// === INITIAL RENDER ===

const GROUP_PALETTES = {
  experimentType: new Map([
    ["Collider experiments", "#d62728"],
    ["Cosmological measurements", "#1f77b4"],
    ["Astrophysical observations", "#2ca02c"],
    ["Laboratory experiments", "#ff7f0e"],
  ]),

  detectionType: new Map([
    ["Direct detection", "#d62728"],
    ["Indirect detection", "#1f77b4"],
  ]),

  timeType: new Map([
    ["Past constraints", "#7f7f7f"],
    ["Recent constraints", "#1f77b4"],
    ["Planned/future constraints", "#d62728"],
  ]),
  assumption: new Map([
    ["None", "#d62728"],
    ["Dark Matter", "#1f77b4"],
  ]),
};

// tuning
const HUE_MIN = 0;   // fraction of circle, e.g. 0.06 -> avoid very red edge if you want
const HUE_MAX = 1;   // fraction of circle
const SATURATION = 0.95;
const LIGHTNESS = 0.6;
const AREA_OPACITY = 0.6;

// golden ratio conjugate for scrambling
const PHI_CONJ = 0.6180339887498949;

const colormap = d3.scaleSequential(d3.interpolateTurbo)
                     .domain([0, plotData.length - 1]);

// stable hash to [0,1] (you already had this)
function hashToUnit(str) {
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

// produce a pleasing HSL color from a t in [0,1] mapped into the hue window
function colorFromT(t) {
  const tClamped = Math.max(0, Math.min(1, t));
  const hueFrac = HUE_MIN + (HUE_MAX - HUE_MIN) * tClamped; // in [HUE_MIN,HUE_MAX]
  const hueDeg = Math.round(hueFrac * 360);
  return d3.hsl(hueDeg, SATURATION, LIGHTNESS).toString();
}

// distinct color for "all-data" mode; stable by id if id exists, otherwise scrambled index
function colorForAllData(el, i, total) {
  // prefer stable hashing by id
  let base;
  if (el.id != null) {
    base = hashToUnit(String(el.id));
  } else {
    // fallback: scramble by golden ratio so adjacent indices are far in hue-space
    base = ((i * PHI_CONJ) % 1);
  }
  return colorFromT(base);
}

function colorForCategory(key, category, i, total) {
  const map = GROUP_PALETTES[key];
  if (map && map.has(category)) return map.get(category);

  // fallback: distinct HSV color based on index
  return distinctColor(i, total);
}

// distinct color generator for N items (used for categories). Uses a scrambled index
function distinctColorForIndex(idx, total) {
  // use a scrambled order based on golden ratio to avoid neighbors being similar
  const base = ((idx * PHI_CONJ) % 1);
  return colorFromT(base);
}

// apply color to an element's data structure (line + area)
function applyElementColors(el, baseColor) {
  el.line = el.line || {};
  el.line.color = baseColor;

  if (el.area && el.area.color != null) {
    const c = d3.color(baseColor);
    if (c) {
      c.opacity = AREA_OPACITY;
      el.area.color = c.formatRgb();
    }
  }
}

// update existing DOM (unchanged)
function updatePlotColorsInDOM(plotData, dataLayer) {
  plotData.forEach(d => {
    const line = dataLayer.select(`#${d.id}-line`);
    if (!line.empty()) line.attr("stroke", (d.line && d.line.color) ? d.line.color : null);

    const area = dataLayer.select(`#${d.id}-area`);
    if (!area.empty()) area.attr("fill", (d.area && d.area.color) ? d.area.color : "none");

    const text = dataLayer.select(`#${d.id}-text`);
    if (!text.empty()) text.attr("fill", (d.line && d.line.color) ? d.line.color : null);
  });
}

// MAIN: assign colors to plotData in-place according to key
function applyColors(plotData, key) {
  if (key === "none") {
    // All-data mode: one distinct color per plot (stable by id)
    plotData.forEach((el, i) => {
      const col = colorForAllData(el, i, plotData.length);
      applyElementColors(el, col);
    });
  } else {
    // Grouped mode: determine unique categories, map category -> color
    const seen = new Set();
    const categories = [];
    plotData.forEach(el => {
      const cat = el.categories ? el.categories[key] : "∅";
      if (!seen.has(cat)) {
        seen.add(cat);
        categories.push(cat);
      }
    });

    // build colors per unique category: prefer GROUP_PALETTES, otherwise assign distinct color per category index
    const categoryColors = new Map();
    for (let ci = 0; ci < categories.length; ci++) {
      const cat = categories[ci];
      const palette = GROUP_PALETTES[key];
      if (palette && palette.has(cat)) {
        categoryColors.set(cat, palette.get(cat));
      } else {
        categoryColors.set(cat, distinctColorForIndex(ci, categories.length));
      }
    }

    // apply colors by looking up the category color
    plotData.forEach((el) => {
      const cat = el.categories ? el.categories[key] : "∅";
      const col = categoryColors.get(cat);
      applyElementColors(el, col);
    });
  } // end grouped
}

function rerenderLegendForKey(key) {
  applyColors(plotData, key);
  updatePlotColorsInDOM(plotData, dataLayer);

  const groupedData = (key === "none")
    ? [{ group: "All data", items: plotData }]
    : groupByCategory(plotData, key);

  renderLegend(groupedData);
}


async function getCurveList() {
  try {
    const res = await fetch('/data/BC1/curves.json');
    const data = await res.json();
    return data.curves || [];
  } catch (err) {
    console.error('Failed to load curves.json:', err);
    return [];
  }
}

async function loadData(curve_list) {
  const results = await Promise.all(
    curve_list.map(async (curve) => {
      const res = await fetch(`/data/BC1/${curve}`);
      return res.json();
    })
  );

  return results;
}

async function populatePlotData() {
  const curve_list = await getCurveList();

  plotData = await loadData(curve_list);

  const dataWithSizes = await Promise.all(
    plotData.map(async (el) => {
    if (!el.url) return { ...el, _size: 0 };

    const data = await d3.csv(el.url, d3.autoType);

    let size = 0;

    if (el.curveType === "excluded" || el.curveType === "projection") {
      size = computeAreaFromPath(areaGen, data);
    } else if (el.curveType === "line") {
      size = computeLineLength(data, x0, y0);
    }

    return { ...el, _data: data, _size: size };
    })
  );

  dataWithSizes.sort((a, b) => {
    const typeDiff = curvePriority[a.curveType] - curvePriority[b.curveType];
    if (typeDiff !== 0) return typeDiff;
    return b._size - a._size;
  });

  plotBuilder(dataWithSizes);

  if (hiddenPath?.parentNode) {
    hiddenPath.parentNode.removeChild(hiddenPath);
  }
}
populatePlotData().then(res => {
  rerenderLegendForKey("none");
});

// === WIRE THE SELECT ===
select.on("change", function () {
  const key = this.value;
  rerenderLegendForKey(key);
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
const plotTitle = svg
  .append("foreignObject")
  .attr("class", "plot-title")
  .attr("x", (isMobile ? 0 : margin.left ))
  .attr("y", 0)
  .attr("width", (isMobile ? width : width - margin.right - margin.left))
  .attr("height", titleHeight)
  .style("font-size", `${titleHeight*0.65}px`); // font-size != line height
  
plotTitle.append("xhtml:div").html(
  katex.renderToString("\\mathrm{Minimal\\,dark\\,photon\\,model\\,(BC1)}", {
    throwOnError: false,
  })
).style("max-width", "fit-content")
 .style("margin-inline", "auto");

//Adding plot labels with TeX content
const foX = svg.append("foreignObject")
  .attr("x", margin.left)
  .attr("y", height - axisLabelHeight)
  .attr("width", width - margin.right - margin.left)
  .attr("height", axisLabelHeight)
  .attr("class", "axis-label")
  .style("font-size", `${axisLabelHeight*0.65}px`); // font-size != line height

// DOMParser to turn that string into actual nodes
foX.append("xhtml:div").html(
  katex.renderToString("\\mathrm{Mass\\,of\\,DM},\\,m_{\\chi}\\,[\\mathrm{GeV}]", {
    throwOnError: false,
  })
).style("max-width", "fit-content")
 .style("margin-inline", "auto");

const foY = svg.append("foreignObject")
  .attr("x", 0)
  .attr("y", margin.top)
  .attr("width", axisLabelHeight)
  .attr("height", height - margin.top - margin.bottom)
  .attr("class", "axis-label")
  .style("font-size", `${axisLabelHeight*0.65}px`); // font-size != line height

// DOMParser to turn that string into actual nodes
foY.append("xhtml:div").html(
    katex.renderToString("\\varepsilon", {
     throwOnError: false,
  })
).style("transform", "rotate(-90deg)")
 .style("max-width", "fit-content")
 .style("margin-inline", "auto");

let currentXMin = x0.domain()[0];
let currentXMax = x0.domain()[1];
let currentYMin = y0.domain()[0];
let currentYMax = y0.domain()[1];

function ticksChangerX(spanRatioX,xMin,xMax) {
  let xTicks, xFormat;
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

    return [xTicks, xFormat];
}


function ticksChangerY(spanRatioY,yMin,yMax) {
  let yFormat, yTicks;

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

    return [yTicks, yFormat];
}
  
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

    currentXMin = xMin;
    currentXMax = xMax;
    currentYMin = yMin;
    currentYMax = yMax;

    const xTicks = ticksChangerX(spanRatioX, xMin, xMax);

    svg.select('.x-axis').call(
      xAxis
        .scale(zx)
        .ticks(xTicks[0])
        .tickFormat(xTicks[1])
        .tickSize(tickSize));
      
    svg.select(".x-axis-top").call(
      xAxisTop
      .scale(zx)
      .ticks(xTicks[0])
      .tickSize(tickSize)
    );

    const yTicks = ticksChangerY(spanRatioY, yMin, yMax);

    svg.select('.y-axis').call(
      yAxis
        .scale(zy)
        .ticks(yTicks[0])
        .tickFormat(yTicks[1])
        .tickSize(tickSize));
      
    svg.select(".y-axis-right").call(
      yAxisRight
      .scale(zy)
      .ticks(yTicks[0])
      .tickSize(tickSize)
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

const fontMap = {
  // KaTeX fonts
  "KaTeX_Main-Regular.woff2": { family: "KaTeX_Main", weight: "400", style: "normal", url: "../vendor/fonts/KaTeX_Main-Regular.woff2" },
  "KaTeX_Main-Bold.woff2": { family: "KaTeX_Main", weight: "700", style: "normal", url: "../vendor/fonts/KaTeX_Main-Bold.woff2" },
  "KaTeX_Math-Italic.woff2": { family: "KaTeX_Math", weight: "400", style: "italic", url: "../vendor/fonts/KaTeX_Math-Italic.woff2" },

  // Open Sans fonts
  "OpenSans-Regular.woff2": {
    family: "Open Sans",
    weight: "400",
    style: "normal",
    url: "../vendor/fonts/OpenSans-Regular.ttf"
  },
  "OpenSans-Bold.woff2": {
    family: "Open Sans",
    weight: "700",
    style: "normal",
    url: "../vendor/fonts/OpenSans-Bold.ttf"
  },
};

async function embedFonts(svgEl) {
  let cssRules = "";

  for (const file in fontMap) {
    const { family, weight, style, url } = fontMap[file];

    const fontUrl = url;
    const res = await fetch(fontUrl);
    const buffer = await res.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    cssRules += `
      @font-face {
        font-family: '${family}';
        font-weight: ${weight};
        font-style: ${style};
        src: url(data:font/woff2;base64,${base64}) format('woff2');
      }
    `;
  }

  // Insert <defs><style> into SVG
  let defs = svgEl.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svgEl.insertBefore(defs, svgEl.firstChild);
  }
  const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = cssRules;
  defs.appendChild(styleEl);
}

async function downloadSVG(svgSelector, filename = "plot.svg") {
  const original = document.querySelector(svgSelector);
  const clone = original.cloneNode(true);

  // --- 1) Copy only *non-default* computed styles ---
  const originalElems = original.querySelectorAll("*");
  const cloneElems = clone.querySelectorAll("*");

  await embedFonts(clone);

  function getDefaultStyles(tagName) {
    const testEl = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    document.body.appendChild(testEl);
    const styles = getComputedStyle(testEl);
    const result = {};
    for (let i = 0; i < styles.length; i++) {
      const prop = styles[i];
      result[prop] = styles.getPropertyValue(prop);
    }
    document.body.removeChild(testEl);
    return result;
  }

const defaultCache = {};
const alwaysInclude = ["font-family", "font-weight", "font-size"]; // force these

originalElems.forEach((origEl, i) => {
  const comp = getComputedStyle(origEl);
  const tagName = origEl.tagName.toLowerCase();

  if (!defaultCache[tagName]) {
    defaultCache[tagName] = getDefaultStyles(tagName);
  }
  const defaults = defaultCache[tagName];

  let styleStr = "";
  for (let j = 0; j < comp.length; j++) {
    const prop = comp[j];
    const val = comp.getPropertyValue(prop);
    const defVal = defaults[prop];

    // Keep if different from default OR in alwaysInclude list
    if ((val && val !== defVal) || alwaysInclude.includes(prop)) {
      styleStr += `${prop}:${val};`;
    }
  }

  if (styleStr) {
    cloneElems[i].setAttribute("style", styleStr);
  }
});


  // --- 2) Remove unwanted UI stuff (scrollbars, checkboxes, etc.) ---
  clone.querySelectorAll("#grouping-select, .hidden-box, .legend-grouping-label")
       .forEach((el) => el.remove());


  // --- 3) Add XML header and serialize ---
  let source = new XMLSerializer().serializeToString(clone);
  if (!source.startsWith("<?xml")) {
    source = '<?xml version="1.0" standalone="no"?>\n' + source;
  }

  // --- 4) Download ---
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


// === Create anchored popup (initially hidden) ===
const popup = d3.select("body")
  .append("div")
  .attr("id", "axes-popup")
  .style("display", "none")
  .style("position", "absolute")   // << anchored to button
  .style("background", "white")
  .style("border", "1px solid #ccc")
  .style("padding", "10px")
  .style("z-index", "1000")
  .style("box-shadow", "0px 4px 10px rgba(0,0,0,0.3)");

// Add form content
popup.html(`
  <label class="fix-axes-label"><p class="fix-axes-text">X min: </p><input class="fix-axes-input" type="number" id="x-min"></label>
  <label class="fix-axes-label"><p class="fix-axes-text">X min:</p><input class="fix-axes-input" type="number" id="x-max"></label>
  <label class="fix-axes-label"><p class="fix-axes-text">Y min: </p><input class="fix-axes-input" type="number" id="y-min"></label>
  <label class="fix-axes-label"><p class="fix-axes-text">Y max: </p><input class="fix-axes-input" type="number" id="y-max"></label>
  <div class="popup-buttons"><button id="apply-axes">Apply</button>
  <button id="cancel-axes">Close</button></div>
`);

// === Event listeners ===

// Show popup just above the button
d3.select("#fix-axes-btn").on("click", function () {
  const isVisible = popup.style("display") === "flex";

  if (isVisible) {
    // Hide on second click
    popup.style("display", "none");
    return;
  }

  // Otherwise, show popup
  const rect = this.getBoundingClientRect();

  // First, make popup visible but hidden (to measure height)
  popup.style("display", "flex").style("visibility", "hidden");

  const popupHeight = popup.node().offsetHeight;

  popup
    .style("left", rect.left + "px")
    .style("top", (window.scrollY + rect.top - popupHeight - 10) + "px")
    .style("visibility", "visible");

  console.log(currentXMin, currentXMax, currentYMin, currentYMax);

  // Pre-fill inputs
  d3.select("#x-min").property("value", currentXMin.toExponential(2));
  d3.select("#x-max").property("value", currentXMax.toExponential(2));
  d3.select("#y-min").property("value", currentYMin.toExponential(2));
  d3.select("#y-max").property("value", currentYMax.toExponential(2));
});

// Hide popup
d3.select("body").on("click", function (event) {
  const target = event.target;
  if (target.id !== "fix-axes-btn" && !popup.node().contains(target)) {
    popup.style("display", "none");
  }
});

// Apply new ranges
d3.select("body").on("click", function (event) {
  if (event.target.id === "apply-axes") {
    const xMin = parseFloat(d3.select("#x-min").property("value"));
    const xMax = parseFloat(d3.select("#x-max").property("value"));
    const yMin = parseFloat(d3.select("#y-min").property("value"));
    const yMax = parseFloat(d3.select("#y-max").property("value"));

    if (!isNaN(xMin) && !isNaN(xMax)) x0.domain([xMin, xMax]);
    if (!isNaN(yMin) && !isNaN(yMax)) y0.domain([yMin, yMax]);

    x0.domain([xMin, xMax]);
    y0.domain([yMin, yMax]);
    const spanRatioX = xMax / xMin; 
    const spanRatioY = yMax / yMin; 

    const xTicks = ticksChangerX(spanRatioX, xMin, xMax);

    svg.select('.x-axis').call(
      xAxis
        .scale(x0)
        .ticks(xTicks[0])
        .tickFormat(xTicks[1])
        .tickSize(tickSize));
      
    svg.select(".x-axis-top").call(
      xAxisTop
      .scale(x0)
      .ticks(xTicks[0])
      .tickSize(tickSize)
    );

    const yTicks = ticksChangerY(spanRatioY, yMin, yMax);

    svg.select('.y-axis').call(
      yAxis
        .scale(y0)
        .ticks(yTicks[0])
        .tickFormat(yTicks[1])
        .tickSize(tickSize));
      
    svg.select(".y-axis-right").call(
      yAxisRight
      .scale(y0)
      .ticks(yTicks[0])
      .tickSize(tickSize)
    );

    dataLayer.selectAll('path.line')
      .attr('d', d => line(d));

    dataLayer.selectAll('path.area')
      .attr('d', d => areaGen(d));

    popup.style("display", "none");
  }
  if (event.target.id === "cancel-axes") {
    popup.style("display", "none");
  }
});
