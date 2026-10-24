// A year of automatic certificate renewal with an ACME CA such as Let's Encrypt:
// 90-day certificates, a timer that renews once 30 or fewer days are left, and the
// ordinary changes that break it. Day by day, with the certificate on disk and the one
// nginx is actually serving tracked separately.

export type Challenge = "http" | "dns";
export type Design = { challenge: Challenge; wildcard: boolean; reloadHook: boolean; monitor: boolean };

export const FIRST: Design = { challenge: "http", wildcard: false, reloadHook: false, monitor: false };
export const FIXED: Design = { challenge: "dns", wildcard: true, reloadHook: true, monitor: true };

export const LIFETIME = 90;
export const RENEW_AT = 30; // days left
export const ALERT_AT = 14; // days left on the served certificate
export const DAYS = 365;
export const PORT80_CLOSED = 100; // a firewall clean-up keeps only 443 open
export const TOKEN_REVOKED = 250; // the DNS team rotates the API token
export const NGINX_RESTART = 290; // a config change restarts nginx

type Cert = { issued: number; expires: number };
export type DayState = {
  day: number;
  disk: Cert | null;
  served: Cert | null;
  attempt: null | { ok: boolean; why: string };
  outage: boolean;
  alert: boolean;
  events: string[];
};

export function simulate(d: Design) {
  let challenge = d.challenge;
  let disk: Cert | null = null;
  let served: Cert | null = null;
  let port80 = true;
  let token = true;
  let reloads = d.reloadHook;
  let alerted = false;
  let fixDay = -1;
  const days: DayState[] = [];
  const log: { day: number; text: string; tone: "good" | "bad" | "info" }[] = [];

  const challengeWorks = (): { ok: boolean; why: string } => {
    if (d.wildcard && challenge === "http") return { ok: false, why: "a wildcard name can only be validated with DNS-01" };
    if (challenge === "http") return port80 ? { ok: true, why: "the CA fetched the token from port 80" } : { ok: false, why: "the CA couldn't reach port 80: connection timed out" };
    return token ? { ok: true, why: "the TXT record was created through the DNS API" } : { ok: false, why: "the DNS API rejected the revoked token" };
  };

  for (let day = 0; day < DAYS; day++) {
    const events: string[] = [];
    if (day === PORT80_CLOSED && challenge === "http") {
      port80 = false;
      events.push("a firewall clean-up closes port 80");
      log.push({ day, text: "Firewall clean-up closes port 80 (“we only serve HTTPS”).", tone: "info" });
    }
    if (day === TOKEN_REVOKED && challenge === "dns") {
      token = false;
      events.push("the DNS API token is rotated");
      log.push({ day, text: "The DNS team rotates the API token; nobody updates the server.", tone: "info" });
    }
    if (day === NGINX_RESTART && disk && served !== disk) {
      served = disk;
      events.push("nginx restarts and loads the newer certificate");
      log.push({ day, text: "nginx restarts for a config change and picks up the newer file.", tone: "info" });
    }
    // Someone acts on the alert (or the outage) the next day and fixes whatever is wrong.
    if (day === fixDay) {
      const fixes: string[] = [];
      if (challenge === "http" && d.wildcard) {
        challenge = "dns";
        fixes.push("switches to DNS-01");
      }
      if (challenge === "http" && !port80) {
        port80 = true;
        fixes.push("reopens port 80 for the CA");
      }
      if (challenge === "dns" && !token) {
        token = true;
        fixes.push("puts the new DNS token on the server");
      }
      if (!reloads) {
        reloads = true;
        fixes.push("adds the reload hook");
      }
      if (disk && served !== disk) {
        served = disk;
        fixes.push("reloads nginx");
      }
      events.push("on-call fixes it");
      log.push({ day, text: `On-call ${fixes.join(", ")}.`, tone: "good" });
    }

    let attempt: DayState["attempt"] = null;
    const left = disk ? disk.expires - day : -1;
    if (!disk || left <= RENEW_AT) {
      attempt = challengeWorks();
      if (attempt.ok) {
        disk = { issued: day, expires: day + LIFETIME };
        if (reloads || !served) served = disk;
        log.push({ day, text: disk.issued === 0 ? "Certificate issued." : `Renewed${reloads ? " and nginx reloaded" : "; nginx keeps the old certificate in memory"}.`, tone: reloads || day === 0 ? "good" : "bad" });
      } else if (!days.some((x) => x.attempt && !x.attempt.ok && x.day >= day - 30)) {
        log.push({ day, text: `Renewal fails: ${attempt.why}. It retries twice a day.`, tone: "bad" });
      }
    }

    const servedLeft = served ? served.expires - day : -1;
    const outage = !served || servedLeft <= 0;
    let alert = false;
    if (d.monitor && served && servedLeft <= ALERT_AT && !alerted && fixDay < day) {
      alert = true;
      alerted = true;
      fixDay = day + 1;
      log.push({ day, text: `Monitoring sees the served certificate expire in ${servedLeft} days and pages on-call.`, tone: "good" });
    }
    if (outage && (days.length === 0 || !days[days.length - 1].outage)) {
      log.push({ day, text: served ? "The served certificate expires: browsers show a full-page error." : "No certificate: the site can't serve HTTPS.", tone: "bad" });
      // Without monitoring, users report it and someone fixes it a day later.
      if (fixDay < day) fixDay = day + 1;
    }
    if (alerted && servedLeft > ALERT_AT) alerted = false;
    days.push({ day, disk, served, attempt, outage, alert, events });
  }
  const outageDays = days.filter((x) => x.outage).length;
  const renewals = new Set(days.map((x) => x.disk?.issued).filter((x) => x !== undefined)).size;
  return { days, log, outageDays, renewals, alerts: days.filter((x) => x.alert).length };
}

export function certbotCommand(d: Design) {
  const names = d.wildcard ? "-d example.com -d '*.example.com'" : "-d example.com -d www.example.com";
  const how = d.challenge === "http" ? "--webroot -w /var/www/html" : "--dns-cloudflare --dns-cloudflare-credentials /etc/letsencrypt/dns.ini";
  return `certbot certonly ${how} ${names}${d.reloadHook ? ` --deploy-hook "systemctl reload nginx"` : ""}`;
}
