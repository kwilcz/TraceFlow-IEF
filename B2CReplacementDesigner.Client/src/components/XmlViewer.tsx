// src/components/XmlViewer.tsx
"use client";

import React from 'react';

interface XmlViewerProps {
    xmlContent: string;
}

const XmlViewer: React.FC<XmlViewerProps> = ({xmlContent}) => {
    return <div>XML Viewer (Placeholder): {xmlContent}</div>;
};

export default XmlViewer;