import type { Claim, Dispute, Incident, SupportConversation, SupportMessage } from '@prisma/client';
import { compact, iso } from '../../common/util';

export function toIncident(i: Incident) {
  return compact({
    id: i.id,
    customerId: i.customerId ?? undefined,
    rentalId: i.rentalId ?? undefined,
    vehicleId: i.vehicleId ?? undefined,
    category: i.category,
    status: i.status,
    description: i.description,
    photoObjectKeys: i.photoObjectKeys.length ? i.photoObjectKeys : undefined,
    lat: i.lat ?? undefined,
    lng: i.lng ?? undefined,
    resolutionNote: i.resolutionNote ?? undefined,
    createdById: i.createdById ?? undefined,
    createdByType: i.createdByType,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  });
}

export function toDispute(d: Dispute) {
  return compact({
    id: d.id,
    customerId: d.customerId,
    rentalId: d.rentalId,
    paymentId: d.paymentId ?? undefined,
    status: d.status,
    reason: d.reason,
    description: d.description ?? undefined,
    resolution: d.resolution ?? undefined,
    refundAmountCents: d.refundAmountCents ?? undefined,
    resolvedById: d.resolvedById ?? undefined,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    resolvedAt: iso(d.resolvedAt),
  });
}

export function toClaim(c: Claim) {
  return compact({
    id: c.id,
    customerId: c.customerId,
    rentalId: c.rentalId,
    incidentId: c.incidentId ?? undefined,
    insurancePolicyId: c.insurancePolicyId ?? undefined,
    providerClaimId: c.providerClaimId ?? undefined,
    type: c.type,
    status: c.status,
    description: c.description,
    occurredAt: c.occurredAt.toISOString(),
    lat: c.lat ?? undefined,
    lng: c.lng ?? undefined,
    photoObjectKeys: c.photoObjectKeys.length ? c.photoObjectKeys : undefined,
    statusNote: c.statusNote ?? undefined,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  });
}

export function toConversation(c: SupportConversation & { customer?: { name: string | null } | null; unreadCount?: number }) {
  return compact({
    id: c.id,
    customerId: c.customerId,
    customerName: c.customer?.name ?? undefined,
    rentalId: c.rentalId ?? undefined,
    subject: c.subject,
    status: c.status,
    unreadCount: c.unreadCount,
    createdAt: c.createdAt.toISOString(),
    lastMessageAt: c.lastMessageAt.toISOString(),
  });
}

export function toMessage(m: SupportMessage) {
  return compact({
    id: m.id,
    conversationId: m.conversationId,
    authorType: m.authorType,
    authorId: m.authorId ?? undefined,
    authorName: m.authorName ?? undefined,
    body: m.body,
    attachmentObjectKeys: m.attachmentObjectKeys.length ? m.attachmentObjectKeys : undefined,
    createdAt: m.createdAt.toISOString(),
  });
}
