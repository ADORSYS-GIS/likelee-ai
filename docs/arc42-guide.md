# Architecture Document: Likelee AI Ecosystem

## 1. Introduction and Goals

### 1.1 Context

Likelee AI is building the world’s first AI-creation ecosystem. This system is designed to counter the growing risk of unauthorized digital likeness usage by transforming faces into monetizable assets.

### 1.2 Key Goals

The system aims to keep humans at the center of AI-generated content, whether for campaigns, ads, or AI-generated/assisted films.

| Persona              | Likelee’s Goal                                                                                                         | Core Value                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Faces** (Talents)  | Secure the license for their likeness, get discovered, and earn royalties.                                             | Turn their face into an asset – gain visibility, generate royalties, and track usage.  |
| **Brands & Studios** | Provide a directory of talents for AI media, find approved likenesses, generate ethical content, and manage contracts. | Access a verified pool of human likenesses, AI creators, and talents in one interface. |
| **AI Creators**      | Serve as a collaboration platform, offer paid opportunities and portfolios.                                            | Discover gigs, license faces for creative work, and showcase their AI portfolio.       |

## 2. Constraints and Architectural Principles

### 2.1 Technical and Strategic Constraints

- **Performance & Cost:** The initial architecture uses **Firebase Realtime Database**, but the team may need to switch some services if scalability or cost becomes an issue.
- **Early Monetization:** The model must support **Immediate Recurring Revenue** (MRR) from day one, especially through agency integration and studio credits.
- **Integrated Workflow:** The system must evolve from a directory to a **creation platform** to enable workflow lock-in.

### 2.2 Compliance and Ethics (Crosscutting)

- **Verification:** Mandatory **KYC** and **liveness** checks for Faces and before “Create Agency” becomes available.
- **Trust/Traceability:** Use of **Invisible Watermarking** and **C2PA manifest** (future/P2) for royalty tracking and conversion attribution.
- **Privacy:** A **privacy-first design** with clear consent steps for uploading face photos.

## 3. Context and Scope

### 3.1 External Interfaces and Key Providers (APIs)

Likelee relies on several external integrations for essential functionality:

| Service                     | Function                                                                 | Provider / Technology                                                                |
| --------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **Payments & Billing**      | Transactions, royalties, subscriptions (Seat Billing), Stripe Tier Gate. | **Stripe Connect**, Stripe Checkout.                                                 |
| **AI Generation/Rendering** | Model routing for image/video generation by AI Creators.                 | Replicate API, Hugging Face APIs, Together.ai.                                       |
| **Storage & Database**      | User profiles, waitlist submissions, and uploaded photos.                | **Firebase Realtime Database**, **Firebase Storage**.                                |
| **Asset Traceability**      | Invisible watermarking for exports.                                      | Truepic Lens.                                                                        |
| **Moderation**              | Analysis of uploaded images.                                             | AWS Rekognition.                                                                     |
| **Royalty Tracking**        | Fetching ad-spend and sales data for spend-share/revenue-share models.   | Meta Ads API, TikTok Ads API, Google Ads API, Shopify Admin API, Stripe (read-only). |

## 4. Logical Component View

The architecture is built around several layers and core services:

### 4.1 Tech Stack Overview

- **Frontend:** React 18.2.0, TypeScript, Vite 6.5, Tailwind CSS 3.4.16.
- **Backend & Database:** Firebase Realtime Database (NoSQL), Firebase Authentication, Firebase Storage.
- **Key System Services:**
  - **Royalty Ledger:** Records booking events (flat-fee transactions) and provides read access for dashboards.
  - **Watermark API:** Applies invisible watermarks on exports, storing a hash tied to the booking ID.
  - **Payment (Stripe Connect):** Manages split payments (Brand → Platform → Face + Creator) and transfers to Stripe Express accounts.
  - **Localization (i18n):** Default English; Spanish and French prioritized for MVP.
  - **Likelee Studio:** Includes the Model Router (Replicate/Hugging Face routing) and Simple Prompt UI.

## 5. Runtime View: Creator and Agency Flows

### 5.1 Core Flow for AI Creators

The creator flow is optimized for monetization and collaboration (P1 must-have):

1. **Discovery:** Creator searches/browses Faces using filters.
2. **Booking:** Creator adds a Face to the **project basket** and proceeds to **checkout** via Stripe.
3. **License/Generation:** They pay for **short-term likeness rights**. In the **Likelee Studio**, they can:
   - Select a model via the Model Router (2–3 max).
   - Use the Simple Prompt UI.
   - **Pay** credits (Creator Tier) or monthly access (Pro Tier) for generation.

4. **Collaboration:** A **simple chat thread** allows communication with brands/studios or other creators.

### 5.2 P0 Flow: Agency Onboarding

This is a priority-zero flow for immediate recurring revenue:

1. **Verification:** The agency owner completes **KYC**.
2. **Seat Purchase:** “Create Agency” appears, and the agency buys **blocks of 50 seats** at $35/seat/month via Stripe.
3. **Import:** Agency uploads talent info (name, email, selfie) via **CSV or drag-and-drop**, triggering auto-invites.
4. **Activation:** A seat becomes **active** when the Face accepts the terms and conditions.

## 6. Crosscutting Concepts

### 6.1 Monetization Model

The system supports multiple licensing models to generate revenue for Likelee and Faces:

| License Model     | Description                                            | Attribution / Tracking                                                               | Priority |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------ | -------- |
| **Flat Fee**      | Face sets a fixed price ($5–$200) per time unit.       | Recorded in the Royalty Ledger at booking payment.                                   | P0/P1    |
| **Spend-Share**   | Face earns a % (5%–15%) of real ad spend by the brand. | Tracked via **OAuth** with ad APIs; nightly cost-metric retrieval.                   | Phase 2  |
| **Revenue-Share** | Face earns a % (2%–10%) of total sales.                | Tracked via **UTM** or **Face-specific coupon codes** + data from Shopify or Stripe. | Phase 2  |

### 6.2 Design and Aesthetic

The design aims to bridge AI and humanity.

- **Vibe:** Futuristic yet Familiar, Raw yet Refined, Ethical and Transparent.
- **Visual Style:** Clean grids, futuristic typography, **organic overlays** (hand-drawn lines, sketches, pencil textures). A black/white palette with muted neon orange, pale blue, and soft yellow accents.
