import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import crypto from "crypto";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Standard security: don't reveal if user exists, but here we process logic behind the scenes
    const user = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true }
    });

    if (!user) {
      // User doesn't exist. Just return success to prevent email enumeration.
      return NextResponse.json({ success: true, message: "If an account exists, a reset link has been sent." });
    }

    let isGoogleOnly = false;
    // If they have no password set, but have accounts, they are an OAuth user
    if (!user.password && user.accounts.length > 0) {
      isGoogleOnly = true;
    }

    // Generate token if not google only
    let resetToken = "";
    if (!isGoogleOnly) {
      resetToken = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 3600 * 1000); // 1 hour

      // Save token to DB
      await prisma.verificationToken.upsert({
        where: {
          identifier_token: {
            identifier: email,
            token: resetToken 
          }
        },
        update: {},
        create: {
          identifier: email,
          token: resetToken,
          expires
        }
      }).catch(async () => {
         // if upsert fails on unique constraint, delete old tokens for this email and create new
         await prisma.verificationToken.deleteMany({ where: { identifier: email } });
         await prisma.verificationToken.create({
            data: { identifier: email, token: resetToken, expires }
         });
      });
    }

    // Create a Nodemailer transporter using Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Prepare email content
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    
    let emailText = "";
    let emailHtml = "";

    if (isGoogleOnly) {
      emailText = `Hello,\n\nYou requested a password reset for your GigSpot account. However, you registered using Google and do not have a password on our system.\n\nPlease go back to the login page and click 'Continue with Google' to sign in.\n\nThanks,\nGigSpot Team`;
      emailHtml = `<p>Hello,</p><p>You requested a password reset for your GigSpot account. However, you registered using Google and do not have a password on our system.</p><p>Please go back to the login page and click <strong>Continue with Google</strong> to sign in.</p><p>Thanks,<br/>GigSpot Team</p>`;
    } else {
      emailText = `Hello,\n\nYou requested a password reset for your GigSpot account.\n\nPlease click the following link to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nThanks,\nGigSpot Team`;
      emailHtml = `<p>Hello,</p><p>You requested a password reset for your GigSpot account.</p><p>Please click the link below to reset your password:</p><a href="${resetUrl}">${resetUrl}</a><p>This link will expire in 1 hour.</p><p>Thanks,<br/>GigSpot Team</p>`;
    }

    // Send mail
    const info = await transporter.sendMail({
      from: '"GigSpot Security" <irfanniesa7@gmail.com>',
      to: email,
      subject: isGoogleOnly ? "GigSpot Account Info" : "Password Reset - GigSpot",
      text: emailText,
      html: emailHtml,
    });

    console.log("Email sent successfully: %s", info.messageId);

    return NextResponse.json({ 
      success: true, 
      message: "If an account exists, a reset link has been sent."
    });

  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
