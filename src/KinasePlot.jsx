import React, { useEffect, useRef, useState } from "react";
import { base_url, extension_urls } from "../config/urls.js";
import Plot from "react-plotly.js";

const KinasePlot = ({ geneName }) => {
    const [plotData, setPlotData] = useState({
        centricPlot: null,
        expressionPlot: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!geneName) {
            setLoading(false);
            return;
        }

        const fetchPlotData = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`${base_url}${extension_urls}kinase-profile-json/${geneName}`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch plot data: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('Kinase Profile JSON:', data);

                // Transform the data into Plotly format
                if (data.data && Array.isArray(data.data)) {
                    // Create expression heatmap (tissue vs mean_expression)
                    const tissues = [...new Set(data.data.map(d => d.tissue))];
                    const cellTypes = [...new Set(data.data.map(d => d.cell_type))];

                    // Create matrix for heatmap
                    const heatmapZ = cellTypes.map(cellType =>
                        tissues.map(tissue => {
                            const record = data.data.find(d => d.tissue === tissue && d.cell_type === cellType);
                            return record ? parseFloat(record.mean_expression) : 0;
                        })
                    );

                    const expressionPlot = {
                        data: [{
                            z: heatmapZ,
                            x: tissues,
                            y: cellTypes,
                            type: 'heatmap',
                            colorscale: 'Viridis',
                            hovertemplate: 'Tissue: %{x}<br>Cell Type: %{y}<br>Mean Expression: %{z:.2f}<extra></extra>',
                            line: { color: '#fff', width: 2 }
                        }],
                        layout: {
                            title: 'Gene Expression Heatmap by Tissue and Cell Type',
                            xaxis: {
                                title: 'Tissue',
                                showgrid: true,
                                gridwidth: 2,
                                gridcolor: '#fff'
                            },
                            yaxis: {
                                title: 'Cell Type',
                                showgrid: true,
                                gridwidth: 2,
                                gridcolor: '#fff'
                            },
                            height: 600
                        }
                    };

                    // Create bubble chart (percentage expressing)
                    const bubbleData = data.data.map(d => ({
                        tissue: d.tissue,
                        cellType: d.cell_type,
                        meanExpression: parseFloat(d.mean_expression),
                        pctExpressing: parseFloat(d.pct_expressing)
                    }));

                    const centricPlot = {
                        data: [{
                            x: bubbleData.map(d => d.pctExpressing),
                            y: bubbleData.map(d => d.meanExpression),
                            mode: 'markers',
                            marker: {
                                size: bubbleData.map(d => Math.max(15, d.pctExpressing / 1.5)),
                                color: bubbleData.map(d => d.meanExpression),
                                colorscale: 'Plasma',
                                showscale: true,
                                colorbar: { title: 'Mean Expression' },
                                line: { width: 1, color: '#fff' }
                            },
                            text: bubbleData.map(d => `${d.tissue}<br>${d.cellType}<br>Mean Expr: ${d.meanExpression.toFixed(2)}<br>% Expressing: ${d.pctExpressing.toFixed(2)}%`),
                            hovertemplate: '%{text}<extra></extra>'
                        }],
                        layout: {
                            title: 'Expression Profile: Percent Expressing vs Mean Expression',
                            xaxis: { title: 'Percent Expressing (%)' },
                            yaxis: { title: 'Mean Expression Level' },
                            height: 500,
                            showlegend: false
                        }
                    };

                    setPlotData({
                        centricPlot: centricPlot,
                        expressionPlot: expressionPlot
                    });
                } else {
                    throw new Error('Invalid data format from API');
                }
            } catch (err) {
                setError(err.message || "Failed to load plot data");
                setPlotData({
                    centricPlot: null,
                    expressionPlot: null
                });
            } finally {
                setLoading(false);
            }
        };

        fetchPlotData();
    }, [geneName]);

    const responsiveText = (min, mid, max) => ({
        fontSize: `clamp(${min}px, ${mid}vw, ${max}px)`
    });

    if (!geneName) {
        return (
            <div style={{
                textAlign: "center",
                padding: "clamp(20px, 3vw, 40px)",
                color: "#666",
                ...responsiveText(14, 1.4, 18)
            }}>
                No gene name provided for plot display
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{
                textAlign: "center",
                padding: "clamp(20px, 3vw, 40px)",
                color: "#2366a8",
                ...responsiveText(14, 1.4, 18)
            }}>
                Loading plots for {geneName}...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                textAlign: "center",
                padding: "clamp(20px, 3vw, 40px)",
                color: "#dc2626",
                ...responsiveText(14, 1.4, 18)
            }}>
                {error}
            </div>
        );
    }

    if (!plotData.centricPlot && !plotData.expressionPlot) {
        return (
            <div style={{
                textAlign: "center",
                padding: "clamp(20px, 3vw, 40px)",
                color: "#666",
                ...responsiveText(14, 1.4, 18)
            }}>
                No plots available for gene: {geneName}
            </div>
        );
    }

    return (
        <div style={{
            background: "white",
            borderRadius: "14px",
            padding: "clamp(16px, 2vw, 28px)",
            boxShadow: "0 2px 8px rgba(35,102,168,0.06)",
            border: "1px solid #e3eaf1",
            maxWidth: "clamp(300px, 80vw, 1300px)",
            margin: "0 auto"
        }}>
            <h3 style={{
                color: "#1565a5",
                fontWeight: 700,
                marginBottom: "clamp(10px, 2vw, 20px)",
                textAlign: "center",
                ...responsiveText(18, 2, 26)
            }}>
                Kinase Plots for {geneName}
            </h3>

            <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "clamp(16px, 3vw, 32px)"
            }}>

                {/* CENTRIC PLOT */}
                {plotData.centricPlot && (
                    <div style={{
                        background: "#f4faff",
                        borderRadius: 10,
                        padding: "clamp(14px, 2vw, 24px)",
                        border: "1px solid #e3f0ff"
                    }}>
                        <h4 style={{
                            color: "#1565a5",
                            fontWeight: 600,
                            marginBottom: "clamp(10px, 1.5vw, 18px)",
                            textAlign: "center",
                            ...responsiveText(14, 1.6, 20)
                        }}>
                            Kinase Centric Analysis
                        </h4>

                        <div style={{
                            textAlign: "center",
                            background: "white",
                            borderRadius: 8,
                            padding: "clamp(8px, 1vw, 14px)",
                            border: "1px solid #e3eaf1"
                        }}>
                            <Plot
                                data={plotData.centricPlot.data}
                                layout={{
                                    ...plotData.centricPlot.layout,
                                    autosize: true,
                                    responsive: true,
                                }}
                                config={{
                                    responsive: true,
                                    displayModeBar: true,
                                    displaylogo: false,
                                }}
                                style={{ width: "100%", height: "100%" }}
                                useResizeHandler={true}
                            />
                        </div>
                    </div>
                )}

                {/* EXPRESSION PLOT */}
                {plotData.expressionPlot && (
                    <div style={{
                        background: "#f4faff",
                        borderRadius: 10,
                        padding: "clamp(14px, 2vw, 24px)",
                        border: "1px solid #e3f0ff"
                    }}>
                        <h4 style={{
                            color: "#1565a5",
                            fontWeight: 600,
                            marginBottom: "clamp(10px, 1.5vw, 18px)",
                            textAlign: "center",
                            ...responsiveText(14, 1.6, 20)
                        }}>
                            Expression Analysis
                        </h4>

                        <div style={{
                            textAlign: "center",
                            background: "white",
                            borderRadius: 8,
                            padding: "clamp(8px, 1vw, 14px)",
                            border: "1px solid #e3eaf1"
                        }}>
                            <Plot
                                data={plotData.expressionPlot.data}
                                layout={{
                                    ...plotData.expressionPlot.layout,
                                    autosize: true,
                                    responsive: true,
                                }}
                                config={{
                                    responsive: true,
                                    displayModeBar: true,
                                    displaylogo: false,
                                }}
                                style={{ width: "100%", height: "100%" }}
                                useResizeHandler={true}
                            />
                        </div>
                    </div>
                )}

                {/* DOWNLOAD LINKS */}
                <div style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "clamp(12px, 2vw, 24px)",
                    marginTop: "clamp(4px, 1vw, 10px)"
                }}>
                    {plotData.centricPlot && (
                        <button
                            onClick={() => {
                                const blob = new Blob([JSON.stringify(plotData.centricPlot)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${geneName}_centric_plot.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            style={{
                                color: "#2366a8",
                                textDecoration: "none",
                                fontWeight: 600,
                                padding: "clamp(6px, 1vw, 12px) clamp(12px, 2vw, 20px)",
                                border: "1px solid #2366a8",
                                borderRadius: 6,
                                background: "white",
                                transition: "0.2s",
                                cursor: "pointer",
                                ...responsiveText(12, 1.4, 16)
                            }}
                            onMouseOver={(e) => {
                                e.target.style.background = "#2366a8";
                                e.target.style.color = "white";
                            }}
                            onMouseOut={(e) => {
                                e.target.style.background = "white";
                                e.target.style.color = "#2366a8";
                            }}
                        >
                            📊 Download Centric Plot
                        </button>
                    )}

                    {plotData.expressionPlot && (
                        <button
                            onClick={() => {
                                const blob = new Blob([JSON.stringify(plotData.expressionPlot)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${geneName}_expression_plot.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            style={{
                                color: "#2366a8",
                                textDecoration: "none",
                                fontWeight: 600,
                                padding: "clamp(6px, 1vw, 12px) clamp(12px, 2vw, 20px)",
                                border: "1px solid #2366a8",
                                borderRadius: 6,
                                background: "white",
                                transition: "0.2s",
                                cursor: "pointer",
                                ...responsiveText(12, 1.4, 16)
                            }}
                            onMouseOver={(e) => {
                                e.target.style.background = "#2366a8";
                                e.target.style.color = "white";
                            }}
                            onMouseOut={(e) => {
                                e.target.style.background = "white";
                                e.target.style.color = "#2366a8";
                            }}
                        >
                            📈 Download Expression Plot
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KinasePlot;
