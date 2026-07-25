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
 * CONFIRMED by Ryan (Jul 25 2026): the 20-minute call at
 * calendar.app.google/EsvzdVFS31JzS4Ui8 IS this schedule (short link
 * resolves to the same AcZssZ0y_kQQ... id), so the intake call and the
 * public discovery call share one calendar by design. The 60-minute
 * roadmap-review call (calendar.app.google/9dxmqtmcX6PuyaFR7 ->
 * AcZssZ36_aKk...) lives in site.ts as premiumCalBookingUrl and shows on
 * the dashboard once Ryan grants the Roadmap tier.
 */
export const INTAKE_CALL_URL =
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ0y_kQQfkvnf6jQEBvA5X2Onolndq6VleuID3n9hDujDd4CjpOsaJzKqs_eXujvfVVayudxp2h5";

export const INTAKE_CALL_EMBED_URL = `${INTAKE_CALL_URL}?gv=true`;
