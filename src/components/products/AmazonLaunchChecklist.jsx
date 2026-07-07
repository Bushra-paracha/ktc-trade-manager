import { CheckCircle2, Circle, FileText, Image, ShieldCheck, Truck } from 'lucide-react';

const launchSteps = [
  { title: 'Seller account', detail: 'USA and UK marketplaces connected to business documents', done: false, icon: ShieldCheck },
  { title: 'Retail packaging', detail: 'Finalize 1 lb, 2 lb and 5 lb bag artwork and carton specs', done: false, icon: Image },
  { title: 'Compliance files', detail: 'COA, ingredient statement, nutrition panel and label copy', done: false, icon: FileText },
  { title: 'FBA shipment plan', detail: 'Case pack quantities, weights, box dimensions and warehouse prep', done: false, icon: Truck },
];

export default function AmazonLaunchChecklist() {
  return (
    <div className="card amazon-checklist-card">
      <div className="card-header">
        <div>
          <h3>Launch Readiness Checklist</h3>
          <div className="card-header-sub">Track the steps before creating live Amazon listings</div>
        </div>
      </div>
      <div className="launch-checklist">
        {launchSteps.map((step) => {
          const Icon = step.icon;
          return (
            <div className="launch-step" key={step.title}>
              <div className="launch-step-status">{step.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}</div>
              <div className="launch-step-icon"><Icon size={17} /></div>
              <div>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
