
import nodemailer from 'nodemailer'

export const sendOtpEmail = async ({ to, otp }) => {
    const {
        SMTP_HOST = 'smtp.gmail.com',
        SMTP_PORT = '465',
        SMTP_SECURE = 'true',
        SMTP_USER,
        SMTP_PASS,
        SMTP_FROM,
    } = process.env

    if (!SMTP_USER || !SMTP_PASS) {
        throw new Error('SMTP_USER or SMTP_PASS is not configured.')
    }

    // Create the transporter only when sending an email.
    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: SMTP_SECURE === 'true',
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
    })

    return transporter.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to,
        subject: 'Verify your ReSurface email',
        text: `Your ReSurface verification code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
        <h2>Welcome to ReSurface</h2>
        <p>Use this code to verify your email address:</p>
        <div style="font-size: 30px; font-weight: bold; letter-spacing: 8px;">
          ${otp}
        </div>
        <p>This code expires in <strong>5 minutes</strong>.</p>
        <p>If you did not request this code, you can ignore this email.</p>
      </div>
    `,
    })
}
