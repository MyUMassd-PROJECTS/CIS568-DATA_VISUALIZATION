// Select the SVG element
const svg = d3.select("#map");

// Define projection and path generator
const projection = d3.geoAlbersUsa();
const pathGenerator = d3.geoPath().projection(projection);

// Append a new SVG group element for labels
const labelContainer = svg.append("g").attr("class", "label-container");

// File paths for data
const topoJsonPath = "/DV_Latest/data/counties.json";
const csvPath = "/DV_Latest/data/filtered_mass_shootings.csv";

// State abbreviations for mapping
const stateAbbreviations = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
  "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
  "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
  "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
  "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
  "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
  "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
  "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
  "Wisconsin": "WI", "Wyoming": "WY"
};

// Global variables
let topoJsonData, csvStateData = {};

// Load data
Promise.all([d3.json(topoJsonPath), d3.csv(csvPath)])
  .then(([topoData, csvData]) => {
    // Extract county names from TopoJSON
    const topoCounties = topoData.objects.counties.geometries.map(county => county.properties.name);

    // Create a Set of county names from CSV
    const csvCounties = new Set(csvData.map(row => row['City Or County']));

    // Find common counties
    const commonCounties = topoCounties.filter(name => csvCounties.has(name));

    // Process CSV data
    const csvCountyData = processCsvData(csvData);
    csvStateData = processStateData(csvData);

    // Render TopoJSON map
    renderMap(topoData);

    // Initialize tooltips
    initializeTooltips();

    // Handle search input
    document.getElementById("search-button").addEventListener("click", handleSearch);

    // Set up year slider
    setupYearSlider();

    // Set up zoom behavior
    setupZoomBehavior();

    // Set up button click handlers
    setupButtonHandlers();
  })
  .catch(error => {
    console.error("Error loading data:", error);
  });

// Process CSV data for counties
function processCsvData(data) {
  return data.reduce((acc, d) => {
    const county = d['City Or County'];
    const victimsKilled = parseInt(d['Victims Killed'], 10) || 0;
    const victimsInjured = parseInt(d['Victims Injured'], 10) || 0;

    if (!acc[county]) acc[county] = { killed: 0, injured: 0 };
    acc[county].killed += victimsKilled;
    acc[county].injured += victimsInjured;

    return acc;
  }, {});
}

// Process CSV data for states
function processStateData(data) {
  return data.reduce((acc, d) => {
    const state = d['State'];
    const victimsKilled = parseInt(d['Victims Killed'], 10) || 0;
    const victimsInjured = parseInt(d['Victims Injured'], 10) || 0;

    if (!acc[state]) acc[state] = { killed: 0, injured: 0, killed_state: 0, injured_state: 0 };
    acc[state].killed += victimsKilled;
    acc[state].injured += victimsInjured;
    acc[state].killed_state += victimsKilled;
    acc[state].injured_state += victimsInjured;

    return acc;
  }, {});
}

// Render the TopoJSON map
function renderMap(data) {
  svg.selectAll("path")
    .data(topojson.feature(data, data.objects.counties).features.concat(
      topojson.feature(data, data.objects.states).features
    ))
    .enter().append("path")
    .attr("d", pathGenerator)
    .attr("fill", "white")
    .attr("data-toggle", "tooltip")
    .attr("data-placement", "top")
    .attr("title", d => d.properties.name);

  // Add circles and triangles
  addVictimMarkers(data);
}

// Add markers for victims
function addVictimMarkers(data) {
  svg.selectAll(".victimCircle")
    .data(topojson.feature(data, data.objects.counties).features)
    .enter().append("circle")
    .filter(d => d.properties.victimsKilled > 0)
    .attr("class", "victimCircle")
    .attr("cx", d => pathGenerator.centroid(d)[0])
    .attr("cy", d => pathGenerator.centroid(d)[1] - 5)
    .attr("r", 3);

  svg.selectAll(".victimTriangle")
    .data(topojson.feature(data, data.objects.counties).features)
    .enter().append("path")
    .filter(d => d.properties.victimsInjured > 0)
    .attr("class", "victimTriangle")
    .attr("d", d => {
      const [x, y] = pathGenerator.centroid(d);
      const size = 3;
      return `M ${x} ${y + size} L ${x - size} ${y - size} L ${x + size} ${y - size} Z`;
    });
}

// Initialize Bootstrap tooltips
function initializeTooltips() {
  $(document).ready(() => {
    $('[data-toggle="tooltip"]').tooltip();
  });
}

// Set up year slider
function setupYearSlider() {
  const yearSlider = document.getElementById("year-slider");
  const yearValue = document.getElementById("year-value");
  const allLabel = document.querySelector(".all-label");
  const yearLabels = document.querySelectorAll(".year-labels span");

  function handleSliderInput() {
    const selectedYear = yearSlider.value;
    yearValue.textContent = selectedYear;

    svg.selectAll("path").classed("all year-2014 year-2015 year-2016 year-2017 year-2018 year-2019 year-2020 year-2021 year-2022", false);

    if (selectedYear === "2013") {
      svg.selectAll("path").classed("all", true);
      allLabel.classList.add("active");
    } else {
      svg.selectAll("path").classed(`year-${selectedYear}`, true);
      allLabel.classList.remove("active");
    }

    yearLabels.forEach(label => {
      label.classList.toggle("active", label.textContent === selectedYear || (selectedYear === "2013" && label.classList.contains("all-label")));
    });
  }

  yearSlider.addEventListener("input", handleSliderInput);
  handleSliderInput(); // Initial call
}

// Set up zoom behavior
function setupZoomBehavior() {
  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

  svg.call(zoom);

  function zoomed() {
    svg.selectAll("path").attr("transform", d3.event.transform);
    svg.selectAll(".victimCircle, .victimTriangle").attr("transform", d3.event.transform);
  }

  svg.on("dblclick", () => {
    const { transform } = d3.event;
    const scale = transform.k * 2;
    svg.transition().duration(500).call(zoom.scaleTo, scale, [d3.event.x, d3.event.y]);
  });

  document.getElementById("reset-button").addEventListener("click", () => {
    svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
  });
}

// Set up button click handlers
function setupButtonHandlers() {
  document.getElementById("fatal-button").addEventListener("click", () => {
    svg.selectAll(".victimTriangle").style("display", "none");
    svg.selectAll(".victimCircle").style("display", "block");
  });

  document.getElementById("nonfatal-button").addEventListener("click", () => {
    svg.selectAll(".victimCircle").style("display", "none");
    svg.selectAll(".victimTriangle").style("display", "block");
  });

  document.getElementById("both-button").addEventListener("click", () => {
    svg.selectAll(".victimCircle, .victimTriangle").style("display", "block");
  });
}

// Handle search functionality
function handleSearch() {
  const searchInput = document.getElementById("search-input").value.toLowerCase();
  const stateAbbr = stateAbbreviations[searchInput];

  if (stateAbbr) {
    // Filter by state abbreviation
    filterByState(stateAbbr);
  } else {
    // Handle county search
    filterByCounty(searchInput);
  }
}

// Filter by state abbreviation
function filterByState(stateAbbr) {
  svg.selectAll("path").style("display", d => {
    const state = d.properties.name;
    return stateAbbreviations[state] === stateAbbr ? "block" : "none";
  });
}

// Filter by county name
function filterByCounty(countyName) {
  svg.selectAll("path").style("display", d => {
    const county = d.properties.name.toLowerCase();
    return county.includes(countyName) ? "block" : "none";
  });
}
