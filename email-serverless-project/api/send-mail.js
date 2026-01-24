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
    const {
      to,
      subject,
      message,
      pdfBase64,   // OPTIONAL
      fileName    // OPTIONAL
    } = req.body;

    /* ======================
       ✅ REQUIRED VALIDATION
    ====================== */
    if (!to || !subject || !message) {
      return res.status(400).json({
        error: "Missing required fields: to, subject, message"
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
       ✉️ BUILD EMAIL PAYLOAD
    ====================== */
    const emailPayload = {
      sender: {
        email: "cafekubera2223@gmail.com",
        name: "Cafe Kubera"
      },
      to: [{ email: to }],
      subject,
      htmlContent: `<p>${message}</p>`
    };

    /* ======================
       📎 OPTIONAL ATTACHMENT
    ====================== */
    if (pdfBase64 && fileName) {
      emailPayload.attachment = [
        {
          content: pdfBase64,   // pure Base64
          name: fileName,
          type: "application/pdf"
        }
      ];
    }

    /* ======================
       🚀 SEND EMAIL
    ====================== */
    await apiInstance.sendTransacEmail(emailPayload);

    return res.status(200).json({
      success: true,
      message: pdfBase64
        ? "Email sent with attachment"
        : "Email sent without attachment"
    });

  } catch (err) {
    console.error("BREVO ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal Server Error"
    });
  }
}
