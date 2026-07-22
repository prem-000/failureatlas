export interface BaseLayoutOptions {
  title: string;
  badgeText?: string;
  content: string;
  baseUrl?: string;
}

export function renderBaseEmailLayout(options: BaseLayoutOptions): string {
  const baseUrl = options.baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const logoUrl = `${baseUrl}/email/logo.png`;
  const settingsUrl = `${baseUrl}/settings`;
  const privacyUrl = `${baseUrl}/privacy`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    body {
      background-color: #0d0d0f;
      color: #e4e4e7;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0d0d0f;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #16161a;
      border: 1px solid #232329;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }
    .header {
      padding: 24px 30px;
      background: linear-gradient(135deg, #1e1b29 0%, #16161a 100%);
      border-bottom: 1px solid #232329;
      text-align: center;
    }
    .logo-img {
      max-width: 220px;
      height: auto;
      margin-bottom: 12px;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      background-color: rgba(168, 85, 247, 0.2);
      color: #c084fc;
      border: 1px solid rgba(168, 85, 247, 0.4);
      padding: 4px 12px;
      border-radius: 20px;
      margin-top: 8px;
    }
    .content {
      padding: 30px;
    }
    .card {
      background-color: #1c1c24;
      border: 1px solid #2a2a35;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .btn {
      display: block;
      width: 100%;
      text-align: center;
      background-color: #a855f7;
      color: #ffffff !important;
      padding: 14px 0;
      border-radius: 8px;
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      margin-top: 24px;
      box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
      box-sizing: border-box;
    }
    .footer {
      padding: 24px 30px;
      background-color: #111115;
      border-top: 1px solid #232329;
      text-align: center;
      font-size: 12px;
      color: #71717a;
      line-height: 1.6;
    }
    .footer a {
      color: #c084fc;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="${logoUrl}" alt="Praxis Logo" class="logo-img" />
        ${options.badgeText ? `<div><span class="badge">${options.badgeText}</span></div>` : ''}
      </div>
      <div class="content">
        ${options.content}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Praxis. All rights reserved.</p>
        <p>
          <a href="${settingsUrl}">Notification Settings</a> &nbsp;|&nbsp; 
          <a href="${privacyUrl}">Privacy Policy</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
