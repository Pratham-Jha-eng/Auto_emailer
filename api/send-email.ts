import { Resend } from 'resend';
import { EmailDraft } from '../types';

const resend = new Resend(process.env.RESEND_API_KEY || "");

export default async function handler(req: any, res: any) { 
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // --- UPDATED --- Expect 'recipientEmails' (plural) as an array
    const { draft, recipientEmails } = req.body as { draft: EmailDraft, recipientEmails: string[] };

    if (!draft || !recipientEmails || !Array.isArray(recipientEmails) || recipientEmails.length === 0) {
      return res.status(400).json({ error: 'Missing draft or valid recipient emails array' });
    }

    // --- UPDATED --- Pass the array directly to Resend's 'to' field
    const { data, error } = await resend.emails.send({
      from: 'Intelligent Report Mailer <onboarding@resend.dev>',
      to: recipientEmails, // Resend accepts an array here
      subject: draft.subject,
      html: draft.body,
    });

    if (error) {
      console.error("Resend Error:", error);
      // Provide more specific error if possible
      let errorMessage = 'Failed to send email';
      if (error.message) {
          errorMessage = error.message;
      }
      return res.status(500).json({ error: errorMessage });
    }

    return res.status(200).json({ message: 'Email sent successfully!' });

  } catch (error: any) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message || 'An internal server error occurred' });
  }
}
