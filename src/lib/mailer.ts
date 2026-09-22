// src/lib/mailer.ts
import nodemailer from 'nodemailer';

// ============================================
// TRANSPORTER SMTP
// ============================================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true pour port 465, false pour 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ============================================
// ENVOI EMAIL — RÉINITIALISATION MOT DE PASSE
// ============================================

export async function sendPasswordResetEmail({
  to,
  nom,
  prenom,
  resetUrl,
}: {
  to: string;
  nom: string;
  prenom: string;
  resetUrl: string;
}) {
  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'MapCommercial'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to,
    subject: '🔐 Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9fafb;border-radius:12px">
        <div style="background:linear-gradient(135deg,#1e3a8a,#1e40af);padding:24px;border-radius:12px 12px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:22px">Réinitialisation de mot de passe</h1>
        </div>
        <div style="background:white;padding:32px;border-radius:0 0 12px 12px">
          <p>Bonjour <strong>${prenom} ${nom}</strong>,</p>
          <p>Vous avez demandé à modifier votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
          <div style="text-align:center;margin:32px 0">
            <a href="${resetUrl}" style="display:inline-block;background:#1e40af;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">
              Modifier mon mot de passe
            </a>
          </div>
          <p style="color:#6b7280;font-size:13px">⏱️ Ce lien expire dans <strong>15 minutes</strong> et ne peut être utilisé qu'une seule fois.</p>
          <p style="color:#6b7280;font-size:13px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
          <p style="color:#9ca3af;font-size:12px">Email automatique — merci de ne pas y répondre.</p>
        </div>
      </div>
    `,
  });
}

// ============================================
// (BONUS) ENVOI GÉNÉRIQUE — réutilisable
// ============================================

export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'MapCommercial'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}