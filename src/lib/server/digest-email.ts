import "server-only";

export type DigestProjectGroup = {
  projectId: string;
  projectName: string;
  entries: { actorLabel: string; categoryLabel: string; description: string }[];
};

export function renderDigestEmail(origin: string, groups: DigestProjectGroup[]) {
  const totalCount = groups.reduce((sum, g) => sum + g.entries.length, 0);

  const projectBlocks = groups
    .map(
      (group) => `
        <tr>
          <td style="padding: 24px 0 8px;">
            <a href="${origin}/projects/${group.projectId}" style="color: #111111; font-size: 16px; font-weight: 600; text-decoration: none;">
              ${escapeHtml(group.projectName)}
            </a>
          </td>
        </tr>
        ${group.entries
          .map(
            (entry) => `
        <tr>
          <td style="padding: 4px 0; border-bottom: 1px solid #eeeeee;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 8px 0; font-size: 13px; color: #7dff43; font-weight: 700; width: 90px; vertical-align: top;">
                  ${escapeHtml(entry.categoryLabel)}
                </td>
                <td style="padding: 8px 0; font-size: 14px; color: #111111; vertical-align: top;">
                  <strong>${escapeHtml(entry.actorLabel)}</strong> — ${escapeHtml(entry.description)}
                </td>
              </tr>
            </table>
          </td>
        </tr>`
          )
          .join("")}
      `
    )
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
                <h1 style="margin: 0 0 8px; font-size: 20px; color: #111111;">Dagelijkse samenvatting</h1>
                <p style="margin: 0; font-size: 14px; color: #666666;">
                  ${totalCount} update${totalCount === 1 ? "" : "s"} van klanten en leveranciers in de afgelopen 24 uur.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 32px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${projectBlocks}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 32px; border-top: 1px solid #eeeeee;">
                <a href="${origin}/projects" style="display: inline-block; background-color: #046bd2; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 6px;">
                  Bekijk in The Bridge — Productie
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject: `${totalCount} update${totalCount === 1 ? "" : "s"} — The Bridge Productie`, html };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
