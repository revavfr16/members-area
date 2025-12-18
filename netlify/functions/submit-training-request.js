import { jwtVerify } from "jose";
import { Resend } from "resend";
import { getStore } from "@netlify/blobs";
import crypto from "crypto";

// Email configuration from environment variables
const TRAINING_FROM_EMAIL =
  process.env.TRAINING_FROM_EMAIL ||
  "Training Funds Request <noreply@internal.reva16.org>";
const TRAINING_APPROVER_EMAIL = process.env.TRAINING_APPROVER_EMAIL;
const TRAINING_DISBURSER_EMAIL = process.env.TRAINING_DISBURSER_EMAIL;

function formatCurrency(value) {
  if (!value) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parseFloat(value));
}

/**
 * Generate request ID: username-YYYYMMDD-sequence
 * e.g., dzager-20251218-1
 */
async function generateRequestId(email, store) {
  const username = email.split("@")[0];
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `${username}-${dateStr}`;

  // Get today's sequence number
  const sequenceKey = `sequence-${prefix}`;
  let sequence = 1;

  try {
    const existing = await store.get(sequenceKey);
    if (existing) {
      sequence = parseInt(existing, 10) + 1;
    }
  } catch {
    // First request of the day
  }

  await store.set(sequenceKey, String(sequence));
  return `${prefix}-${sequence}`;
}

/**
 * Generate a secure token for the approval form
 */
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Calculate cost breakdown by payment timing
 */
function calculateCostBreakdown(data) {
  const registration = parseFloat(data.registration_fee) || 0;
  const hotel =
    parseFloat(data.hotel_cost) || parseFloat(data.hotel_total) || 0;
  const flight = parseFloat(data.flight_cost) || 0;
  const mileage = data.mileage_needed ? parseFloat(data.mileage_total) || 0 : 0;
  const meals = data.meals_needed ? parseFloat(data.meals_total) || 0 : 0;

  // Build prepaid items (department pays before)
  const prepaidItems = [];
  let prepaidTotal = 0;
  if (data.pay_ahead_registration && registration > 0) {
    prepaidItems.push({ label: "Registration", amount: registration });
    prepaidTotal += registration;
  }
  if (data.pay_ahead_hotel && hotel > 0) {
    prepaidItems.push({ label: "Hotel", amount: hotel });
    prepaidTotal += hotel;
  }
  if (data.pay_ahead_flight && flight > 0) {
    prepaidItems.push({ label: "Airfare", amount: flight });
    prepaidTotal += flight;
  }

  // Build reimbursement items (paid after)
  const reimbursementItems = [];
  let reimbursementTotal = 0;
  if (!data.pay_ahead_registration && registration > 0) {
    reimbursementItems.push({ label: "Registration", amount: registration });
    reimbursementTotal += registration;
  }
  if (!data.pay_ahead_hotel && hotel > 0) {
    reimbursementItems.push({ label: "Hotel", amount: hotel });
    reimbursementTotal += hotel;
  }
  if (!data.pay_ahead_flight && flight > 0) {
    reimbursementItems.push({ label: "Airfare", amount: flight });
    reimbursementTotal += flight;
  }
  // Mileage and meals are always reimbursement
  if (mileage > 0) {
    reimbursementItems.push({
      label: `Mileage (${data.mileage_miles || "?"} mi)`,
      amount: mileage,
    });
    reimbursementTotal += mileage;
  }
  if (meals > 0) {
    reimbursementItems.push({ label: "Meals / Per Diem", amount: meals });
    reimbursementTotal += meals;
  }

  return {
    registration,
    hotel,
    flight,
    mileage,
    meals,
    totalCost: registration + hotel + flight + mileage + meals,
    prepaidItems,
    prepaidTotal,
    reimbursementItems,
    reimbursementTotal,
  };
}

function formatEmailHtml(data, requestId, token, baseUrl) {
  const breakdown = calculateCostBreakdown(data);

  const section = (title, content) => `
    <div style="margin-bottom: 24px;">
      <h2 style="color: #991b1b; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #fecaca;">${title}</h2>
      ${content}
    </div>`;

  const field = (label, value) => `
    <p style="margin: 0 0 8px 0; font-size: 14px;">
      <span style="color: #64748b; font-weight: 500;">${label}:</span>
      <span style="color: #1e293b; margin-left: 8px;">${value || "N/A"}</span>
    </p>`;

  const actionFormUrl = `${baseUrl}/api/training/decide`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; margin: 0; padding: 32px 16px;">
  <div style="max-width: 560px; margin: 0 auto;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%); color: white; padding: 24px 32px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Training Funds Request</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Request ID: ${requestId}</p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
      
      ${section(
        "Requester Information",
        `
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
          ${field("Name", data.requester_name)}
          ${field("Department / Position", data.department_position)}
          ${field("Email", `<a href="mailto:${data.email}" style="color: #991b1b;">${data.email}</a>`)}
          ${field("Phone", data.phone)}
        </div>
      `,
      )}

      ${section(
        "Training Details",
        `
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
          ${field("Training", data.training_description)}
          ${field("Dates", data.training_dates)}
          ${field("Location", data.training_location)}
        </div>
      `,
      )}

      ${section(
        "Itemized Costs",
        `
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
          ${field("Registration Fee", formatCurrency(data.registration_fee))}
          ${field("Hotel / Accommodations", formatCurrency(breakdown.hotel))}
          ${field("Airfare / Flight", formatCurrency(data.flight_cost))}
          ${data.mileage_needed ? field("Mileage", `${data.mileage_miles || "?"} miles — ${formatCurrency(data.mileage_total)}`) : ""}
          ${data.meals_needed ? field("Meals / Per Diem", formatCurrency(data.meals_total)) : ""}
        </div>
      `,
      )}

      ${
        data.dept_vehicle
          ? section(
              "Department Vehicle",
              `
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
          ${field("Vehicle Details", data.dept_vehicle_details || "To be determined")}
        </div>
      `,
            )
          : ""
      }

      ${section(
        "Cost Breakdown",
        `
        <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin-top: 12px; text-align: center;">
          <span style="color: #64748b; font-size: 14px;">Total Request:</span>
          <span style="color: #991b1b; font-size: 24px; font-weight: 700; margin-left: 12px;">${formatCurrency(breakdown.totalCost)}</span>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">${formatCurrency(breakdown.prepaidTotal)} now + ${formatCurrency(breakdown.reimbursementTotal)} later</p>
        </div>
      `,
      )}

      ${
        data.additional_notes
          ? section(
              "Additional Notes",
              `
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 14px; color: #1e293b;">
${data.additional_notes}
        </div>
      `,
            )
          : ""
      }

    </div>

    <!-- Decision Button -->
    <div style="background: #fffbeb; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; text-align: center;">
      <a href="${actionFormUrl}?requestId=${requestId}&token=${token}" 
         style="display: inline-block; background: #991b1b; color: white; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-size: 18px; font-weight: 600;">
        Review &amp; Decide
      </a>
      <p style="margin: 16px 0 0 0; font-size: 13px; color: #92400e;">
        Click above to approve, send back, or reject this request
      </p>
    </div>

    <!-- Footer -->
    <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">
      Reva VFR 16 Members Area
    </p>

  </div>
</body>
</html>`.trim();
}

function formatEmailText(data, requestId, token, baseUrl) {
  const breakdown = calculateCostBreakdown(data);

  const lines = [
    `Training Funds Request #${requestId}`,
    "=".repeat(50),
    "",
    "REQUESTER INFORMATION",
    `Name: ${data.requester_name}`,
    `Department/Position: ${data.department_position}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    "",
    "TRAINING DETAILS",
    `Training: ${data.training_description}`,
    `Dates: ${data.training_dates}`,
    `Location: ${data.training_location}`,
    "",
    "ITEMIZED COSTS",
    `Registration Fee: ${formatCurrency(data.registration_fee)}`,
    `Hotel/Accommodations: ${formatCurrency(breakdown.hotel)}`,
    `Airfare/Flight: ${formatCurrency(data.flight_cost)}`,
  ];

  if (data.mileage_needed) {
    lines.push(
      `Mileage: ${data.mileage_miles || "?"} miles — ${formatCurrency(data.mileage_total)}`,
    );
  }
  if (data.meals_needed) {
    lines.push(`Meals: ${formatCurrency(data.meals_total)}`);
  }

  if (data.dept_vehicle) {
    lines.push(
      "",
      "DEPARTMENT VEHICLE",
      `Details: ${data.dept_vehicle_details || "TBD"}`,
    );
  }

  // Cost breakdown
  lines.push("", "-".repeat(40));
  lines.push(`TOTAL REQUEST: ${formatCurrency(breakdown.totalCost)}`);
  lines.push(
    `(${formatCurrency(breakdown.prepaidTotal)} now + ${formatCurrency(breakdown.reimbursementTotal)} later)`,
  );

  if (data.additional_notes) {
    lines.push("", "ADDITIONAL NOTES", data.additional_notes);
  }

  const decisionUrl = `${baseUrl}/api/training/decide?requestId=${requestId}&token=${token}`;

  lines.push(
    "",
    "=".repeat(50),
    "",
    "ACTION REQUIRED",
    `Submit your decision here:`,
    decisionUrl,
  );

  return lines.join("\n");
}

async function verifyUser(cookies) {
  if (!cookies) return null;
  const tokenMatch = cookies.match(/session=([^;]+)/);
  if (!tokenMatch) return null;

  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const { payload } = await jwtVerify(tokenMatch[1], secret);
    return payload;
  } catch {
    return null;
  }
}

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cookies = req.headers.get("cookie");
  const user = await verifyUser(cookies);

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await req.json();

    // Get blob store
    const store = getStore("training-requests");

    // Generate request ID
    const requestId = await generateRequestId(formData.email, store);

    // Generate secure token for approval form
    const token = generateToken();

    // Get base URL for form action
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    if (!TRAINING_APPROVER_EMAIL) {
      console.error("TRAINING_APPROVER_EMAIL not configured");
      return new Response(
        JSON.stringify({
          error: "No approvers configured. Please contact the administrator.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!TRAINING_DISBURSER_EMAIL) {
      console.error("TRAINING_DISBURSER_EMAIL not configured");
      return new Response(
        JSON.stringify({
          error: "No disbursers configured. Please contact the administrator.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Store the request in Blobs
    const requestData = {
      formData,
      token,
      status: "pending",
      submittedAt: new Date().toISOString(),
      submittedBy: user.email,
    };

    await store.set(requestId, JSON.stringify(requestData));
    console.log("Stored request:", requestId);

    console.log("Training Funds Request Submitted:");
    console.log("Request ID:", requestId);
    console.log("Requester:", formData.requester_name, `<${formData.email}>`);
    console.log("Approver:", TRAINING_APPROVER_EMAIL);
    console.log("Disburser:", TRAINING_DISBURSER_EMAIL);

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured!");
      return new Response(
        JSON.stringify({
          error:
            "Email service not configured. Please contact the administrator.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: TRAINING_FROM_EMAIL,
      to: [TRAINING_APPROVER_EMAIL],
      replyTo: formData.email,
      subject: `Training Funds Request ${requestId} - ${formData.requester_name}`,
      html: formatEmailHtml(formData, requestId, token, baseUrl),
      text: formatEmailText(formData, requestId, token, baseUrl),
    });

    if (emailError) {
      console.error("Failed to send email:", emailError);
      return new Response(
        JSON.stringify({
          error: "Failed to send notification email",
          details: emailError.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log("Email sent successfully:", emailResult?.id);

    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        message: "Request submitted successfully",
        emailId: emailResult?.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error processing training request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
