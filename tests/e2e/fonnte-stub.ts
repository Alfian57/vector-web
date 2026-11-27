const messages = new Map<string, string>();

Bun.serve({
  hostname: "127.0.0.1",
  port: 18080,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/messages" && request.method === "GET") {
      return Response.json({ message: messages.get(url.searchParams.get("target") ?? "") ?? null });
    }
    if (url.pathname !== "/send" || request.method !== "POST") return new Response(null, { status: 404 });
    if (request.headers.get("Authorization") !== "vektor-e2e") return Response.json({ status: false }, { status: 401 });
    const form = await request.formData();
    const target = form.get("target");
    const message = form.get("message");
    if (
      typeof target !== "string" ||
      !/^120255501\d{2}$/.test(target) ||
      typeof message !== "string" ||
      form.get("countryCode") !== "0"
    )
      return Response.json({ status: false });
    messages.set(target, message);
    return Response.json({ status: true, detail: "success! message in queue" });
  },
});
