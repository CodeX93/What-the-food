// @ts-nocheck
// Standalone Edge Function to send lifecycle emails via MailerSend
// Events: signup | upgrade_premium | monthly_to_annual | downgrade
// For downgrade: can send HTML email directly (without template) by providing html_content in body

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAILERSEND_API_KEY = Deno.env.get("MAILERSEND_API_KEY");
const MAILERSEND_FROM_EMAIL = Deno.env.get("MAILERSEND_FROM_EMAIL") || "hi@odehahwal.com";
const MAILERSEND_FROM_NAME = Deno.env.get("MAILERSEND_FROM_NAME") || "WhatTheFood";
const TEMPLATE_SIGNUP = Deno.env.get("MAILERSEND_TEMPLATE_SIGNUP") || "jy7zpl9dw9pg5vx6";
const TEMPLATE_UPGRADE_PREMIUM = Deno.env.get("MAILERSEND_TEMPLATE_UPGRADE_PREMIUM") || "v69oxl5dxyz4785k";
const TEMPLATE_MONTHLY_TO_ANNUAL = Deno.env.get("MAILERSEND_TEMPLATE_MONTHLY_TO_ANNUAL") || "zr6ke4n67emlon12";
const TEMPLATE_DOWNGRADE = Deno.env.get("MAILERSEND_TEMPLATE_DOWNGRADE") || "";

const templateByEvent: Record<string, string> = {
  signup: TEMPLATE_SIGNUP,
  upgrade_premium: TEMPLATE_UPGRADE_PREMIUM,
  monthly_to_annual: TEMPLATE_MONTHLY_TO_ANNUAL,
  downgrade: TEMPLATE_DOWNGRADE,
};

// Subject lines for each event type (can be overridden via env vars)
const SUBJECT_SIGNUP = Deno.env.get("MAILERSEND_SUBJECT_SIGNUP") || "Welcome to our family 🎉";
const SUBJECT_UPGRADE_PREMIUM = Deno.env.get("MAILERSEND_SUBJECT_UPGRADE_PREMIUM") || "You're Premium, {{name}} 🎉";
const SUBJECT_UPGRADE_PREMIUM_YEARLY = Deno.env.get("MAILERSEND_SUBJECT_UPGRADE_PREMIUM_YEARLY") || "You're Premium, {{name}} 🎉";
const SUBJECT_MONTHLY_TO_ANNUAL = Deno.env.get("MAILERSEND_SUBJECT_MONTHLY_TO_ANNUAL") || "Smart Move, {{name}} 🎉";
const SUBJECT_YEARLY_TO_MONTHLY = Deno.env.get("MAILERSEND_SUBJECT_YEARLY_TO_MONTHLY") || "You've switched to monthly, {{name}} ✅";
const SUBJECT_DOWNGRADE = Deno.env.get("MAILERSEND_SUBJECT_DOWNGRADE") || "Sorry to see you go, {{name}} 😞";

const subjectByEvent: Record<string, string> = {
  signup: SUBJECT_SIGNUP,
  upgrade_premium: SUBJECT_UPGRADE_PREMIUM,
  upgrade_premium_yearly: SUBJECT_UPGRADE_PREMIUM_YEARLY,
  monthly_to_annual: SUBJECT_MONTHLY_TO_ANNUAL,
  yearly_to_monthly: SUBJECT_YEARLY_TO_MONTHLY,
  downgrade: SUBJECT_DOWNGRADE,
};
// Basic responsive styles reused across all HTML emails
const RESPONSIVE_STYLES = `
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
  a[x-apple-data-detectors] {
    color: inherit !important; text-decoration: none !important; font-size: inherit !important;
    font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important;
  }
  /* Mobile */
  @media only screen and (max-width: 600px) {
    .wrapper { width: 100% !important; }
    .mobile-padding { padding: 20px !important; }
    .mobile-padding-sm { padding: 16px !important; }
    .mobile-title { font-size: 22px !important; line-height: 1.3 !important; }
    .mobile-text { font-size: 15px !important; line-height: 1.6 !important; }
    .mobile-button { width: 100% !important; display: block !important; padding: 14px 0 !important; }
  }
</style>
`;

// Generate HTML email for yearly to monthly change
function generateYearlyToMonthlyEmailHTML(data: {
  name: string;
  nextRenewalDate: string;
  manageSubscriptionUrl?: string;
}): string {
  const manageUrl = data.manageSubscriptionUrl || "http://72.60.113.9/profile";
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plan updated - Yearly to Monthly</title>
  ${RESPONSIVE_STYLES}
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center" class="mobile-padding" style="padding: 40px 20px;">
        <table role="presentation" class="wrapper" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td class="mobile-padding-sm" style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
              <h1 class="mobile-title" style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.2;">
                ✅ Your plan has been updated
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td class="mobile-padding" style="padding: 40px; background-color: #ffffff;">
              <p class="mobile-text" style="margin: 0 0 20px; color: #333333; font-size: 18px; line-height: 1.6; font-weight: 600;">
                Hi ${data.name || "there"}, your WhatTheFood Premium subscription has been switched from a yearly plan to a monthly plan.
              </p>
              
              <p class="mobile-text" style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                You’ll keep full access to all Premium features, now with the flexibility of monthly billing.
              </p>
              
              <p class="mobile-text" style="margin: 30px 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                Your new billing cycle will renew on <strong style="color: #333333;">${data.nextRenewalDate}</strong>.
              </p>
              
              <!-- Manage Subscription Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${manageUrl}" class="mobile-button" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; text-align: center;">
                      Manage My Subscription
                    </a>
                  </td>
                </tr>
              </table>
              
              <p class="mobile-text" style="margin: 30px 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                To your health,
              </p>
              
              <p class="mobile-text" style="margin: 10px 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                The WhatTheFood Team
              </p>
            </td>
          </tr>
          
          <!-- Need Help Section -->
          <tr>
            <td style="padding: 30px 40px 20px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <div style="border-top: 1px solid #e0e0e0; padding-top: 30px;">
                <h3 style="margin: 0 0 15px; color: #333333; font-size: 18px; font-weight: 600;">Need help?</h3>
                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  If you have any questions, please contact us via the chat widget we have on the site.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Disclaimer Section -->
          <tr>
            <td style="padding: 20px 40px 30px; background-color: #f8f9fa;">
              <div style="border-top: 1px solid #e0e0e0; padding-top: 20px;">
                <h3 style="margin: 0 0 15px; color: #333333; font-size: 16px; font-weight: 600;">Disclaimer</h3>
                <p style="margin: 0 0 15px; color: #666666; font-size: 12px; line-height: 1.6;">
                  The information provided by WhatTheFood, including any analysis or meal planning suggestions, is generated by artificial intelligence and is for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment.
                </p>
                <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.6;">
                  This email is intended only for the use of the individual or entity to which it is addressed and may contain information that is confidential and privileged.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} WhatTheFood. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}



// Generate HTML email for monthly to yearly upgrade
function generateMonthlyToYearlyEmailHTML(data: {
  name: string;
  nextRenewalDate: string;
  manageSubscriptionUrl?: string;
}): string {
  const manageUrl = data.manageSubscriptionUrl || "http://72.60.113.9/profile";
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smart Move - Monthly to Yearly</title>
  ${RESPONSIVE_STYLES}
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center" class="mobile-padding" style="padding: 40px 20px;">
        <table role="presentation" class="wrapper" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td class="mobile-padding-sm" style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
              <h1 class="mobile-title" style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.2;">
                🎉 Smart Move!
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td class="mobile-padding" style="padding: 40px; background-color: #ffffff;">
              <p class="mobile-text" style="margin: 0 0 20px; color: #333333; font-size: 18px; line-height: 1.6; font-weight: 600;">
                We are delighted to confirm your successful switch from a monthly to a WhatTheFood Yearly Premium subscription.
              </p>
              
              <p class="mobile-text" style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                This is a brilliant decision that shows your commitment to long-term health and smart savings.
              </p>
              
              <div style="background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p class="mobile-text" style="margin: 0; color: #0c5460; font-size: 16px; line-height: 1.6; font-weight: 600;">
                  By choosing the annual plan, you have secured 12 months of uninterrupted Premium access while effectively receiving 2 months of service completely free!
                </p>
              </div>
              
              <p class="mobile-text" style="margin: 30px 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                Your new billing cycle is now set to renew annually on <strong style="color: #333333;">${data.nextRenewalDate}</strong>.
              </p>
              
              <p class="mobile-text" style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                You don't need to do anything else—just continue enjoying all the powerful features you love: Unlimited scans, personalized analytics, the Meal Planner, and more.
              </p>
              
              <p class="mobile-text" style="margin: 30px 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                Thank you for your continued loyalty and commitment to WhatTheFood.
              </p>
              
              <!-- Manage Subscription Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${manageUrl}" class="mobile-button" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; text-align: center;">
                      Manage My Subscription
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                To your health,
              </p>
              
              <p style="margin: 10px 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                The WhatTheFood Team
              </p>
            </td>
          </tr>
          
          <!-- Need Help Section -->
          <tr>
            <td style="padding: 30px 40px 20px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <div style="border-top: 1px solid #e0e0e0; padding-top: 30px;">
                <h3 style="margin: 0 0 15px; color: #333333; font-size: 18px; font-weight: 600;">Need help?</h3>
                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  If you have any questions, please contact us via the chat widget we have on the site.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Disclaimer Section -->
          <tr>
            <td style="padding: 20px 40px 30px; background-color: #f8f9fa;">
              <div style="border-top: 1px solid #e0e0e0; padding-top: 20px;">
                <h3 style="margin: 0 0 15px; color: #333333; font-size: 16px; font-weight: 600;">Disclaimer</h3>
                <p style="margin: 0 0 15px; color: #666666; font-size: 12px; line-height: 1.6;">
                  The information provided by WhatTheFood, including any analysis or meal planning suggestions, is generated by artificial intelligence and is for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition or dietary needs.
                </p>
                <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.6;">
                  This email is intended only for the use of the individual or entity to which it is addressed and may contain information that is confidential and privileged. If you are not the intended recipient and have received this email in error, please notify the sender immediately and delete it from your system. Any unauthorized use, dissemination, or copying of this email is strictly prohibited.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Copyright Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} WhatTheFood. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Generate HTML email for Free to Yearly Premium upgrade
function generateYearlyPremiumUpgradeEmailHTML(data: {
  name: string;
  dashboardUrl?: string;
}): string {
  const dashboardUrl = data.dashboardUrl || "http://72.60.113.9/dashboard";
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Premium - Yearly</title>
  ${RESPONSIVE_STYLES}
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center" class="mobile-padding" style="padding: 40px 20px;">
        <table role="presentation" class="wrapper" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td class="mobile-padding-sm" style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
              <h1 class="mobile-title" style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.2;">
                🎉 You're Premium!
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td class="mobile-padding" style="padding: 40px; background-color: #ffffff;">
              <p class="mobile-text" style="margin: 0 0 20px; color: #333333; font-size: 18px; line-height: 1.6; font-weight: 600;">
                Congratulations, ${data.name || "there"}! Your upgrade to WhatTheFood Premium is now complete, and your account has been fully activated.
              </p>
              
              <p class="mobile-text" style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                You are now officially free from the 3-scan daily limit and eligible for all of our site's features.
              </p>
              
              <div style="background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p class="mobile-text" style="margin: 0; color: #0c5460; font-size: 16px; line-height: 1.6; font-weight: 600;">
                  By choosing the annual plan, you have secured 12 months of uninterrupted Premium access while effectively receiving 2 months of service completely free!
                </p>
              </div>
              
              <p class="mobile-text" style="margin: 30px 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                This is a brilliant decision that shows your commitment to long-term health and smart savings.
              </p>
              
              <p class="mobile-text" style="margin: 30px 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                We built WhatTheFood Premium to provide the most comprehensive, seamless, and personalized food analysis experience possible.
              </p>
              
              <p class="mobile-text" style="margin: 30px 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                Thank you for trusting us to be your partner in smarter nutrition. We are confident this investment in your health will pay dividends.
              </p>
              
              <!-- Dashboard Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${dashboardUrl}" class="mobile-button" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; text-align: center;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                To your health,
              </p>
              
              <p style="margin: 10px 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                The WhatTheFood Team
              </p>
            </td>
          </tr>
          
          <!-- Need Help Section -->
          <tr>
            <td style="padding: 30px 40px 20px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <div style="border-top: 1px solid #e0e0e0; padding-top: 30px;">
                <h3 style="margin: 0 0 15px; color: #333333; font-size: 18px; font-weight: 600;">Need help?</h3>
                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  If you have any questions, please contact us via the chat widget we have on the site.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Disclaimer Section -->
          <tr>
            <td style="padding: 20px 40px 30px; background-color: #f8f9fa;">
              <div style="border-top: 1px solid #e0e0e0; padding-top: 20px;">
                <h3 style="margin: 0 0 15px; color: #333333; font-size: 16px; font-weight: 600;">Disclaimer</h3>
                <p style="margin: 0 0 15px; color: #666666; font-size: 12px; line-height: 1.6;">
                  The information provided by WhatTheFood, including any analysis or meal planning suggestions, is generated by artificial intelligence and is for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition or dietary needs.
                </p>
                <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.6;">
                  This email is intended only for the use of the individual or entity to which it is addressed and may contain information that is confidential and privileged. If you are not the intended recipient and have received this email in error, please notify the sender immediately and delete it from your system. Any unauthorized use, dissemination, or copying of this email is strictly prohibited.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Copyright Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} WhatTheFood. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Generate HTML email for premium upgrade (monthly)
function generatePremiumUpgradeEmailHTML(data: {
  name: string;
  dashboardUrl?: string;
}): string {
  const dashboardUrl = data.dashboardUrl || "http://72.60.113.9/dashboard";
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Premium!</title>
  ${RESPONSIVE_STYLES}
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center" class="mobile-padding" style="padding: 40px 20px;">
        <table role="presentation" class="wrapper" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td class="mobile-padding-sm" style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
              <h1 class="mobile-title" style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.2;">
                🎉 You're Premium!
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td class="mobile-padding" style="padding: 40px; background-color: #ffffff;">
              <p class="mobile-text" style="margin: 0 0 20px; color: #333333; font-size: 18px; line-height: 1.6; font-weight: 600;">
                Congratulations, ${data.name}!
              </p>
              
              <p class="mobile-text" style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                Your upgrade to WhatTheFood Premium is now complete and your account has been fully activated.
              </p>
              
              <p class="mobile-text" style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                You are now officially free from the 3-scan daily limit and eligible for all of our site's features.
              </p>
              
              <p class="mobile-text" style="margin: 30px 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                We built WhatTheFood Premium to provide the most comprehensive, seamless, and personalized food analysis experience possible.
              </p>
              
              <p class="mobile-text" style="margin: 30px 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                Thank you for trusting us to be your partner in smarter nutrition. We are confident this investment in your health will pay dividends.
              </p>
              
              <!-- Dashboard Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${dashboardUrl}" class="mobile-button" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; text-align: center;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                To your health,
              </p>
              
              <p style="margin: 10px 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                The WhatTheFood Team
              </p>
            </td>
          </tr>
          
          <!-- Need Help Section -->
          <tr>
            <td style="padding: 30px 40px 20px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <div style="border-top: 1px solid #e0e0e0; padding-top: 30px;">
                <h3 style="margin: 0 0 15px; color: #333333; font-size: 18px; font-weight: 600;">Need help?</h3>
                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  If you have any questions, please contact us via the chat widget we have on the site.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Disclaimer Section -->
          <tr>
            <td style="padding: 20px 40px 30px; background-color: #f8f9fa;">
              <div style="border-top: 1px solid #e0e0e0; padding-top: 20px;">
                <h3 style="margin: 0 0 15px; color: #333333; font-size: 16px; font-weight: 600;">Disclaimer</h3>
                <p style="margin: 0 0 15px; color: #666666; font-size: 12px; line-height: 1.6;">
                  The information provided by WhatTheFood, including any analysis or meal planning suggestions, is generated by artificial intelligence and is for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition or dietary needs.
                </p>
                <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.6;">
                  This email is intended only for the use of the individual or entity to which it is addressed and may contain information that is confidential and privileged. If you are not the intended recipient and have received this email in error, please notify the sender immediately and delete it from your system. Any unauthorized use, dissemination, or copying of this email is strictly prohibited.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Copyright Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} WhatTheFood. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Generate HTML email for signup welcome
function generateSignupWelcomeEmailHTML(data: {
  name: string;
  upgradeUrl?: string;
}): string {
  const appUrl = Deno.env.get("APP_URL") || "http://72.60.113.9";
  const upgradeUrl = data.upgradeUrl || `${appUrl}/plans?plan=premium&cycle=yearly`;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to WhatTheFood</title>
  ${RESPONSIVE_STYLES}
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center" class="mobile-padding" style="padding: 40px 20px;">
        <table role="presentation" class="wrapper" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td class="mobile-padding-sm" style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
              <h1 class="mobile-title" style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.2;">
                🎉 Welcome to our family!
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td class="mobile-padding" style="padding: 40px; background-color: #ffffff;">
              <p class="mobile-text" style="margin: 0 0 20px; color: #333333; font-size: 18px; line-height: 1.6; font-weight: 600;">
                Hooray  🎉
              </p>
              
              <p class="mobile-text" style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                You've just taken the first step toward smarter, more informed eating with our powerful AI food analyzer, and we are thrilled to have you on board.
              </p>
              
              <p class="mobile-text" style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                Your free account is now active, granting you 3 complimentary food scans lifetime (or 3 days, whichever comes first). This is a fantastic way to get started and experience the core functionality of WhatTheFood.
              </p>
              
              <p class="mobile-text" style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                However, to truly transform your health journey and unlock the full potential of our platform, we invite you to explore WhatTheFood Premium.
              </p>
              
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p class="mobile-text" style="margin: 0 0 15px; color: #856404; font-size: 16px; font-weight: 600;">
                  The free version is a great start, but it's designed to give you a taste of what's possible. If you're serious about your health and want a seamless, powerful experience, Premium is the answer.
                </p>
              </div>
              
              <p class="mobile-text" style="margin: 30px 0 20px; color: #333333; font-size: 18px; font-weight: 600; line-height: 1.6;">
                Upgrade to Premium today to instantly unlock:
              </p>
              
              <ul style="margin: 0 0 30px; padding-left: 20px; color: #666666; font-size: 16px; line-height: 1.8;">
                <li><strong>Save History:</strong> Never lose track of your past scans and nutritional insights.</li>
                <li><strong>Account Analytics:</strong> Gain deep, personalized insights into your eating patterns over time.</li>
                <li><strong>Personalized Health Context:</strong> Get analysis tailored specifically to your unique health goals and dietary needs.</li>
                <li><strong>Meal Planner:</strong> Effortlessly plan your meals based on your scan data and health objectives.</li>
                <li><strong>Ad-Free Experience:</strong> Say goodbye to annoying pop-up ads and enjoy uninterrupted analysis.</li>
                <li><strong>Customizable Widget:</strong> Access your most important data right from your home screen.</li>
              </ul>
              
              <p class="mobile-text" style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.6;">
                Ready to move beyond the daily limit and take control of your nutrition?
              </p>
              
              <!-- Upgrade Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${upgradeUrl}" class="mobile-button" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: 600; font-size: 16px; text-align: center;">
                      Upgrade to Premium Now
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                We look forward to helping you analyze your way to a healthier life.
              </p>
              
              <p style="margin: 20px 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Happy analyzing,
              </p>
              
              <p style="margin: 10px 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                The WhatTheFood Team
              </p>
            </td>
          </tr>
          
          <!-- Need Help Section -->
          <tr>
            <td style="padding: 30px 40px 20px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <div style="border-top: 1px solid #e0e0e0; padding-top: 30px;">
                <h3 style="margin: 0 0 15px; color: #333333; font-size: 18px; font-weight: 600;">Need help?</h3>
                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  If you have any questions, please contact us via the chat widget we have on the site.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Disclaimer Section -->
          <tr>
            <td style="padding: 20px 40px 30px; background-color: #f8f9fa;">
              <div style="border-top: 1px solid #e0e0e0; padding-top: 20px;">
                <h3 style="margin: 0 0 15px; color: #333333; font-size: 16px; font-weight: 600;">Disclaimer</h3>
                <p style="margin: 0 0 15px; color: #666666; font-size: 12px; line-height: 1.6;">
                  The information provided by WhatTheFood, including any analysis or meal planning suggestions, is generated by artificial intelligence and is for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition or dietary needs.
                </p>
                <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.6;">
                  This email is intended only for the use of the individual or entity to which it is addressed and may contain information that is confidential and privileged. If you are not the intended recipient and have received this email in error, please notify the sender immediately and delete it from your system. Any unauthorized use, dissemination, or copying of this email is strictly prohibited.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Copyright Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} WhatTheFood. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Generate HTML email for downgrade/cancellation
function generateDowngradeEmailHTML(data: {
  name: string;
  premiumExpirationDate: string;
  monthlyPrice: string;
  monthlyOriginalPrice: string;
  yearlyPrice: string;
  yearlyOriginalPrice: string;
  monthlyCheckoutUrl?: string;
  yearlyCheckoutUrl?: string;
}): string {
  const appUrl = Deno.env.get("APP_URL") || "http://72.60.113.9";
  const monthlyUrl = data.monthlyCheckoutUrl || `${appUrl}/plans?plan=premium&cycle=monthly`;
  const yearlyUrl = data.yearlyCheckoutUrl || `${appUrl}/plans?plan=premium&cycle=yearly`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sorry to see you go</title>
  ${RESPONSIVE_STYLES}
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" class="mobile-padding" style="padding: 40px 20px;">
        <table role="presentation" class="wrapper" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td class="mobile-padding-sm" style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 8px 8px 0 0;">
              <h1 class="mobile-title" style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">WhatTheFood</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="mobile-padding" style="padding: 40px;">
              <h2 class="mobile-title" style="margin: 0 0 20px; color: #333333; font-size: 24px; font-weight: 600;">
                Sorry to see you go, ${data.name} 😞
              </h2>
              
              <p class="mobile-text" style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                Dear ${data.name},
              </p>
              
              <p class="mobile-text" style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                This email confirms that your WhatTheFood Premium subscription has been successfully canceled, as per your request.
              </p>
              
              <p class="mobile-text" style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                Your Premium access will remain active until the end of your current billing period on <strong>${data.premiumExpirationDate}</strong>.
              </p>
              
              <p class="mobile-text" style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                After this date, your account will automatically revert to our free plan. You will still be able to use WhatTheFood, but your usage will be limited to 3 free scans lifetime (or 3 days, whichever comes first).
              </p>
              
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p class="mobile-text" style="margin: 0 0 15px; color: #856404; font-size: 16px; font-weight: 600;">
                  Did you know you'll also be losing access to:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 15px; line-height: 1.8;">
                  <li>Unlimited, ad-free scanning</li>
                  <li>The meal planner and personalized health context</li>
                  <li>Your complete scan history and macro account analytics</li>
                  <li>And a lot more fun and continuously updated features…</li>
                </ul>
              </div>
              
              <p class="mobile-text" style="margin: 30px 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                We'd love to keep you on board, though! As a thank-you for being a customer, we're offering you a special, limited one-time discount to renew your Premium subscription.
              </p>
              
              <!-- Pricing Cards -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td style="padding: 0 10px 20px;">
                    <div style="background-color: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 25px; text-align: center;">
                      <p style="margin: 0 0 10px; color: #28a745; font-size: 14px; font-weight: 600; text-transform: uppercase;">Get 33% off</p>
                      <p style="margin: 0 0 15px; color: #333333; font-size: 18px; font-weight: 600;">
                        <span style="text-decoration: line-through; color: #999; font-size: 16px;">$${data.monthlyOriginalPrice}/m</span>
                        <span style="color: #28a745; margin-left: 8px;">$${data.monthlyPrice}/m</span>
                      </p>
                      <a href="${monthlyUrl}" class="mobile-button" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 16px; text-align: center;">
                        Resubscribe to Premium (Monthly)
                      </a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 10px;">
                    <div style="background-color: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 25px; text-align: center;">
                      <p style="margin: 0 0 10px; color: #28a745; font-size: 14px; font-weight: 600; text-transform: uppercase;">Get 45% off</p>
                      <p style="margin: 0 0 15px; color: #333333; font-size: 18px; font-weight: 600;">
                        <span style="text-decoration: line-through; color: #999; font-size: 16px;">$${data.yearlyOriginalPrice}/y</span>
                        <span style="color: #28a745; margin-left: 8px;">$${data.yearlyPrice}/y</span>
                      </p>
                      <a href="${yearlyUrl}" class="mobile-button" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 16px; text-align: center;">
                        Resubscribe to Premium (Yearly)
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
              
              <p class="mobile-text" style="margin: 30px 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                We appreciate you being a part of the WhatTheFood community and hope to welcome you back to Premium soon.
              </p>
              
              <div style="background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 30px 0; border-radius: 4px;">
                <p class="mobile-text" style="margin: 0; color: #0c5460; font-size: 14px; font-style: italic;">
                  <strong>Note:</strong> There's no other place to find these coupon codes than this email. Don't miss out!
                </p>
              </div>
              
              <p style="margin: 30px 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                To your health,
              </p>
              
              <p style="margin: 10px 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                The WhatTheFood Team
              </p>
            </td>
          </tr>
          
          <!-- Need Help Section -->
          <tr>
            <td style="padding: 30px 40px 20px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
              <div style="border-top: 1px solid #e0e0e0; padding-top: 30px;">
                <h3 style="margin: 0 0 15px; color: #333333; font-size: 18px; font-weight: 600;">Need help?</h3>
                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  If you have any questions, please contact us via the chat widget we have on the site.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Disclaimer Section -->
          <tr>
            <td style="padding: 20px 40px 30px; background-color: #f8f9fa;">
              <div style="border-top: 1px solid #e0e0e0; padding-top: 20px;">
                <h3 style="margin: 0 0 15px; color: #333333; font-size: 16px; font-weight: 600;">Disclaimer</h3>
                <p style="margin: 0 0 15px; color: #666666; font-size: 12px; line-height: 1.6;">
                  The information provided by WhatTheFood, including any analysis or meal planning suggestions, is generated by artificial intelligence and is for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition or dietary needs.
                </p>
                <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.6;">
                  This email is intended only for the use of the individual or entity to which it is addressed and may contain information that is confidential and privileged. If you are not the intended recipient and have received this email in error, please notify the sender immediately and delete it from your system. Any unauthorized use, dissemination, or copying of this email is strictly prohibited.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Copyright Footer -->
          <tr>
            <td style="padding: 20px 40px; text-align: center; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                © ${new Date().getFullYear()} WhatTheFood. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Send HTML email without template
async function sendMailerSendHTMLEmail(
  toEmail: string,
  subject: string,
  htmlContent: string,
  textContent?: string,
  name?: string
) {
  if (!MAILERSEND_API_KEY) {
    console.error("MAILERSEND_API_KEY not configured; skipping email send");
    return { skipped: true, reason: "missing_api_key", error: "MAILERSEND_API_KEY environment variable is not set" };
  }

  if (!subject) {
    console.error("No subject provided; skipping email send");
    return { skipped: true, reason: "missing_subject", error: "Subject is required" };
  }

  // Replace {{name}} in subject if present
  const nameForSubject = name || "there";
  const finalSubject = subject.replace(/\{\{name\}\}/g, nameForSubject);

  const payload: any = {
    from: {
      email: MAILERSEND_FROM_EMAIL,
      name: MAILERSEND_FROM_NAME,
    },
    to: [{ email: toEmail }],
    subject: finalSubject,
    html: htmlContent,
  };

  if (textContent) {
    payload.text = textContent;
  }

  console.log("Sending HTML email via MailerSend:", {
    to: toEmail,
    subject: finalSubject,
    from_email: MAILERSEND_FROM_EMAIL,
  });

  try {
    const res = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MAILERSEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    if (!res.ok) {
      console.error("MailerSend API error:", {
        status: res.status,
        statusText: res.statusText,
        response: responseData,
        payload: JSON.stringify(payload, null, 2),
      });
      return { 
        error: typeof responseData === 'string' ? responseData : JSON.stringify(responseData),
        status: res.status,
        details: responseData,
      };
    }

    console.log("MailerSend HTML email sent successfully:", {
      to: toEmail,
      subject: finalSubject,
      response: responseData,
    });

    return { ok: true, response: responseData };
  } catch (fetchError: any) {
    console.error("MailerSend fetch error:", fetchError?.message || fetchError);
    return { 
      error: fetchError?.message || "Failed to send email",
      details: String(fetchError),
    };
  }
}

async function sendMailerSendEmail(toEmail: string, templateId: string, subject: string, data: Record<string, any> = {}) {
  if (!MAILERSEND_API_KEY) {
    console.error("MAILERSEND_API_KEY not configured; skipping email send");
    return { skipped: true, reason: "missing_api_key", error: "MAILERSEND_API_KEY environment variable is not set" };
  }

  if (!templateId) {
    console.error("No templateId for this event; skipping email send");
    return { skipped: true, reason: "missing_template", error: "Template ID is not configured for this event" };
  }

  if (!subject) {
    console.error("No subject for this event; skipping email send");
    return { skipped: true, reason: "missing_subject", error: "Subject is not configured for this event" };
  }

  const payload = {
    from: {
      email: MAILERSEND_FROM_EMAIL,
      name: MAILERSEND_FROM_NAME,
    },
    to: [{ email: toEmail }],
    subject: subject,
    template_id: templateId,
    personalization: [
      {
        email: toEmail,
        data,
      },
    ],
  };

  console.log("Sending email via MailerSend:", {
    to: toEmail,
    template_id: templateId,
    from_email: MAILERSEND_FROM_EMAIL,
  });

  try {
  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MAILERSEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

    const responseText = await res.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

  if (!res.ok) {
      console.error("MailerSend API error:", {
        status: res.status,
        statusText: res.statusText,
        response: responseData,
        payload: JSON.stringify(payload, null, 2),
      });
      return { 
        error: typeof responseData === 'string' ? responseData : JSON.stringify(responseData),
        status: res.status,
        details: responseData,
      };
    }

    console.log("MailerSend email sent successfully:", {
      to: toEmail,
      template_id: templateId,
      response: responseData,
    });

    return { ok: true, response: responseData };
  } catch (fetchError: any) {
    console.error("MailerSend fetch error:", fetchError?.message || fetchError);
    return { 
      error: fetchError?.message || "Failed to send email",
      details: String(fetchError),
    };
  }
}

Deno.serve(async (req) => {
  // Log every request immediately
  console.log('=== SEND-LIFECYCLE-EMAIL REQUEST RECEIVED ===', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  });

  if (req.method === "OPTIONS") {
    console.log('OPTIONS preflight request');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === "GET") {
    console.log('Health check request');
    return new Response(JSON.stringify({ 
      status: 'ok', 
      function: 'send-lifecycle-email',
      timestamp: new Date().toISOString() 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const eventType: string = body?.event_type;
    const email: string = body?.email;
    const name: string | null = body?.name ?? null;
    const metadata = body?.metadata || {};
    const dryRun = body?.dry_run === true;

    console.log("send-lifecycle-email called:", {
      eventType,
      email,
      hasName: !!name,
      hasMetadata: !!metadata,
      dryRun,
    });

    if (!email) {
      console.error("Email is required but not provided");
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!eventType) {
      console.error("event_type is required but not provided");
      return new Response(JSON.stringify({ error: "event_type is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate eventType
    if (!eventType) {
      return new Response(JSON.stringify({ error: "event_type is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is a Free to Yearly Premium upgrade - send HTML email (bypasses template validation)
    if (eventType === "upgrade_premium_yearly" || eventType === "upgrade_yearly") {
      console.log("Processing yearly premium upgrade email request:", {
        email,
        name,
        hasMetadata: !!metadata,
      });

      const subject = (subjectByEvent["upgrade_premium_yearly"] || "You're Premium, {{name}} 🎉").replace(/\{\{name\}\}/g, name || "there");
      
      // Get dashboard URL from metadata or use default
      const dashboardUrl = metadata.dashboard_url || metadata.dashboardUrl || "http://72.60.113.9/dashboard";
      
      console.log("Generating yearly premium upgrade email HTML with data:", {
        name: name || "there",
        dashboardUrl,
      });
      
      const htmlContent = generateYearlyPremiumUpgradeEmailHTML({
        name: name || "there",
        dashboardUrl: dashboardUrl,
      });
      
      if (dryRun) {
        return new Response(
          JSON.stringify({
            dry_run: true,
            event_type: eventType,
            email,
            subject: subject,
            has_html_content: true,
            metadata,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.log("Sending yearly premium upgrade HTML email via MailerSend");

      const result = await sendMailerSendHTMLEmail(
        email,
        subject,
        htmlContent,
        undefined, // textContent
        name || "there" // name for subject replacement
      );

      // Check if email was skipped or failed
      if (result.skipped || result.error) {
        console.error("Yearly premium upgrade email send failed or skipped:", {
          event_type: eventType,
          email,
          result,
        });
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: result.error || result.reason || "Email send failed",
            result 
          }), 
          {
            status: result.status || 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("Yearly premium upgrade email sent successfully");

      return new Response(JSON.stringify({ success: true, result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is a premium upgrade (monthly) - send HTML email (bypasses template validation)
    if (eventType === "upgrade_premium" || eventType === "upgrade") {
      console.log("Processing premium upgrade email request:", {
        email,
        name,
        hasMetadata: !!metadata,
      });

      const subject = (subjectByEvent["upgrade_premium"] || "You're Premium, {{name}} 🎉").replace(/\{\{name\}\}/g, name || "there");
      
      // Get dashboard URL from metadata or use default
      const dashboardUrl = metadata.dashboard_url || metadata.dashboardUrl || "http://72.60.113.9/dashboard";
      
      console.log("Generating premium upgrade email HTML with data:", {
        name: name || "there",
        dashboardUrl,
      });
      
      const htmlContent = generatePremiumUpgradeEmailHTML({
        name: name || "there",
        dashboardUrl: dashboardUrl,
      });
      
      if (dryRun) {
        return new Response(
          JSON.stringify({
            dry_run: true,
            event_type: eventType,
            email,
            subject: subject,
            has_html_content: true,
            metadata,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.log("Sending premium upgrade HTML email via MailerSend");

      const result = await sendMailerSendHTMLEmail(
        email,
        subject,
        htmlContent,
        undefined, // textContent
        name || "there" // name for subject replacement
      );

      // Check if email was skipped or failed
      if (result.skipped || result.error) {
        console.error("Premium upgrade email send failed or skipped:", {
          event_type: eventType,
          email,
          result,
        });
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: result.error || result.reason || "Email send failed",
            result 
          }), 
          {
            status: result.status || 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("Premium upgrade email sent successfully");

      return new Response(JSON.stringify({ success: true, result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is a monthly to yearly upgrade - send HTML email (bypasses template validation)
    if (eventType === "monthly_to_annual" || eventType === "monthly_to_yearly") {
      console.log("Processing monthly to yearly email request:", {
        email,
        name,
        hasMetadata: !!metadata,
      });

      const subject = (subjectByEvent["monthly_to_annual"] || "Smart Move, {{name}} 🎉").replace(/\{\{name\}\}/g, name || "there");
      
      // Get next renewal date from metadata or use default
      const nextRenewalDate = metadata.next_renewal_date || metadata.nextRenewalDate || metadata.current_period_end || "your next billing date";
      const manageSubscriptionUrl = metadata.manage_subscription_url || metadata.manageSubscriptionUrl || "http://72.60.113.9/profile";
      
      console.log("Generating monthly to yearly email HTML with data:", {
        name: name || "there",
        nextRenewalDate,
        manageSubscriptionUrl,
      });
      
      const htmlContent = generateMonthlyToYearlyEmailHTML({
        name: name || "there",
        nextRenewalDate: nextRenewalDate,
        manageSubscriptionUrl: manageSubscriptionUrl,
      });
      
      if (dryRun) {
        return new Response(
          JSON.stringify({
            dry_run: true,
            event_type: eventType,
            email,
            subject: subject,
            has_html_content: true,
            metadata,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.log("Sending monthly to yearly HTML email via MailerSend");

      const result = await sendMailerSendHTMLEmail(
        email,
        subject,
        htmlContent,
        undefined, // textContent
        name || "there" // name for subject replacement
      );

      // Check if email was skipped or failed
      if (result.skipped || result.error) {
        console.error("Monthly to yearly email send failed or skipped:", {
          event_type: eventType,
          email,
          result,
        });
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: result.error || result.reason || "Email send failed",
            result 
          }), 
          {
            status: result.status || 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("Monthly to yearly email sent successfully");

      return new Response(JSON.stringify({ success: true, result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Check if this is a yearly to monthly change - send HTML email (bypasses template validation)
    if (eventType === "yearly_to_monthly") {
      console.log("Processing yearly to monthly email request:", {
        email,
        name,
        hasMetadata: !!metadata,
      });

      const subject = (subjectByEvent["yearly_to_monthly"] || "You've switched to monthly, {{name}} ✅").replace(/\{\{name\}\}/g, name || "there");
      
      const nextRenewalDate = metadata.next_renewal_date || metadata.nextRenewalDate || metadata.current_period_end || "your next billing date";
      const manageSubscriptionUrl = metadata.manage_subscription_url || metadata.manageSubscriptionUrl || "http://72.60.113.9/profile";
      
      console.log("Generating yearly to monthly email HTML with data:", {
        name: name || "there",
        nextRenewalDate,
        manageSubscriptionUrl,
      });
      
      const htmlContent = generateYearlyToMonthlyEmailHTML({
        name: name || "there",
        nextRenewalDate,
        manageSubscriptionUrl,
      });
      
      if (dryRun) {
        return new Response(
          JSON.stringify({
            dry_run: true,
            event_type: eventType,
            email,
            subject: subject,
            has_html_content: true,
            metadata,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.log("Sending yearly to monthly HTML email via MailerSend");

      const result = await sendMailerSendHTMLEmail(
        email,
        subject,
        htmlContent,
        undefined,
        name || "there"
      );

      if (result.skipped || result.error) {
        console.error("Yearly to monthly email send failed or skipped:", {
          event_type: eventType,
          email,
          result,
        });
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: result.error || result.reason || "Email send failed",
            result 
          }), 
          {
            status: result.status || 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("Yearly to monthly email sent successfully");

      return new Response(JSON.stringify({ success: true, result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is a downgrade - send HTML email (bypasses template validation)
    if (eventType === "downgrade") {
      console.log("Processing downgrade email request:", {
        email,
        name,
        hasMetadata: !!metadata,
      });

      const subject = (subjectByEvent[eventType] || "Sorry to see you go, {{name}} 😞").replace(/\{\{name\}\}/g, name || "there");
      
      // Generate HTML email from metadata
      const premiumExpirationDate = metadata.premium_expiration_date || metadata.current_period_end || "the end of your billing period";
      const monthlyPrice = metadata.monthly_price || "9.99";
      const monthlyOriginalPrice = metadata.monthly_original_price || "14.99";
      const yearlyPrice = metadata.yearly_price || "99.99";
      const yearlyOriginalPrice = metadata.yearly_original_price || "149.99";
      const monthlyCheckoutUrl = metadata.monthly_checkout_url;
      const yearlyCheckoutUrl = metadata.yearly_checkout_url;
      
      console.log("Generating downgrade email HTML with data:", {
        name: name || "there",
        premiumExpirationDate,
        monthlyPrice,
        yearlyPrice,
      });
      
      const htmlContent = generateDowngradeEmailHTML({
        name: name || "there",
        premiumExpirationDate: premiumExpirationDate,
        monthlyPrice: monthlyPrice,
        monthlyOriginalPrice: monthlyOriginalPrice,
        yearlyPrice: yearlyPrice,
        yearlyOriginalPrice: yearlyOriginalPrice,
        monthlyCheckoutUrl: monthlyCheckoutUrl,
        yearlyCheckoutUrl: yearlyCheckoutUrl,
      });
      
      if (dryRun) {
        return new Response(
          JSON.stringify({
            dry_run: true,
            event_type: eventType,
            email,
            subject: subject,
            has_html_content: true,
            metadata,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.log("Sending downgrade HTML email via MailerSend");

      const result = await sendMailerSendHTMLEmail(
        email,
        subject,
        htmlContent,
        undefined, // textContent
        name || "there" // name for subject replacement
      );

      // Check if email was skipped or failed
      if (result.skipped || result.error) {
        console.error("Downgrade email send failed or skipped:", {
          event_type: eventType,
          email,
          result,
        });
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: result.error || result.reason || "Email send failed",
            result 
          }), 
          {
            status: result.status || 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("Downgrade email sent successfully");

      return new Response(JSON.stringify({ success: true, result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this is a signup - send HTML email (bypasses template validation)
    if (eventType === "signup") {
      console.log("Processing signup welcome email request:", {
        email,
        name,
        hasMetadata: !!metadata,
      });

      const subject = (subjectByEvent["signup"] || "Welcome to our family, {{name}} 🎉").replace(/\{\{name\}\}/g, name || "there");
      
      // Get upgrade URL from metadata or use default
      const upgradeUrl = metadata.upgrade_url || metadata.upgradeUrl || `${Deno.env.get("APP_URL") || "http://72.60.113.9"}/plans?plan=premium&cycle=yearly`;
      
      console.log("Generating signup welcome email HTML with data:", {
        name: name || "there",
        upgradeUrl,
      });
      
      const htmlContent = generateSignupWelcomeEmailHTML({
        name: name || "there",
        upgradeUrl: upgradeUrl,
      });
      
      if (dryRun) {
        return new Response(
          JSON.stringify({
            dry_run: true,
            event_type: eventType,
            email,
            subject: subject,
            has_html_content: true,
            metadata,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      console.log("Sending signup welcome HTML email via MailerSend");

      const result = await sendMailerSendHTMLEmail(
        email,
        subject,
        htmlContent,
        undefined, // textContent
        name || "there" // name for subject replacement
      );

      // Check if email was skipped or failed
      if (result.skipped || result.error) {
        console.error("Signup welcome email send failed or skipped:", {
          event_type: eventType,
          email,
          result,
        });
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: result.error || result.reason || "Email send failed",
            result 
          }), 
          {
            status: result.status || 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("Signup welcome email sent successfully");

      return new Response(JSON.stringify({ success: true, result }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Template-based emails (other event types if any)
    // Note: signup, downgrade, upgrade_premium, upgrade_premium_yearly, and monthly_to_annual are handled above and don't need a template
    const templateId = templateByEvent[eventType];
    if (!templateId) {
      console.error("Template not configured for event type:", eventType);
      return new Response(JSON.stringify({ error: `Template not configured for event_type: ${eventType}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = subjectByEvent[eventType] || "Email from What The Food";

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          event_type: eventType,
          email,
          template_id: templateId,
          subject: subject,
          metadata,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = await sendMailerSendEmail(email, templateId, subject, {
      name: name || "there",
      ...metadata,
    });

    // Check if email was skipped or failed
    if (result.skipped || result.error) {
      console.error("Email send failed or skipped:", {
        event_type: eventType,
        email,
        result,
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error || result.reason || "Email send failed",
          result 
        }), 
        {
          status: result.status || 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-lifecycle-email error:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});