import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Menu, X, Sparkles, LogIn, LogOut } from "lucide-react";

import { useAuth } from "@/auth/AuthProvider";

export default function Layout({ children, currentPageName }) {
  const { authenticated, logout } = useAuth();

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
    location.pathname.includes("/TalentDashboard");

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
        "Likelee - Fueling the Income Ecosystem for Creators in the AI Era";

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
  }, []);

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
              JavaScript Required
            </h1>
            <p
              style={{
                color: "#856404",
                fontSize: "18px",
                marginBottom: "20px",
              }}
            >
              Likelee requires JavaScript to display content and provide full
              functionality.
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
                About Likelee:
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
                  <strong>For Creators:</strong> License your digital likeness,
                  set your rates, and earn royalties automatically
                </li>
                <li>
                  <strong>For AI Artists:</strong> Build your portfolio and
                  connect with studios for campaigns and projects
                </li>
                <li>
                  <strong>For Businesses:</strong> Access verified creator
                  likenesses with transparent licensing and fast turnaround
                </li>
                <li>
                  <strong>Protection & Rights:</strong> Every usage is tracked,
                  consented, and compensated through smart contracts
                </li>
              </ul>
              <p style={{ marginTop: "20px", fontWeight: "bold" }}>
                Please enable JavaScript in your browser to access the full
                platform.
              </p>
              <p style={{ marginTop: "15px" }}>
                <a
                  href="/static"
                  style={{ color: "#856404", textDecoration: "underline" }}
                >
                  View simplified version
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
            JavaScript Required for Full Experience
          </h1>
          <p
            style={{
              color: "#856404",
              fontSize: "20px",
              marginBottom: "25px",
              fontWeight: "500",
            }}
          >
            Likelee is an interactive platform that requires JavaScript.
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
              Likelee Platform Features:
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
                👤 For Creators & Athletes
              </h3>
              <ul
                style={{
                  listStyle: "disc",
                  paddingLeft: "20px",
                  lineHeight: "1.8",
                }}
              >
                <li>License your digital likeness and earn passive income</li>
                <li>Set your own rates and approval parameters</li>
                <li>Track every usage with automated royalty payments</li>
                <li>Full control over who uses your image and where</li>
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
                🎨 For AI Artists & Filmmakers
              </h3>
              <ul
                style={{
                  listStyle: "disc",
                  paddingLeft: "20px",
                  lineHeight: "1.8",
                }}
              >
                <li>
                  Build professional portfolio showcasing AI creative work
                </li>
                <li>Connect directly with brands and studios</li>
                <li>Access exclusive AI filmmaking opportunities</li>
                <li>Browse curated job board for AI creative roles</li>
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
                🏢 For Businesses
              </h3>
              <ul
                style={{
                  listStyle: "disc",
                  paddingLeft: "20px",
                  lineHeight: "1.8",
                }}
              >
                <li>Launch campaigns with verified, consented creators</li>
                <li>Get brand-safe content in under 48 hours</li>
                <li>Smart contracts with watermarked assets</li>
                <li>Transparent licensing and usage tracking</li>
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
                🔒 <strong>Ethical AI Standards:</strong> SAG-AFTRA aligned,
                GDPR/CCPA compliant, with automated consent tracking and fair
                compensation for all creators.
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
                To access the full interactive platform:
              </p>
              <ol
                style={{
                  textAlign: "left",
                  paddingLeft: "40px",
                  lineHeight: "2",
                  marginBottom: "20px",
                }}
              >
                <li>Enable JavaScript in your browser settings</li>
                <li>Refresh this page</li>
                <li>
                  Or view our{" "}
                  <a
                    href="/static"
                    style={{
                      color: "#32C8D1",
                      textDecoration: "underline",
                      fontWeight: "600",
                    }}
                  >
                    simplified text version
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
                  Questions? Contact us:
                </p>
                <a
                  href="mailto:help@likelee.ai"
                  style={{
                    color: "#32C8D1",
                    fontSize: "16px",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                >
                  help@likelee.ai
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
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
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
                  to={createPageUrl("BrandCompany")}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all relative ${
                    location.pathname === createPageUrl("BrandCompany")
                      ? "text-gray-900 bg-gray-100"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  Brands
                </Link>

                {/* For Business Dropdown */}
                <div className="relative group">
                  <Link
                    to={createPageUrl("AgencySelection")}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all relative ${
                      location.pathname === createPageUrl("AgencySelection")
                        ? "text-gray-900 bg-gray-100"
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Agencies
                  </Link>

                  {/* Dropdown Menu */}
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white border-2 border-gray-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="p-2">
                      <Link
                        to={createPageUrl("MarketingAgency")}
                        className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="font-semibold text-gray-900">
                          Marketing Agency
                        </div>
                        <div className="text-xs text-gray-500">
                          Advertising & creative services
                        </div>
                      </Link>
                      <Link
                        to={createPageUrl("TalentAgency")}
                        className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="font-semibold text-gray-900">
                          Talent / Modeling Agency
                        </div>
                        <div className="text-xs text-gray-500">
                          Talent representation
                        </div>
                      </Link>
                      <Link
                        to={createPageUrl("SportsAgency")}
                        className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="font-semibold text-gray-900">
                          Sports Agency
                        </div>
                        <div className="text-xs text-gray-500">
                          NIL & athlete representation
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>

                <Link
                  to={createPageUrl("AboutUs")}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all relative ${
                    location.pathname === createPageUrl("AboutUs")
                      ? "text-gray-900 bg-gray-100"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  About Us
                </Link>

                <Link
                  to={createPageUrl("Contact")}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all relative ${
                    location.pathname === createPageUrl("Contact")
                      ? "text-gray-900 bg-gray-100"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  Contact
                </Link>

                {!authenticated ? (
                  <Link
                    to="/Login"
                    className="ml-4 px-6 py-2 text-sm font-bold text-white bg-[#32C8D1] rounded-lg hover:bg-[#2AB8C1] transition-all shadow-sm flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 ml-4">
                    <Link
                      to="/CreatorDashboard"
                      className="px-6 py-2 text-sm font-bold text-white bg-[#32C8D1] rounded-lg hover:bg-[#2AB8C1] transition-all shadow-sm"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => logout()}
                      className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-gray-900 p-2"
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
                to={createPageUrl("BrandCompany")}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 text-base font-semibold rounded-lg transition-all ${
                  location.pathname === createPageUrl("BrandCompany")
                    ? "text-gray-900 bg-gray-100"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Brands
              </Link>

              {/* Mobile For Business with sub-items */}
              <div>
                <Link
                  to={createPageUrl("AgencySelection")}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 text-base font-semibold rounded-lg transition-all ${
                    location.pathname === createPageUrl("AgencySelection")
                      ? "text-gray-900 bg-gray-100"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Agencies
                </Link>
                <div className="ml-4 mt-1 space-y-1">
                  <Link
                    to={createPageUrl("MarketingAgency")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                  >
                    Marketing Agency
                  </Link>
                  <Link
                    to={createPageUrl("TalentAgency")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                  >
                    Talent / Modeling Agency
                  </Link>
                  <Link
                    to={createPageUrl("SportsAgency")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                  >
                    Sports Agency
                  </Link>
                </div>
              </div>

              <Link
                to={createPageUrl("AboutUs")}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 text-base font-semibold rounded-lg transition-all ${
                  location.pathname === createPageUrl("AboutUs")
                    ? "text-gray-900 bg-gray-100"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                About Us
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
                Contact
              </Link>

              <div className="pt-4 px-4">
                {!authenticated ? (
                  <Link
                    to="/Login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 text-base font-bold text-white bg-[#32C8D1] rounded-lg shadow-sm"
                  >
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </Link>
                ) : (
                  <div className="space-y-3 w-full">
                    <Link
                      to="/CreatorDashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center w-full py-3 text-base font-bold text-white bg-[#32C8D1] rounded-lg shadow-sm"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center justify-center gap-2 w-full py-3 text-base font-bold text-red-500 bg-red-50 rounded-lg"
                    >
                      <LogOut className="w-5 h-5" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="pt-20">{children}</main>

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
                  The Verified Talent Ecosystem for AI-powered Media.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">
                  Resources
                </h3>
                <div className="space-y-3">
                  <Link
                    to="#"
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    Blog
                  </Link>
                  <Link
                    to={createPageUrl("Impact")}
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    Impact
                  </Link>
                  <Link
                    to={createPageUrl("Support")}
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    Support
                  </Link>
                  <Link
                    to={createPageUrl("SalesInquiry")}
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    Contact Us
                  </Link>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">
                  Legal & Compliance
                </h3>
                <div className="space-y-3">
                  <Link
                    to={createPageUrl("SAGAFTRAAlignment")}
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    SAG-AFTRA Alignment
                  </Link>
                  <Link
                    to={createPageUrl("PrivacyPolicy")}
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    to={createPageUrl("CommercialRights")}
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    Commercial Rights
                  </Link>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">
                  Company
                </h3>
                <div className="space-y-3">
                  <Link
                    to={createPageUrl("AboutUs")}
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    About Us
                  </Link>
                  <Link
                    to={createPageUrl("Faces")}
                    className="block text-gray-600 hover:text-gray-900 text-sm transition-colors"
                  >
                    Creators
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500">
                © 2025 Likelee. All rights reserved.
              </p>
              <p className="text-sm text-gray-500">
                Follow us on Instagram{" "}
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
