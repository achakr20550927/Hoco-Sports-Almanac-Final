const { getUserEmail, isAdminEmail } = require("./_admin");

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  const email = getUserEmail(event, context);
  return json(200, {
    email,
    isAdmin: isAdminEmail(email),
  });
};
