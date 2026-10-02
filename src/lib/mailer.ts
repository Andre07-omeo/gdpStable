// src/lib/mailer.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail({
  to, nom, prenom, resetUrl,
}: {
  to: string; nom: string; prenom: string; resetUrl: string;
}) {
  await resend.emails.send({
    from: 'GDP <omeongaandre2@gmail.com>',  // ou ton domaine vérifié
    to,
    subject: '🔐 Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9fafb;border-radius:12px">
        <h1 style="color:#1e3a8a">Réinitialisation de mot de passe</h1>
        <p>Bonjour <strong>${prenom} ${nom}</strong>,</p>
        <p>Cliquez sur le bouton ci-dessous :</p>
        <div style="text-align:center;margin:32px 0">
          <a href="${resetUrl}" style="display:inline-block;background:#1e40af;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">
            Modifier mon mot de passe
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px">⏱️ Ce lien expire dans 15 minutes.</p>
      </div>
    `,
  });
}

export async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
  await resend.emails.send({ from: 'MapCommercial <onboarding@resend.dev>', to, subject, html });
}