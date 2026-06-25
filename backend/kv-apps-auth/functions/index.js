const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { Resend } = require("resend");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// CONFIGURATION: Replace these with your details
const SENDER_EMAIL = "auth-noreply@kvapps.in";

// 1. GENERATE AND SEND OTP
exports.sendOtp = onRequest({ cors: true, secrets: ["RESEND_API_KEY"] }, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).send({ success: false, message: "Email is required" });
  }

  // Generate a clean 6-digit number
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minute validity

  // DYNAMIC TIMESTAMP GENERATION
  const now = new Date();

  // Format the date string cleanly (e.g., "21st June 2026")
  const day = now.getDate();
  const month = now.toLocaleString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' });
  const year = now.getFullYear();

  // Add English suffix logic for ordinal numbers (st, nd, rd, th)
  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';

  const formattedDate = `${day}${suffix} ${month} ${year}`;

  // Format the time string cleanly (e.g., "11:35 PM")
  const formattedTime = now.toLocaleString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata' // Forces IST layout regardless of where Google servers host the function
  }).toUpperCase();

  const timestampString = `${formattedDate} - ${formattedTime}`;

  try {
    // Save to Firestore, overwriting any previous OTP for this email
    await db.collection("otps").doc(email).set({ otp, expiresAt });

    // Read the secret key directly from the system environment safely
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send email via Resend
    await resend.emails.send({
      from: `KvApps Auth <${SENDER_EMAIL}>`,
      to: email,
      subject: `${otp} is your KvApps verification code`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2>Use the following OTP to complete your login.</h2>
          <p>This code expires in 5 minutes.</p>
          <h1 style="font-size: 32px; letter-spacing: 5px; color: #1a73e8;">${otp}</h1>
          <p> Request time: ${timestampString} IST </p>
        </div>
      `
    });

    return res.status(200).send({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    return res.status(500).send({ success: false, error: error.message });
  }
});

// 2. VERIFY OTP AND RETURN AUTH TOKEN
exports.verifyOtp = onRequest({ cors: true }, async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).send({ success: false, message: "Email and OTP are required" });
  }

  try {
    const docRef = db.collection("otps").doc(email);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(400).send({ success: false, message: "No OTP requested for this email" });
    }

    const data = doc.data();

    // Validate matches and expiry
    if (data.otp !== otp.trim()) {
      return res.status(400).send({ success: false, message: "Invalid verification code" });
    }
    if (Date.now() > data.expiresAt) {
      return res.status(400).send({ success: false, message: "Code has expired" });
    }

    // Delete used OTP immediately
    await docRef.delete();

    // Check if user exists in Firebase Auth, if not create them
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        userRecord = await admin.auth().createUser({ email });
      } else {
        throw error;
      }
    }

    // Create a secure login token for this specific user
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    return res.status(200).send({ success: true, token: customToken });
  } catch (error) {
    return res.status(500).send({ success: false, error: error.message });
  }
});
