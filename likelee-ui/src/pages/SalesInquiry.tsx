import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function SalesInquiry() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    contact_name: "",
    email: "",
    phone: "",
  });

  const submitInquiry = useMutation({
    mutationFn: (data: typeof formData) => {
      // You can create an entity for sales inquiries or send an email
      return base44.post("/integrations/core/send-email", {
        to: "operations@likelee.ai",
        subject: `Sales Inquiry from ${data.contact_name}`,
        body: `
New Sales Inquiry:

Contact: ${data.contact_name}
Email: ${data.email}
Phone: ${data.phone}
        `,
      });
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    submitInquiry.mutate(formData);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 py-16 px-6 flex items-center justify-center">
        <Card className="max-w-2xl w-full p-12 bg-white border-2 border-black shadow-2xl rounded-none text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-[#F7B750] to-[#FAD54C] border-2 border-black rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Thank You!
          </h1>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            We've received your inquiry and will be in touch within 24 hours to
            discuss how Likelee can help your brand create amazing AI-powered
            campaigns.
          </p>
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 border-2 border-black rounded-none mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              What's next?
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Our team will review your inquiry and schedule a personalized demo
              to show you exactly how our platform can work for your campaigns.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-16 px-6">
      <div className="max-w-lg mx-auto">
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
