// src/lib/mailer.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// --- ضع هذه الدوال أعلى src/lib/mailer.js ---

// تأمين النص داخل HTML
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// فك ترميز URL إن وجد (بدون رمي أخطاء)
function safeDecode(str = "") {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

// تنسيق وقت UTC: YYYY-MM-DD HH:mm:ss
function formatUTC(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate()
  )} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(
    d.getUTCSeconds()
  )}`;
}

// تنسيق وقت حسب منطقة زمنية (Asia/Jerusalem) بنفس الصيغة
function formatInTZ(iso, timeZone = "Asia/Jerusalem") {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "00";
  // en-GB يعطي day/month/year؛ نعيد ترتيبها لـ YYYY-MM-DD
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get(
    "minute"
  )}:${get("second")}`;
}

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // لازم App Password
  },
  // مفيد للاختبار: يطبع لوج مفصل من Nodemailer
  logger: true,
  debug: true,
});

// فحص الاتصال عند بدء السيرفر:
export async function verifyEmailTransport() {
  try {
    await transporter.verify();
    console.log("✅ SMTP ready (Gmail) as:", process.env.EMAIL_USER);
  } catch (err) {
    console.error("❌ SMTP verify failed:", err?.message || err);
    // لو شفت هنا 534/535 فالمشكلة App Password/حساب
  }
}

export const sendLikeNotification = async (projectId, newLikes) => {
  const mailOptions = {
    from: `"Muhammad Portfolio" <${process.env.EMAIL_USER}>`, // لازم from = نفس الإيميل
    to: process.env.NOTIFY_EMAIL,
    subject: `👍 New Like on Project ${projectId}`,
    text: `Project ${projectId} just received a new like! Total likes: ${newLikes}`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Like notification sent ✅ messageId:", info.messageId);
  } catch (error) {
    console.error(
      "Failed to send like notification ❌",
      error?.message || error,
      error?.response
    );
  }
};
export const sendVisitNotification = async (payload) => {
  let {
    ip,
    city,
    region,
    country,
    lat,
    lon,
    isp,
    org,
    ua,
    path,
    referer,
    timeISO,
  } = payload;

  // فك ترميز + تأمين HTML
  ua = escapeHtml(safeDecode(ua || "Unknown"));
  path = escapeHtml(safeDecode(path || "/"));
  referer = escapeHtml(safeDecode(referer || "-"));
  city = escapeHtml(city || "?");
  region = escapeHtml(region || "?");
  country = escapeHtml(country || "?");
  isp = escapeHtml(isp || "?");
  org = escapeHtml(org || "?");
  ip = escapeHtml(ip || "?");

  const localTime = formatInTZ(timeISO, "Asia/Jerusalem");
  const utcTime = formatUTC(timeISO);

  const subject = `👀 زيارة جديدة: ${ip} (${city}, ${country})`;

  const mapLink =
    lat != null && lon != null
      ? `<a href="https://www.google.com/maps?q=${lat},${lon}" target="_blank" rel="noopener noreferrer">خريطة تقريبية</a>`
      : "";

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.4;color:#0f172a;">
    <h2 style="margin:0 0 12px;font-size:18px;">زيارة جديدة لموقعك</h2>
    <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
      <div style="background:#f8fafc;padding:10px 14px;font-weight:600;">تفاصيل الزيارة</div>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          <tr><td style="padding:8px 14px;width:180px;color:#64748b;">الوقت (إسرائيل):</td><td style="padding:8px 14px;">${localTime} <span style="color:#94a3b8">(Asia/Jerusalem)</span></td></tr>
          <tr><td style="padding:8px 14px;color:#64748b;">الوقت (UTC):</td><td style="padding:8px 14px;">${utcTime}</td></tr>
          <tr><td style="padding:8px 14px;color:#64748b;">IP:</td><td style="padding:8px 14px;">${ip}</td></tr>
          <tr><td style="padding:8px 14px;color:#64748b;">الدولة:</td><td style="padding:8px 14px;">${country}</td></tr>
          <tr><td style="padding:8px 14px;color:#64748b;">المنطقة:</td><td style="padding:8px 14px;">${region}</td></tr>
          <tr><td style="padding:8px 14px;color:#64748b;">المدينة:</td><td style="padding:8px 14px;">${city}</td></tr>
          <tr><td style="padding:8px 14px;color:#64748b;">الإحداثيات:</td><td style="padding:8px 14px;">${
            lat ?? "?"
          }, ${lon ?? "?"} ${mapLink ? "· " + mapLink : ""}</td></tr>
          <tr><td style="padding:8px 14px;color:#64748b;">ISP / Org:</td><td style="padding:8px 14px;">${isp}${
    org !== "?" ? " (" + org + ")" : ""
  }</td></tr>
          <tr><td style="padding:8px 14px;color:#64748b;">User-Agent:</td><td style="padding:8px 14px;">${ua}</td></tr>
          <tr><td style="padding:8px 14px;color:#64748b;">الصفحة:</td><td style="padding:8px 14px;">${path}</td></tr>
          <tr><td style="padding:8px 14px;color:#64748b;">Referer:</td><td style="padding:8px 14px;">${referer}</td></tr>
        </tbody>
      </table>
    </div>
    <p style="color:#94a3b8;margin-top:10px;font-size:12px;">* لا يمكن استخراج اسم الزائر الحقيقي من عنوان IP.</p>
  </div>`;

  try {
    const info = await transporter.sendMail({
      from: `"Muhammad Portfolio" <${process.env.EMAIL_USER}>`,
      to: process.env.NOTIFY_EMAIL,
      subject,
      html,
    });
    console.log("Visit notification sent ✅ messageId:", info.messageId);
  } catch (error) {
    console.error(
      "Failed to send visit notification ❌",
      error?.message || error,
      error?.response
    );
  }
};
