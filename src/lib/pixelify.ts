export const PIXEL_PROMPT =
  "Convert this car photo into retro 16-bit pixel art: chunky visible pixels, limited vibrant palette, crisp hard edges, clean simple background, side-scroller video game sprite style. Keep the car's shape, colors and details recognizable.";

function buildForm(file: File, streaming: boolean) {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("prompt", PIXEL_PROMPT);
  if (!streaming) fd.append("stream", "false");
  return fd;
}

/**
 * Streams a pixel-art edit of the given image. Calls onFrame with data URLs
 * (partial previews first, then the final image).
 */
export async function pixelifyImage(
  file: File,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
): Promise<void> {
  const res = await fetch("/api/edit-image", { method: "POST", body: buildForm(file, true) });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(errorMessage(res.status, text));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let events = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data) as {
            type?: string;
            b64_json?: string;
            data?: Array<{ b64_json?: string }>;
          };
          const b64 = parsed.b64_json ?? parsed.data?.[0]?.b64_json;
          if (!b64) continue;
          events++;
          onFrame(`data:image/png;base64,${b64}`, Boolean(parsed.type?.includes("completed")));
        } catch {
          /* ignore non-JSON frames */
        }
      }
    }
  }

  if (events === 0) {
    // Zero-event stream: replay once without streaming.
    const retry = await fetch("/api/edit-image", {
      method: "POST",
      body: buildForm(file, false),
    });
    const text = await retry.text();
    if (!retry.ok) throw new Error(errorMessage(retry.status, text));
    const json = JSON.parse(text) as { data?: Array<{ b64_json?: string }> };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image was returned. Please try again.");
    onFrame(`data:image/png;base64,${b64}`, true);
  }
}

function errorMessage(status: number, body: string) {
  if (status === 429) return "Too many requests right now — wait a moment and try again.";
  if (status === 402) return "AI credits are exhausted. Add credits to keep generating.";
  if (status === 403) return "AI access is blocked for this workspace.";
  return body || `Generation failed (${status}).`;
}
