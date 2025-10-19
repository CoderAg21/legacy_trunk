// config/mailer.js
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API);


// sendMail(to, subject, html) — reusable mail sending function
async function sendMail(to, from, subject, html) {
  try {
    const response = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
    console.log(response)

    console.log("Email sent:", response.data?.id || "OK");
  } catch (error) {
    console.error("Email error:", error.message);
  }
}

module.exports = sendMail;