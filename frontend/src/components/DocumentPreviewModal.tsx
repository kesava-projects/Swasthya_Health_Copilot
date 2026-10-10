import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  FileText,
  FileImage,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import api from '../api/client.js';
import { MedicalDocument } from '../types/index.js';

export interface DocumentPreviewTarget {
  id?: string;
  originalName: string;
  mimeType?: string;
  sizeBytes?: number;
  documentType?: string;
  documentDate?: string;
  pageCount?: number;
  processingStatus?: string;
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document?: DocumentPreviewTarget | MedicalDocument | null;
  file?: File | null;
  initialPage?: number;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  file,
  initialPage = 1,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Image manipulation state
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load document / file data
  useEffect(() => {
    if (!isOpen) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    setLoading(true);
    setError(null);
    setZoom(1);
    setRotation(0);

    // If previewing a local unsaved file before upload
    if (file) {
      try {
        const url = URL.createObjectURL(file);
        setBlobUrl(url);
        setLoading(false);
      } catch (err: any) {
        setError('Failed to create local preview: ' + (err.message || 'Unknown error'));
        setLoading(false);
      }
      return;
    }

    // If previewing an uploaded document from backend
    if (doc?.id) {
      let isCancelled = false;
      let activeUrl: string | null = null;

      const fetchDocBlob = async () => {
        try {
          const res = await api.get(`/documents/${doc.id}/preview`, {
            responseType: 'blob',
          });
          if (isCancelled) return;
          const contentType = typeof res.headers['content-type'] === 'string'
            ? res.headers['content-type']
            : doc.mimeType || 'application/pdf';
          const url = URL.createObjectURL(new Blob([res.data], { type: contentType }));
          activeUrl = url;
          setBlobUrl(url);
          setLoading(false);
        } catch (err: any) {
          if (isCancelled) return;
          console.error('Failed to load document preview:', err);
          setError(
            err.response?.data?.error ||
              'Could not load document preview. You can try downloading it directly.'
          );
          setLoading(false);
        }
      };

      fetchDocBlob();

      return () => {
        isCancelled = true;
        if (activeUrl) {
          URL.revokeObjectURL(activeUrl);
        }
      };
    }
  }, [isOpen, doc?.id, file]);

  if (!isOpen) return null;

  const fileName = file?.name || doc?.originalName || 'Medical Document';
  const mimeType = (file?.type || doc?.mimeType || '').toLowerCase();
  const isPdf =
    mimeType.includes('pdf') ||
    fileName.toLowerCase().endsWith('.pdf');
  const isImage =
    mimeType.startsWith('image/') ||
    /\.(png|jpe?g|webp|bmp|gif)$/i.test(fileName);

  const handleDownload = () => {
    if (blobUrl) {
      const link = window.document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, +(z - 0.25).toFixed(2)));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 transition-all"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full rounded-none'
            : 'w-full max-w-5xl h-[92vh] max-h-[920px]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
              {isImage ? <FileImage className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate" title={fileName}>
                {fileName}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                {doc?.documentType && (
                  <span className="capitalize font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    {doc.documentType.replace('_', ' ')}
                  </span>
                )}
                {doc?.sizeBytes && (
                  <span>• {(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                )}
                {file?.size && (
                  <span>• {(file.size / 1024).toFixed(1)} KB (Selected)</span>
                )}
                {doc?.pageCount ? (
                  <span>• {doc.pageCount} page(s)</span>
                ) : null}
                {doc?.documentDate && (
                  <span>• {new Date(doc.documentDate).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isImage && (
              <div className="hidden sm:flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs mr-1">
                <button
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  disabled={zoom <= 0.4}
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 disabled:opacity-40"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono px-1.5 text-slate-600 min-w-[42px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  title="Zoom In"
                  disabled={zoom >= 3}
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 disabled:opacity-40"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRotate}
                  title="Rotate 90° Clockwise"
                  className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100 border-l border-slate-150 ml-0.5"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetZoom}
                  title="Reset View"
                  className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                >
                  Reset
                </button>
              </div>
            )}

            <button
              onClick={handleOpenInNewTab}
              title="Open in new window"
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/70 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              onClick={handleDownload}
              title="Download file"
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/70 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="hidden md:inline-flex p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/70 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              title="Close Preview (Esc)"
              className="p-2 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer Pane */}
        <div className="flex-1 bg-slate-900/90 relative flex items-center justify-center overflow-auto p-2">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-300 py-20">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-sm font-medium">Loading secure medical preview...</p>
            </div>
          )}

          {error && (
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-lg border border-rose-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Unable to Display Preview</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download File
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {!loading && !error && blobUrl && isPdf && (
            <div className="w-full h-full bg-slate-800 rounded-xl overflow-hidden flex flex-col shadow-inner">
              <iframe
                src={`${blobUrl}#page=${initialPage}&zoom=100`}
                title={fileName}
                className="w-full h-full border-none bg-slate-100"
              />
            </div>
          )}

          {!loading && !error && blobUrl && isImage && (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4 select-none">
              <div
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="origin-center max-w-full max-h-full flex items-center justify-center"
              >
                <img
                  src={blobUrl}
                  alt={fileName}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-slate-700/50 bg-white"
                />
              </div>
            </div>
          )}

          {!loading && !error && blobUrl && !isPdf && !isImage && (
            <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-xl text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">{fileName}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Preview is not available directly in browser for this format ({mimeType || 'unknown'}).
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download to View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
