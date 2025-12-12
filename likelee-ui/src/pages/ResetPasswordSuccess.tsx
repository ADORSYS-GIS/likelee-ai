import React from "react";
import Layout from "./Layout";
import { useNavigate } from "react-router-dom";

export default function ResetPasswordSuccess() {
  const navigate = useNavigate();

  return (
    <Layout currentPageName="Password Reset Success">
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Password Reset Successful</h1>
        <p className="text-gray-600 mb-6">
          Your password has been updated successfully. You can now sign in with
          your new password.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="px-4 py-2 rounded bg-black text-white"
        >
          Back to Sign In
        </button>
      </div>
    </Layout>
  );
}
