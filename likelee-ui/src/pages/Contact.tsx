import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function Contact() {
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        contact_name: "",
        phone: "",
    });

    const submitInquiry = useMutation({
        mutationFn: (data: typeof formData) => {
            return base44.post("/integrations/core/send-email", {
                to: "operations@likelee.ai",
                subject: `Contact Form Submission from ${data.contact_name}`,
                body: `
New Contact Form Submission:

Name: ${data.contact_name}
Email: ${data.email}
Phone: ${data.phone}
        `,
            });
        },
        onSuccess: () => {
            setSubmitted(true);
        },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        submitInquiry.mutate(formData);
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-white py-16 px-6 flex items-center justify-center">
                <Card className="max-w-2xl w-full p-12 bg-white border-2 border-black shadow-2xl rounded-none text-center">
                    <div className="w-20 h-20 bg-[#32C8D1] border-2 border-black rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle2 className="w-12 h-12 text-white" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                        Thank You!
                    </h1>
                    <p className="text-lg text-gray-700 leading-relaxed mb-8">
                        We've received your message and will be in touch within 24 hours.
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white py-20 px-6 flex items-center justify-center">
            <div className="max-w-2xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        See Likelee in Action
                    </h1>
                    <p className="text-lg text-gray-600">
                        We'd love to show you a product demo with expert Q&A.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <Input
                            id="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) =>
                                setFormData({ ...formData, email: e.target.value })
                            }
                            className="h-12 border-gray-300 rounded-md"
                            placeholder="Business Email"
                        />
                    </div>
                    <div>
                        <Input
                            id="contact_name"
                            required
                            value={formData.contact_name}
                            onChange={(e) =>
                                setFormData({ ...formData, contact_name: e.target.value })
                            }
                            className="h-12 border-gray-300 rounded-md"
                            placeholder="Full Name"
                        />
                    </div>
                    <div>
                        <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) =>
                                setFormData({ ...formData, phone: e.target.value })
                            }
                            className="h-12 border-gray-300 rounded-md"
                            placeholder="Phone"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={submitInquiry.isPending}
                        className="w-full h-12 text-lg font-medium bg-[#32C8D1] hover:bg-[#2AB5BE] text-white rounded-md transition-all"
                    >
                        {submitInquiry.isPending ? "Submitting..." : "Continue"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
