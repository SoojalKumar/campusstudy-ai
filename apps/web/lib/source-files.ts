"use client";

export type SourceDisposition = "inline" | "attachment";

export function withDisposition(url: string, disposition: SourceDisposition) {
  return `${url}${url.includes("?") ? "&" : "?"}disposition=${disposition}`;
}

function parseContentDispositionFileName(header: string | null) {
  if (!header) return null;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const quotedMatch = header.match(/filename="([^"]+)"/i);
  return quotedMatch?.[1] ?? null;
}

export async function fetchSourceFile({
  url,
  token,
  disposition,
  fallbackFileName
}: {
  url: string;
  token: string | null;
  disposition: SourceDisposition;
  fallbackFileName: string;
}) {
  const response = await fetch(withDisposition(url, disposition), {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(payload?.detail ?? "Could not load the source file.");
  }

  return {
    blob: await response.blob(),
    fileName: parseContentDispositionFileName(response.headers.get("content-disposition")) ?? fallbackFileName
  };
}

