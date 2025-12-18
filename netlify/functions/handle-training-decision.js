import { Resend } from "resend";
import { getStore } from "@netlify/blobs";

// Email configuration from environment variables
const TRAINING_FROM_EMAIL = process.env.TRAINING_FROM_EMAIL || "Training Funds Request <noreply@internal.reva16.org>";
const TRAINING_DISBURSER_EMAIL = process.env.TRAINING_DISBURSER_EMAIL;

function formatCurrency(value) {
  if (!value) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(parseFloat(value));
}

/**
 * Generate HTML for the REQUESTER notification email (status update)
 */
function formatRequesterEmailHtml(requestData, decision, comments, approverEmail) {
  const { formData } = requestData;
  const requestId = requestData.requestId;

  const statusColors = {
    accepted: { bg: "#dcfce7", border: "#22c55e", text: "#166534", label: "Accepted" },
    sent_back: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e", label: "Sent Back" },
    rejected: { bg: "#fee2e2", border: "#ef4444", text: "#991b1b", label: "Rejected" },
  };

  const status = statusColors[decision];
  const costs = [
    parseFloat(formData.registration_fee) || 0,
    parseFloat(formData.hotel_cost) || 0,
    parseFloat(formData.flight_cost) || 0,
    parseFloat(formData.mileage_total) || 0,
    parseFloat(formData.meals_total) || 0,
  ];
  const totalCost = costs.reduce((sum, cost) => sum + cost, 0);

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
      <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Training Funds Request Update</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Request ID: ${requestId}</p>
    </div>

    <!-- Status Banner -->
    <div style="background: ${status.bg}; border-left: 4px solid ${status.border}; padding: 16px 24px; border: 1px solid #e2e8f0; border-top: none;">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${status.text};">
        Status: ${status.label}
      </p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #64748b;">
        Decision on ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
      
      ${comments ? `
      <div style="margin-bottom: 24px;">
        <h2 style="color: #991b1b; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #fecaca;">Approver Comments</h2>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 14px; color: #1e293b;">
${comments}
        </div>
      </div>
      ` : ""}

      <div style="margin-bottom: 24px;">
        <h2 style="color: #991b1b; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #fecaca;">Request Summary</h2>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 8px 0; font-size: 14px;">
            <span style="color: #64748b; font-weight: 500;">Training:</span>
            <span style="color: #1e293b; margin-left: 8px;">${formData.training_description}</span>
          </p>
          <p style="margin: 0 0 8px 0; font-size: 14px;">
            <span style="color: #64748b; font-weight: 500;">Dates:</span>
            <span style="color: #1e293b; margin-left: 8px;">${formData.training_dates}</span>
          </p>
          <p style="margin: 0 0 8px 0; font-size: 14px;">
            <span style="color: #64748b; font-weight: 500;">Location:</span>
            <span style="color: #1e293b; margin-left: 8px;">${formData.training_location}</span>
          </p>
          <p style="margin: 0; font-size: 14px;">
            <span style="color: #64748b; font-weight: 500;">Total:</span>
            <span style="color: #991b1b; font-weight: 700; margin-left: 8px;">${formatCurrency(totalCost)}</span>
          </p>
        </div>
      </div>

      ${decision === "accepted" ? `
      <div style="background: #dcfce7; border: 1px solid #22c55e; border-radius: 8px; padding: 16px;">
        <p style="margin: 0; font-size: 14px; color: #166534;">
          <strong>Next Steps:</strong> The disbursement team has been notified and will process your request for payment/reimbursement as indicated.
        </p>
      </div>
      ` : ""}

      ${decision === "sent_back" ? `
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>Action Required:</strong> Please review the comments above and submit a revised request.
        </p>
      </div>
      ` : ""}

    </div>

    <!-- Footer -->
    <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">
      Reva VFR 16 Members Area
    </p>

  </div>
</body>
</html>`.trim();
}

/**
 * Generate HTML for the DISBURSER notification email (full breakdown)
 */
function formatDisburserEmailHtml(requestData, comments) {
  const { formData } = requestData;
  const requestId = requestData.requestId;

  const costs = [
    parseFloat(formData.registration_fee) || 0,
    parseFloat(formData.hotel_cost) || 0,
    parseFloat(formData.flight_cost) || 0,
    parseFloat(formData.mileage_total) || 0,
    parseFloat(formData.meals_total) || 0,
  ];
  const totalCost = costs.reduce((sum, cost) => sum + cost, 0);

  const payAheadItems = [];
  if (formData.pay_ahead_registration) payAheadItems.push("Registration Fee");
  if (formData.pay_ahead_hotel) payAheadItems.push("Hotel");
  if (formData.pay_ahead_flight) payAheadItems.push("Flight");
  if (formData.pay_ahead_other) payAheadItems.push(`Other: ${formData.pay_ahead_other_details}`);

  const reimbursementItems = [];
  if (formData.reimburse_mileage) reimbursementItems.push("Mileage");
  if (formData.reimburse_meals) reimbursementItems.push("Meals / Per Diem");
  if (formData.reimburse_other) reimbursementItems.push(`Other: ${formData.reimburse_other_details}`);

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
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 24px 32px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 700;">✓ Approved for Disbursement</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Request ID: ${requestId}</p>
    </div>

    <!-- Action Banner -->
    <div style="background: #dcfce7; border-left: 4px solid #22c55e; padding: 16px 24px; border: 1px solid #e2e8f0; border-top: none;">
      <p style="margin: 0; font-size: 14px; color: #166534;">
        <strong>Action Required:</strong> Please process the following training funds request.
      </p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
      
      ${comments ? `
      <div style="margin-bottom: 24px;">
        <h2 style="color: #991b1b; font-size: 16px; font-weight: 600; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #fecaca;">Approver Comments</h2>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 14px; color: #1e293b;">
${comments}
        </div>
      </div>
      ` : ""}

      ${section("Requester Information", `
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
          ${field("Name", formData.requester_name)}
          ${field("Department / Position", formData.department_position)}
          ${field("Email", `<a href="mailto:${formData.email}" style="color: #991b1b;">${formData.email}</a>`)}
          ${field("Phone", formData.phone)}
        </div>
      `)}

      ${section("Training Details", `
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
          ${field("Training", formData.training_description)}
          ${field("Dates", formData.training_dates)}
          ${field("Location", formData.training_location)}
        </div>
      `)}

      ${section("Itemized Costs", `
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
          ${field("Registration Fee", formatCurrency(formData.registration_fee))}
          ${field("Hotel / Accommodations", formatCurrency(formData.hotel_cost))}
          ${field("Airfare / Flight", formatCurrency(formData.flight_cost))}
          ${formData.mileage_needed ? field("Mileage", `${formData.mileage_miles || "?"} miles — ${formatCurrency(formData.mileage_total)}`) : ""}
          ${formData.meals_needed ? field("Meals / Per Diem", formatCurrency(formData.meals_total)) : ""}
        </div>
        <div style="background: #dcfce7; padding: 16px; border-radius: 8px; margin-top: 12px; text-align: right;">
          <span style="color: #166534; font-size: 14px;">Approved Total:</span>
          <span style="color: #166534; font-size: 24px; font-weight: 700; margin-left: 12px;">${formatCurrency(totalCost)}</span>
        </div>
      `)}

      ${formData.dept_vehicle ? section("Department Vehicle", `
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
          ${field("Vehicle Details", formData.dept_vehicle_details || "To be determined")}
        </div>
      `) : ""}

      ${(payAheadItems.length > 0 || reimbursementItems.length > 0) ? section("Payment Instructions", `
        <div style="background: #fef3c7; border-radius: 8px; padding: 16px;">
          ${payAheadItems.length > 0 ? `
            <div style="margin-bottom: 12px;">
              <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #059669;">⬆️ PAY AHEAD (before travel):</p>
              <p style="margin: 0; font-size: 14px; color: #1e293b; padding-left: 24px;">${payAheadItems.join(", ")}</p>
            </div>
          ` : ""}
          ${reimbursementItems.length > 0 ? `
            <div>
              <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #2563eb;">⬇️ REIMBURSE (after travel):</p>
              <p style="margin: 0; font-size: 14px; color: #1e293b; padding-left: 24px;">${reimbursementItems.join(", ")}</p>
            </div>
          ` : ""}
        </div>
      `) : ""}

      ${formData.additional_notes ? section("Additional Notes", `
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 14px; color: #1e293b;">
${formData.additional_notes}
        </div>
      `) : ""}

    </div>

    <!-- Footer -->
    <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px;">
      Reva VFR 16 Members Area
    </p>

  </div>
</body>
</html>`.trim();
}

/**
 * Plain text for requester
 */
function formatRequesterEmailText(requestData, decision, comments) {
  const { formData } = requestData;
  const requestId = requestData.requestId;

  const statusLabels = {
    accepted: "ACCEPTED",
    sent_back: "SENT BACK",
    rejected: "REJECTED",
  };

  const lines = [
    `Training Funds Request Update`,
    `Request ID: ${requestId}`,
    "=".repeat(50),
    "",
    `STATUS: ${statusLabels[decision]}`,
    `Date: ${new Date().toLocaleDateString()}`,
    "",
  ];

  if (comments) {
    lines.push("APPROVER COMMENTS:", comments, "");
  }

  lines.push(
    "REQUEST SUMMARY:",
    `Training: ${formData.training_description}`,
    `Dates: ${formData.training_dates}`,
    `Location: ${formData.training_location}`,
  );

  return lines.join("\n");
}

/**
 * Plain text for disburser
 */
function formatDisburserEmailText(requestData, comments) {
  const { formData } = requestData;
  const requestId = requestData.requestId;

  const lines = [
    `APPROVED FOR DISBURSEMENT`,
    `Request ID: ${requestId}`,
    "=".repeat(50),
    "",
  ];

  if (comments) {
    lines.push("APPROVER COMMENTS:", comments, "");
  }

  lines.push(
    "REQUESTER INFORMATION:",
    `Name: ${formData.requester_name}`,
    `Department/Position: ${formData.department_position}`,
    `Email: ${formData.email}`,
    `Phone: ${formData.phone}`,
    "",
    "TRAINING DETAILS:",
    `Training: ${formData.training_description}`,
    `Dates: ${formData.training_dates}`,
    `Location: ${formData.training_location}`,
    "",
    "ITEMIZED COSTS:",
    `Registration Fee: ${formatCurrency(formData.registration_fee)}`,
    `Hotel/Accommodations: ${formatCurrency(formData.hotel_cost)}`,
    `Airfare/Flight: ${formatCurrency(formData.flight_cost)}`,
  );

  if (formData.mileage_needed) {
    lines.push(`Mileage: ${formData.mileage_miles || "?"} miles — ${formatCurrency(formData.mileage_total)}`);
  }
  if (formData.meals_needed) {
    lines.push(`Meals: ${formatCurrency(formData.meals_total)}`);
  }

  const payAheadItems = [];
  if (formData.pay_ahead_registration) payAheadItems.push("Registration Fee");
  if (formData.pay_ahead_hotel) payAheadItems.push("Hotel");
  if (formData.pay_ahead_flight) payAheadItems.push("Flight");
  if (formData.pay_ahead_other) payAheadItems.push(`Other: ${formData.pay_ahead_other_details}`);

  const reimbursementItems = [];
  if (formData.reimburse_mileage) reimbursementItems.push("Mileage");
  if (formData.reimburse_meals) reimbursementItems.push("Meals/Per Diem");
  if (formData.reimburse_other) reimbursementItems.push(`Other: ${formData.reimburse_other_details}`);

  if (payAheadItems.length > 0) lines.push("", "PAY AHEAD: " + payAheadItems.join(", "));
  if (reimbursementItems.length > 0) lines.push("REIMBURSE: " + reimbursementItems.join(", "));

  if (formData.additional_notes) {
    lines.push("", "ADDITIONAL NOTES:", formData.additional_notes);
  }

  return lines.join("\n");
}

/**
 * Generate HTML confirmation page
 */
function generateConfirmationPage(decision, requestId) {
  const statusInfo = {
    accepted: { color: "#22c55e", label: "Accepted", message: "The requester and disbursement team have been notified." },
    sent_back: { color: "#f59e0b", label: "Sent Back", message: "The requester has been notified to revise their request." },
    rejected: { color: "#ef4444", label: "Rejected", message: "The requester has been notified of the rejection." },
  };

  const status = statusInfo[decision];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Decision Submitted</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; margin: 0; padding: 32px 16px; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
  <div style="max-width: 480px; margin: 0 auto; text-align: center;">
    
    <div style="background: white; padding: 48px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
      <div style="width: 64px; height: 64px; background: ${status.color}; border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      
      <h1 style="margin: 0 0 8px 0; font-size: 24px; color: #1e293b;">Decision Submitted</h1>
      <p style="margin: 0 0 24px 0; font-size: 16px; color: #64748b;">
        Request <strong>${requestId}</strong> has been marked as <strong style="color: ${status.color};">${status.label}</strong>
      </p>
      
      <p style="margin: 0; font-size: 14px; color: #94a3b8;">
        ${status.message}
      </p>
    </div>
    
    <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">
      You can close this window.
    </p>
    
  </div>
</body>
</html>`.trim();
}

/**
 * Parse form data from request body
 */
function parseFormData(body) {
  const params = new URLSearchParams(body);
  return {
    requestId: params.get("requestId"),
    token: params.get("token"),
    decision: params.get("decision"),
    comments: params.get("comments") || "",
  };
}

export default async (req, context) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Parse form data
    const body = await req.text();
    const { requestId, token, decision, comments } = parseFormData(body);

    // Validate required fields
    if (!requestId || !token || !decision) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Validate decision value
    if (!["accepted", "sent_back", "rejected"].includes(decision)) {
      return new Response("Invalid decision value", { status: 400 });
    }

    // Require comments for sent_back and rejected
    if ((decision === "sent_back" || decision === "rejected") && !comments.trim()) {
      return new Response(
        `<html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>Comments Required</h1>
          <p>Please provide comments when sending back or rejecting a request.</p>
          <button onclick="history.back()">Go Back</button>
        </body></html>`,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    // Get the request from Blobs
    const store = getStore("training-requests");
    const storedData = await store.get(requestId);

    if (!storedData) {
      return new Response("Request not found", { status: 404 });
    }

    const requestData = JSON.parse(storedData);

    // Validate token
    if (requestData.token !== token) {
      return new Response("Invalid token", { status: 403 });
    }

    // Check if already decided
    if (requestData.status !== "pending") {
      return new Response(
        `<html><body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>Already Processed</h1>
          <p>This request has already been ${requestData.status}.</p>
        </body></html>`,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    // Update the request status
    requestData.status = decision;
    requestData.decidedAt = new Date().toISOString();
    requestData.comments = comments;
    requestData.requestId = requestId;

    await store.set(requestId, JSON.stringify(requestData));
    console.log(`Request ${requestId} marked as ${decision}`);

    // Send notification emails
    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured!");
      return new Response(generateConfirmationPage(decision, requestId), {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { formData } = requestData;

    const statusLabels = {
      accepted: "Accepted",
      sent_back: "Sent Back",
      rejected: "Rejected",
    };

    // Always send to requester
    const { error: requesterError } = await resend.emails.send({
      from: TRAINING_FROM_EMAIL,
      to: [formData.email],
      subject: `Training Request ${requestId} - ${statusLabels[decision]}`,
      html: formatRequesterEmailHtml(requestData, decision, comments),
      text: formatRequesterEmailText(requestData, decision, comments),
    });

    if (requesterError) {
      console.error("Failed to send requester notification:", requesterError);
    } else {
      console.log(`Requester notification sent to: ${formData.email}`);
    }

    // If accepted, also send to disbursers with full details
    if (decision === "accepted" && TRAINING_DISBURSER_EMAIL) {
      const { error: disburserError } = await resend.emails.send({
        from: TRAINING_FROM_EMAIL,
        to: [TRAINING_DISBURSER_EMAIL],
        subject: `[ACTION REQUIRED] Approved: Training Request ${requestId} - ${formData.requester_name}`,
        html: formatDisburserEmailHtml(requestData, comments),
        text: formatDisburserEmailText(requestData, comments),
      });

      if (disburserError) {
        console.error("Failed to send disburser notification:", disburserError);
      } else {
        console.log(`Disburser notification sent to: ${TRAINING_DISBURSER_EMAIL}`);
      }
    }

    // Return confirmation page
    return new Response(generateConfirmationPage(decision, requestId), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });

  } catch (error) {
    console.error("Error handling decision:", error);
    return new Response("Internal server error", { status: 500 });
  }
};
