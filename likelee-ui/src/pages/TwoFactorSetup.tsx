import React from "react";


export default function TwoFactorSetup() {
  return (
    <div className="max-w-md mx-auto px-6 py-16">

      <h1 className="text-2xl font-bold mb-4">Two-Factor Authentication</h1>
      <p className="text-sm text-gray-700">
        TOTP-based 2FA via Firebase has been removed. Supabase-native 2FA can
        be added later if required.
      </p>
    </div>
  );
}

