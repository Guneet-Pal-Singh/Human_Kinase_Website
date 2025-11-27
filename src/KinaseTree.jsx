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
  const width = isHorizontal ? 1200 : 1000;
  const initialSvgWidth = Math.max(800, width - legendWidth);

  // baseline height; will grow if needed
  const defaultHeight = 700;

  useEffect(() => {
    if (!kinaseId) return;
    setLoading(true);
    setError(null);
    fetch(`${base_url}${extension_urls}${kinase_disease_lookup_uniprot}${encodeURIComponent(kinaseId)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.results && Array.isArray(data.results[0]?.rows)) {
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

    // Helper for wrapping lines (keeps existing behaviour)
    const wrapLines = (text = "", maxChars = 18) => {
      if (!text) return [""];
      const words = String(text).split(/\s+/);
      const lines = [];
      let line = [];
      let len = 0;
      for (const w of words) {
        if (len + w.length + (line.length > 0 ? 1 : 0) > maxChars) {
          if (line.length) lines.push(line.join(" "));
          line = [w];
          len = w.length;
        } else {
          line.push(w);
          len += (line.length > 1 ? 1 : 0) + w.length;
        }
      }
      if (line.length) lines.push(line.join(" "));
      return lines;
    };

    // Build root data
    const root = {
      name: kinaseId,
      children: diseaseData.map(d => ({
        id: d.Disease_ID || "Unknown Disease",
        name: d.Disease_Name || d.Disease || "Unknown Disease Name",
        diseaseName: d.Disease_Name || d.Disease || "Unknown Disease Name",
        score: parseFloat(d.Score),
        datasource: d.Datasource_Scores
      }))
    };

    // Estimate text metrics and available container width to prevent overflowing to the right
    // determine container available width (prefer parentNode client width)
    const parentNode = ref.current && ref.current.parentNode;
    const containerAvailable = (parentNode && parentNode.clientWidth) ? parentNode.clientWidth : window.innerWidth;
    // Reserve legendWidth and margins from available width
    const maxSvgAllowed = Math.max(600, containerAvailable - legendWidth - 80); // 80px for padding & scrollbar safety

    // initial svg width (cannot exceed maxSvgAllowed)
    let svgWidth = Math.min(initialSvgWidth, maxSvgAllowed);

    // tree area fraction (links area), rest reserved for labels
    const treeAreaFraction = 0.68;
    let treeAreaWidth = Math.floor(svgWidth * treeAreaFraction);
    let labelAreaWidth = svgWidth - treeAreaWidth - margin.left - margin.right;

    // We'll compute required label width from text lengths (approx)
    // approximate characters -> pixels
    const approxPxPerChar = 8;
    const maxLabelCharsObserved = (root.children || []).reduce((m, c) => {
      const longestLineLen = wrapLines(c.name, 40).reduce((a, b) => Math.max(a, b.length), 0);
      return Math.max(m, longestLineLen);
    }, 0);
    const estimatedLabelNeeded = Math.max(120, Math.ceil(maxLabelCharsObserved * approxPxPerChar) + 24);

    // If the label area is smaller than estimated need, try to enlarge svgWidth up to containerAvailable
    if (labelAreaWidth < estimatedLabelNeeded) {
      const extraNeeded = estimatedLabelNeeded - labelAreaWidth;
      svgWidth = Math.min(svgWidth + extraNeeded, maxSvgAllowed); // don't exceed allowed
      treeAreaWidth = Math.floor(svgWidth * treeAreaFraction);
      labelAreaWidth = svgWidth - treeAreaWidth - margin.left - margin.right;
    }

    // Now derive leaf wrapping width in characters dynamically to fit labelAreaWidth
    // Use some padding and approximate characters that can fit in labelAreaWidth
    const labelPaddingPx = 18;
    const availableLabelPx = Math.max(80, labelAreaWidth - labelPaddingPx);
    const computedLeafMaxChars = Math.max(8, Math.floor(availableLabelPx / approxPxPerChar));

    // Vertical spacing calculations (increase bottom padding to avoid clipping)
    const leafLinePx = 18;         // px per label text line
    const minGap = 36;             // minimal gap per leaf
    const spacingFactor = 1.4;     // spread factor to increase separation
    const extraBottomPadding = 80; // extra space below to avoid clipping

    // Compute per-leaf heights using computedLeafMaxChars
    const tempLeaves = (root.children || []).map(c => {
      const lines = wrapLines(c.name, computedLeafMaxChars);
      return { linesCount: Math.max(1, lines.length), text: c.name };
    });

    const perLeafHeight = tempLeaves.map(l => {
      const base = Math.max(minGap, l.linesCount * leafLinePx + 12);
      return base * spacingFactor;
    });
    const totalLeafHeight = perLeafHeight.reduce((a, b) => a + b, 0) || 1;

    // Decide svgHeight based on totalLeafHeight and defaultHeight, and add extra bottom padding
    let svgHeight = defaultHeight;
    const availableHeight = defaultHeight - margin.top - margin.bottom;
    if (totalLeafHeight + 60 > availableHeight) {
      svgHeight = margin.top + margin.bottom + totalLeafHeight + extraBottomPadding;
    }
    svgHeight = Math.max(svgHeight, 520);       // minimum
    svgHeight = Math.min(svgHeight, 3000);      // cap max

    // Build D3 tree with computed treeAreaWidth and svgHeight
    const treeLayout = d3.tree()
      .size(isHorizontal
        ? [svgHeight - margin.top - margin.bottom, treeAreaWidth]
        : [treeAreaWidth, svgHeight - margin.top - margin.bottom]
      )
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

    const hierarchy = d3.hierarchy(root);
    treeLayout(hierarchy);

    // Recompute leaves and assign vertical centers based on perLeafHeight
    const leaves = hierarchy.leaves();
    const leafHeights = leaves.map((leaf, i) => {
      // match by name to tempLeaves entry
      const name = leaf.data.name || "";
      const lc = tempLeaves.find(t => t.text === name);
      const lines = lc ? lc.linesCount : 1;
      const base = Math.max(minGap, lines * leafLinePx + 12);
      return base * spacingFactor;
    });

    // compute centers and map to available vertical space
    let centers = [];
    let cur = 0;
    for (let i = 0; i < leafHeights.length; i++) {
      cur += leafHeights[i] / 2;
      centers.push(cur);
      cur += leafHeights[i] / 2;
    }
    const totalNeeded = cur || 1;
    const verticalScale = (svgHeight - margin.top - margin.bottom) / totalNeeded;
    const leafCenters = centers.map(v => v * verticalScale);

    leaves.forEach((leaf, i) => { leaf.x = leafCenters[i]; });
    hierarchy.descendants().forEach(node => {
      if (!node.children || node.children.length === 0) return;
      const meanX = d3.mean(node.leaves(), l => l.x);
      node.x = meanX;
    });

    // Create SVG using final dimensions
    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight)
      .style("background", "white");

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
      .style("opacity", 0.9);

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
      .attr("r", d => d.data.score ? 8 + d.data.score * 12 : 14)
      .style("fill", d => d.data.score ? d3.interpolateViridis(d.data.score) : "steelblue")
      .style("stroke", "white")
      .style("stroke-width", 3)
      .style("filter", "drop-shadow(0px 2px 4px rgba(0,0,0,0.25))")
      .on("mouseover", function(event, d) {
        if (d.data.score) {
          d3.select(this).transition().duration(180).attr("r", d.data.score ? 12 + d.data.score * 16 : 20);
          const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0,0,0,0.9)")
            .style("color", "white")
            .style("padding", "10px")
            .style("border-radius", "6px")
            .style("font-size", "13px")
            .style("pointer-events", "none")
            .style("z-index", "1000");
          tooltip.html(`
            <strong>Disease Name: ${d.data.diseaseName}</strong><br/>
            <span style="color: #ffd700;">Score: ${d.data.score?.toFixed(3)}</span><br/>
            <span style="color: #e0e0e0;">Disease ID: ${d.data.id}</span><br/>
            <span style="color: #e0e0e0;">Data Sources: ${d.data.datasource}</span>
          `).style("left", (event.pageX + 12) + "px").style("top", (event.pageY - 12) + "px");
        }
      })
      .on("mouseout", function(event, d) {
        if (d.data.score) {
          d3.select(this).transition().duration(180).attr("r", d.data.score ? 8 + d.data.score * 12 : 14);
        }
        d3.selectAll(".tooltip").remove();
      });

    // Append wrapped text as tspans using computedLeafMaxChars so it fits label area
    node.append("text")
      .attr("x", d => d.children ? -30 : (isHorizontal ? 25 : 0))
      .attr("y", d => d.children ? 40 : (isHorizontal ? 5 : 30))
      .attr("text-anchor", d => d.children ? "start" : (isHorizontal ? "start" : "middle"))
      .style("font-size", d => d.children ? "18px" : "15px")
      .style("font-weight", d => d.children ? "700" : "600")
      .style("fill", d => d.children ? "#2c3e50" : "#34495e")
      .style("paint-order", "stroke")
      .style("stroke", "white")
      .style("stroke-width", "3px")
      .each(function(d) {
        d3.select(this).selectAll('tspan').remove();
        if (d.children) {
          const lines = wrapLines(d.data.name, 28);
          lines.forEach((l, i) => {
            d3.select(this).append('tspan')
              .attr('x', -30)
              .attr('dy', i === 0 ? '0' : '1.2em')
              .style('font-size', '18px')
              .text(l);
          });
        } else {
          const lines = wrapLines(d.data.name, computedLeafMaxChars);
          lines.forEach((l, i) => {
            d3.select(this).append('tspan')
              .attr('x', isHorizontal ? 25 : 0)
              .attr('dy', i === 0 ? '0' : '1.25em')
              .style('font-size', '15px')
              .text(l);
          });
        }
      });

    // Title
    svg.append("text")
      .attr("x", svgWidth / 2)
      .attr("y", 22)
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

    // Ensure container min width accounts for svg + legend but do not force excessive width
    try {
      const container = ref.current;
      if (container && container.style && parentNode) {
        // only set minWidth if svgWidth is less than available, else leave as is
        const desired = Math.min(svgWidth + legendWidth + 40, parentNode.clientWidth);
        parentNode.style.minWidth = `${desired}px`;
      }
    } catch (e) {
      // ignore
    }

  }, [kinaseId, diseaseData]);

  return (
    <div style={{ display: 'flex', width: '100%', maxWidth: '100%', overflowX: 'auto', marginTop: 32 }}>
      <div ref={ref} className="overflow-auto" style={{ flex: 1, minWidth: initialSvgWidth, borderRadius: 12, borderRight: '1px solid rgba(0,0,0,0.06)' }}></div>
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
