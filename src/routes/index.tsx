import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { pixelifyImage } from "@/lib/pixelify";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PixelRide — Turn Your Car Photo Into Pixel Art" },
      {
        name: "description",
        content:
          "Upload a photo of your car and instantly turn it into retro 16-bit pixel art you can download and share.",
      },
      { property: "og:title", content: "PixelRide — Turn Your Car Photo Into Pixel Art" },
      {
        property: "og:description",
        content: "Upload a car photo and get a retro 16-bit pixel art version in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickFile(f: File | undefined | null) {
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setOriginal(URL.createObjectURL(f));
    setResult(null);
    setIsFinal(false);
    setError(null);
  }

  async function run() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setIsFinal(false);
    try {
      await pixelifyImage(file, (dataUrl, final) => {
        flushSync(() => {
          setResult(dataUrl);
          if (final) setIsFinal(true);
        });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-14">
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <p className="font-display text-xs text-accent">▲ PIXELRIDE ▲</p>
          <h1 className="font-display mt-6 text-2xl leading-relaxed sm:text-4xl">
            Turn your car into
            <span className="block text-primary">pixel art</span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-md text-sm">
            Upload a photo of your ride and get a retro 16-bit sprite version, ready to download.
          </p>
        </header>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <div
            className="pixel-frame arcade-glow bg-card flex min-h-72 cursor-pointer flex-col items-center justify-center gap-4 p-6 text-center"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pickFile(e.dataTransfer.files?.[0]);
            }}
          >
            {original ? (
              <img
                src={original}
                alt="Your uploaded car photo"
                className="max-h-64 w-full object-contain"
              />
            ) : (
              <>
                <p className="font-display text-sm">DROP CAR PHOTO</p>
                <p className="text-muted-foreground text-xs">or click to browse (JPG / PNG)</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>

          <div className="pixel-frame bg-card flex min-h-72 flex-col items-center justify-center gap-4 p-6 text-center">
            {result ? (
              <img
                src={result}
                alt="Pixel art version of your car"
                className={`pixelated max-h-64 w-full object-contain transition-[filter] duration-500 ${
                  isFinal ? "blur-0" : "blur-md"
                }`}
              />
            ) : (
              <p className="font-display text-muted-foreground text-xs leading-relaxed">
                {loading ? "PIXELATING..." : "PIXEL ART APPEARS HERE"}
              </p>
            )}
          </div>
        </section>

        {error && (
          <p className="text-destructive mt-6 text-center text-sm" role="alert">
            {error}
          </p>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button
            size="lg"
            disabled={!file || loading}
            onClick={run}
            className="font-display pixel-frame rounded-none text-xs"
          >
            {loading ? "WORKING..." : "PIXELATE IT"}
          </Button>
          {result && isFinal && (
            <Button
              size="lg"
              variant="secondary"
              asChild
              className="font-display pixel-frame rounded-none text-xs"
            >
              <a href={result} download="pixel-car.png">
                DOWNLOAD
              </a>
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
