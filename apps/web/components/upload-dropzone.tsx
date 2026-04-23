"use client";

import { useRef, useState } from "react";

export function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>("Upload lecture files, PDFs, slides, or recordings");

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
        onChange={(event) => setFileName(event.target.files?.[0]?.name ?? fileName)}
      />
      <p className="text-xs uppercase tracking-[0.35em] text-gold">Upload Workspace</p>
      <h3 className="mt-3 text-2xl font-semibold text-white">Drag files here or browse your course pack.</h3>
      <p className="mt-3 text-sm text-slate-300">{fileName}</p>
    </button>
  );
}

