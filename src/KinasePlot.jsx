import React, { useEffect, useRef, useState } from "react";

const KinasePlot = ({ geneName }) => {
    const [plotAvailability, setPlotAvailability] = useState({
        centricPlot: false,
        expressionPlot: false
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check if plots are available for the given gene name
    useEffect(() => {
        if (!geneName) {
            setLoading(false);
            return;
        }

        const checkPlotAvailability = async () => {
            setLoading(true);
            setError(null);

            try {
                // Construct file paths
                const centricPlotPath = `/kinase_centric_plots_svg/${geneName}_plot.svg`;
                const expressionPlotPath = `/kinase_svg_plots/${geneName}_expression.svg`;

                // Check if files exist by attempting to fetch them
                const checkFile = async (path) => {
                    try {
                        const response = await fetch(path, { method: 'HEAD' });
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
                setError('Failed to check plot availability');
                console.error('Error checking plot availability:', err);
            } finally {
                setLoading(false);
            }
        };

        checkPlotAvailability();
    }, [geneName]);

    if (!geneName) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#666',
                fontSize: '16px'
            }}>
                No gene name provided for plot display
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#2366a8',
                fontSize: '16px'
            }}>
                Loading plots for {geneName}...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#dc2626',
                fontSize: '16px'
            }}>
                {error}
            </div>
        );
    }

    if (!plotAvailability.centricPlot && !plotAvailability.expressionPlot) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#666',
                fontSize: '16px'
            }}>
                No plots available for gene: {geneName}
            </div>
        );
    }

    return (
        <div style={{
            background: 'white',
            borderRadius: 14,
            padding: 24,
            boxShadow: '0 2px 8px 0 rgba(35,102,168,0.06)',
            border: '1px solid #e3eaf1'
        }}>
            <h3 style={{
                color: '#1565a5',
                fontWeight: 700,
                fontSize: 20,
                marginBottom: 20,
                textAlign: 'center'
            }}>
                Kinase Plots for {geneName}
            </h3>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 30
            }}>

                {/* Kinase Centric Plot */}
                {plotAvailability.centricPlot && (
                    <div style={{
                        background: '#f4faff',
                        borderRadius: 10,
                        padding: 20,
                        border: '1px solid #e3f0ff'
                    }}>
                        <h4 style={{
                            color: '#1565a5',
                            fontWeight: 600,
                            fontSize: 16,
                            marginBottom: 15,
                            textAlign: 'center'
                        }}>
                            Kinase Centric Analysis
                        </h4>
                        <div style={{
                            textAlign: 'center',
                            background: 'white',
                            borderRadius: 8,
                            padding: 10,
                            border: '1px solid #e3eaf1'
                        }}>
                            <img
                                src={`/kinase_centric_plots_svg/${geneName}_plot.svg`}
                                alt={`${geneName} Centric Plot`}
                                style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    maxHeight: '500px'
                                }}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                }}
                            />
                            <div style={{
                                display: 'none',
                                color: '#dc2626',
                                padding: '20px',
                                fontSize: '14px'
                            }}>
                                Failed to load centric plot
                            </div>
                        </div>
                    </div>
                )}

                {/* Expression Plot */}
                {plotAvailability.expressionPlot && (
                    <div style={{
                        background: '#f4faff',
                        borderRadius: 10,
                        padding: 20,
                        border: '1px solid #e3f0ff'
                    }}>
                        <h4 style={{
                            color: '#1565a5',
                            fontWeight: 600,
                            fontSize: 16,
                            marginBottom: 15,
                            textAlign: 'center'
                        }}>
                            Expression Analysis
                        </h4>
                        <div style={{
                            textAlign: 'center',
                            background: 'white',
                            borderRadius: 8,
                            padding: 10,
                            border: '1px solid #e3eaf1'
                        }}>
                            <img
                                src={`/kinase_svg_plots/${geneName}_expression.svg`}
                                alt={`${geneName} Expression Plot`}
                                style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    maxHeight: '500px'
                                }}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                }}
                            />
                            <div style={{
                                display: 'none',
                                color: '#dc2626',
                                padding: '20px',
                                fontSize: '14px'
                            }}>
                                Failed to load expression plot
                            </div>
                        </div>
                    </div>
                )}

                {/* Download Links */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 20,
                    marginTop: 10
                }}>
                    {plotAvailability.centricPlot && (
                        <a
                            href={`/kinase_centric_plots_svg/${geneName}_plot.svg`}
                            download={`${geneName}_plot.svg`}
                            style={{
                                color: '#2366a8',
                                textDecoration: 'none',
                                fontWeight: 600,
                                fontSize: 14,
                                padding: '8px 16px',
                                border: '1px solid #2366a8',
                                borderRadius: 6,
                                background: 'white',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.background = '#2366a8';
                                e.target.style.color = 'white';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.background = 'white';
                                e.target.style.color = '#2366a8';
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
                                color: '#2366a8',
                                textDecoration: 'none',
                                fontWeight: 600,
                                fontSize: 14,
                                padding: '8px 16px',
                                border: '1px solid #2366a8',
                                borderRadius: 6,
                                background: 'white',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.background = '#2366a8';
                                e.target.style.color = 'white';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.background = 'white';
                                e.target.style.color = '#2366a8';
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