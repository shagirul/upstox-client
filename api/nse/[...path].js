const upstream = "https://www.nseindia.com";

export default async function handler(req, res) {
  const url = req.url || "";
  const [rawPath = "", rawSearch = ""] = url.split("?");
  const trimmedPath = rawPath.replace(/^\/api\/nse/, "") || "/";
  const search = rawSearch ? `?${rawSearch}` : "";
  const targetUrl = `${upstream}${trimmedPath}${search}`;

  const headers = new Headers();
  const forwardList = [
    "accept",
    "accept-language",
    "cache-control",
    "cookie",
    "pragma",
    "referer",
    "user-agent",
  ];

  forwardList.forEach((key) => {
    const value = req.headers[key];
    if (value) headers.set(key, value);
  });

  if (!headers.has("referer")) {
    headers.set("referer", "https://www.nseindia.com/");
  }
  if (!headers.has("user-agent")) {
    headers.set(
      "user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      redirect: "follow",
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "content-encoding") return;
      res.setHeader(key, value);
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    res
      .status(500)
      .json({ message: "NSE proxy failed", error: err?.message ?? String(err) });
  }
}
