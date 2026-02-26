import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Menu, X, Sparkles, LogIn, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useAuth } from "@/auth/AuthProvider";
import { CONTACT_EMAIL, CONTACT_EMAIL_MAILTO } from "@/config/public";

export default function Layout({ children, currentPageName }) {
  const { t, i18n } = useTranslation();
  const { authenticated, logout, profile } = useAuth();

  // Determine the correct dashboard path based on the user's role.
  const dashboardPath =
    profile?.role === "brand"
      ? "/BrandDashboard"
      : profile?.role === "agency"
        ? "/AgencyDashboard"
        : profile?.role === "talent"
          ? "/talentportal"
          : "/CreatorDashboard";
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if we're on a Studio page
  const isStudioPage =
    currentPageName?.startsWith("Studio") ||
    location.pathname.includes("/studio");

  // Check if we're on a Dashboard page
  const isDashboardPage =
    currentPageName?.includes("Dashboard") ||
    location.pathname.includes("/CreatorDashboard") ||
    location.pathname.includes("/BrandDashboard") ||
    location.pathname.includes("/AgencyDashboard") ||
    location.pathname.includes("/TalentDashboard") ||
    location.pathname.includes("/talentportal");

  const isLandingPage =
    currentPageName === "Landing" ||
    location.pathname === "/" ||
    location.pathname.toLowerCase() === "/landing";

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Track page views on route change
  useEffect(() => {
    const gtag = (window as any).gtag;
    if (gtag) {
      gtag("config", "G-3D3HD3NBKY", {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  // Initialize Google Analytics
  useEffect(() => {
    if (!import.meta.env.PROD) {
      return;
    }
    // Load Google Analytics script
    const script1 = document.createElement("script");
    script1.async = true;
    script1.src = "https://www.googletagmanager.com/gtag/js?id=G-3D3HD3NBKY";
    document.head.appendChild(script1);

    // Initialize gtag
    const script2 = document.createElement("script");
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-3D3HD3NBKY');
    `;
    document.head.appendChild(script2);

    // Load Ubuntu font
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap";
    document.head.appendChild(fontLink);

    // Add meta tags for SEO
    const updateMetaTags = () => {
      // Set title
      document.title =
        "The Verified Talent Ecosystem for AI-powered Media.";

      // Update or create meta description
      let metaDescription = document.querySelector(
        'meta[name="description"]',
      ) as HTMLMetaElement | null;
      if (!metaDescription) {
        metaDescription = document.createElement("meta") as HTMLMetaElement;
        metaDescription.name = "description";
        document.head.appendChild(metaDescription);
      }
      metaDescription.content =
        "Likelee empowers creators, athletes, and talent to license, verify, and monetize their digital likenesses. Join the platform setting the standard for ethical AI creativity.";

      // Add Open Graph tags
      const ogTags = [
        { property: "og:title", content: "Likelee - AI Era Creator Economy" },
        {
          property: "og:description",
          content:
            "License your likeness, earn royalties, and maintain control in the age of AI",
        },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://likelee.ai" },
        {
          property: "og:image",
          content:
            "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eaaf29851_Screenshot2025-10-12at31742PM.png",
        },
      ];

      ogTags.forEach((tag) => {
        let meta = document.querySelector(
          `meta[property="${tag.property}"]`,
        ) as HTMLMetaElement | null;
        if (!meta) {
          meta = document.createElement("meta") as HTMLMetaElement;
          meta.setAttribute("property", tag.property);
          document.head.appendChild(meta);
        }
        meta.content = tag.content;
      });

      // Add Twitter Card tags
      const twitterTags = [
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Likelee - AI Era Creator Economy" },
        {
          name: "twitter:description",
          content:
            "License your likeness, earn royalties, and maintain control in the age of AI",
        },
      ];

      twitterTags.forEach((tag) => {
        let meta = document.querySelector(
          `meta[name="${tag.name}"]`,
        ) as HTMLMetaElement | null;
        if (!meta) {
          meta = document.createElement("meta") as HTMLMetaElement;
          meta.name = tag.name;
          document.head.appendChild(meta);
        }
        meta.content = tag.content;
      });

      // Add canonical link
      let canonical = document.querySelector(
        'link[rel="canonical"]',
      ) as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement("link") as HTMLLinkElement;
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = window.location.href;
    };

    updateMetaTags();
  }, [i18n.language]);

  // If we're on a Studio page, don't render the layout navigation
  if (isStudioPage) {
    return (
      <div
        className="min-h-screen bg-white"
        style={{ fontFamily: "'Ubuntu', sans-serif" }}
      >
        <noscript>
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              backgroundColor: "#fff3cd",
              border: "2px solid #856404",
              margin: "20px",
              borderRadius: "8px",
            }}
          >
            <h1
              style={{
                color: "#856404",
                marginBottom: "16px",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              {t("javascriptRequired")}
            </h1>
            <p
              style={{
                color: "#856404",
                fontSize: "18px",
                marginBottom: "20px",
              }}
            >
              {t("javascriptRequiredMessage")}
            </p>
            <div
              style={{
                color: "#856404",
                fontSize: "16px",
                textAlign: "left",
                maxWidth: "600px",
                margin: "0 auto",
                backgroundColor: "#fff",
                padding: "20px",
                borderRadius: "4px",
              }}
            >
              <h2
                style={{
                  fontWeight: "bold",
                  marginBottom: "15px",
                  fontSize: "18px",
                }}
              >
                {t("aboutLikelee")}
              </h2>
              <ul
                style={{
                  listStyle: "disc",
                  paddingLeft: "20px",
                  lineHeight: "1.8",
                  marginBottom: "20px",
                }}
              >
                <li>
                  <strong>{t("forCreators")}:</strong> {t("forCreatorsMessage")}
                </li>
                <li>
                  <strong>{t("forAiArtists")}:</strong>{" "}
                  {t("forAiArtistsMessage")}
                </li>
                <li>
                  <strong>{t("forBusinesses")}:</strong>{" "}
                  {t("forBusinessesMessage")}
                </li>
                <li>
                  <strong>{t("protectionAndRights")}:</strong>{" "}
                  {t("protectionAndRightsMessage")}
                </li>
              </ul>
              <p style={{ marginTop: "20px", fontWeight: "bold" }}>
                {t("enableJavascript")}
              </p>
              <p style={{ marginTop: "15px" }}>
                <a
                  href="/static"
                  style={{ color: "#856404", textDecoration: "underline" }}
                >
                  {t("viewSimplifiedVersion")}
                </a>
              </p>
            </div>
          </div>
        </noscript>
        <style>{`
          :root {
            --faces-primary: #32C8D1;
            --creators-primary: #F18B6A;
            --brands-primary: #F7B750;
            --brands-secondary: #FAD54C;
          }
          
          * {
            font-family: 'Ubuntu', sans-serif;
          }
          
          body {
            font-family: 'Ubuntu', sans-serif;
          }
        `}</style>
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "'Ubuntu', sans-serif" }}
    >
      <noscript>
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            backgroundColor: "#fff3cd",
            border: "2px solid #856404",
            margin: "20px",
            borderRadius: "8px",
          }}
        >
          <h1
            style={{
              color: "#856404",
              marginBottom: "16px",
              fontSize: "28px",
              fontWeight: "bold",
            }}
          >
            {t("javascriptRequiredFullExperience")}
          </h1>
          <p
            style={{
              color: "#856404",
              fontSize: "20px",
              marginBottom: "25px",
              fontWeight: "500",
            }}
          >
            {t("interactivePlatformMessage")}
          </p>

          <div
            style={{
              color: "#856404",
              fontSize: "16px",
              textAlign: "left",
              maxWidth: "700px",
              margin: "0 auto",
              backgroundColor: "#fff",
              padding: "30px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h2
              style={{
                fontWeight: "bold",
                marginBottom: "20px",
                fontSize: "22px",
                color: "#111",
              }}
            >
              {t("platformFeatures")}
            </h2>

            <div style={{ marginBottom: "25px" }}>
              <h3
                style={{
                  fontWeight: "bold",
                  marginBottom: "10px",
                  fontSize: "18px",
                  color: "#32C8D1",
                }}
              >
                {t("forCreatorsAndAthletes")}
              </h3>
              <ul
                style={{
                  listStyle: "disc",
                  paddingLeft: "20px",
                  lineHeight: "1.8",
                }}
              >
                <li>{t("forCreatorsAndAthletesMessage1")}</li>
                <li>{t("forCreatorsAndAthletesMessage2")}</li>
                <li>{t("forCreatorsAndAthletesMessage3")}</li>
                <li>{t("forCreatorsAndAthletesMessage4")}</li>
              </ul>
            </div>

            <div style={{ marginBottom: "25px" }}>
              <h3
                style={{
                  fontWeight: "bold",
                  marginBottom: "10px",
                  fontSize: "18px",
                  color: "#F18B6A",
                }}
              >
                {t("forAiArtistsAndFilmmakers")}
              </h3>
              <ul
                style={{
                  listStyle: "disc",
                  paddingLeft: "20px",
                  lineHeight: "1.8",
                }}
              >
                <li>{t("forAiArtistsAndFilmmakersMessage1")}</li>
                <li>{t("forAiArtistsAndFilmmakersMessage2")}</li>
                <li>{t("forAiArtistsAndFilmmakersMessage3")}</li>
                <li>{t("forAiArtistsAndFilmmakersMessage4")}</li>
              </ul>
            </div>

            <div style={{ marginBottom: "25px" }}>
              <h3
                style={{
                  fontWeight: "bold",
                  marginBottom: "10px",
                  fontSize: "18px",
                  color: "#F7B750",
                }}
              >
                {t("forBusinesses")}
              </h3>
              <ul
                style={{
                  listStyle: "disc",
                  paddingLeft: "20px",
                  lineHeight: "1.8",
                }}
              >
                <li>{t("forBusinessesMessage1")}</li>
                <li>{t("forBusinessesMessage2")}</li>
                <li>{t("forBusinessesMessage3")}</li>
                <li>{t("forBusinessesMessage4")}</li>
              </ul>
            </div>

            <div
              style={{
                marginTop: "30px",
                padding: "20px",
                backgroundColor: "#f0f9ff",
                borderRadius: "6px",
                borderLeft: "4px solid #32C8D1",
              }}
            >
              <p style={{ margin: "0", fontWeight: "600", fontSize: "16px" }}>
                {t("ethicalAiStandards")}
              </p>
            </div>

            <div style={{ marginTop: "30px", textAlign: "center" }}>
              <p
                style={{
                  marginBottom: "15px",
                  fontSize: "18px",
                  fontWeight: "bold",
                }}
              >
                {t("toAccessPlatform")}
              </p>
              <ol
                style={{
                  textAlign: "left",
                  paddingLeft: "40px",
                  lineHeight: "2",
                  marginBottom: "20px",
                }}
              >
                <li>{t("enableJavascriptInBrowser")}</li>
                <li>{t("refreshPage")}</li>
                <li>
                  {t("orViewOur")}{" "}
                  <a
                    href="/static"
                    style={{
                      color: "#32C8D1",
                      textDecoration: "underline",
                      fontWeight: "600",
                    }}
                  >
                    {t("simplifiedTextVersion")}
                  </a>
                </li>
              </ol>

              <div
                style={{
                  marginTop: "25px",
                  paddingTop: "20px",
                  borderTop: "1px solid #ddd",
                }}
              >
                <p
                  style={{
                    color: "#666",
                    fontSize: "14px",
                    marginBottom: "10px",
                  }}
                >
                  {t("questionsContactUs")}
                </p>
                <a
                  href={CONTACT_EMAIL_MAILTO}
                  style={{
                    color: "#32C8D1",
                    fontSize: "16px",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </div>
        </div>
      </noscript>
      <style>{`
        :root {
          --faces-primary: #32C8D1;
          --creators-primary: #F18B6A;
          --brands-primary: #F7B750;
          --brands-secondary: #FAD54C;
        }
        
        * {
          font-family: 'Ubuntu', sans-serif;
        }
        
        body {
          font-family: 'Ubuntu', sans-serif;
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-xl border-b border-gray-200 z-50 shadow-sm">
        <div
          className={
            isDashboardPage
              ? "w-full px-6 lg:px-8"
              : "max-w-7xl mx-auto px-6 lg:px-8"
          }
        >
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to={createPageUrl("Landing")}
              className="flex items-center gap-3 group"
            >
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eaaf29851_Screenshot2025-10-12at31742PM.png"
                alt="Likelee Logo"
                width="40"
                height="40"
                className="h-10 w-auto transform transition-transform group-hover:scale-105"
              />
              <span className="text-xl font-bold text-gray-900 tracking-tight">
                Likelee
              </span>
            </Link>

            {/* Desktop Navigation */}
            {!isDashboardPage && (
              <div className="hidden md:flex items-center gap-1">
                <Link
                  to={createPageUrl("AgencySelection")}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all relative ${
                    location.pathname === createPageUrl("AgencySelection")
                      ? "text-gray-900 bg-gray-100"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {t("agencies")}
                </Link>

                <Link
                  to={createPageUrl("AboutUs")}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all relative ${
                    location.pathname === createPageUrl("AboutUs")
                      ? "text-gray-900 bg-gray-100"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {t("aboutUs")}
                </Link>

                <Link
                  to={createPageUrl("Contact")}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all relative ${
                    location.pathname === createPageUrl("Contact")
                      ? "text-gray-900 bg-gray-100"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {t("contact")}
                </Link>

                {!authenticated ? (
                  <Link
                    to="/Login"
                    className="px-5 py-2 text-sm font-bold text-white bg-[#32C8D1] rounded-md hover:bg-[#2AB8C1] transition-all"
                  >
                    {t("common.signIn")}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 ml-4">
                    {currentPageName !== "OrganizationSignup" && (
                      <Link
                        to={dashboardPath}
                        className="px-6 py-2 text-sm font-bold text-white bg-[#32C8D1] rounded-lg hover:bg-[#2AB8C1] transition-all shadow-sm"
                      >
                        {t("common.dashboard")}
                      </Link>
                    )}
                    <button
                      onClick={() => logout()}
                      className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                      title={t("common.logout")}
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Language Switcher and Mobile Menu Button */}
            <div className="flex items-center gap-2">
              {!isLandingPage && <LanguageSwitcher />}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-gray-600 hover:text-gray-900 p-2"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              <Link
                to={createPageUrl("AgencySelection")}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 text-base font-semibold rounded-lg transition-all ${
                  location.pathname === createPageUrl("AgencySelection")
                    ? "text-gray-900 bg-gray-100"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t("agencies")}
              </Link>

              <Link
                to={createPageUrl("AboutUs")}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 text-base font-semibold rounded-lg transition-all ${
                  location.pathname === createPageUrl("AboutUs")
                    ? "text-gray-900 bg-gray-100"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t("aboutUs")}
              </Link>

              <Link
                to={createPageUrl("Contact")}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 text-base font-semibold rounded-lg transition-all ${
                  location.pathname === createPageUrl("Contact")
                    ? "text-gray-900 bg-gray-100"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t("contact")}
              </Link>
              {!isLandingPage && (
                <div className="px-4 py-3">
                  <LanguageSwitcher />
                </div>
              )}

              <div className="pt-4 px-4">
                {!authenticated ? (
                  <Link
                    to="/Login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 text-base font-bold text-white bg-[#32C8D1] rounded-md"
                  >
                    <LogIn className="w-5 h-5" />
                    {t("common.signIn")}
                  </Link>
                ) : (
                  <div className="space-y-3 w-full">
                    <Link
                      to={dashboardPath}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center w-full py-3 text-base font-bold text-white bg-[#32C8D1] rounded-lg shadow-sm"
                    >
                      {t("common.dashboard")}
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center justify-center gap-2 w-full py-3 text-base font-bold text-red-500 bg-red-50 rounded-lg"
                    >
                      <LogOut className="w-5 h-5" />
                      {t("common.logout")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-16">{children}</main>

      {/* Footer - Hidden on Dashboard pages */}
      {!isDashboardPage && (
        <footer className="bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
            <div className="grid md:grid-cols-4 gap-12">
              <div>
                <Link
                  to={createPageUrl("Landing")}
                  className="flex items-center gap-3 mb-6"
                >
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ed7158e33f31b30f653449/eaaf29851_Screenshot2025-10-12at31742PM.png"
                    alt="Likelee Logo"
                    loading="lazy"
                    width="40"
                    height="40"
                    className="h-10 w-auto"
                  />
                  <span className="text-xl font-bold text-gray-900">
                    Likelee
                  </span>
                </Link>
                <p className="text-gray-600 text-sm leading-relaxed max-w-md">
                  {t("footerSlogan")}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">
                  {t("resources")}
                </h3>
                <div className="space-y-3">
                  <Link
                    to="#"
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    {t("blog")}
                  </Link>
                  <Link
                    to={createPageUrl("Impact")}
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    {t("impact")}
                  </Link>
                  <Link
                    to={createPageUrl("Support")}
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    {t("support")}
                  </Link>
                  <Link
                    to={createPageUrl("SalesInquiry")}
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    {t("contactUs")}
                  </Link>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">
                  {t("legalAndCompliance")}
                </h3>
                <div className="space-y-3">
                  <Link
                    to={createPageUrl("SAGAFTRAAlignment")}
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    {t("sagAftraAlignment")}
                  </Link>
                  <Link
                    to={createPageUrl("PrivacyPolicy")}
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    {t("privacyPolicy.title")}
                  </Link>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">
                  {t("company")}
                </h3>
                <div className="space-y-3">
                  <Link
                    to={createPageUrl("AboutUs")}
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    {t("aboutUs")}
                  </Link>
                  <Link
                    to={createPageUrl("Faces")}
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    {t("creators")}
                  </Link>
                  <Link
                    to={createPageUrl("BrandCompany")}
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    {t("brands")}
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500">{t("copyright")}</p>
              <p className="text-sm text-gray-500">
                {t("followUs")}{" "}
                <a
                  href="https://instagram.com/@likelee.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  @likelee.ai
                </a>
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
