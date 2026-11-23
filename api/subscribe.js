// Adds a mailing list sign-up to MailerLite.
// Needs two environment variables set in Vercel (never put these in the code):
//   MAILERLITE_API_KEY   - API token from MailerLite (Integrations > API)
//   MAILERLITE_GROUP_ID  - ID of the "Studio mailing list" group
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  // Hidden "website" field: real people leave it empty, bots tend to fill it in.
  if (body.website) return res.status(200).json({ ok: true });

  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const key = process.env.MAILERLITE_API_KEY;
  const group = process.env.MAILERLITE_GROUP_ID;
  if (!key || !group) {
    console.error("MailerLite environment variables are not set");
    return res.status(500).json({ error: "Sign-up isn't available right now. Please try again later." });
  }

  try {
    const r = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({ email, groups: [group] })
    });
    if (r.ok) return res.status(200).json({ ok: true });
    if (r.status === 422) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    console.error("MailerLite error", r.status, await r.text());
  } catch (err) {
    console.error("MailerLite request failed", err);
  }
  return res.status(502).json({ error: "Something went wrong. Please try again in a moment." });
};
