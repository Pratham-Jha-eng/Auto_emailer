import { Resend } from 'resend';
import { EmailDraft } from '../types'; // Import your existing type

// Initialize Resend with the *secure* API key from Vercel
const resend = new Resend(process.env.RESEND_API_KEY || "");

// This is the Vercel Serverless Function handler
export default async function POST(req: Request) {
  try {
    // 1. Get the draft and recipient email from the frontend
    const { draft, recipientEmail } = await req.json() as { draft: EmailDraft, recipientEmail: string };

    if (!draft || !recipientEmail) {
      return new Response(JSON.stringify({ error: 'Missing draft or recipient email' }), { status: 400 });
    }

    // 2. Send the email using Resend
    const { data, error } = await resend.emails.send({
      from: 'Intelligent Report Mailer <onboarding@resend.dev>', // Use this for testing
      to: [recipientEmail], // The recipient you set in the UI
      subject: draft.subject,
      html: draft.body,
    });

    if (error) {
      console.error("Resend Error:", error);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500 });
    }

    // 3. Send a success message back to the frontend
    return new Response(JSON.stringify({ message: 'Email sent successfully!' }), { status: 200 });

  } catch (error: any) {
    console.error("Server Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}