import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Navbar from "./Navbar";
import {
  base_url,
  extension_urls,
  get_disease_list,
  kinase_disease_lookup_disease,
} from "../config/urls";
import "./Kinase_Disease.css"; // ✅ Added CSS import

const Kinase_Disease = ({}) => {
  const ref = useRef();
  const [selectedDisease, setSelectedDisease] = useState("");
  const [diseases, setDiseases] = useState([]);

  // Layout constants (must be outside useEffect for JSX usage)
  const legendWidth = 340;
  const isHorizontal = true;
  const margin = { top: 40, right: 20, bottom: 40, left: 40 };
  const nodeHeight = 50;
  // Kinase data fetched from API
  const [kinaseData, setKinaseData] = useState([]);
  const height = Math.max(
    500,
    (kinaseData.length + 1) * nodeHeight + margin.top + margin.bottom
  );
  const width = isHorizontal ? 1200 : 1000;
  const svgWidth = Math.max(800, width - legendWidth);

  // Fetch diseases from API
  useEffect(() => {
    fetch(`${base_url}${extension_urls}${get_disease_list}`)
      .then((res) => res.json())
      .then((data) => {
        let diseaseList = Array.isArray(data.diseases) ? data.diseases : [];
        setDiseases(diseaseList);
        if (diseaseList.length > 0) setSelectedDisease(diseaseList[0]);
      })
      .catch(() => {
        setDiseases([]);
      });
  }, []);

  // Fetch kinases for selected disease
  useEffect(() => {
    if (!selectedDisease) {
      setKinaseData([]);
      return;
    }
    fetch(
      `${base_url}${extension_urls}${kinase_disease_lookup_disease}${encodeURIComponent(
        selectedDisease
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (
          data &&
          data.results &&
          data.results.length > 0 &&
          Array.isArray(data.results[0].rows)
        ) {
          // Sort kinases by score descending
          const sortedRows = [...data.results[0].rows].sort(
            (a, b) => parseFloat(b.Score) - parseFloat(a.Score)
          );
          setKinaseData(sortedRows);
        } else {
          setKinaseData([]);
        }
      })
      .catch(() => setKinaseData([]));
  }, [selectedDisease]);

  useEffect(() => {
    d3.select(ref.current).selectAll("*").remove();

    // we'll render the main visualization into the svg container element
    const svg = d3
      .select(ref.current)
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", height)
      .attr("class", "kinase-svg");

    // Create hierarchy for selected disease
    const root = {
      name: selectedDisease,
      children: kinaseData.map((d) => ({
        name: d.UniProt,
        score: parseFloat(d.Score),
        ensembl: d.Ensembl,
        uniprot: d.UniProt,
        datasource: d.Datasource_Scores,
      })),
    };

    // Slightly decrease the spread to shorten node lines
    const treeLayout = d3
      .tree()
      .size(
        isHorizontal
          ? [height - margin.top - margin.bottom, svgWidth * 0.7]
          : [svgWidth * 0.7, height - margin.top - margin.bottom]
      )
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

    const hierarchy = d3.hierarchy(root);
    treeLayout(hierarchy);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Draw links
    g.selectAll(".link")
      .data(hierarchy.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr(
        "d",
        isHorizontal
          ? d3.linkHorizontal().x((d) => d.y).y((d) => d.x)
          : d3.linkVertical().x((d) => d.x).y((d) => d.y)
      )
      .style("stroke", (d) =>
        d.target.data.score
          ? d3.interpolateViridis(d.target.data.score)
          : "#999"
      )
      .style("stroke-width", (d) =>
        d.target.data.score ? 2 + d.target.data.score * 6 : 2
      );

    // Draw nodes
    const node = g
      .selectAll(".node")
      .data(hierarchy.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) =>
        isHorizontal
          ? `translate(${d.y}, ${d.x})`
          : `translate(${d.x}, ${d.y})`
      );

    node
      .append("circle")
      .attr("r", (d) => (d.data.score ? 8 + d.data.score * 12 : 18))
      .style("fill", (d) =>
        d.data.score ? d3.interpolateViridis(d.data.score) : "steelblue"
      )
      .attr("class", "node-circle")
      .on("mouseover", function (event, d) {
        if (d.data.score) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", d.data.score ? 12 + d.data.score * 16 : 22);

          const tooltip = d3
            .select("body")
            .append("div")
            .attr("class", "tooltip");

          tooltip
            .html(`
            <strong>Kinase: ${d.data.name}</strong><br/>
            <span class="tooltip-score">Score: ${d.data.score?.toFixed(
              3
            )}</span><br/>
            <span class="tooltip-ensembl">Ensembl: ${d.data.ensembl}</span><br/>
            <span class="tooltip-source">Data Sources: ${
              d.data.datasource
            }</span>
          `)
            .style("left", event.pageX + 15 + "px")
            .style("top", event.pageY - 15 + "px");
        }
      })
      .on("mouseout", function (event, d) {
        if (d.data.score) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", d.data.score ? 8 + d.data.score * 12 : 18);
        }
        d3.selectAll(".tooltip").remove();
      });

    node
      .append("text")
      .attr("x", (d) => (d.children ? -30 : isHorizontal ? 15 : 0))
      .attr("y", (d) => (d.children ? 40 : isHorizontal ? 5 : 30))
      .attr("text-anchor", (d) =>
        d.children ? "start" : isHorizontal ? "start" : "middle"
      )
      .attr("class", "node-text")
      .each(function (d) {
        if (d.children) {
          const words = d.data.name.split(" ");
          let line = [];
          let lineLength = 0;
          const maxChars = 28;
          let lines = [];
          words.forEach((word) => {
            if (lineLength + word.length + 1 > maxChars) {
              lines.push(line.join(" "));
              line = [word];
              lineLength = word.length;
            } else {
              line.push(word);
              lineLength += word.length + 1;
            }
          });
          if (line.length) lines.push(line.join(" "));
          d3.select(this).selectAll("tspan").remove();
          lines.forEach((l, i) => {
            d3.select(this)
              .append("tspan")
              .attr("x", -30)
              .attr("dy", i === 0 ? "0" : "1.2em")
              .text(l);
          });
        } else {
          d3.select(this).text(d.data.name);
        }
      });

    // Add title (position based on svgWidth)
    svg
      .append("text")
      .attr("x", svgWidth / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .attr("class", "chart-title");
    // .text(`${selectedDisease} → Kinase Associations`);

    // Render legend
    const legendItems = [
      { label: "High (≥0.7)", color: d3.interpolateViridis(0.85) },
      { label: "Medium (0.4-0.7)", color: d3.interpolateViridis(0.55) },
      { label: "Low (<0.4)", color: d3.interpolateViridis(0.25) },
    ];

    const legendContainer = d3.select("#legend-items");
    legendContainer.selectAll("*").remove();
    legendItems.forEach((item) => {
      const row = legendContainer.append("div").attr("class", "legend-row");
      row
        .append("div")
        .attr("class", "legend-color")
        .style("background", item.color);
      row.append("div").attr("class", "legend-label").text(item.label);
    });
  }, [selectedDisease, kinaseData]);

  return (
    <>
      <Navbar />
      <div className="kd-container">
        <div className="kd-topbar">
          <div>
            <label className="kd-label">Select Disease:</label>
            <select
              value={selectedDisease}
              onChange={(e) => setSelectedDisease(e.target.value)}
              className="kd-select"
              disabled={!Array.isArray(diseases) || diseases.length === 0}
            >
              {Array.isArray(diseases) && diseases.length > 0 ? (
                diseases.map((disease) => (
                  <option key={disease} value={disease}>
                    {disease}
                  </option>
                ))
              ) : (
                <option value="">No diseases found</option>
              )}
            </select>
          </div>
        </div>

        <div className="kd-chart-area">
          <div className="kd-chart-box">
            <div ref={ref} className="kd-svg-container"></div>
            <div id="legend-column" className="kd-legend-column">
              <h4 className="kd-legend-title">Association Strength</h4>
              <div id="legend-items" className="kd-legend-items"></div>
              <div className="kd-legend-tip">
                <strong>Tip:</strong> hover nodes for details.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Kinase_Disease;
