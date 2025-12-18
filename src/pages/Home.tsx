import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-100">Welcome</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/training-funds-request"
          className="block p-6 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-750 hover:border-red-600 transition-all group"
        >
          <h3 className="text-lg font-semibold text-gray-100 group-hover:text-red-400 transition-colors">
            Training Funds Request
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            Submit a request for training funds including registration, travel,
            and accommodation expenses.
          </p>
        </Link>
      </div>
    </div>
  );
}
