const fs = require("fs");
const path = require("path");

// Read the English locale file
const enPath = path.join(__dirname, "src/locales/agency/en.json");
const enData = JSON.parse(fs.readFileSync(enPath, "utf8"));

// Add missing keys for licensingRequests
if (!enData.agencyDashboard.licensingRequests.filter) {
  enData.agencyDashboard.licensingRequests.filter = {};
}
enData.agencyDashboard.licensingRequests.filter.button = "Filter";
enData.agencyDashboard.licensingRequests.filter.clear = "Clear";
enData.agencyDashboard.licensingRequests.filter.apply = "Apply";

// Add missing keys for licensing requests
enData.agencyDashboard.licensingRequests.archiveNotice =
  "Licensing requests past their end date are automatically moved to the Archive tab.";
enData.agencyDashboard.licensingRequests.noActive =
  "No active licensing requests";
enData.agencyDashboard.licensingRequests.noArchived =
  "No archived licensing requests";

// Add status labels
if (!enData.agencyDashboard.licensingRequests.statusLabels) {
  enData.agencyDashboard.licensingRequests.statusLabels = {};
}
enData.agencyDashboard.licensingRequests.statusLabels.approved = "Approved";
enData.agencyDashboard.licensingRequests.statusLabels.declined = "Declined";
enData.agencyDashboard.licensingRequests.statusLabels.pending = "Pending";

// Add action buttons
if (!enData.agencyDashboard.licensingRequests.actions) {
  enData.agencyDashboard.licensingRequests.actions = {};
}
enData.agencyDashboard.licensingRequests.actions.decline = "Decline";
enData.agencyDashboard.licensingRequests.actions.approve = "Approve";
enData.agencyDashboard.licensingRequests.actions.counterOffer = "Counter Offer";
enData.agencyDashboard.licensingRequests.actions.sendPaymentLink =
  "Send payment link";
enData.agencyDashboard.licensingRequests.actions.resendPaymentLink =
  "Resend payment link";
enData.agencyDashboard.licensingRequests.actions.recoverToActive =
  "Recover to Active";
enData.agencyDashboard.licensingRequests.actions.deletePermanently =
  "Delete Permanently";
enData.agencyDashboard.licensingRequests.actions.acceptWriteContract =
  "Accept & Write Contract";

// Add field labels
if (!enData.agencyDashboard.licensingRequests.fields) {
  enData.agencyDashboard.licensingRequests.fields = {};
}
enData.agencyDashboard.licensingRequests.fields.licenseFee = "License Fee";
enData.agencyDashboard.licensingRequests.fields.regions = "Regions";
enData.agencyDashboard.licensingRequests.fields.usageScope = "Usage Scope";
enData.agencyDashboard.licensingRequests.fields.deadline = "Deadline";
enData.agencyDashboard.licensingRequests.fields.duration = "Duration";
enData.agencyDashboard.licensingRequests.fields.timeline = "Timeline";
enData.agencyDashboard.licensingRequests.fields.modsAllowed = "Mods Allowed";
enData.agencyDashboard.licensingRequests.fields.contractPhase =
  "Contract Phase";
enData.agencyDashboard.licensingRequests.fields.territory = "Territory";
enData.agencyDashboard.licensingRequests.fields.exclusivity = "Exclusivity";

// Add filter modal
if (!enData.agencyDashboard.licensingRequests.filterModal) {
  enData.agencyDashboard.licensingRequests.filterModal = {};
}
enData.agencyDashboard.licensingRequests.filterModal.title =
  "Filter Licensing Requests";
enData.agencyDashboard.licensingRequests.filterModal.description =
  "Narrow down your licensing requests by status, license fee, and duration.";
enData.agencyDashboard.licensingRequests.filterModal.status = "Status";
enData.agencyDashboard.licensingRequests.filterModal.allStatuses =
  "All Statuses";
enData.agencyDashboard.licensingRequests.filterModal.licenseFee = "License Fee";
enData.agencyDashboard.licensingRequests.filterModal.duration = "Duration";
enData.agencyDashboard.licensingRequests.filterModal.apply = "Apply";
enData.agencyDashboard.licensingRequests.filterModal.clear = "Clear";

// Add license submissions missing keys
if (!enData.agencyDashboard.licenseSubmissions.table) {
  enData.agencyDashboard.licenseSubmissions.table = {};
}
enData.agencyDashboard.licenseSubmissions.table.status = "Status";
enData.agencyDashboard.licenseSubmissions.table.client = "Client";
enData.agencyDashboard.licenseSubmissions.table.template = "Template";
enData.agencyDashboard.licenseSubmissions.table.sentDate = "Sent Date";
enData.agencyDashboard.licenseSubmissions.table.actions = "Actions";

if (!enData.agencyDashboard.licenseSubmissions.status) {
  enData.agencyDashboard.licenseSubmissions.status = {};
}
enData.agencyDashboard.licenseSubmissions.status.clientPending =
  "Client pending";
enData.agencyDashboard.licenseSubmissions.status.agencyPending =
  "Agency pending";
enData.agencyDashboard.licenseSubmissions.status.signed = "Signed";
enData.agencyDashboard.licenseSubmissions.status.sent = "Sent";
enData.agencyDashboard.licenseSubmissions.status.opened = "Opened";
enData.agencyDashboard.licenseSubmissions.status.archived = "Archived";

if (!enData.agencyDashboard.licenseSubmissions.actions) {
  enData.agencyDashboard.licenseSubmissions.actions = {};
}
enData.agencyDashboard.licenseSubmissions.actions.openAgencyLink =
  "Open Agency Link";
enData.agencyDashboard.licenseSubmissions.actions.copyAgencyLink =
  "Copy Agency Link";
enData.agencyDashboard.licenseSubmissions.actions.openClientLink =
  "Open Client Link";
enData.agencyDashboard.licenseSubmissions.actions.copyClientLink =
  "Copy Client Link";
enData.agencyDashboard.licenseSubmissions.actions.downloadPdf = "Download PDF";
enData.agencyDashboard.licenseSubmissions.actions.archive = "Archive";
enData.agencyDashboard.licenseSubmissions.actions.recoverToActive =
  "Recover to Active";

enData.agencyDashboard.licenseSubmissions.outboundContracts =
  "Outbound Contracts";

// Add license templates missing keys
if (!enData.agencyDashboard.licenseTemplates.actions) {
  enData.agencyDashboard.licenseTemplates.actions = {};
}
enData.agencyDashboard.licenseTemplates.actions.editDetails = "Edit Details";
enData.agencyDashboard.licenseTemplates.actions.editLayout = "Edit Layout";
enData.agencyDashboard.licenseTemplates.actions.duplicate = "Duplicate";
enData.agencyDashboard.licenseTemplates.actions.delete = "Delete";
enData.agencyDashboard.licenseTemplates.actions.useContract = "Use Contract";

enData.agencyDashboard.licenseTemplates.newTemplate = "New template";
enData.agencyDashboard.licenseTemplates.loading = "Loading...";
enData.agencyDashboard.licenseTemplates.noMatch =
  "No templates match your criteria.";
enData.agencyDashboard.licenseTemplates.noTemplates =
  "No templates yet. Create your first one to get started!";

// Add digitals tracking keys
if (!enData.agencyDashboard.roster.digitals) {
  enData.agencyDashboard.roster.digitals = {};
}
enData.agencyDashboard.roster.digitals.view = "View";
enData.agencyDashboard.roster.digitals.photos = "photos";
enData.agencyDashboard.roster.digitals.lastUpdated = "Last updated:";
enData.agencyDashboard.roster.digitals.never = "Never";
enData.agencyDashboard.roster.digitals.viewHistory = "View History";
enData.agencyDashboard.roster.digitals.uploadPhoto = "Upload photo";
enData.agencyDashboard.roster.digitals.previousUpdates = "Previous Updates";
enData.agencyDashboard.roster.digitals.loadingHistory = "Loading history...";

// Write back to file
fs.writeFileSync(enPath, JSON.stringify(enData, null, 2), "utf8");
console.log("✅ Added missing translation keys to en.json");
