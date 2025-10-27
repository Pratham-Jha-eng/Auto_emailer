import { Resend } from 'resend';
import { EmailDraft } from '../types';

const resend = new Resend(process.env.RESEND_API_KEY || "");

// Use 'any' for the request and response types to avoid needing new packages
export default async function handler(req: any, res: any) { 
  
  // Check if the request method is POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // 1. Get the draft from the *parsed* body (req.body)
    const { draft, recipientEmail } = req.body as { draft: EmailDraft, recipientEmail: string };

    if (!draft || !recipientEmail) {
      // 2. Use res.status().json() to send a response
      return res.status(400).json({ error: 'Missing draft or recipient email' });
    }

    // 3. Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Intelligent Report Mailer <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: draft.subject,
      html: draft.body,
    });

    if (error) {
      console.error("Resend Error:", error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    // 4. Send success response
    return res.status(200).json({ message: 'Email sent successfully!' });

  } catch (error: any) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: error.message });
  }
}