const { getUserEmail, isAdminEmail } = require("./_admin");
const { json } = require("./_security");

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
