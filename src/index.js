export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", service: "BTMedya Worker" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // CORS headers (adjust as needed)
    const headers = {
      "Content-Type": "text/html;charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // Simple response
    return new Response(`<html><body><h1>BTMedya Worker</h1><p>Çalışıyor ✅</p></body></html>`, {
      status: 200,
      headers
    });
  }
};
