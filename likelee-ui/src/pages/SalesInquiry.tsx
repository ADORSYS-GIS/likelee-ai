import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    company_size: "",
    budget_range: "",
    use_case: "",
    message: "",
  });

  const submitInquiry = useMutation({
    mutationFn: (data: typeof formData) => {
      return base44.post("/integrations/core/send-email", {
        to: "operations@likelee.ai",
        subject: `Sales Inquiry from ${data.company_name}`,
        body: `
New Sales Inquiry:

Company: ${data.company_name}
Contact: ${data.contact_name}
Email: ${data.email}
Phone: ${data.phone}
Company Size: ${data.company_size}
Budget Range: ${data.budget_range}
Primary Use Case: ${data.use_case}

Message:
${data.message}
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Talk to Sales
          </h1>
          <p className="text-lg text-gray-600">
            Let's discuss how Likelee can help scale your creative production
          </p>
        </div>

        <Card className="p-8 md:p-10 bg-white border-2 border-black shadow-xl rounded-none">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                  className="h-12 border-gray-300 rounded-md"
                  placeholder="Your Company"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Your Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={formData.contact_name}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_name: e.target.value })
                  }
                  className="h-12 border-gray-300 rounded-md"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Work Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="h-12 border-gray-300 rounded-md"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="h-12 border-gray-300 rounded-md"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Company Size <span className="text-red-500">*</span>
                </label>
                <Select
                  required
                  value={formData.company_size}
                  onValueChange={(value) =>
                    setFormData({ ...formData, company_size: value })
                  }
                >
                  <SelectTrigger className="h-12 border-gray-300 rounded-md">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 employees</SelectItem>
                    <SelectItem value="11-50">11-50 employees</SelectItem>
                    <SelectItem value="51-200">51-200 employees</SelectItem>
                    <SelectItem value="201-500">201-500 employees</SelectItem>
                    <SelectItem value="501+">501+ employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Monthly Budget Range
                </label>
                <Select
                  value={formData.budget_range}
                  onValueChange={(value) =>
                    setFormData({ ...formData, budget_range: value })
                  }
                >
                  <SelectTrigger className="h-12 border-gray-300 rounded-md">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<5k">Less than $5K</SelectItem>
                    <SelectItem value="5k-15k">$5K - $15K</SelectItem>
                    <SelectItem value="15k-50k">$15K - $50K</SelectItem>
                    <SelectItem value="50k-100k">$50K - $100K</SelectItem>
                    <SelectItem value="100k+">$100K+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Primary Use Case <span className="text-red-500">*</span>
              </label>
              <Select
                required
                value={formData.use_case}
                onValueChange={(value) =>
                  setFormData({ ...formData, use_case: value })
                }
              >
                <SelectTrigger className="h-12 border-gray-300 rounded-md">
                  <SelectValue placeholder="Select use case" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ecommerce">E-commerce Product Photos</SelectItem>
                  <SelectItem value="advertising">Advertising Campaigns</SelectItem>
                  <SelectItem value="social">Social Media Content</SelectItem>
                  <SelectItem value="video">Video Production</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Tell us about your needs
              </label>
              <Textarea
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                className="min-h-[120px] border-gray-300 rounded-md resize-none"
                placeholder="What are you looking to achieve with AI-powered creator content?"
              />
            </div>

            <Button
              type="submit"
              disabled={submitInquiry.isPending}
              className="w-full h-12 text-lg font-medium bg-[#F7B750] hover:bg-[#FAD54C] text-gray-900 rounded-md transition-all"
            >
              {submitInquiry.isPending ? "Submitting..." : "Submit Inquiry"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-gray-600 mt-6">
          Need immediate assistance? Email us at{" "}
          <a
            href="mailto:operations@likelee.ai"
            className="text-[#F7B750] hover:text-[#FAD54C] font-medium"
          >
            operations@likelee.ai
          </a>
        </p>
      </div>
    </div>
  );
}
