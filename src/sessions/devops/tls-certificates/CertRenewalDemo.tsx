"use client";

import { useState } from "react";
import { FlowArrow, FlowStep } from "@/components/flow/Flow";
import { Choices, RunButton, Slider, useWalk } from "@/components/session/ui";
import { SessionHeader, SessionPage } from "@/components/session/SessionHeader";
import { SessionLayout } from "@/components/session/SessionSplitLayout";
import { SystemMap, SystemMapPanel, hops, type MapNode, type Packet } from "@/components/system/SystemMap";
import { ALERT_AT, DAYS, FIRST, FIXED, LIFETIME, RENEW_AT, certbotCommand, simulate, type Challenge, type Design } from "@/lib/certRenewal";

const ACCENT = "var(--ops)";

export default function CertRenewalDemo() {
  const [d, setD] = useState<Design>(FIRST);
  const [day, setDay] = useState(120);
  const { stage, busy, run } = useWalk(5, 1100);
  const at = (i: number) => stage === i;
  const set = (p: Partial<Design>) => setD((c) => ({ ...c, ...p }));
  const sim = simulate(d);
  const s = sim.days[day];
  const servedLeft = s.served ? s.served.expires - day : null;
  const diskLeft = s.disk ? s.disk.expires - day : null;
  const stale = !!s.disk && !!s.served && s.served !== s.disk;
  const tried = s.attempt;
  const http = d.challenge === "http";

  const nodes: MapNode[] = [
    { id: "certbot", label: "certbot timer", sub: diskLeft === null ? "no certificate" : `file: ${diskLeft} days left`, at: [14, 18], mobileAt: [25, 12], state: tried ? (tried.ok ? "good" : "bad") : "idle" },
    { id: "ca", label: "Let's Encrypt", sub: "ACME CA", at: [50, 18], mobileAt: [75, 12], state: tried ? "active" : "idle" },
    { id: "challenge", label: http ? "Port 80" : "DNS provider", sub: http ? "/.well-known/acme-challenge" : "_acme-challenge TXT", at: [86, 18], mobileAt: [75, 45], state: tried ? (tried.ok ? "good" : "bad") : "idle" },
    { id: "nginx", label: "nginx", sub: servedLeft === null ? "no certificate" : servedLeft <= 0 ? "serving an expired cert" : `serving: ${servedLeft} days left`, at: [50, 82], mobileAt: [25, 45], state: s.outage ? "bad" : stale ? "wait" : "good" },
    { id: "browsers", label: "Visitors", sub: s.outage ? "certificate error" : "padlock", at: [86, 82], mobileAt: [75, 80], state: s.outage ? "bad" : "good" },
    { id: "monitor", label: "Expiry monitor", sub: d.monitor ? `alerts at ${ALERT_AT} days` : "none", at: [14, 82], mobileAt: [25, 80], state: d.monitor ? (s.alert ? "wait" : "active") : "dim" },
  ];

  const packets: Packet[] =
    stage === 0 ? (tried ? hops("o", ["certbot", "ca"], { label: "new order" }) : [])
    : stage === 1 ? (tried ? hops("c", ["ca", "challenge"], { label: http ? "GET token" : "TXT?", tone: tried.ok ? "good" : "bad" }) : [])
    : stage === 2 ? (tried?.ok ? hops("i", ["ca", "certbot"], { label: `${LIFETIME}-day cert`, tone: "good" }) : [])
    : stage === 3 ? (tried?.ok ? hops("r", ["certbot", "nginx"], { label: d.reloadHook || day === 0 ? "reload" : "file only", tone: stale ? "bad" : "good" }) : hops("b", ["browsers", "nginx"], { label: "HTTPS" }))
    : stage === 4 ? (d.monitor ? hops("m", ["monitor", "nginx"], { label: `${servedLeft ?? 0} days`, tone: s.alert ? "bad" : undefined }) : [])
    : [];

  const captions = [
    tried ? `Step 1: day ${day}: ${diskLeft === null || diskLeft <= 0 ? "no valid certificate" : `${diskLeft} days left`}, so certbot places an order.` : `Step 1: day ${day}: the file has ${diskLeft} days left, more than ${RENEW_AT}, so the timer does nothing.`,
    tried ? `Step 2: ${tried.why}.` : "Step 2: nothing to validate today.",
    tried?.ok ? `Step 3: a new certificate valid until day ${s.disk!.expires} is written to disk.` : "Step 3: no new certificate today.",
    stale ? `Step 4: the file is new, but nginx still serves the one expiring on day ${s.served!.expires}; it reads certificates only at start or reload.` : `Step 4: nginx serves the newest certificate.`,
    d.monitor ? `Step 5: the monitor connects like a browser and sees ${servedLeft ?? 0} days left${s.alert ? ": it pages on-call" : ""}.` : "Step 5: nobody checks the served certificate; the first alert is a customer.",
  ];
  const caption = stage !== null ? captions[stage] : `Over a year: ${sim.outageDays} day${sim.outageDays === 1 ? "" : "s"} of certificate errors · ${sim.alerts} alert${sim.alerts === 1 ? "" : "s"} · day ${day}: ${s.outage ? "the site shows an error" : stale ? "serving a stale certificate" : tried && !tried.ok ? `renewal failing, ${servedLeft} days left` : "fine"}.`;

  return (
    <SessionPage>
      <SessionHeader
        kicker="DevOps · interactive"
        title="TLS certificates"
        blurb={`Let's Encrypt issues free ${LIFETIME}-day certificates through the ACME protocol, so renewal has to be automatic. Automation is easy to set up and easy to break without noticing. Run one year of a small site, with a firewall clean-up, a rotated DNS token and an nginx that never reloads.`}
      />

      <div className="mt-6">
        <SessionLayout
          visual={
            <div className="space-y-3">
              <SystemMap
                title="A certbot timer, the Let's Encrypt CA, the challenge on port 80 or DNS, nginx, visitors and an expiry monitor"
                accent={ACCENT}
                chrome="split"
                nodes={nodes}
                links={[
                  { from: "certbot", to: "ca", label: "ACME" },
                  { from: "ca", to: "challenge", label: http ? "HTTP-01" : "DNS-01" },
                  { from: "certbot", to: "nginx", label: d.reloadHook ? "deploy hook" : "file", dim: !d.reloadHook },
                  { from: "browsers", to: "nginx", label: "HTTPS" },
                  { from: "monitor", to: "nginx", label: "check", dim: !d.monitor },
                ]}
                packets={packets}
                aspect={1.45}
                mobileAspect={0.85}
              />
              <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4" aria-label="The year, day by day">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--faint)]">
                  the year · {sim.outageDays} error day{sim.outageDays === 1 ? "" : "s"}
                </p>
                <div className="mt-2 flex h-6 w-full overflow-hidden rounded" aria-hidden>
                  {sim.days.map((x) => (
                    <div
                      key={x.day}
                      className="h-full flex-1"
                      style={{
                        background: x.outage ? "var(--bad)" : x.served && x.disk !== x.served ? "var(--c2)" : x.attempt && !x.attempt.ok ? "color-mix(in srgb, var(--bad) 35%, transparent)" : "color-mix(in srgb, var(--good) 45%, transparent)",
                        outline: x.day === day ? "2px solid var(--text)" : undefined,
                      }}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-[var(--faint)]">green fine · amber serving a stale certificate · pale red renewals failing · red visitors see an error</p>
                <ul className="mt-3 space-y-1 text-xs">
                  {sim.log.map((l, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="w-14 shrink-0 font-mono text-[var(--faint)]">day {l.day}</span>
                      <span style={{ color: l.tone === "bad" ? "var(--bad)" : l.tone === "good" ? "var(--text)" : "var(--muted)" }}>{l.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          }
          panel={
            <SystemMapPanel caption={caption}>
              <div className="w-full">
                <Slider label="Day" value={day} min={0} max={DAYS - 1} step={1} format={(v) => `day ${v}`} onChange={setDay} accent={ACCENT} />
              </div>
              <div className="flex w-full flex-wrap gap-2">
                <button type="button" onClick={() => setD(FIRST)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  certbot defaults
                </button>
                <button type="button" onClick={() => setD(FIXED)} className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm text-[var(--muted)]">
                  DNS-01, reload hook, monitor
                </button>
              </div>
              <RunButton busy={busy} onClick={run} accent={ACCENT} running="Running…">
                Run this day
              </RunButton>
            </SystemMapPanel>
          }
          detail={
            <>
              <FlowStep n={1} title="Ask the CA for a certificate" what={`A timer runs certbot twice a day. Once ${RENEW_AT} or fewer days are left it places an ACME order for your names. Lifetimes keep shrinking (public certificates drop to 47 days by 2029), so nobody can do this by hand.`} accent={ACCENT} active={at(0)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.wildcard} onChange={(e) => set({ wildcard: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  Include *.example.com
                </label>
                <p className="break-words font-mono text-[10px] text-[var(--muted)]">{certbotCommand(d)}</p>
              </FlowStep>
              <FlowArrow label="challenge" accent={ACCENT} active={at(1)} />

              <FlowStep n={2} title="Prove you control the name" what="HTTP-01: the CA fetches a token from http://your-name/.well-known/acme-challenge/, so port 80 must stay reachable. DNS-01: you publish a TXT record through your DNS provider's API; it needs no open port and is the only way to get a wildcard." accent={ACCENT} active={at(1)}>
                <Choices<Challenge> label="Challenge" accent={ACCENT} value={d.challenge} onChange={(x) => set({ challenge: x })} options={[{ id: "http", label: "HTTP-01" }, { id: "dns", label: "DNS-01" }]} />
                <p className="mt-1 text-xs" style={{ color: tried ? (tried.ok ? "var(--good)" : "var(--bad)") : "var(--muted)" }}>
                  day {day}: {tried ? tried.why : `no renewal due (${diskLeft} days left)`}
                </p>
              </FlowStep>
              <FlowArrow label="certificate" accent={ACCENT} active={at(2)} />

              <FlowStep n={3} title="Store the new certificate" what={`The CA signs a certificate valid for ${LIFETIME} days. certbot writes it under /etc/letsencrypt/live/ and points the fullchain.pem link at it.`} accent={ACCENT} active={at(2)}>
                <p className="font-mono text-xs">{s.disk ? `on disk: issued day ${s.disk.issued}, expires day ${s.disk.expires}` : "nothing on disk"}</p>
              </FlowStep>
              <FlowArrow label="reload" accent={ACCENT} active={at(3)} />

              <FlowStep n={4} title="Make nginx use it" what="nginx reads certificate files when it starts or reloads, not when they change. Without a deploy hook that reloads it, the renewal succeeds and the old certificate keeps being served until it expires." accent={ACCENT} active={at(3)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.reloadHook} onChange={(e) => set({ reloadHook: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  --deploy-hook &quot;systemctl reload nginx&quot;
                </label>
                <p className="font-mono text-xs" style={{ color: stale ? "var(--bad)" : "var(--text)" }}>
                  {s.served ? `served: expires day ${s.served.expires}${stale ? " (stale)" : ""}` : "nothing served"}
                </p>
              </FlowStep>
              <FlowArrow label="what visitors get" accent={ACCENT} active={at(4)} />

              <FlowStep n={5} title="Monitor the certificate people actually get" what={`Check the served certificate from outside, the way a browser does, and page someone at ${ALERT_AT} days left. Checking the file on disk would miss a missing reload. Let's Encrypt stopped sending expiry emails in 2025, so this is yours to run.`} accent={ACCENT} active={at(4)}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={d.monitor} onChange={(e) => set({ monitor: e.target.checked })} className="h-4 w-4" style={{ accentColor: ACCENT }} />
                  External expiry check with an alert
                </label>
                <p className="mt-2 text-[11px] text-[var(--faint)]">The day-by-day simulation runs here. Fixes land the day after an alert or an outage; the events are illustrative.</p>
              </FlowStep>
            </>
          }
        />
      </div>
    </SessionPage>
  );
}
