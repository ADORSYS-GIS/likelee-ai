import React from "react";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

const Unauthorized: React.FC = () => {
    const navigate = useNavigate();
    const { profile, logout } = useAuth();

    const handleGoBack = async () => {
        await logout();
        navigate("/Login");
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
                        This area is restricted to authorized users only.
                    </p>
                </div>

                <div className="flex justify-center pt-4">
                    <Button
                        onClick={handleGoBack}
                        className="flex items-center gap-2 bg-[#F7B750] hover:bg-[#e5a640] text-white border-none px-8 py-6 text-lg font-bold"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Login
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
