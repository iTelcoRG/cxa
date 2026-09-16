import Link from "next/link";
import { getProofByToken } from "../../../operations/proofs.ts";
import { submitProofResponse } from "./actions.ts";

export default async function ProofPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ result?: string }> }) {
  const { token } = await params;
  const { result } = await searchParams;
  const record = await getProofByToken(token);
  if (!record) return <main className="content-page"><h1>Proof link unavailable</h1><p>This secure link is invalid or has expired. Please contact CXA for a new link.</p></main>;
  const proof = record.proof;
  const available = !record.usedAt && proof.status === "READY_FOR_CUSTOMER";
  return <main className="content-page proof-review-page">
    
    <h1>Review your artwork proof</h1>
    <p>Quote {proof.quote.quoteNumber} · {proof.quoteLine.productNameSnapshot} · {proof.decoration.locationLabel} / {proof.decoration.methodLabel}</p>
    <div className="proof-presentation"><iframe src={`/api/proof/${encodeURIComponent(token)}/file`} title={`Artwork proof version ${proof.version}`} /><Link href={`/api/proof/${encodeURIComponent(token)}/file`} target="_blank">Open or download proof version {proof.version}</Link></div>
    {result && <p role="status">Your response has been recorded. Thank you.</p>}
    {available ? <form action={submitProofResponse.bind(null, token)} className="contact-form">
      <label>Optional note<textarea name="note" maxLength={1000} /></label>
      <div><button name="decision" value="APPROVED">Approve proof</button> <button name="decision" value="REJECTED" className="button-secondary">Request changes</button></div>
      <p>Approval confirms the placement and appearance shown in this proof. CXA will separately manage production and supply.</p>
    </form> : <p>This proof has already received a response. Contact CXA if you need assistance.</p>}
  </main>;
}
