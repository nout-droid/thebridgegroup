import "server-only";

export function renderSupplierRequestEmail(
  origin: string,
  projectName: string,
  categoryNames: string[],
  portalCode: string | null
) {
  const items = categoryNames
    .map((name) => `<li style="padding: 2px 0; font-size: 14px; color: #111111;">${escapeHtml(name)}</li>`)
    .join("");

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
                <h1 style="margin: 0 0 8px; font-size: 20px; color: #111111;">Nieuwe aanvraag</h1>
                <p style="margin: 0; font-size: 14px; color: #666666;">
                  Er staat een nieuwe aanvraag voor je klaar bij <strong>${escapeHtml(projectName)}</strong>:
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 32px 8px;">
                <ul style="margin: 0; padding-left: 20px;">${items}</ul>
              </td>
            </tr>
            ${
              portalCode
                ? `<tr>
              <td style="padding: 8px 32px 24px; font-size: 13px; color: #666666;">
                Leverancierscode: <strong>${escapeHtml(portalCode)}</strong>
              </td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding: 0 32px 32px;">
                <a href="${origin}/supplier-portal" style="display: inline-block; background-color: #046bd2; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 6px;">
                  Bekijk aanvraag
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: `Nieuwe aanvraag — ${projectName}`, html };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
