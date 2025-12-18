import { useState, useEffect, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../context/UserContext";

interface FormData {
  // Requester Information
  requester_name: string;
  department_position: string;
  email: string;
  phone: string;
  // Training Details
  training_description: string;
  training_dates: string;
  training_location: string;
  // Itemized Costs
  registration_fee: string;
  hotel_cost: string;
  flight_cost: string;
  // Transportation
  mileage_needed: boolean;
  mileage_miles: string;
  mileage_total: string;
  dept_vehicle: boolean;
  dept_vehicle_details: string;
  // Meals
  meals_needed: boolean;
  meals_total: string;
  // Payment Method - Pay Ahead
  pay_ahead_registration: boolean;
  pay_ahead_hotel: boolean;
  pay_ahead_flight: boolean;
  pay_ahead_other: boolean;
  pay_ahead_other_details: string;
  // Payment Method - Reimbursement
  reimburse_mileage: boolean;
  reimburse_meals: boolean;
  reimburse_other: boolean;
  reimburse_other_details: string;
  // Additional Notes
  additional_notes: string;
}

export default function TrainingFundsRequest() {
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState<FormData>({
    requester_name: "",
    department_position: "",
    email: "",
    phone: "",
    training_description: "",
    training_dates: "",
    training_location: "",
    registration_fee: "",
    hotel_cost: "",
    flight_cost: "",
    mileage_needed: false,
    mileage_miles: "",
    mileage_total: "",
    dept_vehicle: false,
    dept_vehicle_details: "",
    meals_needed: false,
    meals_total: "",
    pay_ahead_registration: false,
    pay_ahead_hotel: false,
    pay_ahead_flight: false,
    pay_ahead_other: false,
    pay_ahead_other_details: "",
    reimburse_mileage: false,
    reimburse_meals: false,
    reimburse_other: false,
    reimburse_other_details: "",
    additional_notes: "",
  });

  // Pre-fill name and email from authenticated user
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        requester_name: prev.requester_name || user.name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      const response = await fetch("/.netlify/functions/submit-training-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit request");
      }

      setSubmitStatus("success");
    } catch (err) {
      setSubmitStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus === "success") {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-6">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-100 mb-4">Request Submitted!</h2>
        <p className="text-gray-400 mb-8">
          Your training funds request has been submitted and sent to the approvers for review.
          You will receive an email notification when a decision is made.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 rounded-md bg-red-700 hover:bg-red-600 text-white transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          ← Back to Home
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-100 mb-2">Training Funds Request Form</h1>
      <p className="text-gray-400 italic mb-8">
        Complete all sections. After submission, the form will be emailed to the approvers for review.
        Once approved, it will be forwarded to the disbursers for processing.
      </p>

      {submitStatus === "error" && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/50 border border-red-700 text-red-200">
          {errorMessage}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        {/* Section 1: Requester Information */}
        <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">1. Requester Information</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="requester_name" className="block text-sm font-medium text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                id="requester_name"
                name="requester_name"
                value={formData.requester_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="department_position" className="block text-sm font-medium text-gray-300 mb-1">
                Department / Position
              </label>
              <input
                type="text"
                id="department_position"
                name="department_position"
                value={formData.department_position}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="text"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Training Details */}
        <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">2. Training Details</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="training_description" className="block text-sm font-medium text-gray-300 mb-1">
                What (Training Title / Description)
              </label>
              <textarea
                id="training_description"
                name="training_description"
                value={formData.training_description}
                onChange={handleChange}
                rows={4}
                required
                className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-y"
              />
            </div>

            <div>
              <label htmlFor="training_dates" className="block text-sm font-medium text-gray-300 mb-1">
                When (Dates & Times)
              </label>
              <input
                type="text"
                id="training_dates"
                name="training_dates"
                value={formData.training_dates}
                onChange={handleChange}
                placeholder="e.g., March 10–14, 2026"
                required
                className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="training_location" className="block text-sm font-medium text-gray-300 mb-1">
                Where (Location / Venue / City, State)
              </label>
              <input
                type="text"
                id="training_location"
                name="training_location"
                value={formData.training_location}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Section 3: Itemized Costs */}
        <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">3. Itemized Costs</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="registration_fee" className="block text-sm font-medium text-gray-300 mb-1">
                Registration Fee ($)
              </label>
              <input
                type="number"
                step="0.01"
                id="registration_fee"
                name="registration_fee"
                value={formData.registration_fee}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="hotel_cost" className="block text-sm font-medium text-gray-300 mb-1">
                Hotel / Accommodations ($)
              </label>
              <input
                type="number"
                step="0.01"
                id="hotel_cost"
                name="hotel_cost"
                value={formData.hotel_cost}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Include number of nights and nightly rate if known</p>
            </div>

            <div>
              <label htmlFor="flight_cost" className="block text-sm font-medium text-gray-300 mb-1">
                Airfare / Flight ($)
              </label>
              <input
                type="number"
                step="0.01"
                id="flight_cost"
                name="flight_cost"
                value={formData.flight_cost}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* Section 4: Transportation */}
        <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">4. Transportation</h2>
          
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="mileage_needed"
                  checked={formData.mileage_needed}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500 focus:ring-offset-gray-800"
                />
                <span className="text-sm font-medium text-gray-300">Need mileage reimbursement</span>
              </label>
              
              {formData.mileage_needed && (
                <div className="mt-4 ml-7 space-y-4">
                  <div>
                    <label htmlFor="mileage_miles" className="block text-sm font-medium text-gray-300 mb-1">
                      Estimated round-trip miles
                    </label>
                    <input
                      type="number"
                      id="mileage_miles"
                      name="mileage_miles"
                      value={formData.mileage_miles}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="mileage_total" className="block text-sm font-medium text-gray-300 mb-1">
                      Total mileage reimbursement requested ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      id="mileage_total"
                      name="mileage_total"
                      value={formData.mileage_total}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="dept_vehicle"
                  checked={formData.dept_vehicle}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500 focus:ring-offset-gray-800"
                />
                <span className="text-sm font-medium text-gray-300">Prefer to use department vehicle</span>
              </label>
              
              {formData.dept_vehicle && (
                <div className="mt-4 ml-7">
                  <label htmlFor="dept_vehicle_details" className="block text-sm font-medium text-gray-300 mb-1">
                    Vehicle details (if known)
                  </label>
                  <input
                    type="text"
                    id="dept_vehicle_details"
                    name="dept_vehicle_details"
                    value={formData.dept_vehicle_details}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 5: Meals */}
        <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">5. Meals</h2>
          
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="meals_needed"
                checked={formData.meals_needed}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500 focus:ring-offset-gray-800"
              />
              <span className="text-sm font-medium text-gray-300">Need meal reimbursement / per diem</span>
            </label>
            
            {formData.meals_needed && (
              <div className="mt-4 ml-7">
                <label htmlFor="meals_total" className="block text-sm font-medium text-gray-300 mb-1">
                  Estimated meal total ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="meals_total"
                  name="meals_total"
                  value={formData.meals_total}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">If using per diem, note the rate and number of days</p>
              </div>
            )}
          </div>
        </section>

        {/* Section 6: Payment Method Preferences */}
        <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">6. Payment Method Preferences</h2>
          
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">
                Items to be PAID AHEAD by the department (check all that apply)
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="pay_ahead_registration"
                    checked={formData.pay_ahead_registration}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500 focus:ring-offset-gray-800"
                  />
                  <span className="text-sm text-gray-300">Registration Fee</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="pay_ahead_hotel"
                    checked={formData.pay_ahead_hotel}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500 focus:ring-offset-gray-800"
                  />
                  <span className="text-sm text-gray-300">Hotel</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="pay_ahead_flight"
                    checked={formData.pay_ahead_flight}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500 focus:ring-offset-gray-800"
                  />
                  <span className="text-sm text-gray-300">Flight</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="pay_ahead_other"
                    checked={formData.pay_ahead_other}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500 focus:ring-offset-gray-800"
                  />
                  <span className="text-sm text-gray-300">Other (specify below)</span>
                </label>
              </div>
              {formData.pay_ahead_other && (
                <textarea
                  name="pay_ahead_other_details"
                  value={formData.pay_ahead_other_details}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Describe other items to be paid in advance"
                  className="mt-3 w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-y"
                />
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">
                Items to be REIMBURSED after travel (check all that apply)
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="reimburse_mileage"
                    checked={formData.reimburse_mileage}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500 focus:ring-offset-gray-800"
                  />
                  <span className="text-sm text-gray-300">Mileage</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="reimburse_meals"
                    checked={formData.reimburse_meals}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500 focus:ring-offset-gray-800"
                  />
                  <span className="text-sm text-gray-300">Meals / Per Diem</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="reimburse_other"
                    checked={formData.reimburse_other}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-red-600 focus:ring-red-500 focus:ring-offset-gray-800"
                  />
                  <span className="text-sm text-gray-300">Other (specify below)</span>
                </label>
              </div>
              {formData.reimburse_other && (
                <textarea
                  name="reimburse_other_details"
                  value={formData.reimburse_other_details}
                  onChange={handleChange}
                  rows={2}
                  className="mt-3 w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-y"
                />
              )}
            </div>
          </div>
        </section>

        {/* Section 7: Additional Notes */}
        <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">7. Additional Notes / Justification</h2>
          <textarea
            name="additional_notes"
            value={formData.additional_notes}
            onChange={handleChange}
            rows={5}
            placeholder="Explain how this training benefits the department, any special circumstances, etc."
            className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-y"
          />
        </section>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 rounded-md bg-red-700 hover:bg-red-600 disabled:bg-red-900 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            {isSubmitting ? "Submitting..." : "Submit Request for Approval"}
          </button>
        </div>
      </form>

      <p className="mt-8 text-sm text-gray-500 italic">
        <strong>Workflow:</strong> This form automatically notifies the approvers. 
        They will respond with approval, a request to revise, or rejection. 
        Once approved, the disbursers will handle bookings or reimbursements as indicated above.
      </p>
    </div>
  );
}
