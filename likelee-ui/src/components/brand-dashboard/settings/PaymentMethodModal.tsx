import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  createBrandPaymentMethodSetupIntent,
  setBrandPrimaryPaymentMethod,
} from "@/api/functions";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CardForm = ({
  isLoading,
  onSubmit,
}: {
  isLoading: boolean;
  onSubmit: (setupIntentClientSecret: string) => Promise<void>;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!stripe || !elements) {
      setError("Stripe is not loaded. Please try again.");
      return;
    }

    setIsProcessing(true);

    try {
      const setupIntentData = await createBrandPaymentMethodSetupIntent();

      if (!setupIntentData?.client_secret) {
        throw new Error("Failed to create setup intent");
      }

      const { setupIntent, error: confirmError } =
        await stripe.confirmCardSetup(setupIntentData.client_secret, {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: {
              name: "Brand Payment Method",
            },
          },
        });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      if (setupIntent?.payment_method) {
        await onSubmit(setupIntentData.client_secret);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Card Details</Label>
        <div className="p-3 border border-gray-200 rounded-lg bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#424770",
                  "::placeholder": {
                    color: "#aab7c4",
                  },
                },
                invalid: {
                  color: "#fa755a",
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={isLoading || isProcessing || !stripe}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Add Card"
        )}
      </Button>
    </form>
  );
};

const PaymentMethodModalContent = ({
  isOpen,
  onClose,
  onSuccess,
}: PaymentMethodModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<
    typeof loadStripe
  > | null>(null);

  useEffect(() => {
    if (isOpen && !stripePromise) {
      base44
        .get<{ publishable_key: string }>("/brand/billing/stripe-config")
        .then((data) => {
          if (data.publishable_key) {
            setStripePromise(loadStripe(data.publishable_key));
          } else {
            toast.error("Stripe is not configured. Please contact support.");
          }
        })
        .catch(() => {
          toast.error("Failed to load Stripe configuration.");
        });
    }
  }, [isOpen, stripePromise]);

  const handleCardSubmit = async (setupIntentClientSecret: string) => {
    setIsLoading(true);
    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to load");

      const setupIntent = await stripe.retrieveSetupIntent(
        setupIntentClientSecret,
      );

      if (
        setupIntent.setupIntent?.payment_method &&
        typeof setupIntent.setupIntent.payment_method === "string"
      ) {
        await setBrandPrimaryPaymentMethod({
          stripe_payment_method_id: setupIntent.setupIntent.payment_method,
        });

        setSuccessMessage("Card added successfully!");
        toast.success("Payment method added successfully");

        setTimeout(() => {
          onSuccess();
          onClose();
          setSuccessMessage(null);
        }, 1500);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      console.error("Error in handleCardSubmit:", message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Enter your card details to add a new payment method for your brand
            account.
          </DialogDescription>
        </DialogHeader>

        {successMessage ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-center text-sm font-medium text-gray-700">
              {successMessage}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <CardForm isLoading={isLoading} onSubmit={handleCardSubmit} />
              </Elements>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            )}

            <p className="text-xs text-gray-500 text-center">
              Your card information is securely processed by Stripe and never
              stored on our servers.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const PaymentMethodModal = (props: PaymentMethodModalProps) => (
  <PaymentMethodModalContent {...props} />
);
