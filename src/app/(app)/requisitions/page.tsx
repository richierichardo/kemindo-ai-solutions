import { RequisitionClient } from "./requisition-client";

export default function RequisitionsPage() {
  return <main className="page-content"><div className="page-heading"><div className="eyebrow">Recruitment workflow</div><h1>Requisitions</h1><p>Define role requirements, request human approval, and publish a vacancy when the role is approved.</p></div><RequisitionClient /></main>;
}
