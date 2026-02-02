import { useState, useRef, useCallback } from "react";
import { uploadFiles, UploadResult } from "../services/api";

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error";

/**
 * Upload Page Component
 *
 * Allows users to upload PDF/DOCX files for processing.
 */
function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const validFiles = Array.from(selectedFiles).filter((file) => {
        const ext = file.name.toLowerCase();
        return ext.endsWith(".pdf") || ext.endsWith(".docx");
      });

      setFiles((prev) => [...prev, ...validFiles]);
      setResult(null);
      setStatus("idle");
    },
    []
  );

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    e.target.value = ""; // Reset input
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Remove a file from the list
  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload files
  const handleUpload = async () => {
    if (files.length === 0) return;

    setStatus("uploading");
    setResult(null);

    try {
      setStatus("processing");
      const uploadResult = await uploadFiles(files);
      setResult(uploadResult);
      setStatus(uploadResult.success ? "success" : "error");

      // Clear files on success
      if (uploadResult.success) {
        setFiles([]);
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      });
      setStatus("error");
    }
  };

  // Click handler for upload zone
  const handleZoneClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <div className="card">
        <h2>Upload Documents</h2>

        {/* Upload zone */}
        <div
          className={`upload-zone ${dragOver ? "dragover" : ""}`}
          onClick={handleZoneClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            multiple
            onChange={handleInputChange}
          />
          <div>
            <strong>Drop files here or click to browse</strong>
            <p>Supports PDF and DOCX files (max 20MB each)</p>
          </div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="file-list">
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <span>
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
                <button onClick={() => removeFile(index)} title="Remove file">
                  X
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        <div style={{ marginTop: "1rem" }}>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={files.length === 0 || status === "processing"}
          >
            {status === "processing" ? (
              <>
                <span className="spinner" /> Processing...
              </>
            ) : (
              `Upload ${files.length} file${files.length !== 1 ? "s" : ""}`
            )}
          </button>
        </div>

        {/* Status message */}
        {status === "processing" && (
          <div className="status processing">
            Processing documents... This may take a minute for large files.
          </div>
        )}

        {status === "success" && result?.data && (
          <div className="status success">
            <strong>Success!</strong> Processed {result.data.files_successful} of{" "}
            {result.data.files_processed} files. Extracted{" "}
            {result.data.total_entities_extracted} entities.
          </div>
        )}

        {status === "error" && (
          <div className="status error">
            <strong>Error:</strong> {result?.error || "Upload failed"}
          </div>
        )}
      </div>

      {/* Results details */}
      {result?.data?.results && result.data.results.length > 0 && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h2>Processing Results</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Status</th>
                  <th>Entities</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {result.data.results.map((r, i) => (
                  <tr key={i}>
                    <td>{r.filename}</td>
                    <td>
                      <span
                        style={{
                          color: r.success
                            ? "var(--color-success)"
                            : "var(--color-error)",
                        }}
                      >
                        {r.success ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td>{r.entities_count}</td>
                    <td>{r.error || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadPage;
