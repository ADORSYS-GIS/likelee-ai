# Storage Organization Visual Guide

This document provides visual diagrams to understand the Likelee AI storage organization at a glance.

---

## Complete Storage Hierarchy

```mermaid
graph TB
    ROOT[Likelee AI Storage]

    ROOT --> PUBLIC[likelee-public<br/>Public Bucket]
    ROOT --> PRIVATE[likelee-private<br/>Private Bucket]
    ROOT --> TEMP[likelee-temp<br/>Temporary Bucket]

    subgraph "Public Assets - Direct URL Access"
        PUBLIC --> PUB1["creators/{id}/reference-images"]
        PUBLIC --> PUB2["agencies/{id}/talents/{tid}/portfolio"]
        PUBLIC --> PUB3["agencies/{id}/talents/{tid}/assets"]

        PUB1 --> PUB1A[Creator-owned<br/>No quota]
        PUB2 --> PUB2A[Agency-owned<br/>Counts quota]
        PUB3 --> PUB3A[Agency-owned<br/>Counts quota]
    end

    subgraph "Private Assets - Signed URL Access"
        PRIVATE --> PRIV1["agencies/{id}/storage"]
        PRIVATE --> PRIV2["agencies/{id}/clients/{cid}/files"]
        PRIVATE --> PRIV3["users/{id}/voice-recordings"]
        PRIVATE --> PRIV4["agencies/{id}/bookings/{bid}/files"]
        PRIVATE --> PRIV5["agencies/{id}/booking-campaigns/{cid}/deliverables"]
        PRIVATE --> PRIV6["agencies/{id}/talents/{tid}/tax-documents"]
        PRIVATE --> PRIV7["brands/{id}/voice-assets"]

        PRIV1 --> PRIV1A[Agency-owned<br/>Counts quota]
        PRIV2 --> PRIV2A[Agency-owned<br/>Counts quota]
        PRIV3 --> PRIV3A[User-owned<br/>No quota]
        PRIV4 --> PRIV4A[Agency-owned<br/>Counts quota]
        PRIV5 --> PRIV5A[Agency-owned<br/>Counts quota]
        PRIV6 --> PRIV6A[Agency-owned<br/>Counts quota]
        PRIV7 --> PRIV7A[Brand-owned<br/>Counts quota]
    end

    subgraph "Temporary Assets - Internal Only"
        TEMP --> TEMP1[Staged uploads]
        TEMP --> TEMP2[Processing artifacts]
        TEMP --> TEMP3[Preview generation]
    end

    style PUBLIC fill:#90EE90
    style PRIVATE fill:#FFB6C1
    style TEMP fill:#FFE4B5
    style PUB1A fill:#98FB98
    style PUB2A fill:#FFA07A
    style PUB3A fill:#FFA07A
    style PRIV1A fill:#FFA07A
    style PRIV2A fill:#FFA07A
    style PRIV3A fill:#98FB98
    style PRIV4A fill:#FFA07A
    style PRIV5A fill:#FFA07A
    style PRIV6A fill:#FFA07A
    style PRIV7A fill:#FFA07A
```

**Legend**:

- 🟢 Green = No quota (creator/user-owned source assets)
- 🟠 Orange = Counts quota (agency/brand-owned operational assets)

---

## Storage Flow: Upload to Access

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Storage Module
    participant Bucket
    participant Registry
    participant Business Table

    Note over User,Business Table: Upload Flow

    User->>API: Upload file
    API->>Storage Module: canonical_object_path()
    Storage Module-->>API: Generated path
    API->>Storage Module: upload_object()
    Storage Module->>Bucket: Store file
    Bucket-->>Storage Module: Success
    Storage Module-->>API: Upload result

    par Dual Write
        API->>Business Table: Insert domain record
        Business Table-->>API: Record ID
    and
        API->>Registry: insert_asset_record()
        Registry-->>API: Registry ID
    end

    API-->>User: Upload complete

    Note over User,Business Table: Access Flow (Private Assets)

    User->>API: Request file access
    API->>API: Verify permissions
    API->>Storage Module: generate_signed_url()
    Storage Module->>Bucket: Request signed URL
    Bucket-->>Storage Module: Signed URL (5 min expiry)
    Storage Module-->>API: Signed URL
    API-->>User: Return signed URL
    User->>Bucket: Download via signed URL
    Bucket-->>User: File content

    Note over User,Business Table: Access Flow (Public Assets)

    User->>API: Request file URL
    API->>Storage Module: public_object_url()
    Storage Module-->>API: Public URL
    API-->>User: Return public URL
    User->>Bucket: Direct download
    Bucket-->>User: File content
```

---

## Deletion Flow with Audit Trail

```mermaid
flowchart TD
    START[User requests deletion]
    START --> AUTH{Verify<br/>ownership}

    AUTH -->|Unauthorized| DENY[Return 403 Forbidden]
    AUTH -->|Authorized| STORAGE[Delete from storage bucket]

    STORAGE -->|Success| REGISTRY[Soft-delete registry row<br/>SET deleted_at = NOW]
    STORAGE -->|Failure| ABORT[Abort operation<br/>Return error]

    REGISTRY -->|Success| BUSINESS[Delete business table row]
    REGISTRY -->|Failure| WARN[Log warning<br/>Continue anyway]

    BUSINESS --> VERIFY{Verify<br/>deletion}
    WARN --> BUSINESS

    VERIFY -->|Success| SUCCESS[Return success]
    VERIFY -->|Failure| ERROR[Return error]

    DENY --> END[End]
    ABORT --> END
    SUCCESS --> END
    ERROR --> END

    style STORAGE fill:#FFB6C1
    style REGISTRY fill:#FFE4B5
    style BUSINESS fill:#90EE90
    style SUCCESS fill:#98FB98
    style ERROR fill:#FF6B6B
    style DENY fill:#FF6B6B
    style ABORT fill:#FF6B6B
```

**Key Points**:

- Storage deletion is **STRICT** - must succeed
- Registry soft-delete preserves audit trail
- Business table deletion is final
- Verification ensures consistency

---

## Quota Attribution Decision Tree

```mermaid
flowchart TD
    START[New Asset Upload]
    START --> OWNER{Owner Type?}

    OWNER -->|Agency| AGENCY_CHECK{Asset Type?}
    OWNER -->|Creator| CREATOR[counts_toward_quota = false]
    OWNER -->|User| USER[counts_toward_quota = false]
    OWNER -->|Brand| BRAND[counts_toward_quota = true]
    OWNER -->|System| SYSTEM[counts_toward_quota = false]

    AGENCY_CHECK -->|Operational<br/>Agency files, client files,<br/>portfolios, deliverables| AGENCY_YES[counts_toward_quota = true]
    AGENCY_CHECK -->|Source Material<br/>Creator-provided assets| AGENCY_NO[counts_toward_quota = false]

    CREATOR --> REASON1[Reason: Creator-owned<br/>source assets]
    USER --> REASON2[Reason: User personal<br/>assets]
    BRAND --> REASON3[Reason: Brand operational<br/>assets]
    SYSTEM --> REASON4[Reason: Platform<br/>assets]
    AGENCY_YES --> REASON5[Reason: Agency operational<br/>assets]
    AGENCY_NO --> REASON6[Reason: Creator-provided<br/>source material]

    REASON1 --> REGISTRY[Write to storage_assets]
    REASON2 --> REGISTRY
    REASON3 --> REGISTRY
    REASON4 --> REGISTRY
    REASON5 --> REGISTRY
    REASON6 --> REGISTRY

    style AGENCY_YES fill:#FFA07A
    style BRAND fill:#FFA07A
    style CREATOR fill:#98FB98
    style USER fill:#98FB98
    style SYSTEM fill:#98FB98
    style AGENCY_NO fill:#98FB98
```

---

## Asset Type Comparison Table

| Asset Type                | Owner   | Bucket  | Visibility | Quota  | Path Example                                                |
| ------------------------- | ------- | ------- | ---------- | ------ | ----------------------------------------------------------- |
| 📁 **Agency Storage**     | Agency  | Private | Private    | ✅ Yes | `agencies/123/storage/contracts/file.pdf`                   |
| 📄 **Client Files**       | Agency  | Private | Private    | ✅ Yes | `agencies/123/clients/456/files/doc.pdf`                    |
| 🎭 **Talent Assets**      | Agency  | Public  | Public     | ✅ Yes | `agencies/123/talents/789/assets/photo.jpg`                 |
| 📸 **Talent Portfolio**   | Agency  | Public  | Public     | ✅ Yes | `agencies/123/talents/789/portfolio/headshot.jpg`           |
| 📋 **Booking Files**      | Agency  | Private | Private    | ✅ Yes | `agencies/123/bookings/456/files/brief.pdf`                 |
| 📦 **Deliverables**       | Agency  | Private | Private    | ✅ Yes | `agencies/123/booking-campaigns/456/deliverables/video.mp4` |
| 🖼️ **Reference Images**   | Creator | Public  | Public     | ❌ No  | `creators/abc/reference-images/section1/portrait.jpg`       |
| 🎤 **Voice Recordings**   | User    | Private | Private    | ❌ No  | `users/xyz/voice-recordings/sample.webm`                    |
| 💼 **Tax Documents**      | Agency  | Private | Private    | ✅ Yes | `agencies/123/talents/789/tax-documents/w9.pdf`             |
| 🎵 **Brand Voice Assets** | Brand   | Private | Private    | ✅ Yes | `brands/456/voice-assets/jingle.mp3`                        |

**Color Key**:

- ✅ Green = Counts toward quota
- ❌ Red = Does NOT count toward quota

---

## Path Structure Breakdown

```
┌─────────────────────────────────────────────────────────────────────┐
│  Full Path Example:                                                 │
│  agencies/550e8400/talents/talent-123/portfolio/1234567890_photo.jpg│
└─────────────────────────────────────────────────────────────────────┘
     │         │          │          │            │            │
     │         │          │          │            │            └─ Sanitized filename
     │         │          │          │            └────────────── Timestamp (ms)
     │         │          │          └─────────────────────────── Context ID
     │         │          └────────────────────────────────────── Context type
     │         └───────────────────────────────────────────────── Owner ID
     └─────────────────────────────────────────────────────────── Owner type

Components:
1. Owner Type:  agencies, creators, users, brands, studio
2. Owner ID:    UUID or identifier of the owning entity
3. Context:     Specific asset category (talents, storage, voice-recordings)
4. Context ID:  Optional sub-context (talent ID, section ID, etc.)
5. Timestamp:   Milliseconds since epoch (prevents collisions)
6. Filename:    Sanitized original filename
```

---

## Storage Registry Schema

```mermaid
erDiagram
    storage_assets ||--o{ business_tables : "links to"

    storage_assets {
        uuid id PK "Primary key"
        string owner_type "agency, creator, user, brand, system"
        uuid owner_id "ID of owning entity"
        string context_type "voice_recording, reference_image, etc"
        uuid context_id "Optional context identifier"
        string visibility "public, private, temp"
        string bucket_id "likelee-public, likelee-private, likelee-temp"
        string object_path "Full path within bucket"
        string original_file_name "User's original filename"
        string mime_type "Content type"
        bigint size_bytes "File size in bytes"
        string checksum_sha256 "Optional integrity hash"
        string source_table "Business table name"
        uuid source_id "Business table row ID"
        uuid created_by "User who created"
        boolean counts_toward_quota "Quota attribution flag"
        timestamp created_at "Creation time"
        timestamp deleted_at "Soft-delete time (NULL = active)"
    }

    business_tables {
        uuid id PK "Primary key"
        uuid user_id "User reference"
        string storage_bucket "Bucket name"
        string storage_path "Object path"
        string domain_field_1 "Domain-specific field"
        string domain_field_2 "Domain-specific field"
        timestamp created_at "Creation time"
    }
```

**Key Relationships**:

- `storage_assets.source_table` → Business table name
- `storage_assets.source_id` → Business table row ID
- One business row → One registry row (1:1)
- Registry preserves history via soft-delete

---

## Migration Status Overview

```mermaid
gantt
    title Storage Migration Progress
    dateFormat YYYY-MM-DD
    section Foundation
    Storage Module           :done, foundation, 2024-01-01, 30d
    Registry Table          :done, registry, 2024-01-01, 30d

    section PR 2 - Agency Files
    Agency Storage          :done, agency, 2024-02-01, 15d
    Client Files            :done, client, 2024-02-01, 15d
    Booking Files           :done, booking, 2024-02-15, 10d

    section PR 3 - Creator Media
    Reference Images        :done, refimg, 2024-03-01, 10d
    Voice Recordings        :done, voice, 2026-04-15, 1d
    Talent Portfolio        :active, portfolio, 2026-04-16, 3d

    section PR 4 - Deliverables
    Booking Deliverables    :done, bdeliv, 2024-03-15, 10d
    Campaign Deliverables   :done, cdeliv, 2024-03-15, 10d
    Normalization          :active, norm, 2026-04-19, 2d

    section PR 5 - Backfill
    Backfill Planning       :backfill, 2026-04-21, 5d
    Backfill Execution      :backfill2, 2026-04-26, 3d
```

**Status Legend**:

- ✅ Done (Green)
- 🔄 Active (Blue)
- ⏳ Pending (Gray)

---

## Quick Reference: Where Things Live

### Public Assets (Direct URL)

```
likelee-public/
├── creators/
│   └── {creator_id}/
│       └── reference-images/
│           └── {section_id}/
│               └── {timestamp}_{filename}
│
└── agencies/
    └── {agency_id}/
        └── talents/
            └── {talent_id}/
                ├── portfolio/
                │   └── {timestamp}_{filename}
                └── assets/
                    └── {timestamp}_{filename}
```

### Private Assets (Signed URL)

```
likelee-private/
├── users/
│   └── {user_id}/
│       └── voice-recordings/
│           └── {timestamp}_{filename}
│
├── agencies/
│   └── {agency_id}/
│       ├── storage/
│       │   └── {folder_path}/
│       │       └── {timestamp}_{filename}
│       ├── clients/
│       │   └── {client_id}/
│       │       └── files/
│       │           └── {timestamp}_{filename}
│       ├── bookings/
│       │   └── {booking_id}/
│       │       └── files/
│       │           └── {timestamp}_{filename}
│       ├── booking-campaigns/
│       │   └── {campaign_id}/
│       │       └── deliverables/
│       │           └── {timestamp}_{filename}
│       └── talents/
│           └── {talent_id}/
│               └── tax-documents/
│                   └── {timestamp}_{filename}
│
├── brands/
│   └── {brand_id}/
│       └── voice-assets/
│           └── {timestamp}_{filename}
│
└── studio/
    └── campaigns/
        └── {campaign_id}/
            └── documents/
                └── {timestamp}_{filename}
```

---

**Document Purpose**: Visual reference for understanding storage organization  
**Audience**: Developers, Product Managers, Operations  
**Last Updated**: 2026-04-15  
**Related**: `docs/storage-architecture.md` (detailed documentation)
