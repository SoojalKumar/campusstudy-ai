"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";

export function UploadDropzone({
  selectedLabel,
  onSelect
}: {
  selectedLabel?: string;
  onSelect?: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>(
    selectedLabel ?? "Upload lecture files, PDFs, slides, or recordings"
  );

  useEffect(() => {
    setFileName(selectedLabel ?? "Upload lecture files, PDFs, slides, or recordings");
  }, [selectedLabel]);

  function applyFile(nextFile: File | null) {
    setFileName(nextFile?.name ?? selectedLabel ?? "Upload lecture files, PDFs, slides, or recordings");
    onSelect?.(nextFile);
  }

  function handleDragEvent(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragEnter={(event) => {
        handleDragEvent(event);
        setIsDragging(true);
      }}
      onDragOver={(event) => {
        handleDragEvent(event);
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        handleDragEvent(event);
        setIsDragging(false);
      }}
      onDrop={(event) => {
        handleDragEvent(event);
        setIsDragging(false);
        applyFile(event.dataTransfer.files?.[0] ?? null);
      }}
      className={`group w-full rounded-[2rem] border border-dashed p-8 text-left transition ${
        isDragging
          ? "border-tide bg-white/10 shadow-2xl shadow-cyan-950/20"
          : "border-white/20 bg-white/5 hover:border-tide/60 hover:bg-white/10"
      }`}
    >
      <input
        ref={inputRef}
        hidden
        type="file"
        onChange={(event) => {
          applyFile(event.target.files?.[0] ?? null);
        }}
      />
      <p className="text-xs uppercase tracking-[0.35em] text-gold">Upload Workspace</p>
      <h3 className="mt-3 text-2xl font-semibold text-white">
        {isDragging ? "Drop the file to queue processing." : "Drag files here or browse your course pack."}
      </h3>
      <p className="mt-3 text-sm text-slate-300">{selectedLabel ?? fileName}</p>
      <p className="mt-2 text-xs text-slate-500">
        Supports PDF, slides, docs, markdown, audio, and lecture video uploads.
      </p>
    </button>
  );
}
