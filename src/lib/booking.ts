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
 * TODO(ryan): replace with the dedicated "Roadmap intake call" appointment
 * schedule URL (calendar.google.com -> appointment schedules -> open booking
 * page -> copy link). Until then this points at the public 20-minute
 * discovery call so the flow never dead-ends.
 */
export const INTAKE_CALL_URL =
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ0y_kQQfkvnf6jQEBvA5X2Onolndq6VleuID3n9hDujDd4CjpOsaJzKqs_eXujvfVVayudxp2h5";

export const INTAKE_CALL_EMBED_URL = `${INTAKE_CALL_URL}?gv=true`;
