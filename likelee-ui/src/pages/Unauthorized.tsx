import React from "react";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

const Unauthorized: React.FC = () => {
    const navigate = useNavigate();
    const { profile } = useAuth();

    const handleGoBack = () => {
        navigate(-1);
    };

    const handleGoHome = () => {
        if (!profile) {
            navigate("/");
            return;
        }

        switch (profile.role) {
            case "creator":
                navigate("/CreatorDashboard");
                break;
            case "brand":
                navigate("/BrandDashboard");
                break;
            case "agency":
                navigate("/AgencyDashboard");
                break;
            default:
                navigate("/");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="flex justify-center">
                    <div className="bg-red-100 p-6 rounded-full">
                        <ShieldAlert className="w-16 h-16 text-red-600" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                        Access Denied
                    </h1>
                    <p className="text-lg text-gray-600">
                        Oops! You don't have the required permissions to view this page.
                        This area is restricted to {profile?.role === 'creator' ? 'Brands and Agencies' : 'authorized users'} only.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Button
                        variant="outline"
                        onClick={handleGoBack}
                        className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go Back
                    </Button>
                </div>

                <div className="pt-8 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                        If you believe this is a mistake, please contact support or
                        check your account settings.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;
