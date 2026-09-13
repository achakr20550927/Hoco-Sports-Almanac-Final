const { publicAuthConfig } = require("./_auth");
const { json, withErrorHandling } = require("./_security");

exports.handler = withErrorHandling(async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  return json(200, publicAuthConfig());
});
