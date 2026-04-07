// api/[...path].js
export default async function handler(req, res) {
  try {
    const base = process.env.UPSTREAM_BASE_URL;
    if (!base) {
      return res.status(500).json({
        ok: false,
        error: "Missing UPSTREAM_BASE_URL env var",
      });
    }

    const pathParts = Array.isArray(req.query.path) ? req.query.path : [];
    const qs = new URLSearchParams(req.query);
    qs.delete("path"); // remove o parâmetro interno do catch-all

    const targetUrl =
      base.replace(/\/$/, "") +
      "/" +
      pathParts.map(encodeURIComponent).join("/") +
      (qs.toString() ? `?${qs.toString()}` : "");

    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        // repassa headers úteis
        "content-type": req.headers["content-type"] || "application/json",
        "user-agent": req.headers["user-agent"] || "mtx-proxy",
      },
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : JSON.stringify(req.body ?? {}),
    });

    const contentType = upstreamRes.headers.get("content-type") || "";
    res.status(upstreamRes.status);
    res.setHeader("content-type", contentType);

    if (contentType.includes("application/json")) {
      const data = await upstreamRes.json();
      return res.json(data);
    } else {
      const text = await upstreamRes.text();
      return res.send(text);
    }
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: e?.message || "Proxy error",
    });
  }
}
