/**
 * Payload-First Security Verification Suite for Whop Firestore Rules
 * Verifies all 12 "Dirty Dozen" adversarial payloads are rejected with PERMISSION_DENIED.
 */

export interface DirtyDozenCase {
  id: string;
  collectionPath: string;
  operation: 'create' | 'update' | 'get' | 'list';
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const dirtyDozenCases: DirtyDozenCase[] = [
  {
    id: 'DD-01-Shadow-Field',
    collectionPath: '/whops/whop_test_1',
    operation: 'create',
    payload: { id: 'whop_test_1', isVerifiedAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-02-Owner-Spoof',
    collectionPath: '/whops/whop_test_2',
    operation: 'create',
    payload: { id: 'whop_test_2', ownerId: 'someone_else' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-03-ID-Poisoning',
    collectionPath: '/whops/' + 'a'.repeat(200),
    operation: 'create',
    payload: { id: 'a'.repeat(200) },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-04-PII-Read',
    collectionPath: '/users/victim_uid/private/info',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-05-Order-Scrape',
    collectionPath: '/orders',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-06-Unverified-Email',
    collectionPath: '/whops/whop_test_6',
    operation: 'create',
    payload: { id: 'whop_test_6' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-07-NonOwner-Lesson',
    collectionPath: '/whops/whop_owned_by_a/lessons/lesson_1',
    operation: 'create',
    payload: { id: 'lesson_1', whopId: 'whop_owned_by_a' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-08-NonMember-Chat',
    collectionPath: '/whops/whop_paid_a/messages/msg_1',
    operation: 'create',
    payload: { id: 'msg_1', channel: 'general', text: 'spam' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-09-Announcement-Impersonation',
    collectionPath: '/whops/whop_paid_a/messages/msg_2',
    operation: 'create',
    payload: { id: 'msg_2', channel: 'announcements', text: 'fake promo' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-10-Timestamp-Forgery',
    collectionPath: '/orders/order_1',
    operation: 'create',
    payload: { id: 'order_1', createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-11-Terminal-State-Mutation',
    collectionPath: '/orders/order_refunded',
    operation: 'update',
    payload: { status: 'paid' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-12-Array-Exhaustion',
    collectionPath: '/memberships/userA_whopA',
    operation: 'update',
    payload: { completedLessons: Array.from({ length: 150 }, (_, i) => `l_${i}`) },
    expected: 'PERMISSION_DENIED',
  },
];
