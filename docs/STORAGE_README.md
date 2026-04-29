# Likelee AI Storage Documentation

**Welcome to the Likelee AI Storage Documentation!**

This directory contains comprehensive documentation about how storage is organized and managed in the Likelee AI platform.

---

## 📚 Documentation Index

### 🎯 Start Here

**[storage-architecture.md](storage-architecture.md)** - Main Documentation

- Complete storage architecture guide
- Bucket descriptions and usage
- Storage registry schema
- Asset organization and ownership
- Quota attribution rules
- Lifecycle management
- Voice recording details
- Implementation guidelines
- FAQ section

**Best for**: Understanding the complete storage system, implementation details, and business rules.

---

### 📊 Visual Reference

**[storage-organization-diagram.md](storage-organization-diagram.md)** - Visual Guide

- Storage hierarchy diagrams
- Upload/access sequence flows
- Deletion flow with audit trail
- Quota attribution decision tree
- Asset comparison tables
- Path structure breakdown
- Registry schema diagrams
- Migration timeline
- Directory tree reference

**Best for**: Quick visual understanding, presentations, and onboarding.

---

### 📋 Implementation Tracking

**[ticket-499-implementation-checklist.md](ticket-499-implementation-checklist.md)** - Progress Tracking

- Migration progress (63% complete)
- Task completion status
- Testing status
- Next priorities
- Quick reference card

**Best for**: Tracking migration progress and understanding what's been completed.

---

### 🎤 Specific Asset Documentation

**[voice-recording-migration-summary.md](voice-recording-migration-summary.md)** - Voice Recordings

- Detailed voice recording migration
- Before/after comparisons
- Architecture compliance
- Testing documentation

**Best for**: Understanding voice recording storage specifics.

**[pr3-implementation-summary.md](pr3-implementation-summary.md)** - PR 3 Status

- Creator and talent media migration
- Testing results
- Benefits achieved
- Next steps

**Best for**: Understanding PR 3 (Creator Media) progress.

---

## 🗺️ Quick Navigation

### By Role

**👨‍💻 Developers**

1. Read [storage-architecture.md](storage-architecture.md) - Implementation Guidelines section
2. Review [storage-organization-diagram.md](storage-organization-diagram.md) - Sequence diagrams
3. Check [ticket-499-implementation-checklist.md](ticket-499-implementation-checklist.md) - Migration status
4. Reference code: `likelee-server/src/storage/mod.rs`

**📊 Product Managers**

1. Read [storage-architecture.md](storage-architecture.md) - Overview and Asset Matrix
2. Review [storage-organization-diagram.md](storage-organization-diagram.md) - Asset comparison table
3. Understand quota rules in [storage-architecture.md](storage-architecture.md) - Quota Attribution section

**🔧 Operations**

1. Review [storage-organization-diagram.md](storage-organization-diagram.md) - Directory tree structure
2. Read [storage-architecture.md](storage-architecture.md) - Storage Buckets section
3. Check [storage-architecture.md](storage-architecture.md) - FAQ for common queries

**💼 Business**

1. Read [storage-architecture.md](storage-architecture.md) - Quota Attribution section
2. Review [storage-organization-diagram.md](storage-organization-diagram.md) - Quota decision tree
3. Understand costs via [storage-architecture.md](storage-architecture.md) - Asset Matrix

---

## 🎯 Common Questions

### Where is X stored?

See the **Asset Matrix** in [storage-architecture.md](storage-architecture.md#asset-organization) or the **Directory Tree** in [storage-organization-diagram.md](storage-organization-diagram.md#quick-reference-where-things-live).

### Does X count toward quota?

See the **Quota Attribution** section in [storage-architecture.md](storage-architecture.md#quota-attribution) or the **Quota Decision Tree** in [storage-organization-diagram.md](storage-organization-diagram.md#quota-attribution-decision-tree).

### How do I implement storage for a new asset type?

See the **Implementation Guidelines** in [storage-architecture.md](storage-architecture.md#implementation-guidelines).

### What's the migration status?

See [ticket-499-implementation-checklist.md](ticket-499-implementation-checklist.md) for detailed progress tracking.

### How are voice recordings stored?

See the **Voice Recordings** section in [storage-architecture.md](storage-architecture.md#voice-recordings-recently-migrated) or [voice-recording-migration-summary.md](voice-recording-migration-summary.md).

---

## 📊 Storage at a Glance

### Three Buckets

| Bucket              | Purpose        | Access     | Examples                       |
| ------------------- | -------------- | ---------- | ------------------------------ |
| **likelee-public**  | Public media   | Direct URL | Reference images, portfolios   |
| **likelee-private** | Private assets | Signed URL | Voice recordings, agency files |
| **likelee-temp**    | Temporary      | Internal   | Staged uploads, processing     |

### Twelve Asset Types

| Asset Type                  | Owner   | Bucket  | Quota  |
| --------------------------- | ------- | ------- | ------ |
| Agency Storage              | Agency  | Private | ✅ Yes |
| Client Files                | Agency  | Private | ✅ Yes |
| Talent Assets               | Agency  | Public  | ✅ Yes |
| Talent Portfolio            | Agency  | Public  | ✅ Yes |
| Booking Files               | Agency  | Private | ✅ Yes |
| Deliverables                | Agency  | Private | ✅ Yes |
| Reference Images            | Creator | Public  | ❌ No  |
| Voice Recordings            | User    | Private | ❌ No  |
| Tax Documents               | Agency  | Private | ✅ Yes |
| Brand Voice Assets          | Brand   | Private | ✅ Yes |
| Studio Docs                 | User    | Private | ❌ No  |
| Campaign Offer Deliverables | Agency  | Private | ✅ Yes |

### Path Pattern

```
{owner_type}/{owner_id}/{context}/{timestamp}_{sanitized_filename}

Example:
users/550e8400/voice-recordings/1234567890123_sample.webm
```

---

## 🔄 Migration Status

**Overall Progress**: 63% complete (19/30 tasks)

| Phase                | Status         | Completion |
| -------------------- | -------------- | ---------- |
| PR 1 - Foundation    | ✅ Complete    | 100%       |
| PR 2 - Agency Files  | ✅ Core Done   | 90%        |
| PR 3 - Creator Media | 🔄 In Progress | 50%        |
| PR 4 - Deliverables  | ✅ Core Done   | 75%        |
| PR 5 - Backfill      | ⏳ Not Started | 0%         |

**Recently Completed**: Voice recording migration (2026-04-15)

**Next Priority**: Talent portfolio migration

---

## 🎓 Learning Path

### New to the System?

1. **Start**: Read [storage-architecture.md](storage-architecture.md) - Overview section
2. **Visualize**: Review [storage-organization-diagram.md](storage-organization-diagram.md) - Storage hierarchy
3. **Understand**: Read [storage-architecture.md](storage-architecture.md) - Asset Matrix
4. **Deep Dive**: Read specific asset sections in [storage-architecture.md](storage-architecture.md)

### Need to Implement Something?

1. **Understand**: Read [storage-architecture.md](storage-architecture.md) - Implementation Guidelines
2. **Reference**: Check existing implementations in `likelee-server/src/`
3. **Follow**: Use the migration pattern from [storage-architecture.md](storage-architecture.md)
4. **Test**: Add unit tests following examples in `likelee-server/src/storage/mod.rs`

### Troubleshooting?

1. **Check**: [storage-architecture.md](storage-architecture.md) - FAQ section
2. **Review**: [storage-organization-diagram.md](storage-organization-diagram.md) - Flow diagrams
3. **Verify**: Path patterns and ownership rules
4. **Query**: Use SQL examples in [storage-architecture.md](storage-architecture.md)

---

## 📝 Key Concepts

### Dual-Write Architecture

Every storage operation writes to **two** places:

1. **Business Table** - Domain-specific fields and relationships
2. **Storage Registry** - Centralized storage metadata

This separation keeps domain models clean while enabling powerful storage management.

### Quota Attribution

- **Agency-owned assets** (operational files) → Count toward quota
- **Creator-owned assets** (source materials) → Do NOT count toward quota

This ensures agencies aren't charged for creator-provided source materials.

### STRICT Deletion

Storage deletion must succeed before database deletion. This prevents orphaned database records that reference non-existent storage objects.

### Soft-Delete Registry

Registry rows are soft-deleted (set `deleted_at`) rather than hard-deleted. This preserves audit trails and enables quota history tracking.

---

## 🔗 Related Resources

### Code

- `likelee-server/src/storage/mod.rs` - Shared storage module
- `likelee-server/src/voice.rs` - Voice recording handlers
- `likelee-server/src/reference_images.rs` - Reference image handlers
- `likelee-server/src/talent.rs` - Talent portfolio handlers

### Database

- `supabase/migrations/` - Storage assets table migration
- `public.storage_assets` - Storage registry table

### External

- Supabase Storage Documentation
- Storage bucket configuration

---

## 📞 Support

For questions or clarifications:

1. Check the [FAQ section](storage-architecture.md#frequently-asked-questions)
2. Review the [visual diagrams](storage-organization-diagram.md)
3. Consult the implementation team

---

**Last Updated**: 2026-04-15  
**Maintained By**: Engineering Team  
**Version**: 2.0

---

## 📄 Document Versions

| Document                               | Version | Last Updated | Status     |
| -------------------------------------- | ------- | ------------ | ---------- |
| storage-architecture.md                | 2.0     | 2026-04-15   | ✅ Current |
| storage-organization-diagram.md        | 1.0     | 2026-04-15   | ✅ Current |
| ticket-499-implementation-checklist.md | 1.2     | 2026-04-15   | ✅ Current |
| voice-recording-migration-summary.md   | 1.0     | 2026-04-15   | ✅ Current |
| pr3-implementation-summary.md          | 1.0     | 2026-04-15   | ✅ Current |

---

**Happy Storing! 🚀**
