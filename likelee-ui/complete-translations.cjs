const fs = require("fs");
const path = require("path");

// Read all locale files
const localesDir = path.join(__dirname, "src/locales/agency");
const enPath = path.join(localesDir, "en.json");
const dePath = path.join(localesDir, "de.json");
const esPath = path.join(localesDir, "es.json");
const frPath = path.join(localesDir, "fr.json");

const enData = JSON.parse(fs.readFileSync(enPath, "utf8"));
const deData = JSON.parse(fs.readFileSync(dePath, "utf8"));
const esData = JSON.parse(fs.readFileSync(esPath, "utf8"));
const frData = JSON.parse(fs.readFileSync(frPath, "utf8"));

// Comprehensive missing keys for all sections
const newKeys = {
  agencyDashboard: {
    licensingRequests: {
      filter: {
        button: "Filter",
        clear: "Clear",
        apply: "Apply",
      },
      filterModal: {
        title: "Filter Licensing Requests",
        description:
          "Narrow down your licensing requests by status, license fee, and duration.",
        status: "Status",
        allStatuses: "All Statuses",
        licenseFee: "License Fee",
        duration: "Duration",
        apply: "Apply",
        clear: "Clear",
      },
      archiveNotice:
        "Licensing requests past their end date are automatically moved to the Archive tab.",
      noActive: "No active licensing requests",
      noArchived: "No archived licensing requests",
      statusLabels: {
        approved: "Approved",
        declined: "Declined",
        pending: "Pending",
      },
      actions: {
        decline: "Decline",
        approve: "Approve",
        counterOffer: "Counter Offer",
        sendPaymentLink: "Send payment link",
        resendPaymentLink: "Resend payment link",
        recoverToActive: "Recover to Active",
        deletePermanently: "Delete Permanently",
        acceptWriteContract: "Accept & Write Contract",
      },
      fields: {
        licenseFee: "License Fee",
        regions: "Regions",
        usageScope: "Usage Scope",
        deadline: "Deadline",
        duration: "Duration",
        timeline: "Timeline",
        modsAllowed: "Mods Allowed",
        contractPhase: "Contract Phase",
        territory: "Territory",
        exclusivity: "Exclusivity",
      },
      messages: {
        recovering: "Recovering...",
        deleting: "Deleting...",
        sending: "Sending...",
      },
    },
    licenseSubmissions: {
      outboundContracts: "Outbound Contracts",
      table: {
        status: "Status",
        client: "Client",
        template: "Template",
        sentDate: "Sent Date",
        actions: "Actions",
      },
      status: {
        clientPending: "client_pending",
        agencyPending: "agency_pending",
        signed: "signed",
        sent: "sent",
        opened: "opened",
        archived: "archived",
      },
      actions: {
        openAgencyLink: "Open Agency Link",
        copyAgencyLink: "Copy Agency Link",
        openClientLink: "Open Client Link",
        copyClientLink: "Copy Client Link",
        downloadPdf: "Download PDF",
        archive: "Archive",
        recoverToActive: "Recover to Active",
      },
    },
    licenseTemplates: {
      newTemplate: "New template",
      loading: "Loading...",
      noMatch: "No templates match your criteria.",
      noTemplates: "No templates yet. Create your first one to get started!",
      actions: {
        editDetails: "Edit Details",
        editLayout: "Edit Layout",
        duplicate: "Duplicate",
        delete: "Delete",
        useContract: "Use Contract",
      },
      delete: {
        title: "Delete Template",
      },
    },
    roster: {
      digitals: {
        view: "view",
        photos: "photos",
        lastUpdated: "Last updated:",
        never: "Never",
        viewHistory: "View History",
        uploadPhoto: "Upload photo",
        previousUpdates: "Previous Updates",
        loadingHistory: "loading history...",
      },
    },
    deliverables: {
      offerCard: {
        offer: "Offer",
        brand: "Brand",
        signed: "Signed",
        notSigned: "Not signed",
        paid: "Paid",
        awaitingPayment: "Awaiting Payment",
        hide: "Hide",
        open: "Open",
        assignTalent: "Assign Talent",
        addTalent: "Add Talent",
      },
      statusLabels: {
        draft: "Draft",
        sentToBrand: "Sent to Brand",
        brandApproved: "Brand Approved",
        new: "New",
        contractSigned: "Contract Signed",
        contractSent: "Contract Sent",
        sent: "Sent",
        accepted: "Accepted",
        open: "Open",
      },
      deliverableCard: {
        deliverable: "Deliverable",
        feedback: "Feedback",
        yourFeedback: "Your Feedback:",
        brandFeedback: "Brand Feedback:",
        noCaption: "No caption",
        approve: "Approve",
        revise: "Revise",
        reject: "Reject",
      },
      payoutStatus: {
        agency: "agency",
        talent: "talent",
      },
      retryTransferDialog: {
        failed: "failed",
        transferred: "Transferred",
        transfersNotAllowed: "Transfers not allowed on this Stripe account.",
      },
      toasts: {
        assignmentsLocked: "Assignments locked",
        talentUnassigned: "Talent unassigned",
        talentRemoved: "Talent removed from this offer.",
        unassignFailed: "Unassign failed",
        pleaseTryAgain: "Please try again.",
        talentAssigned: "Talent assigned",
        assignmentFailed: "Assignment failed",
        nothingToRetry: "Nothing to retry",
        allTransfersSuccessful: "All transfers were successful.",
        notYetAvailable: "Not yet available",
        retryAfterApproval: "Retry transfers after escrow approval.",
        retryFailed: "Retry failed",
        deliverablesUploaded: "Deliverables uploaded",
        uploadFailed: "Upload failed",
        permissionRequired: "Permission required",
        cannotSubmitDeliverables: "Your role cannot submit deliverables.",
        submittedToBrand: "Submitted to brand",
        submitFailed: "Submit failed",
        cannotReviewDeliverables: "Your role cannot review deliverables.",
        reviewSubmitted: "Review submitted",
        reviewFailed: "Review failed",
        deliverableDeleted: "Deliverable deleted",
        deleteFailed: "Delete failed",
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

// Merge new keys into English
deepMerge(enData, newKeys);

// For other languages, copy the English keys (they'll be translated later)
deepMerge(deData, newKeys);
deepMerge(esData, newKeys);
deepMerge(frData, newKeys);

// Write all files
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), "utf8");
fs.writeFileSync(dePath, JSON.stringify(deData, null, 2), "utf8");
fs.writeFileSync(esPath, JSON.stringify(esData, null, 2), "utf8");
fs.writeFileSync(frPath, JSON.stringify(frData, null, 2), "utf8");

console.log("✅ Added comprehensive translation keys to all locale files");
