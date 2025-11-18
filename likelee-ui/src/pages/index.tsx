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

import StudioAvatar from "./StudioAvatar";

import AdminCredits from "./AdminCredits";

import StudioSubscribe from "./StudioSubscribe";

import StudioVideoOptions from "./StudioVideoOptions";

import StudioImageOptions from "./StudioImageOptions";

import StudioImageToVideo from "./StudioImageToVideo";

import TestFalAPI from "./TestFalAPI";

import SalesInquiry from "./SalesInquiry";

import MarketingAgency from "./MarketingAgency";

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

import AddTalent from "./AddTalent";

import BrandDashboard from "./BrandDashboard";

import MarketingAgencyDashboard from "./MarketingAgencyDashboard";

import BrandCampaignDashboard from "./BrandCampaignDashboard";

import PostJob from "./PostJob";

import SportsAgency from "./SportsAgency";

import SportsAgencyDashboard from "./SportsAgencyDashboard";

import CreatorSignupOptions from "./CreatorSignupOptions";

import SAGAFTRAAlignment from "./SAGAFTRAAlignment";

import AboutUs from "./AboutUs";

import CommercialRights from "./CommercialRights";

import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

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

  StudioAvatar: StudioAvatar,

  AdminCredits: AdminCredits,

  StudioSubscribe: StudioSubscribe,

  StudioVideoOptions: StudioVideoOptions,

  StudioImageOptions: StudioImageOptions,

  StudioImageToVideo: StudioImageToVideo,

  TestFalAPI: TestFalAPI,

  SalesInquiry: SalesInquiry,

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

  AddTalent: AddTalent,

  BrandDashboard: BrandDashboard,

  MarketingAgencyDashboard: MarketingAgencyDashboard,

  BrandCampaignDashboard: BrandCampaignDashboard,

  PostJob: PostJob,

  SportsAgency: SportsAgency,

  SportsAgencyDashboard: SportsAgencyDashboard,

  CreatorSignupOptions: CreatorSignupOptions,

  SAGAFTRAAlignment: SAGAFTRAAlignment,

  AboutUs: AboutUs,

  CommercialRights: CommercialRights,
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
function PagesContent() {
  const location = useLocation();
  const currentPage = _getCurrentPage(location.pathname);

  return (
    <Layout currentPageName={currentPage}>
      <Routes>
        <Route path="/" element={<BrandsStudios />} />

        <Route path="/BrandsStudios" element={<BrandsStudios />} />

        <Route path="/Impact" element={<Impact />} />

        <Route path="/Faces" element={<Faces />} />

        <Route path="/Landing" element={<Landing />} />

        <Route path="/AICreators" element={<AICreators />} />

        <Route path="/ReserveProfile" element={<ReserveProfile />} />

        <Route path="/OrganizationSignup" element={<OrganizationSignup />} />

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

        <Route path="/StudioAvatar" element={<StudioAvatar />} />

        <Route path="/AdminCredits" element={<AdminCredits />} />

        <Route path="/StudioSubscribe" element={<StudioSubscribe />} />

        <Route path="/StudioVideoOptions" element={<StudioVideoOptions />} />

        <Route path="/StudioImageOptions" element={<StudioImageOptions />} />

        <Route path="/StudioImageToVideo" element={<StudioImageToVideo />} />

        <Route path="/TestFalAPI" element={<TestFalAPI />} />

        <Route path="/SalesInquiry" element={<SalesInquiry />} />

        <Route path="/MarketingAgency" element={<MarketingAgency />} />

        <Route path="/TalentAgency" element={<TalentAgency />} />

        <Route path="/ProductionStudio" element={<ProductionStudio />} />

        <Route path="/BrandCompany" element={<BrandCompany />} />

        <Route path="/ForBusiness" element={<ForBusiness />} />

        <Route path="/CreatorEconomics" element={<CreatorEconomics />} />

        <Route path="/AITalentBoard" element={<AITalentBoard />} />

        <Route path="/TalentDashboard" element={<TalentDashboard />} />

        <Route path="/UploadProject" element={<UploadProject />} />

        <Route path="/DemoTalentDashboard" element={<DemoTalentDashboard />} />

        <Route path="/CreatorDashboard" element={<CreatorDashboard />} />

        <Route path="/AgencyDashboard" element={<AgencyDashboard />} />

        <Route path="/AddTalent" element={<AddTalent />} />

        <Route path="/BrandDashboard" element={<BrandDashboard />} />

        <Route
          path="/MarketingAgencyDashboard"
          element={<MarketingAgencyDashboard />}
        />

        <Route
          path="/BrandCampaignDashboard"
          element={<BrandCampaignDashboard />}
        />

        <Route path="/PostJob" element={<PostJob />} />

        <Route path="/SportsAgency" element={<SportsAgency />} />

        <Route
          path="/SportsAgencyDashboard"
          element={<SportsAgencyDashboard />}
        />

        <Route
          path="/CreatorSignupOptions"
          element={<CreatorSignupOptions />}
        />

        <Route path="/SAGAFTRAAlignment" element={<SAGAFTRAAlignment />} />

        <Route path="/AboutUs" element={<AboutUs />} />

        <Route path="/CommercialRights" element={<CommercialRights />} />
      </Routes>
    </Layout>
  );
}

export default function Pages() {
  return (
    <Router>
      <PagesContent />
    </Router>
  );
}
