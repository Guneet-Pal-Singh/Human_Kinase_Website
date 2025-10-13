import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Navbar from "./Navbar";

// Sample data structure
const sampleData = [
  { kinase: "CDK1", disease: "Cancer", diseaseId: "DOID:162", score: 0.9 },
  { kinase: "CDK1", disease: "Alzheimer's Disease", diseaseId: "DOID:10652", score: 0.7 },
  { kinase: "CDK1", disease: "Parkinson's Disease", diseaseId: "DOID:14330", score: 0.6 },
  { kinase: "CDK1", disease: "Diabetes Mellitus", diseaseId: "DOID:9351", score: 0.5 },
  { kinase: "CDK1", disease: "Heart Disease", diseaseId: "DOID:114", score: 0.8 },
  { kinase: "CDK1", disease: "Stroke", diseaseId: "DOID:6713", score: 0.4 },
  { kinase: "CDK1", disease: "Obesity", diseaseId: "DOID:9970", score: 0.3 },
  { kinase: "CDK1", disease: "Hypertension", diseaseId: "DOID:10763", score: 0.65 },
  { kinase: "CDK1", disease: "Arthritis", diseaseId: "DOID:848", score: 0.55 },
  { kinase: "CDK1", disease: "Cancer", diseaseId: "DOID:162", score: 0.9 },
  { kinase: "CDK1", disease: "Alzheimer's Disease", diseaseId: "DOID:10652", score: 0.7 },
  { kinase: "CDK1", disease: "Parkinson's Disease", diseaseId: "DOID:14330", score: 0.6 },
  { kinase: "CDK1", disease: "Diabetes Mellitus", diseaseId: "DOID:9351", score: 0.5 },
  { kinase: "CDK1", disease: "Heart Disease", diseaseId: "DOID:114", score: 0.8 },
  { kinase: "CDK1", disease: "Stroke", diseaseId: "DOID:6713", score: 0.4 },
  { kinase: "CDK1", disease: "Obesity", diseaseId: "DOID:9970", score: 0.3 },
  { kinase: "CDK1", disease: "Hypertension", diseaseId: "DOID:10763", score: 0.65 },
  { kinase: "CDK1", disease: "Arthritis", diseaseId: "DOID:848", score: 0.55 },
  { kinase: "CDK1", disease: "Depression", diseaseId: "DOID:1596", score: 0.45 },
  { kinase: "CDK1", disease: "Cancer", diseaseId: "DOID:162", score: 0.9 },
  { kinase: "CDK1", disease: "Alzheimer's Disease", diseaseId: "DOID:10652", score: 0.7 },
  { kinase: "CDK1", disease: "Parkinson's Disease", diseaseId: "DOID:14330", score: 0.6 },
  { kinase: "CDK1", disease: "Diabetes Mellitus", diseaseId: "DOID:9351", score: 0.5 },
  { kinase: "CDK1", disease: "Heart Disease", diseaseId: "DOID:114", score: 0.8 },
  { kinase: "CDK1", disease: "Stroke", diseaseId: "DOID:6713", score: 0.4 },
  { kinase: "CDK1", disease: "Obesity", diseaseId: "DOID:9970", score: 0.3 },
  { kinase: "CDK1", disease: "Hypertension", diseaseId: "DOID:10763", score: 0.65 },
  { kinase: "CDK1", disease: "Arthritis", diseaseId: "DOID:848", score: 0.55 },
  { kinase: "CDK1", disease: "Cancer", diseaseId: "DOID:162", score: 0.9 },
  { kinase: "CDK1", disease: "Alzheimer's Disease", diseaseId: "DOID:10652", score: 0.7 },
  { kinase: "CDK1", disease: "Parkinson's Disease", diseaseId: "DOID:14330", score: 0.6 },
  { kinase: "CDK1", disease: "Diabetes Mellitus", diseaseId: "DOID:9351", score: 0.5 },
  { kinase: "CDK1", disease: "Heart Disease", diseaseId: "DOID:114", score: 0.8 },
  { kinase: "CDK1", disease: "Stroke", diseaseId: "DOID:6713", score: 0.4 },
  { kinase: "CDK1", disease: "Obesity", diseaseId: "DOID:9970", score: 0.3 },
  { kinase: "CDK1", disease: "Hypertension", diseaseId: "DOID:10763", score: 0.65 },
  { kinase: "CDK1", disease: "Arthritis", diseaseId: "DOID:848", score: 0.55 },
  { kinase: "MAPK1", disease: "Cancer", diseaseId: "DOID:162", score: 0.8 },
  { kinase: "MAPK1", disease: "Diabetes Mellitus", diseaseId: "DOID:9351", score: 0.6 },
  { kinase: "MAPK1", disease: "Heart Disease", diseaseId: "DOID:114", score: 0.5 },
  { kinase: "MAPK1", disease: "Hypertension", diseaseId: "DOID:10763", score: 0.7 },
  { kinase: "MAPK1", disease: "Arthritis", diseaseId: "DOID:848", score: 0.4 },
  { kinase: "MAPK1", disease: "Depression", diseaseId: "DOID:1596", score: 0.3 },
  { kinase: "AKT1", disease: "Cancer", diseaseId: "DOID:162", score: 0.95 },
  { kinase: "AKT1", disease: "Heart Disease", diseaseId: "DOID:114", score: 0.8 },
  { kinase: "AKT1", disease: "Obesity", diseaseId: "DOID:9970", score: 0.4 },
  { kinase: "AKT1", disease: "Diabetes Mellitus", diseaseId: "DOID:9351", score: 0.85 },
  { kinase: "AKT1", disease: "Alzheimer's Disease", diseaseId: "DOID:10652", score: 0.6 },
  { kinase: "PIK3CA", disease: "Cancer", diseaseId: "DOID:162", score: 0.85 },
  { kinase: "PIK3CA", disease: "Diabetes Mellitus", diseaseId: "DOID:9351", score: 0.7 },
  { kinase: "PIK3CA", disease: "Obesity", diseaseId: "DOID:9970", score: 0.5 },
  { kinase: "EGFR", disease: "Cancer", diseaseId: "DOID:162", score: 0.92 },
  { kinase: "EGFR", disease: "Alzheimer's Disease", diseaseId: "DOID:10652", score: 0.3 },
];

const TreeHierarchyView = ({ associations = sampleData }) => {
  const ref = useRef();
  const [selectedKinase, setSelectedKinase] = useState("CDK1");
  const [layout, setLayout] = useState("horizontal");

  // Layout constants (must be outside useEffect for JSX usage)
  const legendWidth = 340;
  const isHorizontal = layout === "horizontal";
  const margin = { top: 40, right: 20, bottom: 40, left: 40 };
  const nodeHeight = 50;
  // Sort disease nodes by score descending
  const filteredData = associations
    .filter(d => d.kinase === selectedKinase)
    .sort((a, b) => b.score - a.score);
  const height = Math.max(500, (filteredData.length + 1) * nodeHeight + margin.top + margin.bottom);
  const width = isHorizontal ? 1200 : 1000; // Slightly decrease horizontal width
  const svgWidth = Math.max(800, width - legendWidth); // Slightly decrease svg width

  const kinases = Array.from(new Set(associations.map(d => d.kinase)));

  useEffect(() => {
    d3.select(ref.current).selectAll("*").remove();

    // we'll render the main visualization into the svg container element
    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", height)
      .style("background", "white");

    // Create hierarchy
    const root = {
      name: selectedKinase,
      children: filteredData.map(d => ({
        name: d.disease,
        score: d.score,
        diseaseId: d.diseaseId
      }))
    };

    // Slightly decrease the spread to shorten node lines
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

    // Draw links with gradient based on score
    const defs = svg.append("defs");
    
    g.selectAll(".link")
      .data(hierarchy.links())
      .enter().append("path")
      .attr("class", "link")
      .attr("d", isHorizontal 
        ? d3.linkHorizontal().x(d => d.y).y(d => d.x)
        : d3.linkVertical().x(d => d.x).y(d => d.y)
      )
      .style("fill", "none")
      .style("stroke", d => d.target.data.score ? d3.interpolateViridis(d.target.data.score) : "#999")
      .style("stroke-width", d => d.target.data.score ? 2 + d.target.data.score * 6 : 2)
      .style("opacity", 0.7);

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
      .attr("r", d => d.data.score ? 8 + d.data.score * 12 : 18)
      .style("fill", d => d.data.score ? d3.interpolateViridis(d.data.score) : "steelblue")
      .style("stroke", "white")
      .style("stroke-width", 3)
      .style("filter", "drop-shadow(0px 2px 4px rgba(0,0,0,0.3))")
      .on("mouseover", function(event, d) {
        if (d.data.score) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", d.data.score ? 12 + d.data.score * 16 : 22);

          const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0,0,0,0.9)")
            .style("color", "white")
            .style("padding", "12px")
            .style("border-radius", "6px")
            .style("font-size", "13px")
            .style("pointer-events", "none")
            .style("box-shadow", "0 4px 6px rgba(0,0,0,0.3)")
            .style("z-index", "1000");
          
          tooltip.html(`
            <strong>${d.data.name}</strong><br/>
            <span style="color: #ffd700;">Association Score: ${d.data.score.toFixed(3)}</span><br/>
            <span style="color: #87ceeb;">Disease ID: ${d.data.diseaseId}</span>
          `)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 15) + "px");
        }
      })
      .on("mouseout", function(event, d) {
        if (d.data.score) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("r", d.data.score ? 8 + d.data.score * 12 : 18);
        }
        d3.selectAll(".tooltip").remove();
      });

    // Add text labels with better positioning
    node.append("text")
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
      .style("text-anchor", d => {
        if (isHorizontal) {
          return d.children ? "middle" : "start";
        }
        return "middle";
      })
      .style("font-size", d => d.children ? "16px" : "13px")
      .style("font-weight", "bold")
      .style("fill", d => d.children ? "#2c3e50" : "#34495e")
      .style("paint-order", "stroke")
      .style("stroke", "white")
      .style("stroke-width", "3px")
      .style("stroke-linecap", "round")
      .style("stroke-linejoin", "round")
      .text(d => d.data.name);

    // Add score badges for disease nodes
    node.filter(d => d.data.score)
      .append("text")
      .attr("dy", isHorizontal ? -8 : -25)
      .attr("x", isHorizontal ? 15 : 0)
      .style("text-anchor", isHorizontal ? "start" : "middle")
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .style("fill", d => d.data.score > 0.7 ? "#27ae60" : d.data.score > 0.4 ? "#f39c12" : "#e74c3c")
      .style("paint-order", "stroke")
      .style("stroke", "white")
      .style("stroke-width", "2px")
      .text(d => `Score: ${d.data.score.toFixed(2)}`);

    // Add title (position based on svgWidth)
    svg.append("text")
      .attr("x", svgWidth / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "#2c3e50")
      .text(`${selectedKinase} → Disease Associations`);

    // Render legend into the right column (outside the SVG)
    const legendItems = [
      { label: "High (≥0.7)", color: d3.interpolateViridis(0.85) },
      { label: "Medium (0.4-0.7)", color: d3.interpolateViridis(0.55) },
      { label: "Low (<0.4)", color: d3.interpolateViridis(0.25) }
    ];

    const legendContainer = d3.select('#legend-items');
    legendContainer.selectAll('*').remove();
    legendItems.forEach(item => {
      const row = legendContainer.append('div').style('display', 'flex').style('align-items', 'center').style('margin-bottom', '10px');
      row.append('div').style('width', '18px').style('height', '18px').style('border-radius', '9px').style('background', item.color).style('margin-right', '8px').style('box-shadow', 'inset 0 0 0 2px rgba(255,255,255,0.6)');
      row.append('div').style('font-size', '13px').text(item.label);
    });

  }, [selectedKinase, layout, associations]);

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center w-full" style={{ padding: 24 }}>
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

        <div style={{ display: 'flex', gap: 0, width: '100%', maxWidth: '1400px', overflowX: 'auto' }}>
          <div ref={ref} className="overflow-auto border rounded-lg shadow-lg bg-white" style={{ flex: 1, minHeight: 520, minWidth: svgWidth, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: '1px solid rgba(0,0,0,0.06)' }}></div>
          <div id="legend-column" style={{ width: legendWidth, background: '#fff', borderRadius: 8, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.06)', marginLeft: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', borderLeft: '1px solid rgba(0,0,0,0.06)' }}>
            <h4 style={{ marginTop: 0, marginBottom: 8, color: '#2c3e50' }}>Association Strength</h4>
            <div id="legend-items" style={{ marginTop: 4 }}></div>
            <div style={{ marginTop: 12, fontSize: 13, color: '#555' }}>
              <strong>Tip:</strong> hover nodes for details.
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default TreeHierarchyView;