import { MailService } from '@sendgrid/mail';

let mailService: MailService | null = null;

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface BookingEmailData {
  title: string;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  organizerName: string;
  organizerEmail: string;
}

export async function sendBookingInvites(
  attendees: string[],
  bookingData: BookingEmailData
): Promise<boolean> {
  if (!mailService || !process.env.SENDGRID_API_KEY) {
    console.log('SendGrid not configured. Email invites would be sent to:', attendees);
    return true; // Return true for demo purposes
  }

  try {
    const { title, roomName, date, startTime, endTime, description, organizerName, organizerEmail } = bookingData;
    
    const subject = `Meeting Invitation: ${title}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976D2;">Meeting Invitation</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">${title}</h3>
          <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
          <p><strong>Location:</strong> ${roomName}</p>
          <p><strong>Organizer:</strong> ${organizerName} (${organizerEmail})</p>
          ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
        </div>
        <p>Please confirm your attendance by replying to this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This invitation was sent from the RoomBook Meeting Portal.</p>
      </div>
    `;

    const emails = attendees.map(email => ({
      to: email,
      from: organizerEmail,
      subject,
      html: htmlContent,
    }));

    await mailService.send(emails);
    console.log(`Email invites sent to ${attendees.length} attendees`);
    return true;
  } catch (error) {
    console.error('Failed to send email invites:', error);
    return false;
  }
}

export async function sendBookingConfirmation(
  organizerEmail: string,
  bookingData: BookingEmailData
): Promise<boolean> {
  if (!mailService || !process.env.SENDGRID_API_KEY) {
    console.log('SendGrid not configured. Confirmation email would be sent to:', organizerEmail);
    return true; // Return true for demo purposes
  }

  try {
    const { title, roomName, date, startTime, endTime, description } = bookingData;
    
    const subject = `Booking Confirmed: ${title}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Booking Confirmed</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">${title}</h3>
          <p><strong>Date:</strong> ${new Date(date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
          <p><strong>Room:</strong> ${roomName}</p>
          ${description ? `<p><strong>Description:</strong> ${description}</p>` : ''}
        </div>
        <p>Your meeting room has been successfully booked. You can manage your booking through the RoomBook portal.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This confirmation was sent from the RoomBook Meeting Portal.</p>
      </div>
    `;

    await mailService.send({
      to: organizerEmail,
      from: organizerEmail,
      subject,
      html: htmlContent,
    });

    console.log(`Booking confirmation sent to ${organizerEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send booking confirmation:', error);
    return false;
  }
}