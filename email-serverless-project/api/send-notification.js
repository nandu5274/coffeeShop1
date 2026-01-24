import SibApiV3Sdk from "sib-api-v3-sdk";

export default async function handler(req, res) {

  /* ======================
     ✅ CORS HEADERS
  ====================== */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { recipient, msgBody, subject } = req.body;

    /* ======================
       ✅ VALIDATION (AS PER PAYLOAD)
    ====================== */
    if (!recipient || !msgBody || !subject) {
      return res.status(400).json({
        error: "Missing required fields: recipient, msgBody, subject"
      });
    }

    if (!process.env.BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY is missing");
    }

    /* ======================
       ✅ BREVO CONFIG
    ====================== */
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications["api-key"].apiKey =
      process.env.BREVO_API_KEY;

    const apiInstance =
      new SibApiV3Sdk.TransactionalEmailsApi();

    /* ======================
       ✉️ SEND OTP EMAIL
    ====================== */
    await apiInstance.sendTransacEmail({
      sender: {
        email: "cafekubera2223@gmail.com",
        name: "Cafe Kubera"
      },
      to: [{ email: recipient }],
      subject,
      htmlContent: `
        <pre style="
          font-family: Arial, sans-serif;
          font-size: 14px;
          white-space: pre-wrap;
        ">
${msgBody}
        </pre>
      `
    });

    return res.status(200).json({
      success: true,
      message: "OTP email sent successfully"
    });

  } catch (err) {
    console.error("OTP EMAIL ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal Server Error"
    });
  }
}
