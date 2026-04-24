"use client";

import { useEffect, useRef, useState } from "react";

export function UploadDropzone({
  selectedLabel,
  onSelect
}: {
  selectedLabel?: string;
  onSelect?: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>(
    selectedLabel ?? "Upload lecture files, PDFs, slides, or recordings"
  );

  useEffect(() => {
    setFileName(selectedLabel ?? "Upload lecture files, PDFs, slides, or recordings");
  }, [selectedLabel]);

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="group w-full rounded-[2rem] border border-dashed border-white/20 bg-white/5 p-8 text-left transition hover:border-tide/60 hover:bg-white/10"
    >
      <input
        ref={inputRef}
        hidden
        type="file"
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          setFileName(nextFile?.name ?? selectedLabel ?? fileName);
          onSelect?.(nextFile);
        }}
      />
      <p className="text-xs uppercase tracking-[0.35em] text-gold">Upload Workspace</p>
      <h3 className="mt-3 text-2xl font-semibold text-white">Drag files here or browse your course pack.</h3>
      <p className="mt-3 text-sm text-slate-300">{selectedLabel ?? fileName}</p>
    </button>
  );
}
