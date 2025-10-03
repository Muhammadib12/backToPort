// src/lib/mailer.js
import { Resend } from "resend";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Fallback محلي فقط (لن يعمل على Render مع SMTP المحجوب)
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// -------- أدوات تنسيق (لو عندك مسبقًا احتفظ بها) --------
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function safeDecode(str = "") {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}
function formatUTC(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(
    d.getUTCDate()
  )} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}
function formatInTZ(iso, tz = "Asia/Jerusalem") {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g(
    "minute"
  )}:${g("second")}`;
}

// -------- دالة إرسال موحّدة (Resend أولاً) --------
async function sendEmailUnified({ subject, html }) {
  const to = process.env.NOTIFY_EMAIL;

  if (resend) {
    // يمكنك ترك from على onboarding@resend.dev للاختبار
    const { data, error } = await resend.emails.send({
      from: "Muhammad <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });
    if (error)
      throw new Error(
        typeof error === "string" ? error : JSON.stringify(error)
      );
    return data?.id || "resend-ok";
  } else {
    const info = await transporter.sendMail({
      from: `"Muhammad Portfolio" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return info.messageId;
  }
}

// -------- دوالك الحالية تستخدم الموحّدة فقط --------
export const sendLikeNotification = async (projectId, newLikes) => {
  const subject = `👍 New Like on Project ${projectId}`;
  const html = `<p>Project <b>${escapeHtml(
    projectId
  )}</b> received a new like! Total likes: <b>${newLikes}</b></p>`;
  try {
    const id = await sendEmailUnified({ subject, html });
    console.log("Like notification sent ✅ id:", id);
  } catch (e) {
    console.error("Failed to send like notification ❌", e?.message || e);
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
    const id = await sendEmailUnified({ subject, html });
    console.log("Visit notification sent ✅ id:", id);
  } catch (e) {
    console.error("Failed to send visit notification ❌", e?.message || e);
  }
};
