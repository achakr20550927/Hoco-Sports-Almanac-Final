const { getUserEmail, isAdminEmail } = require("./_admin");
const { json, withErrorHandling } = require("./_security");

exports.handler = withErrorHandling(async (event, context) => {
  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  const email = await getUserEmail(event, context);
  return json(200, {
    email,
    isAdmin: isAdminEmail(email),
  });
});
