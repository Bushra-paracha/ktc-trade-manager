import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function useAnalytics() {
  const [data, setData] = useState({
    monthlyRevenue: [],
    revenueByCountry: [],
    pipelineByStage: [],
    leadToInquiryRate: 0,
    inquiryToOrderRate: 0,
    avgSalesCycleDays: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      const [clientsRes, inquiriesRes, ordersRes] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('inquiries').select('*, clients(country)'),
        supabase.from('orders').select('*, clients(country)'),
      ]);

      if (!active) return;

      if (clientsRes.error || inquiriesRes.error || ordersRes.error) {
        setError(clientsRes.error?.message || inquiriesRes.error?.message || ordersRes.error?.message);
        setLoading(false);
        return;
      }

      const clients = clientsRes.data || [];
      const inquiries = inquiriesRes.data || [];
      const orders = ordersRes.data || [];

      // ---- Monthly revenue from orders (based on created_at), with a simple target line ----
      const now = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_NAMES[d.getMonth()] });
      }

      const monthlyRevenue = months.map(({ year, month, label }) => {
        const revenue = orders
          .filter((o) => {
            const d = new Date(o.created_at);
            return d.getFullYear() === year && d.getMonth() === month;
          })
          .reduce((sum, o) => sum + (Number(o.total_value) || 0), 0);
        return { month: label, revenue, target: 0 };
      });

      // Target = simple rolling average of non-zero months, fallback to a flat number
      const nonZero = monthlyRevenue.filter((m) => m.revenue > 0).map((m) => m.revenue);
      const avgRevenue = nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
      monthlyRevenue.forEach((m) => { m.target = Math.round(avgRevenue) || 0; });

      // ---- Revenue by country (from orders, joined via clients) ----
      const countryTotals = {};
      orders.forEach((o) => {
        const country = o.clients?.country || 'Unknown';
        countryTotals[country] = (countryTotals[country] || 0) + (Number(o.total_value) || 0);
      });
      const revenueByCountry = Object.entries(countryTotals)
        .map(([country, value]) => ({ country, value }))
        .sort((a, b) => b.value - a.value);

      // ---- Pipeline by stage (from clients.status, using revenue field as value) ----
      const stages = ['New', 'Contacted', 'Engaged', 'Negotiating', 'Won', 'Lost', 'Dormant'];
      const pipelineByStage = stages.map((stage) => {
        const stageClients = clients.filter((c) => c.status === stage);
        return {
          stage,
          count: stageClients.length,
          value: stageClients.reduce((sum, c) => sum + (Number(c.revenue) || 0), 0),
        };
      }).filter((s) => s.count > 0);

      // ---- Conversion rates ----
      const totalClients = clients.length;
      const totalInquiries = inquiries.length;
      const totalOrders = orders.length;

      const leadToInquiryRate = totalClients ? Math.round((totalInquiries / totalClients) * 1000) / 10 : 0;
      const inquiryToOrderRate = totalInquiries ? Math.round((totalOrders / totalInquiries) * 1000) / 10 : 0;

      // ---- Avg sales cycle: days between inquiry creation and order creation, for orders with a linked inquiry ----
      let cycleDays = [];
      orders.forEach((o) => {
        if (!o.inquiry_id) return;
        const inquiry = inquiries.find((i) => i.id === o.inquiry_id);
        if (!inquiry) return;
        const days = (new Date(o.created_at) - new Date(inquiry.created_at)) / (1000 * 60 * 60 * 24);
        if (days >= 0) cycleDays.push(days);
      });
      const avgSalesCycleDays = cycleDays.length
        ? Math.round(cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length)
        : 0;

      setData({
        monthlyRevenue,
        revenueByCountry,
        pipelineByStage,
        leadToInquiryRate,
        inquiryToOrderRate,
        avgSalesCycleDays,
      });
      setLoading(false);
    }

    load();
    return () => { active = false; };
  }, []);

  return { ...data, loading, error };
}
