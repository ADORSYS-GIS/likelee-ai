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
    mutationFn: (data) => {
      // You can create an entity for sales inquiries or send an email
      return base44.integrations.Core.SendEmail({
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
Use Case: ${data.use_case}

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
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Talk to Sales
          </h1>
          <p className="text-xl text-gray-600">
            Let's discuss how Likelee can help scale your creative production
          </p>
        </div>

        <Card className="p-8 bg-white border-2 border-black shadow-xl rounded-none">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label
                  htmlFor="company_name"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Company Name *
                </Label>
                <Input
                  id="company_name"
                  required
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                  className="border-2 border-gray-300 rounded-none"
                  placeholder="Your Company"
                />
              </div>

              <div>
                <Label
                  htmlFor="contact_name"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Your Name *
                </Label>
                <Input
                  id="contact_name"
                  required
                  value={formData.contact_name}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_name: e.target.value })
                  }
                  className="border-2 border-gray-300 rounded-none"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Work Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="border-2 border-gray-300 rounded-none"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <Label
                  htmlFor="phone"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="border-2 border-gray-300 rounded-none"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label
                  htmlFor="company_size"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Company Size *
                </Label>
                <Select
                  value={formData.company_size}
                  onValueChange={(value) =>
                    setFormData({ ...formData, company_size: value })
                  }
                  required
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
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
                <Label
                  htmlFor="budget_range"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Monthly Budget Range
                </Label>
                <Select
                  value={formData.budget_range}
                  onValueChange={(value) =>
                    setFormData({ ...formData, budget_range: value })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 rounded-none">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under_5k">Under $5,000</SelectItem>
                    <SelectItem value="5k-25k">$5,000 - $25,000</SelectItem>
                    <SelectItem value="25k-100k">$25,000 - $100,000</SelectItem>
                    <SelectItem value="100k+">$100,000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label
                htmlFor="use_case"
                className="text-sm font-medium text-gray-700 mb-2 block"
              >
                Primary Use Case *
              </Label>
              <Select
                value={formData.use_case}
                onValueChange={(value) =>
                  setFormData({ ...formData, use_case: value })
                }
                required
              >
                <SelectTrigger className="border-2 border-gray-300 rounded-none">
                  <SelectValue placeholder="Select use case" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social_media">
                    Social Media Campaigns
                  </SelectItem>
                  <SelectItem value="commercials">
                    TV/Digital Commercials
                  </SelectItem>
                  <SelectItem value="brand_content">
                    Brand Content Creation
                  </SelectItem>
                  <SelectItem value="product_launches">
                    Product Launches
                  </SelectItem>
                  <SelectItem value="influencer_marketing">
                    Influencer Marketing
                  </SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label
                htmlFor="message"
                className="text-sm font-medium text-gray-700 mb-2 block"
              >
                Tell us about your needs
              </Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                className="border-2 border-gray-300 rounded-none min-h-[120px]"
                placeholder="What are you looking to achieve with AI-powered creator content?"
              />
            </div>

            <Button
              type="submit"
              disabled={submitInquiry.isPending}
              className="w-full h-14 text-lg font-medium bg-gradient-to-r from-[#F7B750] to-[#FAD54C] hover:from-[#E6A640] hover:to-[#F7B750] text-white border-2 border-black shadow-lg transition-all hover:shadow-xl rounded-none"
            >
              {submitInquiry.isPending ? "Submitting..." : "Submit Inquiry"}
            </Button>
          </form>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Need immediate assistance? Email us at{" "}
            <a
              href="mailto:operations@likelee.ai"
              className="text-[#F7B750] hover:text-[#E6A640] font-semibold underline"
            >
              operations@likelee.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
