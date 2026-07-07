import { ArrowRight } from 'lucide-react';

export default function ConversionFunnel({ leadToInquiryRate, inquiryToOrderRate, avgSalesCycleDays }) {
  const steps = [
    { label: 'Lead → Inquiry', value: `${leadToInquiryRate || 0}%`, helper: 'Buyer records turning into active inquiries' },
    { label: 'Inquiry → Order', value: `${inquiryToOrderRate || 0}%`, helper: 'Quoted demand turning into confirmed export orders' },
    { label: 'Sales cycle', value: avgSalesCycleDays > 0 ? `${avgSalesCycleDays}d` : '—', helper: 'Average inquiry-to-order time' },
  ];

  return (
    <div className="card reports-funnel-card">
      <div className="card-header">
        <div>
          <h3>Conversion Funnel</h3>
          <div className="card-header-sub">A simple view of how leads become revenue</div>
        </div>
      </div>
      <div className="reports-funnel">
        {steps.map((step, index) => (
          <div className="reports-funnel-step" key={step.label}>
            <div>
              <span>{step.label}</span>
              <strong>{step.value}</strong>
              <p>{step.helper}</p>
            </div>
            {index < steps.length - 1 && <ArrowRight size={18} />}
          </div>
        ))}
      </div>
    </div>
  );
}
