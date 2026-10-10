import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { getT } from '../utils/i18n.js';
import {
  Upload,
  FileText,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FileUp,
  Eye,
  Sparkles,
} from 'lucide-react';
import { MedicalDocument, DocumentType } from '../types/index.js';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal.js';
import { DocumentSummaryModal } from '../components/DocumentSummaryModal.js';

export const DocumentsPage: React.FC = () => {
  const { language } = useAuth();
  const t = getT(language);
  const [searchParams, setSearchParams] = useSearchParams();

  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [summaryModalDoc, setSummaryModalDoc] = useState<MedicalDocument | null>(null);

  // Upload Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>('lab_report');
  const [docDate, setDocDate] = useState<string>('');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Delete modal state
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<MedicalDocument | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewInitialPage, setPreviewInitialPage] = useState<number>(1);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const res = await api.get('/documents', { params });
      if (res.data.success) {
        setDocuments(res.data.documents);
      }
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [search, statusFilter, typeFilter]);

  // Check for ?preview=<docId>&page=<pageNum> query parameters
  useEffect(() => {
    const previewId = searchParams.get('preview');
    if (!previewId) return;

    const pageParam = searchParams.get('page');
    if (pageParam) {
      const parsed = parseInt(pageParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        setPreviewInitialPage(parsed);
      }
    } else {
      setPreviewInitialPage(1);
    }

    // Try finding in current documents list first
    const existing = documents.find(
      (d) => d.id === previewId || (d as any)._id === previewId || d.originalName === previewId
    );
    if (existing) {
      setPreviewDoc(existing);
      return;
    }

    // If not in current list (e.g., initial render or filters applied), fetch document metadata directly
    let isCancelled = false;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(previewId);

    if (isObjectId) {
      api.get(`/documents/${previewId}`)
        .then((res) => {
          if (!isCancelled && res.data.success && res.data.document) {
            setPreviewDoc(res.data.document);
          }
        })
        .catch((err) => {
          console.error('Failed to load document for preview from query param:', err);
        });
    } else {
      api.get('/documents', { params: { search: previewId } })
        .then((res) => {
          if (!isCancelled && res.data.success && res.data.documents?.length > 0) {
            const matched = res.data.documents.find(
              (d: any) => d.originalName === previewId || d.id === previewId
            ) || res.data.documents[0];
            setPreviewDoc(matched);
          }
        })
        .catch((err) => {
          console.error('Failed to search document for preview:', err);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [searchParams, documents]);

  const handleClosePreview = () => {
    setPreviewDoc(null);
    setPreviewFile(null);
    if (searchParams.has('preview')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('preview');
      nextParams.delete('page');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    }
  };

  const handleFileSelect = (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Invalid file type. Only PDF, JPG, and PNG are allowed.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size exceeds the 15MB limit.');
      return;
    }
    setSelectedFile(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadError(null);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('documentType', docType);
    if (docDate) formData.append('documentDate', docDate);

    try {
      setUploadProgress(50);
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadProgress(100);
      if (res.data.success) {
        setUploadSuccess('Document uploaded successfully and queued for processing!');
        setSelectedFile(null);
        setDocDate('');
        fetchDocuments();
      }
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(null), 1500);
    }
  };

  const handleDownload = async (docId: string, filename: string) => {
    try {
      const res = await api.get(`/documents/${docId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Unable to download document. Please try again.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDocId) return;
    try {
      await api.delete(`/documents/${deletingDocId}`);
      setDeletingDocId(null);
      fetchDocuments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete document');
    }
  };

  const handleReprocess = async (docId: string) => {
    try {
      await api.post(`/documents/${docId}/reprocess`);
      fetchDocuments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reprocess document');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Document Library</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Upload medical prescriptions, lab reports, and diagnostic summaries for automated OCR & structured extraction.
        </p>
      </div>

      {/* Upload Zone */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4 text-emerald-600" />
          {t.common.upload}
        </h2>

        {uploadError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-700 text-xs">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              selectedFile
                ? 'border-emerald-500 bg-emerald-50/30'
                : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50'
            }`}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />

            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <FileUp className="w-5 h-5" />
              </div>
              {selectedFile ? (
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-emerald-800">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewFile(selectedFile);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-300 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    Preview Selected File
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Drag and drop your medical report here, or <span className="text-emerald-600 font-semibold">browse</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Supports PDF, PNG, JPG (up to 15 MB)</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Document Category</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white outline-none"
              >
                <option value="lab_report">Laboratory Report</option>
                <option value="prescription">Prescription / Rx</option>
                <option value="diagnostic_report">Diagnostic Imaging / ECG</option>
                <option value="discharge_summary">Discharge Summary</option>
                <option value="other">Other Document</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Document Date (Optional)</label>
              <input
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Process Document
                  </>
                )}
              </button>
            </div>
          </div>

          {uploadProgress !== null && (
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search documents by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none"
          >
            <option value="">All Categories</option>
            <option value="lab_report">Lab Report</option>
            <option value="prescription">Prescription</option>
            <option value="diagnostic_report">Diagnostic Report</option>
            <option value="discharge_summary">Discharge Summary</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white outline-none"
          >
            <option value="">All Statuses</option>
            <option value="awaiting_review">Awaiting Review</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">{t.common.loading}</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No documents matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewInitialPage(1);
                            setPreviewDoc(doc);
                          }}
                          className="text-left font-medium text-slate-800 hover:text-emerald-700 hover:underline truncate max-w-[200px] sm:max-w-xs block cursor-pointer transition-colors"
                          title="Click to preview document"
                        >
                          {doc.originalName}
                        </button>
                        <p className="text-[10px] text-slate-400">{(doc.sizeBytes / 1024).toFixed(1)} KB • {doc.pageCount} page(s)</p>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 capitalize">
                      {doc.documentType.replace('_', ' ')}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {doc.documentDate
                        ? new Date(doc.documentDate).toLocaleDateString()
                        : new Date(doc.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-semibold text-[10px] capitalize ${
                          doc.processingStatus === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.processingStatus === 'awaiting_review'
                            ? 'bg-amber-100 text-amber-800'
                            : doc.processingStatus === 'processing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {doc.processingStatus.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSummaryModalDoc(doc)}
                        title="View AI Clinical Summary & Analysis"
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>AI Summary</span>
                      </button>

                      <button
                        onClick={() => {
                          setPreviewInitialPage(1);
                          setPreviewDoc(doc);
                        }}
                        title="Preview document"
                        className="p-1.5 text-slate-600 hover:text-emerald-700 rounded hover:bg-emerald-50 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      </button>

                      {doc.processingStatus === 'awaiting_review' && (
                        <Link
                          to={`/documents/review/${doc.id}`}
                          className="inline-block px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[11px]"
                        >
                          Review & Confirm
                        </Link>
                      )}

                      <button
                        onClick={() => handleDownload(doc.id, doc.originalName)}
                        title="Download securely"
                        className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleReprocess(doc.id)}
                        title="Reprocess OCR"
                        className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setDeletingDocId(doc.id)}
                        title="Delete document"
                        className="p-1.5 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingDocId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-slate-900 text-base">Confirm Document Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this document? This will remove the stored private file and all associated extracted observations and timeline records.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingDocId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                {t.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(previewDoc || previewFile)}
        onClose={handleClosePreview}
        document={previewDoc}
        file={previewFile}
        initialPage={previewInitialPage}
      />

      {/* Document AI Summary Modal */}
      <DocumentSummaryModal
        isOpen={Boolean(summaryModalDoc)}
        onClose={() => setSummaryModalDoc(null)}
        documentId={summaryModalDoc ? (summaryModalDoc.id || (summaryModalDoc as any)._id) : null}
        documentTitle={summaryModalDoc?.originalName || 'Medical Document'}
        initialLanguage={language}
      />
    </div>
  );
};
