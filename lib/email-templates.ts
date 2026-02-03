export const OTP_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{APP_NAME} Login</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b;">
  <div style="max-width: 600px; margin: 40px auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 16px; padding: 48px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); text-align: center;">
      
      <!-- Header -->
      <div style="margin-bottom: 32px;">
        <img src="{LOGO_URL}" alt="{APP_NAME}" style="height: 48px; width: auto; margin-bottom: 16px; border-radius: 10px;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #000000;">{APP_NAME}</h1>
        <p style="margin: 8px 0 0; font-size: 16px; color: #71717a;">{TAGLINE}</p>
      </div>

      <!-- Content -->
      <div style="margin-bottom: 32px;">
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #3f3f46;">
          Use the following code to complete your login. This code is valid for <strong>{EXPIRY_MINUTES} minutes</strong>.
        </p>
        
        <div style="background-color: #f4f4f5; border-radius: 12px; padding: 24px; display: inline-block; margin: 0 auto;">
          <span style="font-family: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #000000; display: block;">{CODE}</span>
        </div>
      </div>

      <!-- Security Note -->
      <p style="font-size: 14px; color: #71717a; margin-top: 32px;">
        If you didn't request this email, you can safely ignore it.
      </p>

    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #a1a1aa;">
      <p style="margin: 0 0 8px;">
        &copy; {YEAR} {APP_NAME}. All rights reserved.
      </p>
      <p style="margin: 0;">
        <a href="mailto:{SUPPORT_EMAIL}" style="color: #a1a1aa; text-decoration: underline;">Contact Support</a>
        &nbsp;&bull;&nbsp;
        Please don't reply to this email
      </p>
    </div>
  </div>
</body>
</html>
`;

export const RESET_PASSWORD_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your {APP_NAME} password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b;">
  <div style="max-width: 600px; margin: 40px auto; padding: 20px;">
    <!-- Hidden Preheader -->
    <span style="display: none; color: transparent; visibility: hidden; opacity: 0; font-size: 0px; line-height: 0px; max-height: 0px; max-width: 0px; overflow: hidden;">
      Reset your password for {APP_NAME}.
    </span>

    <div style="background-color: #ffffff; border-radius: 24px; padding: 48px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); border: 1px solid #e4e4e7;">
      
      <!-- Header / Logo & Title Row -->
      <div style="margin-bottom: 40px; border-bottom: 1px solid #f4f4f5; padding-bottom: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="left" style="vertical-align: middle;">
              <div style="display: inline-block; background-color: #000000; color: #ffffff; width: 32px; height: 32px; border-radius: 8px; text-align: center; line-height: 32px; font-size: 18px; font-weight: 700; margin-right: 12px; vertical-align: middle;">
                N
              </div>
              <span style="font-size: 18px; font-weight: 700; color: #000000; letter-spacing: -0.02em; vertical-align: middle;">{APP_NAME}</span>
            </td>
            <td align="right" style="vertical-align: middle;">
              <span style="font-size: 14px; font-weight: 600; color: #71717a; text-transform: uppercase; tracking-wider: 0.05em;">Reset Password</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Content -->
      <div style="margin-bottom: 40px; text-align: center;">
        <p style="font-size: 16px; line-height: 1.6; color: #52525b; margin: 0 auto 32px; max-width: 440px;">
          Hi there, we received a request to reset your password. Click the button below to choose a new one.
        </p>
        
        <a href="{RESET_URL}" style="display: inline-block; background-color: #000000; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 40px; border-radius: 12px; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
          Set New Password
        </a>
      </div>

      <!-- Fallback -->
      <div style="padding-top: 32px; border-top: 1px solid #f4f4f5; text-align: center;">
        <p style="font-size: 13px; color: #71717a; margin-bottom: 8px;">
          Button not working? Copy and paste this link:
        </p>
        <div style="word-break: break-all; color: #2563eb; font-size: 13px; line-height: 1.4; text-decoration: underline;">
          {RESET_URL}
        </div>
      </div>

      <!-- Security Note -->
      <p style="font-size: 13px; color: #a1a1aa; margin-top: 40px; line-height: 1.5; text-align: center;">
        If you didn't request a password reset, you can safely ignore this email. Your password will not change.
      </p>

    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #a1a1aa;">
      <p style="margin: 0 0 12px;">
        &copy; {YEAR} {APP_NAME}. All rights reserved.
      </p>
      <div style="display: flex; justify-content: center; gap: 12px; align-items: center;">
        <a href="mailto:{SUPPORT_EMAIL}" style="color: #71717a; text-decoration: none; font-weight: 500;">Support</a>
        <span style="color: #e4e4e7;">&bull;</span>
        <span style="color: #71717a;">Don't reply to this email</span>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Replaces placeholders in the email template with actual values.
 * @param template The HTML string with {VARIABLES}
 * @param variables Object containing key-value pairs to replace
 * @returns The compiled HTML string
 */
export function compileEmailTemplate(template: string, variables: Record<string, string | number>): string {
  let compiled = template;
  for (const [key, value] of Object.entries(variables)) {
    // Create a global regex to replace all instances of {KEY}
    const regex = new RegExp(`{${key}}`, 'g');
    compiled = compiled.replace(regex, String(value));
  }
  return compiled;
}
