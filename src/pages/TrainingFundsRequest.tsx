import { useState, useEffect, FormEvent, useMemo } from "react";
import { Link } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { DateRangePicker } from "../components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { differenceInDays, format } from "date-fns";

// 2025 IRS mileage rate
const MILEAGE_RATE = 0.70;

// Default per diem rate (GSA standard)
const DEFAULT_PER_DIEM = 59;

interface FormData {
  // Requester Information
  requester_name: string;
  department_position: string;
  email: string;
  phone: string;
  // Training Details
  training_description: string;
  training_dates: string; // Formatted string for submission
  training_location: string;
  // Itemized Costs
  registration_fee: string;
  hotel_nightly_rate: string;
  hotel_total: string;
  flight_cost: string;
  // Transportation
  mileage_needed: boolean;
  mileage_miles: string;
  mileage_total: string;
  dept_vehicle: boolean;
  dept_vehicle_details: string;
  // Meals
  meals_needed: boolean;
  meals_per_diem_rate: string;
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function parseNumber(value: string): number {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

export default function TrainingFundsRequest() {
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [formData, setFormData] = useState<FormData>({
    requester_name: "",
    department_position: "",
    email: "",
    phone: "",
    training_description: "",
    training_dates: "",
    training_location: "",
    registration_fee: "",
    hotel_nightly_rate: "",
    hotel_total: "",
    flight_cost: "",
    mileage_needed: false,
    mileage_miles: "",
    mileage_total: "",
    dept_vehicle: false,
    dept_vehicle_details: "",
    meals_needed: false,
    meals_per_diem_rate: DEFAULT_PER_DIEM.toString(),
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

  // Calculate number of nights and days from date range
  const { nights, days } = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return { nights: 0, days: 0 };
    }
    const nights = differenceInDays(dateRange.to, dateRange.from);
    return { nights, days: nights + 1 };
  }, [dateRange]);

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

  // Sync date range to form data
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const formattedDates = `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`;
      setFormData((prev) => ({ ...prev, training_dates: formattedDates }));
    }
  }, [dateRange]);

  // Auto-calculate hotel total
  useEffect(() => {
    const rate = parseNumber(formData.hotel_nightly_rate);
    const total = rate * nights;
    setFormData((prev) => ({
      ...prev,
      hotel_total: total > 0 ? total.toFixed(2) : "",
      // Auto-set hotel cost in old field for backwards compatibility
      hotel_cost: total > 0 ? total.toFixed(2) : "",
    }));
  }, [formData.hotel_nightly_rate, nights]);

  // Auto-calculate mileage total
  useEffect(() => {
    if (formData.mileage_needed) {
      const miles = parseNumber(formData.mileage_miles);
      const total = miles * MILEAGE_RATE;
      setFormData((prev) => ({
        ...prev,
        mileage_total: total > 0 ? total.toFixed(2) : "",
        // Auto-check reimburse if mileage is needed
        reimburse_mileage: prev.mileage_needed,
      }));
    }
  }, [formData.mileage_miles, formData.mileage_needed]);

  // Auto-calculate meals total
  useEffect(() => {
    if (formData.meals_needed && days > 0) {
      const rate = parseNumber(formData.meals_per_diem_rate);
      const total = rate * days;
      setFormData((prev) => ({
        ...prev,
        meals_total: total > 0 ? total.toFixed(2) : "",
        // Auto-check reimburse if meals is needed
        reimburse_meals: prev.meals_needed,
      }));
    }
  }, [formData.meals_per_diem_rate, formData.meals_needed, days]);

  // Calculate totals by payment timing
  const { prepaidTotal, reimbursementTotal, grandTotal } = useMemo(() => {
    const registration = parseNumber(formData.registration_fee);
    const hotel = parseNumber(formData.hotel_total);
    const flight = parseNumber(formData.flight_cost);
    const mileage = formData.mileage_needed ? parseNumber(formData.mileage_total) : 0;
    const meals = formData.meals_needed ? parseNumber(formData.meals_total) : 0;

    // Prepaid = items where pay_ahead is true
    const prepaid = 
      (formData.pay_ahead_registration ? registration : 0) +
      (formData.pay_ahead_hotel ? hotel : 0) +
      (formData.pay_ahead_flight ? flight : 0);

    // Reimbursement = items where pay_ahead is false, plus mileage and meals (always reimbursed)
    const reimbursement =
      (!formData.pay_ahead_registration ? registration : 0) +
      (!formData.pay_ahead_hotel ? hotel : 0) +
      (!formData.pay_ahead_flight ? flight : 0) +
      mileage +
      meals;

    return {
      prepaidTotal: prepaid,
      reimbursementTotal: reimbursement,
      grandTotal: registration + hotel + flight + mileage + meals,
    };
  }, [
    formData.registration_fee,
    formData.hotel_total,
    formData.flight_cost,
    formData.mileage_needed,
    formData.mileage_total,
    formData.meals_needed,
    formData.meals_total,
    formData.pay_ahead_registration,
    formData.pay_ahead_hotel,
    formData.pay_ahead_flight,
  ]);

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

  // Determine which payment options to show
  const hasRegistration = parseNumber(formData.registration_fee) > 0;
  const hasHotel = parseNumber(formData.hotel_total) > 0;
  const hasFlight = parseNumber(formData.flight_cost) > 0;
  const hasMileage = formData.mileage_needed && parseNumber(formData.mileage_total) > 0;
  const hasMeals = formData.meals_needed && parseNumber(formData.meals_total) > 0;

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
          <h2 className="text-lg font-semibold text-gray-100 mb-4">1. Who</h2>
          
          <div className="grid gap-4 sm:grid-cols-2">
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
          <h2 className="text-lg font-semibold text-gray-100 mb-4">2. What / When / Where</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="training_description" className="block text-sm font-medium text-gray-300 mb-1">
                Training Title / Description
              </label>
              <textarea
                id="training_description"
                name="training_description"
                value={formData.training_description}
                onChange={handleChange}
                rows={3}
                required
                placeholder="What is this training about?"
                className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-y"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Training Dates
                </label>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="Select start and end dates"
                />
                {nights > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    {nights} night{nights !== 1 ? "s" : ""} / {days} day{days !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="training_location" className="block text-sm font-medium text-gray-300 mb-1">
                  Location / Venue
                </label>
                <input
                  type="text"
                  id="training_location"
                  name="training_location"
                  value={formData.training_location}
                  onChange={handleChange}
                  required
                  placeholder="City, State or venue name"
                  className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Costs */}
        <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">3. Costs</h2>
          
          <div className="space-y-6">
            {/* Registration */}
            <div>
              <label htmlFor="registration_fee" className="block text-sm font-medium text-gray-300 mb-1">
                Registration Fee
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="registration_fee"
                  name="registration_fee"
                  value={formData.registration_fee}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Hotel */}
            <div className="p-4 rounded-lg bg-gray-750 border border-gray-600">
              <p className="text-sm font-medium text-gray-300 mb-3">Hotel / Accommodations</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="hotel_nightly_rate" className="block text-xs text-gray-400 mb-1">
                    Nightly Rate
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="hotel_nightly_rate"
                      name="hotel_nightly_rate"
                      value={formData.hotel_nightly_rate}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Total ({nights} night{nights !== 1 ? "s" : ""})
                  </label>
                  <div className="px-3 py-2 rounded-md bg-gray-600 border border-gray-500 text-gray-100">
                    {formData.hotel_total ? formatCurrency(parseNumber(formData.hotel_total)) : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Flight */}
            <div>
              <label htmlFor="flight_cost" className="block text-sm font-medium text-gray-300 mb-1">
                Airfare / Flight
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="flight_cost"
                  name="flight_cost"
                  value={formData.flight_cost}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Mileage */}
            <div className="p-4 rounded-lg bg-gray-750 border border-gray-600">
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
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="mileage_miles" className="block text-xs text-gray-400 mb-1">
                      Estimated Round-Trip Miles
                    </label>
                    <input
                      type="number"
                      min="0"
                      id="mileage_miles"
                      name="mileage_miles"
                      value={formData.mileage_miles}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Total @ ${MILEAGE_RATE.toFixed(2)}/mi
                    </label>
                    <div className="px-3 py-2 rounded-md bg-gray-600 border border-gray-500 text-gray-100">
                      {formData.mileage_total ? formatCurrency(parseNumber(formData.mileage_total)) : "—"}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4">
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
                  <div className="mt-3 ml-7">
                    <input
                      type="text"
                      id="dept_vehicle_details"
                      name="dept_vehicle_details"
                      value={formData.dept_vehicle_details}
                      onChange={handleChange}
                      placeholder="Vehicle details / notes"
                      className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Meals */}
            <div className="p-4 rounded-lg bg-gray-750 border border-gray-600">
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
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="meals_per_diem_rate" className="block text-xs text-gray-400 mb-1">
                      Per Diem Rate (per day)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        id="meals_per_diem_rate"
                        name="meals_per_diem_rate"
                        value={formData.meals_per_diem_rate}
                        onChange={handleChange}
                        className="w-full pl-7 pr-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Total ({days} day{days !== 1 ? "s" : ""})
                    </label>
                    <div className="px-3 py-2 rounded-md bg-gray-600 border border-gray-500 text-gray-100">
                      {formData.meals_total ? formatCurrency(parseNumber(formData.meals_total)) : "—"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 4: Summary & Payment Preferences */}
        <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">4. Summary & Payment Preferences</h2>

          {/* Grand Total */}
          {grandTotal > 0 && (
            <div className="mb-6 p-4 rounded-lg bg-gray-900 border border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-lg font-semibold text-gray-100">Total Request</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatCurrency(prepaidTotal)} now + {formatCurrency(reimbursementTotal)} later
                  </p>
                </div>
                <span className="text-2xl font-bold text-red-400">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          )}

          {grandTotal === 0 && (
            <div className="mb-6 p-4 rounded-lg bg-gray-900 border border-gray-700">
              <p className="text-gray-500 italic text-center">No costs entered yet</p>
            </div>
          )}

          {/* Payment Preferences - per-item toggle */}
          {grandTotal > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-2">
                For each expense, choose when you want payment:
              </p>
              
              {/* Registration */}
              {hasRegistration && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 border border-gray-600">
                  <div>
                    <span className="text-sm font-medium text-gray-200">Registration Fee</span>
                    <span className="ml-2 text-sm text-gray-400">{formatCurrency(parseNumber(formData.registration_fee))}</span>
                  </div>
                  <div className="flex rounded-lg overflow-hidden border border-gray-600">
                    <label className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${formData.pay_ahead_registration ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                      <input
                        type="radio"
                        name="registration_payment"
                        checked={formData.pay_ahead_registration}
                        onChange={() => setFormData(prev => ({ ...prev, pay_ahead_registration: true }))}
                        className="sr-only"
                      />
                      Before
                    </label>
                    <label className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${!formData.pay_ahead_registration ? 'bg-amber-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                      <input
                        type="radio"
                        name="registration_payment"
                        checked={!formData.pay_ahead_registration}
                        onChange={() => setFormData(prev => ({ ...prev, pay_ahead_registration: false }))}
                        className="sr-only"
                      />
                      Reimburse
                    </label>
                  </div>
                </div>
              )}

              {/* Hotel */}
              {hasHotel && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 border border-gray-600">
                  <div>
                    <span className="text-sm font-medium text-gray-200">Hotel</span>
                    <span className="ml-2 text-sm text-gray-400">{formatCurrency(parseNumber(formData.hotel_total))}</span>
                  </div>
                  <div className="flex rounded-lg overflow-hidden border border-gray-600">
                    <label className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${formData.pay_ahead_hotel ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                      <input
                        type="radio"
                        name="hotel_payment"
                        checked={formData.pay_ahead_hotel}
                        onChange={() => setFormData(prev => ({ ...prev, pay_ahead_hotel: true }))}
                        className="sr-only"
                      />
                      Before
                    </label>
                    <label className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${!formData.pay_ahead_hotel ? 'bg-amber-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                      <input
                        type="radio"
                        name="hotel_payment"
                        checked={!formData.pay_ahead_hotel}
                        onChange={() => setFormData(prev => ({ ...prev, pay_ahead_hotel: false }))}
                        className="sr-only"
                      />
                      Reimburse
                    </label>
                  </div>
                </div>
              )}

              {/* Flight */}
              {hasFlight && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 border border-gray-600">
                  <div>
                    <span className="text-sm font-medium text-gray-200">Airfare</span>
                    <span className="ml-2 text-sm text-gray-400">{formatCurrency(parseNumber(formData.flight_cost))}</span>
                  </div>
                  <div className="flex rounded-lg overflow-hidden border border-gray-600">
                    <label className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${formData.pay_ahead_flight ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                      <input
                        type="radio"
                        name="flight_payment"
                        checked={formData.pay_ahead_flight}
                        onChange={() => setFormData(prev => ({ ...prev, pay_ahead_flight: true }))}
                        className="sr-only"
                      />
                      Before
                    </label>
                    <label className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${!formData.pay_ahead_flight ? 'bg-amber-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                      <input
                        type="radio"
                        name="flight_payment"
                        checked={!formData.pay_ahead_flight}
                        onChange={() => setFormData(prev => ({ ...prev, pay_ahead_flight: false }))}
                        className="sr-only"
                      />
                      Reimburse
                    </label>
                  </div>
                </div>
              )}

              {/* Mileage - always reimbursed */}
              {hasMileage && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 border border-gray-600">
                  <div>
                    <span className="text-sm font-medium text-gray-200">Mileage</span>
                    <span className="ml-2 text-sm text-gray-400">{formatCurrency(parseNumber(formData.mileage_total))}</span>
                  </div>
                  <span className="px-3 py-1.5 text-xs font-medium bg-amber-700 text-white rounded-lg">
                    Reimburse
                  </span>
                </div>
              )}

              {/* Meals - always reimbursed */}
              {hasMeals && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 border border-gray-600">
                  <div>
                    <span className="text-sm font-medium text-gray-200">Meals / Per Diem</span>
                    <span className="ml-2 text-sm text-gray-400">{formatCurrency(parseNumber(formData.meals_total))}</span>
                  </div>
                  <span className="px-3 py-1.5 text-xs font-medium bg-amber-700 text-white rounded-lg">
                    Reimburse
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Cost Summary by Payment Timing */}
          {grandTotal > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {/* Prepaid by Department */}
              <div className="p-4 rounded-lg bg-green-900/20 border border-green-800/50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 rounded-full bg-green-600"></span>
                  <h3 className="text-sm font-medium text-green-400">Department Prepays</h3>
                </div>
                <div className="space-y-1.5 text-sm">
                  {hasRegistration && formData.pay_ahead_registration && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Registration</span>
                      <span className="text-gray-100">{formatCurrency(parseNumber(formData.registration_fee))}</span>
                    </div>
                  )}
                  {hasHotel && formData.pay_ahead_hotel && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Hotel ({nights} nights)</span>
                      <span className="text-gray-100">{formatCurrency(parseNumber(formData.hotel_total))}</span>
                    </div>
                  )}
                  {hasFlight && formData.pay_ahead_flight && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Airfare</span>
                      <span className="text-gray-100">{formatCurrency(parseNumber(formData.flight_cost))}</span>
                    </div>
                  )}
                  {prepaidTotal === 0 && (
                    <p className="text-gray-500 italic text-xs">No prepaid items</p>
                  )}
                </div>
                <div className="pt-2 mt-2 border-t border-green-800/50 flex justify-between font-semibold">
                  <span className="text-green-300">Subtotal</span>
                  <span className="text-green-400">{formatCurrency(prepaidTotal)}</span>
                </div>
              </div>

              {/* Reimbursement */}
              <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-800/50">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 rounded-full bg-amber-600"></span>
                  <h3 className="text-sm font-medium text-amber-400">Reimbursement (After)</h3>
                </div>
                <div className="space-y-1.5 text-sm">
                  {hasRegistration && !formData.pay_ahead_registration && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Registration</span>
                      <span className="text-gray-100">{formatCurrency(parseNumber(formData.registration_fee))}</span>
                    </div>
                  )}
                  {hasHotel && !formData.pay_ahead_hotel && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Hotel ({nights} nights)</span>
                      <span className="text-gray-100">{formatCurrency(parseNumber(formData.hotel_total))}</span>
                    </div>
                  )}
                  {hasFlight && !formData.pay_ahead_flight && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Airfare</span>
                      <span className="text-gray-100">{formatCurrency(parseNumber(formData.flight_cost))}</span>
                    </div>
                  )}
                  {hasMileage && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Mileage ({formData.mileage_miles} mi)</span>
                      <span className="text-gray-100">{formatCurrency(parseNumber(formData.mileage_total))}</span>
                    </div>
                  )}
                  {hasMeals && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Meals ({days} days)</span>
                      <span className="text-gray-100">{formatCurrency(parseNumber(formData.meals_total))}</span>
                    </div>
                  )}
                  {reimbursementTotal === 0 && (
                    <p className="text-gray-500 italic text-xs">No reimbursement items</p>
                  )}
                </div>
                <div className="pt-2 mt-2 border-t border-amber-800/50 flex justify-between font-semibold">
                  <span className="text-amber-300">Subtotal</span>
                  <span className="text-amber-400">{formatCurrency(reimbursementTotal)}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 5: Additional Notes */}
        <section className="rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">5. Additional Notes / Justification</h2>
          <textarea
            name="additional_notes"
            value={formData.additional_notes}
            onChange={handleChange}
            rows={4}
            placeholder="Explain how this training benefits the department, any special circumstances, etc."
            className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-y"
          />
        </section>

        {/* Submit Button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Total request: <span className="font-semibold text-red-400">{formatCurrency(grandTotal)}</span>
          </p>
          <button
            type="submit"
            disabled={isSubmitting || !dateRange?.from || !dateRange?.to}
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
