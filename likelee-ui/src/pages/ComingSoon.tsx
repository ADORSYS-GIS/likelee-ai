import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ComingSoon() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const feature = params.get("feature") || "This feature";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg p-8 border-2 border-gray-100 shadow-xl rounded-2xl text-center">
        <h1 className="text-3xl font-bold text-gray-900">Coming Soon</h1>
        <p className="mt-3 text-gray-600">
          {feature} is not available yet. Please check back soon.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link to="/Login">Back to Login</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
