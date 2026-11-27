export type FonnteMode = "ok" | "status-false" | "http-500" | "invalid-json" | "network-drop";

export type FonnteStubController = {
  port: number;
  sendUrl: string;
  controlUrl: string;
  stop: () => void;
};

const syntheticPhonePattern = /^(?:120255501\d{2}|6280000\d{5,8})$/;

export function startFonnteStub(port = 0): FonnteStubController {
  let mode: FonnteMode = "ok";
  const messages = new Map<string, string[]>();

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port,
    async fetch(request) {
      const url = new URL(request.url);

      if (url.pathname === "/__test/mode" && request.method === "POST") {
        const body: unknown = await request.json().catch(() => null);
        if (
          body &&
          typeof body === "object" &&
          "mode" in body &&
          typeof body.mode === "string" &&
          ["ok", "status-false", "http-500", "invalid-json", "network-drop"].includes(body.mode)
        ) {
          mode = body.mode as FonnteMode;
          return Response.json({ mode });
        }
        return Response.json({ error: "invalid mode" }, { status: 400 });
      }

      if (url.pathname === "/__test/reset" && request.method === "POST") {
        mode = "ok";
        messages.clear();
        return Response.json({ ok: true });
      }

      if (url.pathname === "/messages" && request.method === "GET") {
        const target = url.searchParams.get("target") ?? "";
        const list = messages.get(target) ?? [];
        return Response.json({ message: list.at(-1) ?? null, messages: list });
      }

      if (url.pathname !== "/send" || request.method !== "POST") {
        return new Response(null, { status: 404 });
      }

      if (mode === "network-drop") {
        return new Response(null, { status: 503 });
      }

      if (request.headers.get("Authorization") !== "vektor-e2e") {
        return Response.json({ status: false }, { status: 401 });
      }

      if (mode === "http-500") {
        return Response.json({ status: false, reason: "simulated server error" }, { status: 500 });
      }
      if (mode === "invalid-json") {
        return new Response("<html>502 Bad Gateway</html>", { status: 200 });
      }
      if (mode === "status-false") {
        return Response.json({ status: false, reason: "simulated device offline" }, { status: 200 });
      }

      const form = await request.formData();
      const target = form.get("target");
      const message = form.get("message");
      if (
        typeof target !== "string" ||
        !syntheticPhonePattern.test(target) ||
        typeof message !== "string" ||
        form.get("countryCode") !== "0"
      ) {
        return Response.json({ status: false });
      }

      const history = messages.get(target) ?? [];
      history.push(message);
      messages.set(target, history);
      return Response.json({ status: true, detail: "success! message in queue" });
    },
  });

  const boundPort = server.port ?? port;
  return {
    port: boundPort,
    sendUrl: `http://127.0.0.1:${boundPort}/send`,
    controlUrl: `http://127.0.0.1:${boundPort}`,
    stop: () => server.stop(true),
  };
}
