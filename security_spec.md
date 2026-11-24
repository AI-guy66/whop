# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Identity Integrity**: Every user-owned document (`whops.ownerId`, `memberships.userId`, `orders.buyerId`, `payouts.ownerId`, `messages.authorId`, `reviews.authorId`) must strictly equal `request.auth.uid` on creation and remain immutable on update.
2. **Master Gate & Relational Integrity**: Subcollections under `/whops/{whopId}` (`lessons`, `files`, `messages`, `reviews`) verify parent Whop existence via `exists()`/`get()`. Creator writes on `lessons` and `files` require the caller to own the parent Whop. Community `announcements` messages require Whop ownership; `general` messages require an active membership or Whop ownership.
3. **Deterministic Membership Gate**: Membership IDs follow `{userId}_{whopId}` so subcollection rules can verify active membership in O(1) without scanning lists.
4. **PII Isolation**: User email and payout account details are stored exclusively under `/users/{userId}/private/info` and are readable/writable only by `{userId}`.
5. **Terminal State Locking**: Paid orders and completed payouts cannot be mutated back to arbitrary states or modified by buyers; only the Whop owner or admin can mark a paid order `refunded`, and `refunded` is terminal.
6. **Zero-Trust Validation**: Every string has strict `.size()` bounds, every array has `.size() <= MAX` bounds and element type verification, timestamps equal `request.time`, and all IDs match `^[a-zA-Z0-9_\-]+$`.

## 2. The "Dirty Dozen" Attack Payloads
1. **Shadow Field Injection on Whop Create**: Sending `{ ..., isVerifiedAdmin: true }` to `/whops/{id}` -> Rejected by `keys().hasOnly(...)`.
2. **Identity Spoofing on Whop Create**: Sending `{ ownerId: "victim_uid" }` -> Rejected by `ownerId == request.auth.uid`.
3. **ID Poisoning**: Creating `/whops/bad$id..with..slashes` or a 2KB ID -> Rejected by `isValidId(whopId)`.
4. **PII Cross-User Read**: User B calling `get` on `/users/userA/private/info` -> Rejected by `request.auth.uid == userId`.
5. **Blanket Order List Scraping**: User C calling `list` on `/orders` without buyerId/ownerId match -> Rejected by `resource.data.buyerId == request.auth.uid || resource.data.ownerId == request.auth.uid`.
6. **Unverified Email Write**: Auth token with `email_verified: false` attempting to create a Whop -> Rejected by `request.auth.token.email_verified == true`.
7. **Non-Owner Lesson Tampering**: Buyer attempting to create/edit `/whops/{whopId}/lessons/{lessonId}` -> Rejected by parent Whop `ownerId == request.auth.uid`.
8. **Non-Member Chat Injection**: Non-member attempting to post to `/whops/{whopId}/messages/{msgId}` on a paid Whop -> Rejected by active membership / owner check.
9. **Announcement Impersonation**: Member attempting to post `channel: "announcements"` in `/whops/{whopId}/messages/{msgId}` -> Rejected by owner-only gate for announcements.
10. **Client Timestamp Forgery**: Creating a Whop or Order with `createdAt` in the past/future (`createdAt != request.time`) -> Rejected by `incoming().createdAt == request.time`.
11. **Terminal State Mutation**: Attempting to update an `Order` whose status is already `refunded` -> Rejected by terminal state lock.
12. **Unbounded Array Exhaustion**: Sending `completedLessons` with 500 elements or integer element `[123]` -> Rejected by `size() <= 100` and element type guard.
