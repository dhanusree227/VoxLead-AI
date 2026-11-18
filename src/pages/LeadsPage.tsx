import React, { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Eye, X, AlertCircle, ArrowUpDown } from 'lucide-react';
import { api } from '../services/api';
import type { Lead, LeadStatus } from '../types';
import { LeadStatusTag, formatDateShort } from '../components/StatusBadge';

interface LeadFormState {
  customer_name: string;
  phone_number: string;
  email: string;
  company: string;
  budget: string;
  requirements: string;
  purchase_timeline: string;
  interest_level: string;
  lead_status: LeadStatus;
  lead_source: string;
}

const EMPTY_FORM: LeadFormState = {
  customer_name: '',
  phone_number: '',
  email: '',
  company: '',
  budget: '',
  requirements: '',
  purchase_timeline: '',
  interest_level: 'Medium',
  lead_status: 'Warm',
  lead_source: 'Manual Entry',
};

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | LeadStatus>('All');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLeads({
        search: search.trim() || undefined,
        status: statusFilter,
        sort: sortOrder,
      });
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadLeads();
    }, 150);
    return () => window.clearTimeout(timer);
  }, [search, statusFilter, sortOrder]);

  const openCreateModal = () => {
    setEditingLead(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      customer_name: lead.customer_name,
      phone_number: lead.phone_number || '',
      email: lead.email || '',
      company: lead.company || '',
      budget: lead.budget || '',
      requirements: lead.requirements || '',
      purchase_timeline: lead.purchase_timeline || '',
      interest_level: lead.interest_level || 'Medium',
      lead_status: lead.lead_status,
      lead_source: lead.lead_source || 'Manual Entry',
    });
    setModalOpen(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingLead) {
        await api.updateLead(editingLead.id, form);
      } else {
        await api.createLead(form);
      }
      setModalOpen(false);
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lead.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteLead(deleteTarget.id);
      setDeleteTarget(null);
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lead.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#172554]">Lead Management</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track, filter, and manage prospects qualified through voice conversations or manual entry
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#172554] hover:bg-indigo-700 text-white text-sm font-semibold transition-colors whitespace-nowrap min-h-[42px]"
        >
          <Plus className="w-4 h-4" />
          Add New Lead
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, email, or requirements..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['All', 'Hot', 'Warm', 'Cold'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSortOrder((s) => (s === 'desc' ? 'asc' : 'desc'))}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Date: {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Leads List */}
      <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-display font-semibold text-slate-900">No leads match your filters</p>
            <p className="text-xs text-slate-500 mt-1">
              Adjust your search query or add a new lead manually.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="py-3 px-4 font-medium">Lead</th>
                    <th className="py-3 px-4 font-medium">Company &amp; Contact</th>
                    <th className="py-3 px-4 font-medium">Budget</th>
                    <th className="py-3 px-4 font-medium">Requirements</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Source · Created</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {lead.customer_name}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div className="font-medium text-slate-800">{lead.company || '—'}</div>
                        <div className="text-slate-500 mt-0.5">
                          {lead.phone_number || lead.email || 'No contact'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {lead.budget || 'Not provided'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-[260px]">
                        <p className="line-clamp-2">{lead.requirements || 'Not provided'}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <LeadStatusTag status={lead.lead_status} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap tabular-nums">
                        <div>{lead.lead_source}</div>
                        <div className="text-[11px] text-slate-400">{formatDateShort(lead.created_at)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailLead(lead)}
                            title="View details"
                            className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(lead)}
                            title="Edit lead"
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(lead)}
                            title="Delete lead"
                            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Cards */}
            <div className="lg:hidden divide-y divide-slate-100">
              {leads.map((lead) => (
                <div key={lead.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-slate-900 truncate">{lead.customer_name}</h3>
                      <p className="text-xs text-slate-500 truncate">
                        {lead.company || 'Independent'} · {lead.phone_number || lead.email || 'No contact'}
                      </p>
                    </div>
                    <LeadStatusTag status={lead.lead_status} />
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">{lead.requirements || 'Not provided'}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500">
                    <span className="font-mono tabular-nums">
                      {lead.budget || 'Not provided'} · {formatDateShort(lead.created_at)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDetailLead(lead)}
                        className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-700"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(lead)}
                        className="px-2.5 py-1.5 rounded-md border border-slate-200 text-xs font-medium text-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(lead)}
                        className="px-2.5 py-1.5 rounded-md border border-rose-200 text-xs font-medium text-rose-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-[#172554]">
                {editingLead ? 'Edit Lead' : 'Add New Lead'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLead} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Name *</label>
                  <input
                    type="text"
                    required
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Budget</label>
                  <input
                    type="text"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    placeholder="e.g. $1,500/mo or 50,000 INR"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Status</label>
                  <select
                    value={form.lead_status}
                    onChange={(e) => setForm({ ...form, lead_status: e.target.value as LeadStatus })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Timeline</label>
                  <input
                    type="text"
                    value={form.purchase_timeline}
                    onChange={(e) => setForm({ ...form, purchase_timeline: e.target.value })}
                    placeholder="e.g. Within 30 days"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Source</label>
                  <input
                    type="text"
                    value={form.lead_source}
                    onChange={(e) => setForm({ ...form, lead_source: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Requirements</label>
                <textarea
                  rows={3}
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#172554] hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingLead ? 'Save Changes' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-[#172554]">{detailLead.customer_name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {detailLead.company || 'Independent'} · {detailLead.lead_source}
                </p>
              </div>
              <LeadStatusTag status={detailLead.lead_status} />
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2 border-t border-slate-100">
              <div>
                <dt className="text-xs text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{detailLead.email || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Phone</dt>
                <dd className="font-mono text-slate-900 mt-0.5">{detailLead.phone_number || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Budget</dt>
                <dd className="font-medium text-slate-900 mt-0.5 tabular-nums">{detailLead.budget || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Timeline</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{detailLead.purchase_timeline || 'Not provided'}</dd>
              </div>
            </dl>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500">Requirements</p>
              <p className="text-sm text-slate-800 mt-1">{detailLead.requirements || 'Not provided'}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailLead(null)}
                className="px-4 py-2 rounded-lg bg-[#172554] text-white text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-sm w-full p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-slate-900">Delete lead?</h3>
            <p className="text-sm text-slate-600 mt-2">
              Are you sure you want to remove <span className="font-semibold">{deleteTarget.customer_name}</span>?
              This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
