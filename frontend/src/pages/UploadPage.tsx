import { useState, useRef, useCallback } from "react";
import { uploadFiles, UploadResult } from "../services/api";

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error";

const MAX_FILES = 10;

/**
 * Upload Page Component
 *
 * Allows users to upload up to 5 PDF/DOCX files (resumes) for processing.
 */
function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processingFile, setProcessingFile] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection with 5 file limit
  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const validFiles = Array.from(selectedFiles).filter((file) => {
        const ext = file.name.toLowerCase();
        return ext.endsWith(".pdf") || ext.endsWith(".docx");
      });

      // Check limit
      const remainingSlots = MAX_FILES - files.length;
      if (remainingSlots <= 0) {
        alert(`Maximum ${MAX_FILES} files allowed. Please remove some files first.`);
        return;
      }

      const filesToAdd = validFiles.slice(0, remainingSlots);
      if (validFiles.length > remainingSlots) {
        alert(`Only ${remainingSlots} more file(s) can be added. ${validFiles.length - remainingSlots} file(s) were skipped.`);
      }

      setFiles((prev) => [...prev, ...filesToAdd]);
      setResult(null);
      setStatus("idle");
    },
    [files.length]
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

  // Clear all files
  const clearAllFiles = () => {
    setFiles([]);
    setResult(null);
    setStatus("idle");
  };

  // Upload files
  const handleUpload = async () => {
    if (files.length === 0) return;

    setStatus("uploading");
    setResult(null);
    setProcessingFile(`Uploading ${files.length} file(s)...`);

    try {
      setStatus("processing");
      setProcessingFile("Processing with AI... This may take 1-2 minutes.");

      const uploadResult = await uploadFiles(files);
      setResult(uploadResult);
      setStatus(uploadResult.success ? "success" : "error");
      setProcessingFile("");

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
      setProcessingFile("");
    }
  };

  // Click handler for upload zone
  const handleZoneClick = () => {
    fileInputRef.current?.click();
  };

  const canAddMore = files.length < MAX_FILES;

  return (
    <div>
      <div className="card">
        <h2>Upload Resumes</h2>
        <p style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>
          Upload up to {MAX_FILES} PDF or DOCX resumes at a time for AI-powered data extraction.
        </p>

        {/* Upload zone */}
        <div
          className={`upload-zone ${dragOver ? "dragover" : ""} ${!canAddMore ? "disabled" : ""}`}
          onClick={canAddMore ? handleZoneClick : undefined}
          onDragOver={canAddMore ? handleDragOver : undefined}
          onDragLeave={handleDragLeave}
          onDrop={canAddMore ? handleDrop : undefined}
          style={{ opacity: canAddMore ? 1 : 0.5, cursor: canAddMore ? "pointer" : "not-allowed" }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            multiple
            onChange={handleInputChange}
            disabled={!canAddMore}
          />
          <div>
            <strong>
              {canAddMore
                ? "Drop files here or click to browse"
                : `Maximum ${MAX_FILES} files reached`}
            </strong>
            <p>
              {canAddMore
                ? `Supports PDF and DOCX files (${files.length}/${MAX_FILES} selected)`
                : "Remove files to add more"}
            </p>
          </div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
              <strong>{files.length} of {MAX_FILES} files selected</strong>
              <button
                className="btn btn-secondary"
                onClick={clearAllFiles}
                style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem" }}
              >
                Clear All
              </button>
            </div>
            <div className="file-list">
              {files.map((file, index) => (
                <div key={index} className="file-item">
                  <span>
                    <strong>{index + 1}.</strong> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                  <button onClick={() => removeFile(index)} title="Remove file">
                    X
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Upload button */}
        <div style={{ marginTop: "1rem" }}>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={files.length === 0 || status === "processing" || status === "uploading"}
            style={{ padding: "0.75rem 2rem", fontSize: "1rem" }}
          >
            {status === "processing" || status === "uploading" ? (
              <>
                <span className="spinner" /> Processing...
              </>
            ) : (
              `Extract Data from ${files.length} Resume${files.length !== 1 ? "s" : ""}`
            )}
          </button>
        </div>

        {/* Status message */}
        {(status === "processing" || status === "uploading") && (
          <div className="status processing">
            <strong>{processingFile}</strong>
            <br />
            <small>AI is extracting contact information, skills, and experience from your resumes.</small>
          </div>
        )}

        {status === "success" && result?.data && (
          <div className="status success">
            <strong>Success!</strong> Processed {result.data.files_successful} of{" "}
            {result.data.files_processed} files. Extracted{" "}
            {result.data.total_entities_extracted} contact record(s).
            <br />
            <small>View extracted data in the Records tab.</small>
          </div>
        )}

        {status === "error" && (
          <div className="status error">
            <strong>Error:</strong> {result?.error || "Upload failed"}
            <br />
            <small>Please try again or check if the files are valid PDF/DOCX documents.</small>
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
                  <th>#</th>
                  <th>File</th>
                  <th>Status</th>
                  <th>Contacts Found</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {result.data.results.map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{r.filename}</td>
                    <td>
                      <span
                        style={{
                          color: r.success
                            ? "var(--color-success)"
                            : "var(--color-error)",
                          fontWeight: "bold",
                        }}
                      >
                        {r.success ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td>{r.entities_count}</td>
                    <td style={{ color: r.error ? "var(--color-error)" : "inherit" }}>
                      {r.error || (r.success ? "Data extracted successfully" : "-")}
                    </td>
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
