import "server-only";
import type { DailyForecast } from "./weather";

export function renderWeatherAlertEmail(
  origin: string,
  projectId: string,
  projectName: string,
  venueName: string,
  forecast: DailyForecast
) {
  const dateLabel = new Date(`${forecast.date}T00:00:00`).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const html = `<!DOCTYPE html>
<html>
  <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
            <tr>
              <td style="background-color: #000000; padding: 24px 32px;">
                <img src="${origin}/logo.png" alt="The Bridge" height="28" style="display: block;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 32px 32px 8px;">
                <h1 style="margin: 0 0 8px; font-size: 20px; color: #111111;">⚠️ Weerswaarschuwing</h1>
                <p style="margin: 0; font-size: 14px; color: #666666;">
                  Het weerbericht voor <strong>${escapeHtml(projectName)}</strong>${venueName ? ` bij ${escapeHtml(venueName)}` : ""} op ${dateLabel} ziet er niet goed uit.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 32px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff7ed; border-radius: 6px;">
                  <tr>
                    <td style="padding: 16px 20px; font-size: 14px; color: #111111;">
                      <strong>${forecast.tempMin}°C — ${forecast.tempMax}°C</strong><br />
                      Kans op neerslag: ${forecast.precipitationProbability}%
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 32px 32px;">
                <a href="${origin}/projects/${projectId}" style="display: inline-block; background-color: #046bd2; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 6px;">
                  Bekijk project
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: `Weerswaarschuwing — ${projectName}`, html };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
