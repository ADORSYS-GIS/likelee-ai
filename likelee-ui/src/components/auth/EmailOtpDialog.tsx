import * as React from "react";
import { Loader2, Mail } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFriendlyErrorMessage } from "@/utils/errorMapping";
import { cn } from "@/lib/utils";

export interface EmailOtpDialogTheme {
  headerClassName?: string;
  headerTitleClassName?: string;
  headerDescriptionClassName?: string;
  iconWrapperClassName?: string;
  infoClassName?: string;
  primaryButtonClassName?: string;
  activeSlotClassName?: string;
  resendButtonClassName?: string;
}

interface EmailOtpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  title: string;
  description: React.ReactNode;
  onVerify: (code: string) => Promise<void>;
  onResend?: () => Promise<void>;
  verifyLabel?: string;
  initialCooldownSec?: number;
  helperText?: React.ReactNode;
  theme?: EmailOtpDialogTheme;
}

const DEFAULT_EMAIL_OTP_THEME: Required<EmailOtpDialogTheme> = {
  headerClassName: "bg-gradient-to-r from-[#32C8D1] to-teal-500 text-white",
  headerTitleClassName: "text-white",
  headerDescriptionClassName: "text-white/80",
  iconWrapperClassName: "border border-white/30 bg-white/15 text-white",
  infoClassName: "border-cyan-100 bg-cyan-50 text-cyan-950",
  primaryButtonClassName: "bg-[#32C8D1] text-white hover:bg-[#2AB8C1]",
  activeSlotClassName: "border-[#32C8D1] ring-[#32C8D1]/30",
  resendButtonClassName: "text-cyan-700 hover:text-cyan-800",
};

export function EmailOtpDialog({
  open,
  onOpenChange,
  email,
  title,
  description,
  onVerify,
  onResend,
  verifyLabel,
  initialCooldownSec = 20,
  helperText,
  theme,
}: EmailOtpDialogProps) {
  const { t } = useTranslation("auth");
  const [code, setCode] = React.useState("");
  const [verifyLoading, setVerifyLoading] = React.useState(false);
  const [resendLoading, setResendLoading] = React.useState(false);
  const [cooldownSec, setCooldownSec] = React.useState(0);
  const [otpFocused, setOtpFocused] = React.useState(false);
  const [verifyError, setVerifyError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const lastSubmittedCodeRef = React.useRef<string | null>(null);
  const resolvedTheme = React.useMemo(
    () => ({
      ...DEFAULT_EMAIL_OTP_THEME,
      ...theme,
    }),
    [theme],
  );

  React.useEffect(() => {
    if (!open) {
      setCode("");
      setVerifyLoading(false);
      setResendLoading(false);
      setCooldownSec(0);
      setOtpFocused(false);
      setVerifyError(null);
      lastSubmittedCodeRef.current = null;
      return;
    }

    setCode("");
    setCooldownSec(initialCooldownSec);
    setVerifyError(null);
    lastSubmittedCodeRef.current = null;
  }, [initialCooldownSec, open]);

  React.useEffect(() => {
    if (cooldownSec <= 0) return;

    const timer = window.setInterval(() => {
      setCooldownSec((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [cooldownSec]);

  const handleVerify = React.useCallback(async () => {
    const normalizedCode = code.trim();
    if (normalizedCode.length !== 6 || verifyLoading) return;

    setVerifyLoading(true);
    setVerifyError(null);
    lastSubmittedCodeRef.current = normalizedCode;

    try {
      await onVerify(normalizedCode);
      lastSubmittedCodeRef.current = null;
    } catch (error) {
      setVerifyError(getFriendlyErrorMessage(error, t));
    } finally {
      setVerifyLoading(false);
    }
  }, [code, onVerify, verifyLoading]);

  const handleResend = async () => {
    if (!onResend || resendLoading || cooldownSec > 0) return;

    setResendLoading(true);
    try {
      setVerifyError(null);
      setCode("");
      lastSubmittedCodeRef.current = null;
      await onResend();
      setCooldownSec(initialCooldownSec);
    } finally {
      setResendLoading(false);
    }
  };

  const handleCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVerifyError(null);
    lastSubmittedCodeRef.current = null;
    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
  };

  const handleCodePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    setVerifyError(null);
    lastSubmittedCodeRef.current = null;
    setCode(
      event.clipboardData.getData("text/plain").replace(/\D/g, "").slice(0, 6),
    );
  };

  const focusOtpInput = () => {
    inputRef.current?.focus();
    window.requestAnimationFrame(() => {
      const nextPosition = Math.min(code.length, 6);
      inputRef.current?.setSelectionRange(nextPosition, nextPosition);
    });
  };

  React.useEffect(() => {
    if (!open || verifyLoading || code.length !== 6) return;
    if (lastSubmittedCodeRef.current === code) return;

    void handleVerify();
  }, [code, handleVerify, open, verifyLoading]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-2 border-black p-0" hideClose>
        <div className={cn("px-6 py-5", resolvedTheme.headerClassName)}>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full",
                resolvedTheme.iconWrapperClassName,
              )}
            >
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle
                className={cn(
                  "text-xl font-semibold",
                  resolvedTheme.headerTitleClassName,
                )}
              >
                {title}
              </DialogTitle>
              <DialogDescription
                className={cn(
                  "mt-1 text-sm",
                  resolvedTheme.headerDescriptionClassName,
                )}
              >
                {description}
              </DialogDescription>
            </div>
          </div>
        </div>

        <DialogHeader className="space-y-4 px-6 py-6 text-left">
          <div
            className={cn(
              "rounded-lg border px-4 py-3 text-sm",
              resolvedTheme.infoClassName,
            )}
          >
            <Trans
              i18nKey="auth.emailOtp.enterCode"
              ns="auth"
              values={{ email }}
              components={{ strong: <span className="font-semibold" /> }}
            />
          </div>

          <div className="space-y-3">
            <div
              className="relative mx-auto w-fit"
              onClick={focusOtpInput}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleVerify();
                }
              }}
            >
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={handleCodeChange}
                onPaste={handleCodePaste}
                onFocus={() => setOtpFocused(true)}
                onBlur={() => setOtpFocused(false)}
                aria-label={t("auth.emailOtp.codeAriaLabel")}
                className="absolute inset-0 h-full w-full cursor-text opacity-0"
              />

              <div className="flex items-center gap-2">
                {Array.from({ length: 6 }, (_, index) => {
                  const char = code[index] ?? "";
                  const isActiveSlot =
                    otpFocused &&
                    (index === Math.min(code.length, 5) ||
                      (code.length === 6 && index === 5));

                  return (
                    <div
                      key={index}
                      className={cn(
                        "relative flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background text-base font-semibold shadow-sm transition-all",
                        verifyError && "border-red-500",
                        isActiveSlot &&
                          cn(
                            "z-10 ring-2 ring-offset-2",
                            resolvedTheme.activeSlotClassName,
                          ),
                      )}
                    >
                      {char}
                      {isActiveSlot && !char ? (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="h-5 w-px animate-caret-blink bg-foreground duration-1000" />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {verifyError ? (
              <p className="text-center text-sm text-red-600">{verifyError}</p>
            ) : null}

            {helperText ? (
              <p className="text-center text-xs text-muted-foreground">
                {helperText}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <Button
              className={cn(
                "h-11 w-full",
                resolvedTheme.primaryButtonClassName,
              )}
              disabled={verifyLoading || code.trim().length !== 6}
              onClick={handleVerify}
            >
              {verifyLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("auth.emailOtp.verifying")}
                </span>
              ) : (
                verifyLabel || t("auth.emailOtp.verifyLabel")
              )}
            </Button>

            <Button
              variant="ghost"
              className={cn("h-10 w-full", resolvedTheme.resendButtonClassName)}
              disabled={!onResend || resendLoading || cooldownSec > 0}
              onClick={handleResend}
            >
              {resendLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("auth.emailOtp.sending")}
                </span>
              ) : cooldownSec > 0 ? (
                t("auth.emailOtp.resendAvailableIn", { seconds: cooldownSec })
              ) : (
                t("auth.emailOtp.resendCode")
              )}
            </Button>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
