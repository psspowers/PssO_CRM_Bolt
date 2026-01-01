import { getCompanyLogoUrl, getCompanyName } from './api/settings';

export interface ConfirmationEmailData {
  confirmationUrl: string;
  userName?: string;
}

export interface WelcomeEmailData {
  userName: string;
  loginUrl?: string;
}

export interface PasswordResetEmailData {
  resetUrl: string;
  userName?: string;
}

export async function generateConfirmationEmail(data: ConfirmationEmailData): Promise<string> {
  const logoUrl = await getCompanyLogoUrl();
  const companyName = await getCompanyName() || 'PSS Orange';

  return `<!DOCTYPE html>
<html>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 40px 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <div style="max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 5px solid #E87E3C;">
          <div style="padding: 40px; text-align: center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" width="140" style="margin-bottom: 30px;">` : ''}
            <h2 style="color: #333; margin-top: 0;">${data.userName ? `Hi ${data.userName}, l` : 'L'}et's get started!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">Thanks for joining ${companyName}. Please click the button below to verify your email address and activate your account.</p>
            <a href="${data.confirmationUrl}" style="display: inline-block; padding: 14px 30px; background-color: #E87E3C; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Confirm My Account</a>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">If the button doesn't work, copy this link: <br> <a href="${data.confirmationUrl}" style="color: #E87E3C;">${data.confirmationUrl}</a></p>
          </div>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; color: #999; font-size: 12px;">
            &copy; 2026 ${companyName}. All rights reserved.
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function generateWelcomeEmail(data: WelcomeEmailData): Promise<string> {
  const logoUrl = await getCompanyLogoUrl();
  const companyName = await getCompanyName() || 'PSS Orange';

  return `<!DOCTYPE html>
<html>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 40px 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <div style="max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 5px solid #E87E3C;">
          <div style="padding: 40px; text-align: center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" width="140" style="margin-bottom: 30px;">` : ''}
            <h2 style="color: #333; margin-top: 0;">Welcome to ${companyName}!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">Hi ${data.userName}, your account has been successfully created. You're all set to start using our platform.</p>
            ${data.loginUrl ? `<a href="${data.loginUrl}" style="display: inline-block; padding: 14px 30px; background-color: #E87E3C; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Go to Dashboard</a>` : ''}
          </div>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; color: #999; font-size: 12px;">
            &copy; 2026 ${companyName}. All rights reserved.
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function generatePasswordResetEmail(data: PasswordResetEmailData): Promise<string> {
  const logoUrl = await getCompanyLogoUrl();
  const companyName = await getCompanyName() || 'PSS Orange';

  return `<!DOCTYPE html>
<html>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 40px 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <div style="max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 5px solid #E87E3C;">
          <div style="padding: 40px; text-align: center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" width="140" style="margin-bottom: 30px;">` : ''}
            <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">${data.userName ? `Hi ${data.userName}, w` : 'W'}e received a request to reset your password. Click the button below to create a new password.</p>
            <a href="${data.resetUrl}" style="display: inline-block; padding: 14px 30px; background-color: #E87E3C; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Reset Password</a>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">If you didn't request this, you can safely ignore this email.</p>
            <p style="color: #999; font-size: 12px;">If the button doesn't work, copy this link: <br> <a href="${data.resetUrl}" style="color: #E87E3C;">${data.resetUrl}</a></p>
          </div>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; color: #999; font-size: 12px;">
            &copy; 2026 ${companyName}. All rights reserved.
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function generateGenericEmail(options: {
  title: string;
  message: string;
  buttonText?: string;
  buttonUrl?: string;
  footerText?: string;
}): Promise<string> {
  const logoUrl = await getCompanyLogoUrl();
  const companyName = await getCompanyName() || 'PSS Orange';

  return `<!DOCTYPE html>
<html>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 40px 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <div style="max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 5px solid #E87E3C;">
          <div style="padding: 40px; text-align: center;">
            ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" width="140" style="margin-bottom: 30px;">` : ''}
            <h2 style="color: #333; margin-top: 0;">${options.title}</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">${options.message}</p>
            ${options.buttonText && options.buttonUrl ? `<a href="${options.buttonUrl}" style="display: inline-block; padding: 14px 30px; background-color: #E87E3C; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">${options.buttonText}</a>` : ''}
            ${options.footerText ? `<p style="color: #999; font-size: 12px; margin-top: 30px;">${options.footerText}</p>` : ''}
          </div>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; color: #999; font-size: 12px;">
            &copy; 2026 ${companyName}. All rights reserved.
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
