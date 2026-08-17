/**
 * Booking links for the Roadmap flow. Booking runs on Google Calendar
 * appointment schedules (same system as rss-site /work-with-ryan;
 * cal.com + Zoom retired June 2026). Google Meet auto-attaches.
 *
 * INTAKE_CALL_URL is shown on /roadmap/thanks immediately after an
 * application is submitted, so the family commits to a time while the
 * decision is hot. The `?gv=true` variant is required for the inline
 * iframe embed to render instead of redirecting.
 *
 * CONFIRMED by Ryan (Jul 25 2026): the 20-minute Discovery Call IS this
 * schedule (short link resolves to the same AcZssZ0y_kQQ... id), so the
 * intake call and the public discovery call share one calendar by design.
 * The 60-minute Roadmap Call (-> AcZssZ36_aKk...) lives in site.ts as
 * premiumCalBookingUrl and shows on the dashboard once Ryan grants the
 * Roadmap tier.
 *
 * Current short links (RSS_HowWeOperate, Aug 14 2026) — use these in new
 * copy:
 *   Discovery Call, 20 min, families:  calendar.app.google/iXAo34Z8zkcTqSb69
 *   Partner & Media Call, 20-30 min:   calendar.app.google/fTCwztNu7tHhh1T46
 *   Roadmap Call, 60 min:              calendar.app.google/PheFJu1xuHhspiLq6
 * Retired short links still resolve to the same three pages — treat them as
 * the same destination when auditing, but do not reuse them:
 * EsvzdVFS31JzS4Ui8 = Discovery. 8j5ajzaShsLqkL656 = Partner & Media.
 * 9dxmqtmcX6PuyaFR7 and TZNt4jBsG5xXBVdw5 = Roadmap.
 */
export const INTAKE_CALL_URL =
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ0y_kQQfkvnf6jQEBvA5X2Onolndq6VleuID3n9hDujDd4CjpOsaJzKqs_eXujvfVVayudxp2h5";

export const INTAKE_CALL_EMBED_URL = `${INTAKE_CALL_URL}?gv=true`;
