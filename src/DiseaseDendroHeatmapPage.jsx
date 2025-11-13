import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Navbar from "./Navbar";
import "./DiseaseDendroHeatmapPage.css";

// Sample data structure
const sampleData = [
  // ... (data omitted for brevity)
];

const TreeHierarchyView = ({ associations = sampleData }) => {
  const ref = useRef();
  const [selectedKinase, setSelectedKinase] = useState("CDK1");
  const [layout, setLayout] = useState("horizontal");

  // Layout constants
  const legendWidth = 340;
  const isHorizontal = layout === "horizontal";
  const margin = { top: 40, right: 20, bottom: 40, left: 40 };
  const nodeHeight = 50;
  
  const filteredData = associations
    .filter(d => d.kinase === selectedKinase)
    .sort((a, b) => b.score - a.score);
  const height = Math.max(500, (filteredData.length + 1) * nodeHeight + margin.top + margin.bottom);
  const width = isHorizontal ? 1200 : 1000;
  const svgWidth = Math.max(800, width - legendWidth);

  const kinases = Array.from(new Set(associations.map(d => d.kinase)));

  useEffect(() => {
    d3.select(ref.current).selectAll("*").remove();

    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", height)
      .attr("class", "tree-svg"); // Use CSS class

    // Create hierarchy
    const root = {
      name: selectedKinase,
      children: filteredData.map(d => ({
        name: d.disease,
        score: d.score,
        diseaseId: d.diseaseId
      }))
    };

    const treeLayout = d3.tree()
      .size(isHorizontal 
        ? [height - margin.top - margin.bottom, svgWidth * 0.70]
        : [svgWidth * 0.70, height - margin.top - margin.bottom]
      )
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

    const hierarchy = d3.hierarchy(root);
    treeLayout(hierarchy);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Draw links
    g.selectAll(".link")
      .data(hierarchy.links())
      .enter().append("path")
      .attr("class", "link") // Use CSS class
      .attr("d", isHorizontal 
        ? d3.linkHorizontal().x(d => d.y).y(d => d.x)
        : d3.linkVertical().x(d => d.x).y(d => d.y)
      )
      // DYNAMIC styles (based on data) must stay
      .style("stroke", d => d.target.data.score ? d3.interpolateViridis(d.target.data.score) : "#999")
      .style("stroke-width", d => d.target.data.score ? 2 + d.target.data.score * 6 : 2);

    // Draw nodes
    const node = g.selectAll(".node")
      .data(hierarchy.descendants())
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", d => isHorizontal 
        ? `translate(${d.y}, ${d.x})`
        : `translate(${d.x}, ${d.y})`
      );

    // Add circles for nodes
    node.append("circle")
      .attr("class", "node-circle") // Use CSS class
      // DYNAMIC attributes/styles (based on data) must stay
      .attr("r", d => d.data.score ? 8 + d.data.score * 12 : 18)
      .style("fill", d => d.data.score ? d3.interpolateViridis(d.data.score) : "steelblue")
      .on("mouseover", function(event, d) {
        if (d.data.score) {
          d3.select(this)
            .transition()
            .duration(200)
            // DYNAMIC attribute
            .attr("r", d.data.score ? 12 + d.data.score * 16 : 22);

          const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip"); // Use CSS class
          
          tooltip.html(`
            <strong>${d.data.name}</strong><br/>
            <span class="tooltip-score">Association Score: ${d.data.score.toFixed(3)}</span><br/>
            <span class="tooltip-id">Disease ID: ${d.data.diseaseId}</span>
          `)
            // DYNAMIC styles (based on mouse position) must stay
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 15) + "px");
        }
      })
      .on("mouseout", function(event, d) {
        if (d.data.score) {
          d3.select(this)
            .transition()
            .duration(200)
            // DYNAMIC attribute
            .attr("r", d.data.score ? 8 + d.data.score * 12 : 18);
        }
        d3.selectAll(".tooltip").remove();
      });

    // Add text labels
    node.append("text")
      .attr("class", "node-label") // Use CSS class
      // DYNAMIC attributes (based on data) must stay
      .attr("dy", d => d.children ? -25 : (isHorizontal ? 5 : 30))
      .attr("x", d => {
        if (isHorizontal) {
          return d.children ? 0 : 15;
        }
        return 0;
      })
      .attr("y", d => {
        if (!isHorizontal && d.children) {
          return -25;
        }
        return 0;
      })
      // DYNAMIC styles (based on data) must stay
      .style("text-anchor", d => {
        if (isHorizontal) {
          return d.children ? "middle" : "start";
        }
        return "middle";
      })
      .style("font-size", d => d.children ? "16px" : "13px")
      .style("fill", d => d.children ? "#2c3e50" : "#34495e")
      .text(d => d.data.name);

    // Add score badges
    node.filter(d => d.data.score)
      .append("text")
      .attr("class", "score-badge") // Use CSS class
      // DYNAMIC attributes/styles (based on data) must stay
      .attr("dy", isHorizontal ? -8 : -25)
      .attr("x", isHorizontal ? 15 : 0)
      .style("text-anchor", isHorizontal ? "start" : "middle")
      .style("fill", d => d.data.score > 0.7 ? "#27ae60" : d.data.score > 0.4 ? "#f39c12" : "#e74c3c")
      .text(d => `Score: ${d.data.score.toFixed(2)}`);

    // Add title
    svg.append("text")
      .attr("x", svgWidth / 2) // DYNAMIC attribute
      .attr("y", 25)
      .attr("class", "chart-title") // Use CSS class
      .text(`${selectedKinase} → Disease Associations`);

    // Render legend
    const legendItems = [
      { label: "High (≥0.7)", color: d3.interpolateViridis(0.85) },
      { label: "Medium (0.4-0.7)", color: d3.interpolateViridis(0.55) },
      { label: "Low (<0.4)", color: d3.interpolateViridis(0.25) }
    ];

    const legendContainer = d3.select('#legend-items');
    legendContainer.selectAll('*').remove();
    legendItems.forEach(item => {
      const row = legendContainer.append('div').attr('class', 'legend-row'); // Use CSS class
      row.append('div')
         .attr('class', 'legend-swatch') // Use CSS class
         .style('background', item.color); // DYNAMIC style must stay
      row.append('div')
         .attr('class', 'legend-label') // Use CSS class
         .text(item.label);
    });

  }, [selectedKinase, layout, associations, height, isHorizontal, svgWidth]); // Added missing dependencies

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center w-full page-container">
        <div className="mb-6 flex gap-4 items-center bg-gray-50 p-4 rounded-lg shadow w-full max-w-6xl">
          <div>
            <label className="mr-2 font-medium text-gray-700">Select Kinase:</label>
            <select 
              value={selectedKinase} 
              onChange={(e) => setSelectedKinase(e.target.value)}
              className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              {kinases.map(kinase => (
                <option key={kinase} value={kinase}>{kinase}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mr-2 font-medium text-gray-700">Layout:</label>
            <select 
              value={layout} 
              onChange={(e) => setLayout(e.target.value)}
              className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
          </div>
        </div>

        <div className="chart-legend-wrapper">
          <div 
            ref={ref} 
            className="overflow-auto border rounded-lg shadow-lg bg-white chart-container" 
            // DYNAMIC style (based on variable) must stay
            style={{ minWidth: svgWidth }}
          ></div>
          
          <div 
            id="legend-column" 
            className="legend-column"
            // DYNAMIC style (based on variable) must stay
            style={{ width: legendWidth }}
          >
            <h4 className="legend-title">Association Strength</h4>
            <div id="legend-items"></div>
            <div className="legend-tip">
              <strong>Tip:</strong> hover nodes for details.
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default TreeHierarchyView;