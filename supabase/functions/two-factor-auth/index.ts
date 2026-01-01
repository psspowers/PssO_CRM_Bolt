import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as OTPAuth from "npm:otpauth@9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  action: "check" | "setup" | "enable" | "disable" | "verify" | "send-email-otp";
  userId: string;
  email?: string;
  method?: "email" | "authenticator";
  code?: string;
}

// Simple encryption for secrets (base64 encoding for demo - use proper encryption in production)
const encryptSecret = (secret: string): string => {
  return btoa(secret);
};

const decryptSecret = (encrypted: string): string => {
  return atob(encrypted);
};

// Generate backup codes
const generateBackupCodes = (count: number = 8): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    codes.push(code);
  }
  return codes;
};

// Hash backup codes for storage
const hashBackupCode = async (code: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Verify backup code against stored hashes
const verifyBackupCode = async (code: string, hashedCodes: string[]): Promise<boolean> => {
  const hash = await hashBackupCode(code);
  return hashedCodes.includes(hash);
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: RequestBody = await req.json();
    const { action, userId, email, method, code } = body;

    // CHECK: Get user's 2FA status
    if (action === "check") {
      const { data: user, error } = await supabase
        .from("crm_users")
        .select("two_factor_enabled, two_factor_secret")
        .eq("id", userId)
        .maybeSingle();

      if (error || !user) {
        return new Response(
          JSON.stringify({ enabled: false, method: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine method based on secret presence
      const detectedMethod = user.two_factor_secret ? "authenticator" : "email";

      return new Response(
        JSON.stringify({
          enabled: user.two_factor_enabled,
          method: detectedMethod
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SETUP: Initialize 2FA setup
    if (action === "setup") {
      if (method === "authenticator") {
        // Generate TOTP secret
        const secret = new OTPAuth.Secret({ size: 20 });
        const totp = new OTPAuth.TOTP({
          issuer: "PSS Orange CRM",
          label: email || "user",
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: secret,
        });

        // Generate QR code URL
        const otpAuthUrl = totp.toString();

        // Generate backup codes
        const backupCodes = generateBackupCodes();
        const hashedCodes = await Promise.all(backupCodes.map(c => hashBackupCode(c)));

        // Store encrypted secret (not enabled yet)
        const encryptedSecret = encryptSecret(secret.base32);
        await supabase
          .from("crm_users")
          .update({
            two_factor_secret: encryptedSecret,
            backup_codes: hashedCodes,
            two_factor_enabled: false, // Not enabled until verified
          })
          .eq("id", userId);

        return new Response(
          JSON.stringify({
            secret: secret.base32,
            otpAuthUrl,
            backupCodes,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Email method - just generate backup codes
        const backupCodes = generateBackupCodes();
        const hashedCodes = await Promise.all(backupCodes.map(c => hashBackupCode(c)));

        await supabase
          .from("crm_users")
          .update({
            two_factor_secret: null,
            backup_codes: hashedCodes,
            two_factor_enabled: false,
          })
          .eq("id", userId);

        return new Response(
          JSON.stringify({ backupCodes }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ENABLE: Verify code and enable 2FA
    if (action === "enable") {
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: user, error } = await supabase
        .from("crm_users")
        .select("two_factor_secret")
        .eq("id", userId)
        .maybeSingle();

      if (error || !user || !user.two_factor_secret) {
        return new Response(
          JSON.stringify({ error: "2FA not set up" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the code
      const secret = decryptSecret(user.two_factor_secret);
      const totp = new OTPAuth.TOTP({
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secret),
      });

      const delta = totp.validate({ token: code, window: 1 });

      if (delta === null) {
        return new Response(
          JSON.stringify({ error: "Invalid code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Enable 2FA
      await supabase
        .from("crm_users")
        .update({
          two_factor_enabled: true,
          two_factor_verified_at: new Date().toISOString(),
        })
        .eq("id", userId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DISABLE: Turn off 2FA
    if (action === "disable") {
      await supabase
        .from("crm_users")
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          backup_codes: null,
          two_factor_verified_at: null,
        })
        .eq("id", userId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // VERIFY: Verify a code during login
    if (action === "verify") {
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Code is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: user, error } = await supabase
        .from("crm_users")
        .select("two_factor_secret, backup_codes")
        .eq("id", userId)
        .maybeSingle();

      if (error || !user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if it's a backup code (8 characters)
      if (code.length === 8 && user.backup_codes) {
        const isValid = await verifyBackupCode(code, user.backup_codes);

        if (isValid) {
          // Remove used backup code
          const hashedCode = await hashBackupCode(code);
          const remainingCodes = user.backup_codes.filter((c: string) => c !== hashedCode);

          await supabase
            .from("crm_users")
            .update({
              backup_codes: remainingCodes,
              two_factor_verified_at: new Date().toISOString(),
            })
            .eq("id", userId);

          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Check if it's a TOTP code (6 digits)
      if (code.length === 6 && user.two_factor_secret) {
        const secret = decryptSecret(user.two_factor_secret);
        const totp = new OTPAuth.TOTP({
          algorithm: "SHA1",
          digits: 6,
          period: 30,
          secret: OTPAuth.Secret.fromBase32(secret),
        });

        const delta = totp.validate({ token: code, window: 1 });

        if (delta !== null) {
          await supabase
            .from("crm_users")
            .update({
              two_factor_verified_at: new Date().toISOString(),
            })
            .eq("id", userId);

          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ error: "Invalid code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SEND-EMAIL-OTP: Send OTP via email (placeholder - requires email service)
    if (action === "send-email-otp") {
      // This would integrate with your email service
      // For now, return success (you'll need to implement actual email sending)
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email OTP not yet implemented"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("2FA function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});