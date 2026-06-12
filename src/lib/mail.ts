import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendWelcomeEmail(to: string, name: string) {
  const mailOptions = {
    from: `"SkillViva Team" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Welcome to SkillViva! 🚀',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to SkillViva, ${name}!</h2>
        <p>Your account has been created successfully. We're excited to have you on board.</p>
        <p>Get ready for brutally honest, real-world mock interviews powered by AI.</p>
        <br/>
        <p>Best Regards,</p>
        <p>The SkillViva Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Welcome email sent to:", to);
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
}

export async function sendLoginOTP(to: string, otp: string) {
  const mailOptions = {
    from: `"SkillViva Security" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your SkillViva Access Code',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
        <h2>Login Access Code</h2>
        <p>Use the following 6-digit OTP to access your SkillViva account:</p>
        <h1 style="background: #eee; padding: 10px; letter-spacing: 5px; color: #333;">${otp}</h1>
        <p>This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("OTP email sent to:", to);
  } catch (error) {
    console.error("Error sending OTP email:", error);
  }
}