import { FileText, Mail, MessageCircle, PackageCheck, Phone, Sparkles } from 'lucide-react';

export default function BuyerProfileTimeline({ client, inquiries = [], orders = [], emails = [] }) {
  const items = [
    client?.created_at && {
      icon: Sparkles,
      title: 'Buyer added to CRM',
      note: client.source ? `Source: ${client.source}` : 'Imported into buyer database',
      time: new Date(client.created_at).toLocaleDateString(),
    },
    client?.email && {
      icon: Mail,
      title: 'Email available',
      note: client.email,
      time: 'Contact ready',
    },
    client?.phone && {
      icon: Phone,
      title: 'Phone / WhatsApp available',
      note: client.phone,
      time: 'Direct contact',
    },
    ...inquiries.slice(0, 3).map((inq) => ({
      icon: FileText,
      title: `Inquiry ${inq.id || ''}`,
      note: (inq.inquiry_items || []).map((item) => item.product_name).filter(Boolean).join(', ') || 'Product inquiry',
      time: inq.status || 'Open',
    })),
    ...orders.slice(0, 3).map((order) => ({
      icon: PackageCheck,
      title: `Order ${order.id}`,
      note: Array.isArray(order.products) ? order.products.join(', ') : 'Order created',
      time: order.status || 'Order',
    })),
    ...emails.slice(0, 2).map((thread) => ({
      icon: MessageCircle,
      title: thread.subject || 'Email thread',
      note: `${thread.messages?.length || 0} messages`,
      time: 'Email',
    })),
  ].filter(Boolean);

  return (
    <div className="buyer-profile-timeline">
      {items.length === 0 ? (
        <div className="empty-state"><h4>No timeline yet</h4><p>Activity will appear as the buyer moves through the pipeline.</p></div>
      ) : items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div className="buyer-timeline-item" key={`${item.title}-${index}`}>
            <div className="buyer-timeline-icon"><Icon size={15} /></div>
            <div>
              <strong>{item.title}</strong>
              <p>{item.note}</p>
            </div>
            <span>{item.time}</span>
          </div>
        );
      })}
    </div>
  );
}
