/*
 * Pryntor R0: operator-pinned Ed25519 approval verification for Node hosts.
 * No private keys, secrets, network calls, providers or reviewer identity
 * systems are included. Trusted keys are provided outside untrusted graphs.
 */
import { createHash, createPublicKey, verify } from 'node:crypto';

const APPROVAL_VERSION = 1;
const KEY_ID = /^[a-z][a-z0-9_-]{0,39}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function approvalRunDigest(graph, inputs, runId) {
  if (typeof runId !== 'string' || !runId.trim() || runId.length > 100) {
    throw new Error('A bounded, nonblank, independently issued run ID is required');
  }
  return createHash('sha256').update(JSON.stringify({version: APPROVAL_VERSION, runId, graph, inputs}), 'utf8').digest('hex');
}

export function approvalPayload(receipt) {
  return JSON.stringify({
    schema_version: APPROVAL_VERSION,
    approved: true,
    key_id: receipt.key_id,
    reviewer: receipt.reviewer,
    node_id: receipt.node_id,
    run_id: receipt.run_id,
    run_digest: receipt.run_digest,
    issued_at: receipt.issued_at,
    expires_at: receipt.expires_at,
  });
}

export function createApprovalVerifier({ trustedPublicKeys, runId, now = () => Date.now() }) {
  if (!trustedPublicKeys || typeof trustedPublicKeys !== 'object' || Array.isArray(trustedPublicKeys)) {
    throw new Error('Trusted public keys must be an operator-controlled map');
  }
  if (typeof now !== 'function') throw new Error('now must be a function');
  const pinned = new Map();
  for (const [id, publicKey] of Object.entries(trustedPublicKeys)) {
    if (!KEY_ID.test(id)) throw new Error('Invalid public-key identifier');
    pinned.set(id, createPublicKey(publicKey));
  }
  if (!pinned.size) throw new Error('At least one operator-approved reviewer key is required');
  approvalRunDigest({}, {}, runId);
  return ({ nodeId, receipt, graph, inputs }) => {
    if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt) || receipt.approved !== true) return false;
    if (typeof receipt.key_id !== 'string' || !pinned.has(receipt.key_id)) return false;
    if (typeof receipt.reviewer !== 'string' || !receipt.reviewer.trim() || receipt.reviewer.length > 128) return false;
    if (receipt.node_id !== nodeId || receipt.run_id !== runId || !DIGEST.test(receipt.run_digest)) return false;
    const instant = now();
    if (!Number.isSafeInteger(instant) || !Number.isSafeInteger(receipt.issued_at) ||
      !Number.isSafeInteger(receipt.expires_at) || receipt.issued_at > instant + 60000 ||
      receipt.expires_at <= instant || receipt.expires_at <= receipt.issued_at ||
      receipt.expires_at - receipt.issued_at > 3600000) return false;
    if (typeof receipt.signature !== 'string' || !BASE64.test(receipt.signature) || receipt.signature.length > 1000) return false;
    if (receipt.run_digest !== approvalRunDigest(graph, inputs, runId)) return false;
    try {
      const signature = Buffer.from(receipt.signature, 'base64');
      if (signature.length !== 64) return false; // Ed25519
      return verify(null, Buffer.from(approvalPayload(receipt), 'utf8'), pinned.get(receipt.key_id), signature);
    } catch { return false; }
  };
}
