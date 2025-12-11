import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Mail, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function Support() {
  const [formData, setFormData] = useState({
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    // This form doesn't actually send an email, it just simulates the UI.
    // In a real app, you would handle the form submission here (e.g., API call).

    // Show success message
    setSubmitted(true);

    // Reset form after 3 seconds
    setTimeout(() => {
      setFormData({ email: "", subject: "", message: "" });
      setSubmitted(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-r from-[#32C8D1] to-teal-500 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Support
          </h1>
          <p className="text-xl text-gray-700 leading-relaxed max-w-2xl mx-auto mb-4">
            Need a hand? We've got you. The fastest way to reach us is{" "}
            <button
              onClick={() => {
                navigator.clipboard.writeText("help@likelee.ai");
                toast({
                  title: "Copied to Clipboard",
                  description: "Support email address has been copied to your clipboard.",
                });
              }}
              className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline"
            >
              help@likelee.ai
            </button>
            .
          </p>
          <p className="text-lg text-gray-600">
            We read every message. Please include as much detail as you can
            (screenshots, links, steps to reproduce). We'll reply as quickly as
            possible.
          </p>
        </div>

        <Card className="p-8 bg-white border-2 border-black shadow-xl rounded-none">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 border-2 border-black rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Message Sent!
              </h3>
              <p className="text-gray-600">
                Thank you for your message. We'll get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Your Email *
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
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <Label
                  htmlFor="subject"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Subject *
                </Label>
                <Input
                  id="subject"
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="border-2 border-gray-300 rounded-none"
                  placeholder="How can we help?"
                />
              </div>

              <div>
                <Label
                  htmlFor="message"
                  className="text-sm font-medium text-gray-700 mb-2 block"
                >
                  Your Question *
                </Label>
                <Textarea
                  id="message"
                  required
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="border-2 border-gray-300 rounded-none min-h-[200px]"
                  placeholder="Please include as much detail as possible: what you're trying to do, what's happening, any error messages, screenshots, etc."
                />
              </div>

              <Button
                type="submit"
                className="w-full h-14 text-lg font-medium bg-gradient-to-r from-[#32C8D1] to-teal-500 hover:from-[#2AB8C1] hover:to-teal-600 text-white border-2 border-black rounded-none"
              >
                Send Message
              </Button>
            </form>
          )}
        </Card>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Or email us directly at{" "}
            <button
              onClick={() => {
                navigator.clipboard.writeText("help@likelee.ai");
                toast({
                  title: "Copied to Clipboard",
                  description: "Support email address has been copied to your clipboard.",
                });
              }}
              className="text-[#32C8D1] hover:text-[#2AB8C1] font-semibold underline"
            >
              help@likelee.ai
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
