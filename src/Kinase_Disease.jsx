import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Navbar from "./Navbar";
import {base_url, extension_urls, get_disease_list, kinase_disease_lookup_disease} from "../config/urls";

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
  const height = Math.max(500, (kinaseData.length + 1) * nodeHeight + margin.top + margin.bottom);
  const width = isHorizontal ? 1200 : 1000;
  const svgWidth = Math.max(800, width - legendWidth);

  // Fetch diseases from API
  useEffect(() => {
    fetch(`${base_url}${extension_urls}${get_disease_list}`)
      .then(res => res.json())
      .then(data => {
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
    fetch(`${base_url}${extension_urls}${kinase_disease_lookup_disease}${encodeURIComponent(selectedDisease)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.results && data.results.length > 0 && Array.isArray(data.results[0].rows)) {
          // Sort kinases by score descending
          const sortedRows = [...data.results[0].rows].sort((a, b) => parseFloat(b.Score) - parseFloat(a.Score));
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
    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", height)
      .style("background", "white");

    // Create hierarchy for selected disease
    const root = {
      name: selectedDisease,
      children: kinaseData.map(d => ({
        name: d.UniProt,
        score: parseFloat(d.Score),
        ensembl: d.Ensembl,
        uniprot: d.UniProt,
        datasource: d.Datasource_Scores
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
            <strong>Kinase: ${d.data.name}</strong><br/>
            <span style="color: #ffd700;">Score: ${d.data.score?.toFixed(3)}</span><br/>
            <span style="color: #87ceeb;">Ensembl: ${d.data.ensembl}</span><br/>
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

    // Add text labels with better positioning and always show full disease name for root node
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
        // Only wrap for root node
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
          d3.select(this).text(d.data.name);
        }
      });

    // (Score badges removed; score now only shown in tooltip)

    // Add title (position based on svgWidth)
    svg.append("text")
      .attr("x", svgWidth / 2)
      .attr("y", 25)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "#2c3e50")
      // .text(`${selectedDisease} → Kinase Associations`);

    // Render legend into the right column (outside the SVG)
    const legendItems = [
      { label: "High (≥0.7)", color: d3.interpolateViridis(0.85) },
      { label: "Medium (0.4-0.7)", color: d3.interpolateViridis(0.55) },
      { label: "Low (<0.4)", color: d3.interpolateViridis(0.25) }
    ];

    const legendContainer = d3.select('#legend-items');
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

  }, [selectedDisease, kinaseData]);

  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center w-full" style={{ padding: 24 }}>
        <div className="mb-6 flex gap-4 items-center bg-gray-50 p-4 rounded-lg shadow w-full max-w-6xl">
          <div>
            <label className="mr-2 font-medium text-gray-700">Select Disease:</label>
            <select 
              value={selectedDisease} 
              onChange={(e) => setSelectedDisease(e.target.value)}
              className="border-2 border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              disabled={!Array.isArray(diseases) || diseases.length === 0}
            >
              {Array.isArray(diseases) && diseases.length > 0 ? (
                diseases.map(disease => (
                  <option key={disease} value={disease}>{disease}</option>
                ))
              ) : (
                <option value="">No diseases found</option>
              )}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', width: '100%', maxWidth: '1400px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)', minHeight: 520 }}>
            <div ref={ref} className="overflow-auto" style={{ flex: 1, minWidth: svgWidth, borderRadius: 12, borderRight: '1px solid rgba(0,0,0,0.06)' }}></div>
            <div id="legend-column" style={{ width: legendWidth, background: '#fff', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              <h4 style={{ marginTop: 0, marginBottom: 8, color: '#2c3e50' }}>Association Strength</h4>
              <div id="legend-items" style={{ marginTop: 4 }}></div>
              <div style={{ marginTop: 12, fontSize: 13, color: '#555' }}>
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