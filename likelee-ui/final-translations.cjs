const fs = require("fs");
const path = require("path");

const localesDir = path.join(__dirname, "src/locales/agency");
const enPath = path.join(localesDir, "en.json");

const enData = JSON.parse(fs.readFileSync(enPath, "utf8"));

// Add all remaining missing keys
const additionalKeys = {
  agencyDashboard: {
    licensingRequests: {
      messages: {
        recovering: "Recovering...",
        deleting: "Deleting...",
        sending: "Sending...",
        sendingCounterOffer: "Sending...",
        counterOfferSent: "Counter offer sent",
        clientNotified: "The client has been notified.",
        failedToSendCounterOffer: "Failed to send counter offer",
        couldNotSendCounterOffer: "Could not send counter offer",
        updateFailed: "Update failed",
        couldNotFindIds:
          "Could not find licensing request IDs to update. Please refresh and try again.",
        requestDeclined: "Request declined",
        requestDeclinedDescription: "The licensing request has been declined.",
        requestApproved: "Request approved",
        requestApprovedDescription: "The licensing request has been approved.",
        couldNotUpdate: "Could not update licensing request",
        paymentLinkSent: "Payment link sent",
        paymentLinkGenerated: "Payment link generated and sent.",
        paymentLinkSentSimple: "Payment link sent.",
        sendPaymentLinkFailed: "Send payment link failed",
        couldNotGenerateSendPaymentLink: "Could not generate/send payment link",
        recovered: "Recovered",
        recoveredDescription:
          "Licensing request has been moved back to active.",
        recoveryFailed: "Recovery failed",
        couldNotRecover: "Could not recover licensing request",
        deleted: "Deleted",
        deletedDescription: "Licensing request(s) permanently deleted.",
        deleteFailed: "Delete failed",
        couldNotDelete: "Could not delete licensing request",
        close: "Close",
        messageTalent: "Message Talent",
        messageAthlete: "Message Athlete",
        yesDecline: "Yes, Decline",
        declining: "Declining...",
        sendCounterOffer: "Send Counter Offer",
        cancel: "Cancel",
      },
      counterOfferModal: {
        title: "Send Counter Offer",
        description:
          "Explain your proposed terms to the client. They will be notified by email.",
        messageLabel: "Message to Client",
        messagePlaceholder: "Describe your counter offer terms...",
        send: "Send Counter Offer",
        cancel: "Cancel",
      },
      deleteModal: {
        title: "Delete Licensing Request",
        description:
          "This will permanently delete this archived licensing request. This action cannot be undone.",
        descriptionActive:
          "This will archive and then permanently delete this licensing request. This action cannot be undone.",
        confirmQuestion:
          "Are you sure you want to delete the licensing request for",
        unknownBrand: "Unknown brand",
        cancel: "Cancel",
        delete: "Delete Permanently",
        deleting: "Deleting...",
      },
      declineModal: {
        title: "Confirm Decline",
        description:
          "Are you sure you want to decline this licensing request? This action cannot be undone.",
        confirmQuestion: "You are about to decline the request from",
        thisBrand: "this brand",
        cancel: "Cancel",
        yesDecline: "Yes, Decline",
        declining: "Declining...",
      },
      detailsModal: {
        title: "Licensing Request Details",
        description: "Additional campaign context for contract preparation.",
        campaign: "Campaign",
        category: "Category",
        exclusivity: "Exclusivity",
        offerAmount: "Offer Amount",
        description: "Description",
        customTerms: "Custom Terms",
        modificationsAllowed: "Modifications Allowed",
      },
      paymentReadinessModal: {
        title: "Talent setup required",
        titleAthlete: "Athlete setup required",
        description:
          "The following talents need to complete their account setup before a payment link can be sent.",
        descriptionAthlete:
          "The following athletes need to complete their account setup before a payment link can be sent.",
        accountSetupIncomplete: "Account setup incomplete",
        close: "Close",
        messageTalent: "Message Talent",
        messageAthlete: "Message Athlete",
      },
      brandRequests: {
        unknownBrand: "Unknown Brand",
        noDescription: "No description provided",
        customTerms: "Custom Terms",
        contractPhase: "Contract Phase",
        declined: "Declined",
      },
    },
    licenseSubmissions: {
      resendingContractEmail: "Resending contract email",
      refreshingSubmissions:
        "Refreshing submissions so the updated send appears here.",
      noActiveSubmissions: "No active submissions found.",
      noArchivedSubmissions: "No archived submissions found.",
      reason: "Reason:",
      signHere: "Sign here",
      resend: "Resend",
      resending: "Resending...",
      agencyLink: "Agency link",
      clientLink: "Client link",
    },
    licenseTemplates: {
      useContract: "Use Contract",
    },
    roster: {
      digitals: {
        loading: "Loading...",
        loadingHistory: "loading history...",
      },
    },
  },
};

// Deep merge function
function deepMerge(target, source) {
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Merge new keys
deepMerge(enData, additionalKeys);

// Write back
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), "utf8");

console.log("✅ Added final translation keys to en.json");
