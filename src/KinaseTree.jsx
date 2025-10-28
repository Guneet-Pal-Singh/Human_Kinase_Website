import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { base_url, extension_urls, kinase_disease_lookup_uniprot } from "../config/urls";

// Props: kinaseId (string)
const KinaseTree = ({ kinaseId }) => {
  const ref = useRef();
  const [diseaseData, setDiseaseData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Layout constants
  const legendWidth = 340;
  const isHorizontal = true;
  const margin = { top: 40, right: 20, bottom: 40, left: 40 };
  const nodeHeight = 50;
  const height = Math.max(500, (diseaseData.length + 1) * nodeHeight + margin.top + margin.bottom);
  const width = isHorizontal ? 1200 : 1000;
  const svgWidth = Math.max(800, width - legendWidth);

  useEffect(() => {
    if (!kinaseId) return;
    setLoading(true);
    setError(null);
    fetch(`${base_url}${extension_urls}${kinase_disease_lookup_uniprot}${encodeURIComponent(kinaseId)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.results && Array.isArray(data.results[0]?.rows)) {
          // Sort diseases by score descending
          const sortedRows = [...data.results[0].rows].sort((a, b) => parseFloat(b.Score) - parseFloat(a.Score));
          setDiseaseData(sortedRows);
        } else {
          setDiseaseData([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch disease associations");
        setDiseaseData([]);
        setLoading(false);
      });
  }, [kinaseId]);

  useEffect(() => {
    d3.select(ref.current).selectAll("*").remove();
    if (!kinaseId || diseaseData.length === 0) return;
    // Render tree
    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", height)
      .style("background", "white");

    // Create hierarchy for selected kinase
    const root = {
      name: kinaseId,
      children: diseaseData.map(d => ({
        id: d.Disease_ID || "Unknown Disease",
        name: d.Disease_ID || "Unknown Disease", // node label is Disease_ID
        diseaseName: d.Disease_Name || d.Disease || "Unknown Disease Name", // for tooltip
        score: parseFloat(d.Score),
        datasource: d.Datasource_Scores
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
            <strong>Disease Name: ${d.data.diseaseName}</strong><br/>
            <span style="color: #ffd700;">Score: ${d.data.score?.toFixed(3)}</span><br/>
            <span style="color: #e0e0e0;">Disease ID: ${d.data.id}</span><br/>
            <span style="color: #e0e0e0;">Data Sources: ${d.data.datasource}</span>
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

    node.append("text")
      .attr("x", d => d.children ? -30 : (isHorizontal ? 15 : 0))
      .attr("y", d => d.children ? 40 : (isHorizontal ? 5 : 30))
      .attr("text-anchor", d => d.children ? "start" : (isHorizontal ? "start" : "middle"))
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", d => d.children ? "#2c3e50" : "#34495e")
      .style("paint-order", "stroke")
      .style("stroke", "white")
      .style("stroke-width", "3px")
      .style("stroke-linecap", "round")
      .style("stroke-linejoin", "round")
      .each(function(d) {
        if (d.children) {
          const words = d.data.name.split(' ');
          let line = [];
          let lineLength = 0;
          const maxChars = 28;
          let lines = [];
          words.forEach(word => {
            if (lineLength + word.length + 1 > maxChars) {
              lines.push(line.join(' '));
              line = [word];
              lineLength = word.length;
            } else {
              line.push(word);
              lineLength += word.length + 1;
            }
          });
          if (line.length) lines.push(line.join(' '));
          d3.select(this).selectAll('tspan').remove();
          lines.forEach((l, i) => {
            d3.select(this)
              .append('tspan')
              .attr('x', -30)
              .attr('dy', i === 0 ? '0' : '1.2em')
              .text(l);
          });
        } else {
          // Show Disease_ID on node label
          d3.select(this).text(d.data.id || d.data.name);
        }
      });

    // Add title
    svg.append("text")
      .attr("x", svgWidth / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "#2c3e50")
      .text(`${kinaseId} → Disease Associations`);

    // Render legend into the right column (outside the SVG)
    const legendItems = [
      { label: "High (≥0.7)", color: d3.interpolateViridis(0.85) },
      { label: "Medium (0.4-0.7)", color: d3.interpolateViridis(0.55) },
      { label: "Low (<0.4)", color: d3.interpolateViridis(0.25) }
    ];
    const legendContainer = d3.select(ref.current.parentNode).select("#legend-items-kinase");
    legendContainer.selectAll('*').remove();
    legendItems.forEach(item => {
      const row = legendContainer.append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('margin-bottom', '10px');
      row.append('div')
        .style('width', '18px')
        .style('height', '18px')
        .style('border-radius', '9px')
        .style('background', item.color)
        .style('margin-right', '8px')
        .style('box-shadow', 'inset 0 0 0 2px rgba(255,255,255,0.6)');
      row.append('div')
        .style('font-size', '13px')
        .text(item.label);
    });
  }, [kinaseId, diseaseData]);

  return (
    <div style={{ display: 'flex', width: '100%', maxWidth: '1400px', overflowX: 'auto', marginTop: 32 }}>
      <div ref={ref} className="overflow-auto" style={{ flex: 1, minWidth: svgWidth, borderRadius: 12, borderRight: '1px solid rgba(0,0,0,0.06)' }}></div>
      <div id="legend-column-kinase" style={{ width: legendWidth, background: '#fff', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
        <h4 style={{ marginTop: 0, marginBottom: 8, color: '#2c3e50' }}>Association Strength</h4>
        <div id="legend-items-kinase" style={{ marginTop: 4 }}></div>
        <div style={{ marginTop: 12, fontSize: 13, color: '#555' }}>
          <strong>Tip:</strong> hover nodes for details.
        </div>
      </div>
    </div>
  );
};

export default KinaseTree;
