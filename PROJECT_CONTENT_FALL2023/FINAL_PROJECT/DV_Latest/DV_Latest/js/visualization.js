// Selecting the svg
const svg = d3.select("#map")

// Create a geographic path generator using the Albers USA projection
const pathGenerator = d3.geoPath().projection(d3.geoAlbersUsa());

// Append a new SVG group element to the 'svg' container with the class 'label-container'
const labelContainer = svg.append("g").attr("class", "label-container");

// Constant variable to store the file path for a TopoJSON file representing counties
const topoJsonPath = "/DV_Latest/data/counties.json";

// Constant variable to store the file path for a CSV file containing data on mass shootings from 2014 to 2022
const csvPath = "/DV_Latest/data/filtered_mass_shootings.csv";

// State Abbreviations data - used for better mapping of states
const stateAbbreviations = {
  "Alabama": "AL",
  "Alaska": "AK",
  "Arizona": "AZ",
  "Arkansas": "AR",
  "California": "CA",
  "Colorado": "CO",
  "Connecticut": "CT",
  "Delaware": "DE",
  "Florida": "FL",
  "Georgia": "GA",
  "Hawaii": "HI",
  "Idaho": "ID",
  "Illinois": "IL",
  "Indiana": "IN",
  "Iowa": "IA",
  "Kansas": "KS",
  "Kentucky": "KY",
  "Louisiana": "LA",
  "Maine": "ME",
  "Maryland": "MD",
  "Massachusetts": "MA",
  "Michigan": "MI",
  "Minnesota": "MN",
  "Mississippi": "MS",
  "Missouri": "MO",
  "Montana": "MT",
  "Nebraska": "NE",
  "Nevada": "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  "Ohio": "OH",
  "Oklahoma": "OK",
  "Oregon": "OR",
  "Pennsylvania": "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  "Tennessee": "TN",
  "Texas": "TX",
  "Utah": "UT",
  "Vermont": "VT",
  "Virginia": "VA",
  "Washington": "WA",
  "West Virginia": "WV",
  "Wisconsin": "WI",
  "Wyoming": "WY"
};


let topoJsonData; // Declare topoJsonData globally
let csvStateData = {};

Promise.all([d3.json(topoJsonPath), d3.csv(csvPath)])
  .then(function ([topoJsonData, csvData]) {

    let topoJsonCounties = topoJsonData.objects.counties.geometries.map(county => county.properties.name);

    // Create a set of county names from CSV for fast lookup
    let csvCountyNames = new Set(csvData.map(row => row['City Or County']));

    // Displays SET names of all the counties
    // console.log(csvCountyNames);

    // Find and print common counties
    let commonCounties = topoJsonCounties.filter(name => csvCountyNames.has(name));

    // Initialize an object to hold the data
    let csvCountyData = {};

    // Process CSV data
    csvData.forEach(function (d) {
      let county = d['City Or County'];
      let victimsKilled = parseInt(d['Victims Killed'], 10) || 0;
      let victimsInjured = parseInt(d['Victims Injured'], 10) || 0;
      if (!csvCountyData[county]) {
        csvCountyData[county] = { killed: 0, injured: 0 };
      }
      csvCountyData[county].killed += victimsKilled;
      csvCountyData[county].injured += victimsInjured;

      let state = d['State'];
      let victimsKilled_state = parseInt(d['Victims Killed'], 10) || 0;
      let victimsInjured_state = parseInt(d['Victims Injured'], 10) || 0;
      if (!csvStateData[state]) {
        csvStateData[state] = { killed: 0, injured: 0, killed_state: 0, injured_state: 0 };
      }
      csvStateData[state].killed += victimsKilled;
      csvStateData[state].injured += victimsInjured;
      csvStateData[state].killed_state += victimsKilled_state;
      csvStateData[state].injured_state += victimsInjured_state;
    });


    // ======= RENDERING THE TopoJSON MAP ==========
    // Append a new group element to the 'svg' container with the class 'state-labels'
    const stateLabels = svg.append("g").attr("class", "state-labels");

    // Add Bootstrap tooltip attributes to state paths
    svg.selectAll("path")
      // Displays Counties with county name tooltips
      .data(topojson.feature(topoJsonData, topoJsonData.objects.counties).features)

      // Displays States with State name tooltips
      .data(topojson.feature(topoJsonData, topoJsonData.objects.states).features)
      .enter().append("path")
      .attr("d", pathGenerator)
      .attr("fill", "white")
      .attr("data-toggle", "tooltip") // Enable Bootstrap tooltip
      .attr("data-placement", "top") // Set tooltip placement
      .attr("title", d => d.properties.name); // Set the tooltip text to the full state name

    // Initialize Bootstrap tooltips
    $(document).ready(function () {
      $('[data-toggle="tooltip"]').tooltip();
    });

    // Associate CSV data with TopoJSON features
    topoJsonData.objects.counties.geometries.forEach(function (geoFeature) {
      // Pulls the county name from json file
      let countyName = geoFeature.properties.name;
      // console.log("CountyName:" + countyName);

      let data = csvCountyData[countyName];
      // console.log("CountyName[Data]:" + data);

      geoFeature.properties.victimsKilled = data ? data.killed : 0;
      geoFeature.properties.victimsInjured = data ? data.injured : 0;


    });

    // Add red circles for Victims Killed
    svg.selectAll(".victimCircle")
      .data(topojson.feature(topoJsonData, topoJsonData.objects.counties).features)
      .enter().append("circle")
      .filter(function (d) { return d.properties.victimsKilled > 0; })
      .attr("class", "victimCircle")
      .attr("cx", d => pathGenerator.centroid(d)[0])
      .attr("cy", d => pathGenerator.centroid(d)[1] - 5) // Adjust the y-coordinate to avoid overlap
      .attr("r", 3)  // Radius of the circle

    // Add yellow triangles for Victims Injured
    svg.selectAll(".victimTriangle")
      .data(topojson.feature(topoJsonData, topoJsonData.objects.counties).features)
      .enter().append("path")
      .filter(function (d) { return d.properties.victimsInjured > 0; })
      .attr("class", "victimTriangle")
      .attr("d", function (d) {
        var centroid = pathGenerator.centroid(d);
        var x = centroid[0], y = centroid[1] + 5; // Adjust the y-coordinate to avoid overlap
        var size = 3; // Size of the triangle
        return `M ${x} ${y - size} L ${x - size} ${y + size} L ${x + size} ${y + size} Z`;
      })
  })
  // Else loop of Promise function
  .catch(function (error) {
    console.error("Error loading data:", error);
  });

// // Adding an event listener to update the map's colors when the slider is moved
const yearSlider = document.getElementById("year-slider");
const yearValue = document.getElementById("year-value");
const allLabel = document.querySelector(".all-label");
const yearLabels = document.querySelectorAll(".year-labels span");

// Function to set the initial colors
function setInitialColors() {
  // Set the "All" label to red
  allLabel.classList.add("active");
  // Set the initial color for the map paths
  svg.selectAll("path").classed("all", true);
}

// Function to handle slider input
function handleSliderInput() {
  const selectedYear = yearSlider.value;
  yearValue.textContent = selectedYear;

  // Remove previous year class from map paths
  svg.selectAll("path").classed("all year-2014 year-2015 year-2016 year-2017 year-2018 year-2019 year-2020 year-2021 year-2022", false);

  // Apply the class for the selected year
  if (selectedYear === "2013") {
    svg.selectAll("path").classed("all", true);
    allLabel.classList.add("active");
  }
  else {
    svg.selectAll("path").classed("year-" + selectedYear, true);
    allLabel.classList.remove("active");
  }

  // Update year labels
  yearLabels.forEach((label) => {
    if (label.textContent === selectedYear || (selectedYear === "2013" && label.classList.contains("all-label"))) {
      label.classList.add("active");
    } else {
      label.classList.remove("active");
    }
  });
}

// Set the initial colors
setInitialColors();

// Add event listener for slider input
yearSlider.addEventListener("input", handleSliderInput);

// Trigger the initial input event to handle the "All" label
handleSliderInput();


// User Input Suggestions 
// Create an array of state names for suggestions
const stateNames = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas",
  "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
  "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina",
  "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

// Function to handle search
function handleSearch() {
  const input = document.querySelector(".text-field");
  const suggestionsContainer = document.getElementById("suggestions");
  const userInput = input.value.trim().toLowerCase();
  suggestionsContainer.innerHTML = ""; // Clear previous suggestions

  if (userInput === "") {
    return; // No input, so no suggestions
  }

  const filteredStates = stateNames.filter((state) => state.toLowerCase().includes(userInput));

  if (filteredStates.length === 0) {
    suggestionsContainer.innerHTML = "<p>No matching results...</p>";
  } else {
    const suggestionsList = document.createElement("ul");
    filteredStates.forEach((state) => {
      const listItem = document.createElement("li");
      listItem.textContent = state;

      listItem.addEventListener("click", () => {
        input.value = state; // Set the input value to the selected suggestion
        suggestionsContainer.innerHTML = ""; // Clear suggestions

        // Check if topoJsonData is defined
        if (topoJsonData) {
          // Zoom into the selected state
          const selectedState = topojson.feature(topoJsonData, topoJsonData.objects.states).features.find(feature => feature.properties.name === state);
          console.log("Selected State:", selectedState);

          if (selectedState) {
            const bounds = pathGenerator.bounds(selectedState);
            const dx = bounds[1][0] - bounds[0][0];
            const dy = bounds[1][1] - bounds[0][1];
            const x = (bounds[0][0] + bounds[1][0]) / 2;
            const y = (bounds[0][1] + bounds[1][1]) / 2;
            const scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)));
            const translate = [width / 2 - scale * x, height / 2 - scale * y];

            svg.transition()
              .duration(750)
              .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
          }
        }
        // Display the summary information
        displaySummaryInformation(state);
      });
      suggestionsList.appendChild(listItem);

    });
    suggestionsContainer.appendChild(suggestionsList);
  }
}


// Function to display state specific information
function displaySummaryInformation(state) {
  // Find data for the selected state
  const selectedStateData = csvStateData[state];

  if (selectedStateData) {
    // Display additional information for the selected state
    const victimsKilledState = selectedStateData.killed_state || 0;
    const victimsInjuredState = selectedStateData.injured_state || 0;

    // Update the summary container
    const summaryContainer = document.getElementById("summary-container");
    summaryContainer.innerHTML = `
      <p>State-specific Data:</p>
      <p>State Victims Killed: ${victimsKilledState}</p>
      <p>State Victims Injured: ${victimsInjuredState}</p>
    `;
  }
}

document.getElementById("search-button").addEventListener("click", function (event) {
  event.preventDefault();
  handleSearch();
});

// Define the zoom behavior
const zoom = d3.zoom()
  .scaleExtent([1, 8]) // Set the scale extent for zooming
  .on("zoom", zoomed);

// Apply the zoom behavior to the SVG container
svg.call(zoom);

// Function to handle zoom
function zoomed() {
  svg.selectAll("path")
    .attr("transform", d3.event.transform);
  svg.selectAll(".victimCircle, .victimTriangle")
    .attr("transform", d3.event.transform);
}

// Add double-click event for zooming in
svg.on("dblclick", function () {
  const scale = d3.event.transform.k * 2; // Double the current scale
  const x = d3.event.x;
  const y = d3.event.y;

  // Use transition to smoothly zoom in
  svg.transition()
    .duration(500)
    .call(zoom.scaleTo, scale, [x, y]);
});

// Add event listener for the reset button to reset zoom
document.getElementById("reset-button").addEventListener("click", function () {
  // Use transition to smoothly reset zoom
  svg.transition()
    .duration(500)
    .call(zoom.transform, d3.zoomIdentity);
});

// Function to handle "Fatal" button click
function handleFatalButtonClick() {
  svg.selectAll(".victimTriangle").style("display", "none");
  svg.selectAll(".victimCircle").style("display", "block");
}

// Function to handle "Nonfatal" button click
function handleNonfatalButtonClick() {
  svg.selectAll(".victimCircle").style("display", "none");
  svg.selectAll(".victimTriangle").style("display", "block");
}

function handleAllButtonClick() {
  // Display all data points
  svg.selectAll(".victimCircle").style("display", "block");
  svg.selectAll(".victimTriangle").style("display", "block");
}

// Add event listeners for the "Fatal" and "Nonfatal" buttons
document.getElementById("fatal-button").addEventListener("click", handleFatalButtonClick);
document.getElementById("nonfatal-button").addEventListener("click", handleNonfatalButtonClick);
document.getElementById("all-button").addEventListener("click", handleAllButtonClick);
