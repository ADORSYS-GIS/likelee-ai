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

import StudioImageToVideo from "./StudioImageToVideo";

import TestFalAPI from "./TestFalAPI";

import SalesInquiry from "./SalesInquiry";
import Contact from "./Contact";

import MarketingAgency from "./MarketingAgency";
import AgencySelection from "./AgencySelection";

import TalentAgency from "./TalentAgency";

import ProductionStudio from "./ProductionStudio";

import BrandCompany from "./BrandCompany";

import ForBusiness from "./ForBusiness";

import CreatorEconomics from "./CreatorEconomics";

import AITalentBoard from "./AITalentBoard";

import TalentDashboard from "./TalentDashboard";

import UploadProject from "./UploadProject";

import DemoTalentDashboard from "./DemoTalentDashboard";

import CreatorDashboard from "./CreatorDashboard";

import AgencyDashboard from "./AgencyDashboard";

import AgencySubscribe from "./AgencySubscribe";

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

import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const __pagesQueryClient = new QueryClient();
import ProtectedRoute from "@/auth/ProtectedRoute";
import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import UpdatePassword from "./UpdatePassword";
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

  StudioImageToVideo: StudioImageToVideo,

  TestFalAPI: TestFalAPI,

  SalesInquiry: SalesInquiry,

  Contact: Contact,

  MarketingAgency: MarketingAgency,

  TalentAgency: TalentAgency,

  ProductionStudio: ProductionStudio,

  BrandCompany: BrandCompany,

  ForBusiness: ForBusiness,

  CreatorEconomics: CreatorEconomics,

  AITalentBoard: AITalentBoard,

  TalentDashboard: TalentDashboard,

  UploadProject: UploadProject,

  DemoTalentDashboard: DemoTalentDashboard,

  CreatorDashboard: CreatorDashboard,

  AgencyDashboard: AgencyDashboard,

  AgencySubscribe: AgencySubscribe,

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

// Create a wrapper component that uses useLocation inside the Router context
function AppRoutes() {
  const location = useLocation();
  const isPublicPackage = location.pathname.startsWith("/share/package/");

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

      <Route path="/Studio" element={<Studio />} />

      <Route path="/StudioVideo" element={<StudioVideo />} />

      <Route path="/StudioImage" element={<StudioImage />} />

      <Route path="/AdminCredits" element={<AdminCredits />} />

      <Route path="/StudioSubscribe" element={<StudioSubscribe />} />

      <Route path="/StudioVideoOptions" element={<StudioVideoOptions />} />

      <Route path="/StudioImageOptions" element={<StudioImageOptions />} />

      <Route path="/StudioImageToVideo" element={<StudioImageToVideo />} />

      <Route path="/TestFalAPI" element={<TestFalAPI />} />

      <Route path="/SalesInquiry" element={<SalesInquiry />} />

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
        path="/TalentDashboard"
        element={
          <ProtectedRoute allowedRoles={["creator"]}>
            <TalentDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/UploadProject"
        element={
          <ProtectedRoute allowedRoles={["creator"]}>
            <UploadProject />
          </ProtectedRoute>
        }
      />

      <Route
        path="/DemoTalentDashboard"
        element={
          <ProtectedRoute allowedRoles={["creator"]}>
            <DemoTalentDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/CreatorDashboard"
        element={
          <ProtectedRoute allowedRoles={["creator"]}>
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
          <ProtectedRoute allowedRoles={["agency"]}>
            <AgencySubscribe />
          </ProtectedRoute>
        }
      />

      <Route
        path="/agencysubscribe"
        element={
          <ProtectedRoute allowedRoles={["agency"]}>
            <AgencySubscribe />
          </ProtectedRoute>
        }
      />

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
          <ProtectedRoute allowedRoles={["brand"]}>
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
          <ProtectedRoute allowedRoles={["creator"]}>
            <LicensingSettings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/RoyaltyWallet"
        element={
          <ProtectedRoute allowedRoles={["creator"]}>
            <RoyaltyWallet />
          </ProtectedRoute>
        }
      />

      <Route
        path="/PublicProfile"
        element={
          <ProtectedRoute allowedRoles={["creator"]}>
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

  if (isPublicPackage) {
    return (
      <Routes>
        <Route path="/share/package/:token" element={<PublicPackageView />} />
      </Routes>
    );
  }

  return <Layout currentPageName={currentPage}>{routes}</Layout>;
}

export default function Pages() {
  return (
    <QueryClientProvider client={__pagesQueryClient}>
      <Router>
        <AppRoutes />
      </Router>
    </QueryClientProvider>
  );
}
