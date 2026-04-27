"use client";

import { useState } from "react";

import { fetchSourceFile } from "@/lib/source-files";
import { useSession } from "@/lib/session";

function revokeLater(objectUrl: string) {
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export function SourceFileActions({
  downloadUrl,
  fileName
}: {
  downloadUrl: string | null | undefined;
  fileName: string;
}) {
  const { token } = useSession();
  const [status, setStatus] = useState<"idle" | "opening" | "downloading">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!downloadUrl) return null;

  async function openSource() {
    const targetWindow = window.open("about:blank", "_blank", "noreferrer");
    setStatus("opening");
    setError(null);
    try {
      const source = await fetchSourceFile({
        url: downloadUrl!,
        token,
        disposition: "inline",
        fallbackFileName: fileName
      });
      const objectUrl = URL.createObjectURL(source.blob);
      if (targetWindow) {
        targetWindow.location.href = objectUrl;
      } else {
        window.open(objectUrl, "_blank", "noreferrer");
      }
      revokeLater(objectUrl);
    } catch (error) {
      targetWindow?.close();
      setError(error instanceof Error ? error.message : "Could not open the source file.");
    } finally {
      setStatus("idle");
    }
  }

  async function downloadSource() {
    setStatus("downloading");
    setError(null);
    try {
      const source = await fetchSourceFile({
        url: downloadUrl!,
        token,
        disposition: "attachment",
        fallbackFileName: fileName
      });
      const objectUrl = URL.createObjectURL(source.blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = source.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      revokeLater(objectUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not download the source file.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={openSource}
        disabled={status !== "idle"}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "opening" ? "Opening source..." : "Open original source"}
      </button>
      <button
        type="button"
        onClick={downloadSource}
        disabled={status !== "idle"}
        className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "downloading" ? "Downloading..." : "Download file"}
      </button>
      {error ? <p className="basis-full text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}

export function SourceTimestampButton({
  downloadUrl,
  fileName,
  startSecond
}: {
  downloadUrl: string;
  fileName: string;
  startSecond: number;
}) {
  const { token } = useSession();
  const [isOpening, setIsOpening] = useState(false);

  async function openAtTimestamp() {
    const targetWindow = window.open("about:blank", "_blank", "noreferrer");
    setIsOpening(true);
    try {
      const source = await fetchSourceFile({
        url: downloadUrl,
        token,
        disposition: "inline",
        fallbackFileName: fileName
      });
      const objectUrl = URL.createObjectURL(source.blob);
      const timestampedUrl = `${objectUrl}#t=${startSecond}`;
      if (targetWindow) {
        targetWindow.location.href = timestampedUrl;
      } else {
        window.open(timestampedUrl, "_blank", "noreferrer");
      }
      revokeLater(objectUrl);
    } catch {
      targetWindow?.close();
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <button
      type="button"
      onClick={openAtTimestamp}
      disabled={isOpening}
      className="text-xs font-medium text-tide transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isOpening ? "Opening..." : "Open at timestamp"}
    </button>
  );
}
