import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/edit-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const form = await request.formData();
        form.set("model", "openai/gpt-image-2");
        const streaming = form.get("stream") !== "false";
        if (streaming) {
          form.set("stream", "true");
          form.set("partial_images", "1");
        } else {
          form.delete("stream");
          form.delete("partial_images");
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/edits", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: form,
        });
        if (!upstream.ok || !upstream.body) {
          return new Response(await upstream.text(), { status: upstream.status });
        }
        if (!streaming) {
          return new Response(upstream.body, {
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(upstream.body, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
