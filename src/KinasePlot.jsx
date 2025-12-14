import React, { useEffect, useRef, useState } from "react";

const KinasePlot = ({ geneName }) => {
    const [plotAvailability, setPlotAvailability] = useState({
        centricPlot: false,
        expressionPlot: false
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!geneName) {
            setLoading(false);
            return;
        }

        const checkPlotAvailability = async () => {
            setLoading(true);
            setError(null);

            try {
                const centricPlotPath = `/kinase_centric_plots_svg/${geneName}_plot.svg`;
                const expressionPlotPath = `/kinase_svg_plots/${geneName}_expression.svg`;

                const checkFile = async (path) => {
                    try {
                        const response = await fetch(path, { method: "HEAD" });
                        return response.ok;
                    } catch {
                        return false;
                    }
                };

                const [centricExists, expressionExists] = await Promise.all([
                    checkFile(centricPlotPath),
                    checkFile(expressionPlotPath)
                ]);

                setPlotAvailability({
                    centricPlot: centricExists,
                    expressionPlot: expressionExists
                });
            } catch (err) {
                setError("Failed to check plot availability");
            } finally {
                setLoading(false);
            }
        };

        checkPlotAvailability();
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

    if (!plotAvailability.centricPlot && !plotAvailability.expressionPlot) {
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
                {plotAvailability.centricPlot && (
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
                            <img
                                src={`/kinase_centric_plots_svg/${geneName}_plot.svg`}
                                alt={`${geneName} Centric Plot`}
                                style={{
                                    maxWidth: "100%",
                                    height: "auto",
                                    maxHeight: "clamp(260px, 45vw, 600px)"
                                }}
                                onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display = "block";
                                }}
                            />
                            <div style={{
                                display: "none",
                                color: "#dc2626",
                                padding: "clamp(10px, 2vw, 20px)",
                                ...responsiveText(12, 1.4, 16)
                            }}>
                                Failed to load centric plot
                            </div>
                        </div>
                    </div>
                )}

                {/* EXPRESSION PLOT */}
                {plotAvailability.expressionPlot && (
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
                            <img
                                src={`/kinase_svg_plots/${geneName}_expression.svg`}
                                alt={`${geneName} Expression Plot`}
                                style={{
                                    maxWidth: "100%",
                                    height: "auto",
                                    maxHeight: "clamp(260px, 45vw, 600px)"
                                }}
                                onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display = "block";
                                }}
                            />
                            <div style={{
                                display: "none",
                                color: "#dc2626",
                                padding: "clamp(10px, 2vw, 20px)",
                                ...responsiveText(12, 1.4, 16)
                            }}>
                                Failed to load expression plot
                            </div>
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
                    {plotAvailability.centricPlot && (
                        <a
                            href={`/kinase_centric_plots_svg/${geneName}_plot.svg`}
                            download={`${geneName}_plot.svg`}
                            style={{
                                color: "#2366a8",
                                textDecoration: "none",
                                fontWeight: 600,
                                padding: "clamp(6px, 1vw, 12px) clamp(12px, 2vw, 20px)",
                                border: "1px solid #2366a8",
                                borderRadius: 6,
                                background: "white",
                                transition: "0.2s",
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
                        </a>
                    )}

                    {plotAvailability.expressionPlot && (
                        <a
                            href={`/kinase_svg_plots/${geneName}_expression.svg`}
                            download={`${geneName}_expression.svg`}
                            style={{
                                color: "#2366a8",
                                textDecoration: "none",
                                fontWeight: 600,
                                padding: "clamp(6px, 1vw, 12px) clamp(12px, 2vw, 20px)",
                                border: "1px solid #2366a8",
                                borderRadius: 6,
                                background: "white",
                                transition: "0.2s",
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
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KinasePlot;
