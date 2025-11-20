import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import "./KinaseTissue.css";

const KinaseTissue = () => {
    const [selectedTissue, setSelectedTissue] = useState("");
    const [tissueImages, setTissueImages] = useState([]);
    const [loading, setLoading] = useState(false);

    // Define the 4 tissue image folders
    const imageFolders = [
        'tissue_centric_barcharts_svg',
        'tissue_centric_data',
        'tissue_centric_heatmaps_svg',
        'tissue_centric_svg_plots'
    ];

    // Extract unique tissue names from file names
    const getAvailableTissues = () => {
        // Sample tissue names based on the file structure
        return [
            'breast',
            'esophagusmucosa',
            'esophagusmuscularis',
            'heart',
            'lung',
            'prostate',
            'skeletalmuscle',
            'skin'
        ];
    };

    const tissues = getAvailableTissues();

    // Get actual available images for selected tissue
    const getTissueImages = (tissueName) => {
        if (!tissueName) return [];

        const images = [];

        // Define actual cell types available for each tissue based on real file structure
        const tissueSpecificCellTypes = {
            'breast': ['Adipocyte', 'Endothelial_cell', 'Epithelial_cell', 'Fibroblast', 'Immune_myeloid', 'Muscle'],
            'esophagusmucosa': ['Endothelial_cell', 'Epithelial_cell', 'Fibroblast', 'Glia', 'Immune_lymphocyte', 'Immune_myeloid', 'Muscle', 'Stromal'],
            'esophagusmuscularis': ['Adipocyte', 'Endothelial_cell', 'Fibroblast', 'Glia', 'Immune_lymphocyte', 'Immune_myeloid', 'Muscle', 'Neuron'],
            'heart': ['Adipocyte', 'Endothelial_cell', 'Fibroblast', 'Glia', 'Immune_lymphocyte', 'Immune_myeloid', 'Muscle'],
            'lung': ['Endothelial_cell', 'Epithelial_cell', 'Fibroblast', 'Immune_lymphocyte', 'Immune_myeloid', 'Muscle'],
            'prostate': ['Endothelial_cell', 'Epithelial_cell', 'Fibroblast', 'Glia', 'Immune_lymphocyte', 'Immune_myeloid', 'Muscle'],
            'skeletalmuscle': ['Adipocyte', 'Endothelial_cell', 'Fibroblast', 'Glia', 'Immune_lymphocyte', 'Immune_myeloid', 'Muscle'],
            'skin': ['Adipocyte', 'Endothelial_cell', 'Epithelial_cell', 'Epithelial_cell_keratinocyte', 'Fibroblast', 'Immune_lymphocyte', 'Immune_myeloid', 'Melanocyte', 'Muscle', 'Other']
        };

        const availableCellTypes = tissueSpecificCellTypes[tissueName] || [];

        // Only add images that actually exist
        availableCellTypes.forEach(cellType => {
            // Barchart images
            images.push({
                folder: 'tissue_centric_barcharts_svg',
                filename: `${tissueName}_${cellType}_barchart.svg`,
                title: `${tissueName} - ${cellType} Barchart`,
                type: 'Barchart'
            });

            // Heatmap images
            images.push({
                folder: 'tissue_centric_heatmaps_svg',
                filename: `${tissueName}_${cellType}_heatmap.svg`,
                title: `${tissueName} - ${cellType} Heatmap`,
                type: 'Heatmap'
            });
        });

        return images;
    };

    useEffect(() => {
        if (selectedTissue) {
            setLoading(true);
            const images = getTissueImages(selectedTissue);
            setTissueImages(images);
            setLoading(false);
        } else {
            setTissueImages([]);
        }
    }, [selectedTissue]);

    // Set first tissue as default
    useEffect(() => {
        if (tissues.length > 0 && !selectedTissue) {
            setSelectedTissue(tissues[0]);
        }
    }, []);

    return (
        <>
            <Navbar />
            <div className="kt-container">
                <div className="kt-topbar">
                    <div>
                        <label className="kt-label">Select Tissue:</label>
                        <select
                            value={selectedTissue}
                            onChange={(e) => setSelectedTissue(e.target.value)}
                            className="kt-select"
                        >
                            {tissues.map((tissue) => (
                                <option key={tissue} value={tissue}>
                                    {tissue.charAt(0).toUpperCase() + tissue.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="kt-content-area">
                    {loading && (
                        <div className="kt-loading">Loading tissue images...</div>
                    )}

                    {selectedTissue && !loading && (
                        <div className="kt-images-container">
                            <h2 className="kt-tissue-title">
                                {selectedTissue.charAt(0).toUpperCase() + selectedTissue.slice(1)} Tissue Analysis
                            </h2>

                            <div className="kt-images-grid">
                                {tissueImages.map((image, index) => (
                                    <div key={index} className="kt-image-item">
                                        <div className="kt-image-header">
                                            <h4>{image.title}</h4>
                                            <span className="kt-image-type">{image.type}</span>
                                        </div>
                                        <div className="kt-image-wrapper">
                                            <img
                                                src={`/${image.folder}/${image.filename}`}
                                                alt={image.title}
                                                className="kt-tissue-image"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'block';
                                                }}
                                                onLoad={(e) => {
                                                    e.target.style.display = 'block';
                                                    e.target.nextSibling.style.display = 'none';
                                                }}
                                            />
                                            <div className="kt-image-placeholder" style={{ display: 'none' }}>
                                                Image not available
                                            </div>
                                        </div>
                                        <div className="kt-download-link">
                                            <a
                                                href={`/${image.folder}/${image.filename}`}
                                                download={image.filename}
                                                className="kt-download-btn"
                                            >
                                                📥 Download
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default KinaseTissue;