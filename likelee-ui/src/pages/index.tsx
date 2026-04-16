import Layout from "./Layout";

import BrandsStudios from "./BrandsStudios";

import Impact from "./Impact";

import Faces from "./Faces";

import Landing from "./Landing";

import AICreators from "./AICreators";

import ReserveProfile from "./ReserveProfile";

import OrganizationSignup from "./OrganizationSignup";

import ForYou from "./ForYou";

import BrandsForYou from "./BrandsForYou";

import CreatorSignup from "./CreatorSignup";

import CreatorsForYou from "./CreatorsForYou";

import Support from "./Support";

import PrivacyPolicy from "./PrivacyPolicy";

import GetAccess from "./GetAccess";

import Studio from "./Studio";

import StudioVideo from "./StudioVideo";

import StudioImage from "./StudioImage";

import AdminCredits from "./AdminCredits";

import StudioSubscribe from "./StudioSubscribe";

import StudioVideoOptions from "./StudioVideoOptions";

import StudioImageOptions from "./StudioImageOptions";
import StudioTemplates from "./StudioTemplates";
import StudioPresets from "./StudioPresets";

import StudioImageToVideo from "./StudioImageToVideo";

import TestFalAPI from "./TestFalAPI";

import SalesInquiry from "./SalesInquiry";
import Contact from "./Contact";
import BookDemo from "./BookDemo";
import BookDemoThanks from "./BookDemoThanks";

import MarketingAgency from "./MarketingAgency";
import AgencySelection from "./AgencySelection";

import TalentAgency from "./TalentAgency";

import ProductionStudio from "./ProductionStudio";

import BrandCompany from "./BrandCompany";

import ForBusiness from "./ForBusiness";

import CreatorEconomics from "./CreatorEconomics";

import AITalentBoard from "./AITalentBoard";
import JobsBoard from "./JobsBoard";

import TalentDashboard from "./TalentDashboard";

import TalentPortal from "./TalentPortal";

import UploadProject from "./UploadProject";

import DemoTalentDashboard from "./DemoTalentDashboard";

import CreatorDashboard from "./CreatorDashboard";
import CreatorSubscribe from "./CreatorSubscribe";

import AgencyDashboard from "./AgencyDashboard";

import AgencySubscribe from "./AgencySubscribe";
import BrandSubscribe from "./BrandSubscribe";

import StripeConnectReturn from "./StripeConnectReturn";
import StripeConnectRefresh from "./StripeConnectRefresh";

import AddTalent from "./AddTalent";

import BrandDashboard from "./BrandDashboard";

import MarketingAgencyDashboard from "./MarketingAgencyDashboard";

import BrandCampaignDashboard from "./BrandCampaignDashboard";

import PostJob from "./PostJob";

import SportsAgency from "./SportsAgency";

import SportsAgencyDashboard from "./SportsAgencyDashboard";

import ScoutingOffers from "./ScoutingOffers";

import CreatorSignupOptions from "./CreatorSignupOptions";

import SAGAFTRAAlignment from "./SAGAFTRAAlignment";

import AboutUs from "./AboutUs";

import CommercialRights from "./CommercialRights";
import RoyaltyWallet from "./RoyaltyWallet";
import PublicProfile from "./PublicProfile";
import BrandDiscoverFaces from "./BrandDiscoverFaces";
import { PublicPackageView } from "./PublicPackageView";
import PublicCatalogView from "./PublicCatalogView";

import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
  Navigate,
} from "react-router-dom";
import BrandStudioAddonRoute from "@/auth/BrandStudioAddonRoute";

import ProtectedRoute from "@/auth/ProtectedRoute";
import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import UpdatePassword from "./UpdatePassword";
import AgencyInviteLanding from "./AgencyInviteLanding";
import TeamInviteLanding from "./TeamInviteLanding";
import TwoFactorSetup from "./TwoFactorSetup";
import LicensingSettings from "./LicensingSettings";
import Unauthorized from "./Unauthorized";

const PAGES = {
  BrandsStudios: BrandsStudios,

  Impact: Impact,

  Faces: Faces,

  Landing: Landing,

  AICreators: AICreators,

  ReserveProfile: ReserveProfile,

  OrganizationSignup: OrganizationSignup,

  ForYou: ForYou,

  BrandsForYou: BrandsForYou,

  CreatorSignup: CreatorSignup,

  CreatorsForYou: CreatorsForYou,

  Support: Support,

  PrivacyPolicy: PrivacyPolicy,

  GetAccess: GetAccess,

  Studio: Studio,

  StudioVideo: StudioVideo,

  StudioImage: StudioImage,

  AdminCredits: AdminCredits,

  StudioSubscribe: StudioSubscribe,

  StudioVideoOptions: StudioVideoOptions,

  StudioImageOptions: StudioImageOptions,

  StudioTemplates: StudioTemplates,

  StudioPresets: StudioPresets,

  StudioImageToVideo: StudioImageToVideo,

  TestFalAPI: TestFalAPI,

  SalesInquiry: SalesInquiry,

  Contact: Contact,

  BookDemo: BookDemo,

  BookDemoThanks: BookDemoThanks,

  MarketingAgency: MarketingAgency,

  TalentAgency: TalentAgency,

  ProductionStudio: ProductionStudio,

  BrandCompany: BrandCompany,

  ForBusiness: ForBusiness,

  CreatorEconomics: CreatorEconomics,

  AITalentBoard: AITalentBoard,
  Jobs: JobsBoard,

  TalentDashboard: TalentDashboard,

  UploadProject: UploadProject,

  DemoTalentDashboard: DemoTalentDashboard,

  CreatorDashboard: CreatorDashboard,
  CreatorSubscribe: CreatorSubscribe,

  AgencyDashboard: AgencyDashboard,

  AgencySubscribe: AgencySubscribe,

  BrandSubscribe: BrandSubscribe,

  AddTalent: AddTalent,

  BrandDashboard: BrandDashboard,

  MarketingAgencyDashboard: MarketingAgencyDashboard,

  BrandCampaignDashboard: BrandCampaignDashboard,

  PostJob: PostJob,

  SportsAgency: SportsAgency,

  SportsAgencyDashboard: SportsAgencyDashboard,

  ScoutingOffers: ScoutingOffers,

  CreatorSignupOptions: CreatorSignupOptions,

  SAGAFTRAAlignment: SAGAFTRAAlignment,

  AboutUs: AboutUs,

  CommercialRights: CommercialRights,

  LicensingSettings: LicensingSettings,

  RoyaltyWallet: RoyaltyWallet,
  PublicProfile: PublicProfile,
  BrandDiscoverFaces: BrandDiscoverFaces,
  Unauthorized: Unauthorized,
  PublicPackageView: PublicPackageView,
};

function _getCurrentPage(url) {
  const loweredUrl = url.toLowerCase();
  if (loweredUrl === "/book-demo" || loweredUrl === "/bookdemo") {
    return "BookDemo";
  }
  if (loweredUrl === "/bookdemothanks" || loweredUrl === "/book-demo/thanks") {
    return "BookDemoThanks";
  }
  if (
    loweredUrl === "/brandpricing" ||
    loweredUrl === "/brand-pricing" ||
    loweredUrl === "/brandsubscribe"
  ) {
    return "BrandSubscribe";
  }

  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  let urlLastPart = url.split("/").pop();
  if (urlLastPart.includes("?")) {
    urlLastPart = urlLastPart.split("?")[0];
  }

  const pageName = Object.keys(PAGES).find(
    (page) => page.toLowerCase() === urlLastPart.toLowerCase(),
  );
  return pageName || Object.keys(PAGES)[0];
}

function BrandPricingRedirect() {
  const location = useLocation();

  return (
    <Navigate
      to={{
        pathname: "/brandpricing",
        search: location.search,
        hash: location.hash,
      }}
      replace
    />
  );
}

// Create a wrapper component that uses useLocation inside the Router context
function AppRoutes() {
  const location = useLocation();
  const isPublicPackage = location.pathname.startsWith("/share/package/");
  const isPublicCatalog = location.pathname.startsWith("/share/catalog/");
  const isInviteFlow =
    location.pathname.startsWith("/invite/agency/") ||
    location.pathname.startsWith("/invite/team/");
  const isPasswordRecoveryFlow = location.pathname === "/update-password";

  const currentPage = _getCurrentPage(location.pathname);

  const routes = (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/BrandsStudios" element={<BrandsStudios />} />

      <Route path="/Impact" element={<Impact />} />

      <Route path="/Faces" element={<Faces />} />

      <Route path="/Landing" element={<Landing />} />

      <Route path="/AICreators" element={<AICreators />} />

      <Route path="/ReserveProfile" element={<ReserveProfile />} />

      <Route path="/OrganizationSignup" element={<OrganizationSignup />} />
      <Route path="/organization-signup" element={<OrganizationSignup />} />

      <Route path="/ForYou" element={<ForYou />} />

      <Route path="/BrandsForYou" element={<BrandsForYou />} />

      <Route path="/CreatorSignup" element={<CreatorSignup />} />

      <Route path="/CreatorsForYou" element={<CreatorsForYou />} />

      <Route path="/Support" element={<Support />} />

      <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />

      <Route path="/GetAccess" element={<GetAccess />} />

      <Route
        path="/Studio"
        element={
          <BrandStudioAddonRoute>
            <Studio />
          </BrandStudioAddonRoute>
        }
      />

      <Route
        path="/StudioVideo"
        element={
          <BrandStudioAddonRoute>
            <StudioVideo />
          </BrandStudioAddonRoute>
        }
      />

      <Route
        path="/StudioImage"
        element={
          <BrandStudioAddonRoute>
            <StudioImage />
          </BrandStudioAddonRoute>
        }
      />

      <Route path="/AdminCredits" element={<AdminCredits />} />

      <Route
        path="/StudioSubscribe"
        element={
          <BrandStudioAddonRoute>
            <StudioSubscribe />
          </BrandStudioAddonRoute>
        }
      />

      <Route path="/CreatorSubscribe" element={<CreatorSubscribe />} />

      <Route
        path="/StudioVideoOptions"
        element={
          <BrandStudioAddonRoute>
            <StudioVideoOptions />
          </BrandStudioAddonRoute>
        }
      />

      <Route
        path="/StudioImageOptions"
        element={
          <BrandStudioAddonRoute>
            <StudioImageOptions />
          </BrandStudioAddonRoute>
        }
      />

      <Route
        path="/studiotemplates"
        element={
          <BrandStudioAddonRoute>
            <StudioTemplates />
          </BrandStudioAddonRoute>
        }
      />
      <Route
        path="/StudioTemplates"
        element={
          <BrandStudioAddonRoute>
            <StudioTemplates />
          </BrandStudioAddonRoute>
        }
      />

      <Route
        path="/studiopresets"
        element={
          <BrandStudioAddonRoute>
            <StudioPresets />
          </BrandStudioAddonRoute>
        }
      />
      <Route
        path="/StudioPresets"
        element={
          <BrandStudioAddonRoute>
            <StudioPresets />
          </BrandStudioAddonRoute>
        }
      />

      <Route
        path="/StudioImageToVideo"
        element={
          <BrandStudioAddonRoute>
            <StudioImageToVideo />
          </BrandStudioAddonRoute>
        }
      />

      <Route path="/TestFalAPI" element={<TestFalAPI />} />

      <Route path="/SalesInquiry" element={<SalesInquiry />} />
      <Route path="/BookDemo" element={<BookDemo />} />
      <Route path="/bookdemo" element={<BookDemo />} />
      <Route path="/book-demo" element={<BookDemo />} />
      <Route path="/BookDemoThanks" element={<BookDemoThanks />} />
      <Route path="/bookdemothanks" element={<BookDemoThanks />} />
      <Route path="/book-demo/thanks" element={<BookDemoThanks />} />

      <Route path="/Contact" element={<Contact />} />

      <Route path="/MarketingAgency" element={<MarketingAgency />} />

      <Route path="/AgencySelection" element={<AgencySelection />} />

      <Route path="/TalentAgency" element={<TalentAgency />} />

      <Route path="/ProductionStudio" element={<ProductionStudio />} />

      <Route path="/BrandCompany" element={<BrandCompany />} />

      <Route path="/ForBusiness" element={<ForBusiness />} />

      <Route path="/CreatorEconomics" element={<CreatorEconomics />} />

      <Route path="/AITalentBoard" element={<AITalentBoard />} />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute
            allowedRoles={["creator", "talent", "agency", "ai_artist"]}
          >
            <JobsBoard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/talentportal"
        element={
          <ProtectedRoute allowedRoles={["creator", "talent"]}>
            <TalentPortal />
          </ProtectedRoute>
        }
      />

      <Route
        path="/TalentDashboard"
        element={<Navigate to="/talentportal" replace />}
      />

      <Route
        path="/UploadProject"
        element={
          <ProtectedRoute allowedRoles={["creator", "talent"]}>
            <UploadProject />
          </ProtectedRoute>
        }
      />

      <Route
        path="/DemoTalentDashboard"
        element={
          <ProtectedRoute allowedRoles={["creator", "talent"]}>
            <DemoTalentDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/CreatorDashboard"
        element={
          <ProtectedRoute allowedRoles={["creator", "talent"]}>
            <CreatorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/AgencyDashboard"
        element={
          <ProtectedRoute allowedRoles={["agency"]}>
            <AgencyDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/AddTalent"
        element={
          <ProtectedRoute>
            <AddTalent />
          </ProtectedRoute>
        }
      />
      <Route
        path="/AgencySubscribe"
        element={
          <ProtectedRoute
            allowedRoles={["agency"]}
            requiredPermissions={["manage_billing"]}
          >
            <AgencySubscribe />
          </ProtectedRoute>
        }
      />

      <Route
        path="/agencysubscribe"
        element={
          <ProtectedRoute
            allowedRoles={["agency"]}
            requiredPermissions={["manage_billing"]}
          >
            <AgencySubscribe />
          </ProtectedRoute>
        }
      />

      <Route path="/brandpricing" element={<BrandSubscribe />} />
      <Route path="/BrandSubscribe" element={<BrandPricingRedirect />} />
      <Route path="/brandsubscribe" element={<BrandPricingRedirect />} />
      <Route path="/brand-pricing" element={<BrandPricingRedirect />} />

      <Route path="/stripe/connect/return" element={<StripeConnectReturn />} />
      <Route
        path="/stripe/connect/refresh"
        element={<StripeConnectRefresh />}
      />

      <Route
        path="/BrandDashboard"
        element={
          <ProtectedRoute allowedRoles={["brand"]}>
            <BrandDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/MarketingAgencyDashboard"
        element={
          <ProtectedRoute allowedRoles={["agency"]}>
            <MarketingAgencyDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/BrandCampaignDashboard"
        element={
          <ProtectedRoute
            allowedRoles={["brand"]}
            requiredPermissions={["create_campaigns"]}
          >
            <BrandCampaignDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/PostJob"
        element={
          <ProtectedRoute allowedRoles={["brand", "agency"]}>
            <PostJob />
          </ProtectedRoute>
        }
      />

      <Route path="/SportsAgency" element={<SportsAgency />} />

      <Route
        path="/SportsAgencyDashboard"
        element={
          <ProtectedRoute allowedRoles={["agency"]}>
            <SportsAgencyDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/scoutingoffers"
        element={
          <ProtectedRoute allowedRoles={["agency"]}>
            <ScoutingOffers />
          </ProtectedRoute>
        }
      />

      <Route path="/CreatorSignupOptions" element={<CreatorSignupOptions />} />

      <Route path="/SAGAFTRAAlignment" element={<SAGAFTRAAlignment />} />

      <Route path="/AboutUs" element={<AboutUs />} />

      <Route path="/CommercialRights" element={<CommercialRights />} />

      <Route
        path="/LicensingSettings"
        element={
          <ProtectedRoute allowedRoles={["creator", "talent"]}>
            <LicensingSettings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/RoyaltyWallet"
        element={
          <ProtectedRoute allowedRoles={["creator", "talent"]}>
            <RoyaltyWallet />
          </ProtectedRoute>
        }
      />

      <Route
        path="/PublicProfile"
        element={
          <ProtectedRoute allowedRoles={["creator", "talent"]}>
            <PublicProfile />
          </ProtectedRoute>
        }
      />

      <Route path="/BrandDiscoverFaces" element={<BrandDiscoverFaces />} />

      <Route path="/Login" element={<Login />} />
      <Route path="/login" element={<Login />} />

      <Route path="/Register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/update-password" element={<UpdatePassword />} />

      <Route path="/invite/agency/:token" element={<AgencyInviteLanding />} />
      <Route path="/invite/team/:token" element={<TeamInviteLanding />} />
      <Route
        path="/TwoFactorSetup"
        element={
          <ProtectedRoute>
            <TwoFactorSetup />
          </ProtectedRoute>
        }
      />
      <Route path="/Unauthorized" element={<Unauthorized />} />
    </Routes>
  );

  if (isPublicCatalog) {
    return (
      <Routes>
        <Route path="/share/catalog/:token" element={<PublicCatalogView />} />
      </Routes>
    );
  }

  if (isPublicPackage) {
    return (
      <Routes>
        <Route path="/share/package/:token" element={<PublicPackageView />} />
      </Routes>
    );
  }

  if (isInviteFlow || isPasswordRecoveryFlow) {
    return routes;
  }

  return <Layout currentPageName={currentPage}>{routes}</Layout>;
}

export default function Pages() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
