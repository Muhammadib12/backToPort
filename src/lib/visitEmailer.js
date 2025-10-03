// src/middleware/visitEmailer.js
import fetch from "node-fetch";
import { sendVisitNotification } from "../lib/mailer.js";
const ALLOW_LOCAL = process.env.ALLOW_LOCAL_EMAIL === "true";

// استخرج IP الحقيقي
function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return xff.split(",")[0].trim();
  const ip =
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.headers["x-real-ip"];
  return (ip || "").replace("::ffff:", "");
}

// كاش بسيط: لا ترسل أكثر من مرة لنفس الـIP خلال 10 دقائق
const recentlyEmailed = new Map();

// تجاهل بعض العناكب/البوتات الشائعة لتقليل الضوضاء
const BOT_KEYWORDS = [
  "bot",
  "crawler",
  "spider",
  "preview",
  "fetch",
  "monitor",
];

function isLikelyBot(userAgent = "") {
  const ua = userAgent.toLowerCase();
  return BOT_KEYWORDS.some((k) => ua.includes(k));
}

// جلب بيانات جغرافية من ip-api (مجاني)
async function lookupGeo(ip) {
  try {
    const url = `http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,lat,lon,isp,org,as,query`;
    const res = await fetch(url, { timeout: 4000 });
    if (!res.ok) return {};
    const data = await res.json();
    if (data?.status === "fail") return {};
    return data;
  } catch {
    return {};
  }
}

// الميدلوير
export async function visitEmailer(req, res, next) {
  try {
    // فقط على GET للصفحات العامة (تقدر تغيّر الشرط حسب حاجتك)
    if (req.method !== "GET") return next();

    const ua = req.headers["user-agent"] || "";
    if (isLikelyBot(ua)) return next();

    const ip = getClientIp(req);
    if (!ip || (!ALLOW_LOCAL && (ip === "127.0.0.1" || ip === "::1")))
      return next();
    const now = Date.now();
    const last = recentlyEmailed.get(ip) || 0;
    if (now - last < 10 * 60 * 1000) return next(); // 10 دقائق
    recentlyEmailed.set(ip, now);

    const geo = await lookupGeo(ip);
    const referer = req.headers.referer || "-";
    const path = req.originalUrl || req.url;
    const timeISO = new Date().toISOString();

    await sendVisitNotification({
      ip,
      city: geo?.city,
      region: geo?.regionName,
      country: geo?.country,
      lat: geo?.lat,
      lon: geo?.lon,
      isp: geo?.isp,
      org: geo?.org,
      ua,
      path,
      referer,
      timeISO,
    });
    console.log(
      `Visit from ${ip} (${geo?.city || "?"}, ${geo?.country || "?"})`
    );
  } catch (err) {
    console.error("visitEmailer error:", err?.message || err);
  } finally {
    next();
  }
}
