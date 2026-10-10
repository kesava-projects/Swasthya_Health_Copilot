import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { getT } from '../utils/i18n.js';
import {
  Bell,
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Pill,
} from 'lucide-react';
import { Reminder } from '../types/index.js';

export const RemindersPage: React.FC = () => {
  const { language } = useAuth();
  const t = getT(language);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New Reminder form state
  const [title, setTitle] = useState('');
  const [reminderType, setReminderType] = useState<'appointment' | 'medication' | 'lab_followup'>('appointment');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notes, setNotes] = useState('');

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reminders');
      if (res.data.success) {
        setReminders(res.data.reminders);
      }
    } catch (err) {
      console.error('Failed to load reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !scheduledTime) return;

    try {
      const res = await api.post('/reminders', {
        title,
        reminderType,
        scheduledTime,
        notes,
      });

      if (res.data.success) {
        setShowModal(false);
        setTitle('');
        setNotes('');
        setScheduledTime('');
        fetchReminders();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create reminder');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/reminders/${id}`, { status });
      fetchReminders();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      await api.delete(`/reminders/${id}`);
      fetchReminders();
    } catch (err) {
      alert('Failed to delete reminder');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Reminders & Schedules</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Confirmed medical appointments, laboratory follow-up dates, and active medicine alerts.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Reminder
        </button>
      </div>

      {/* Reminders List */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">{t.common.loading}</div>
        ) : reminders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No upcoming reminders. Click "Add Reminder" to schedule medical follow-ups.
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((rem) => (
              <div
                key={rem._id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                  rem.status === 'completed'
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      rem.reminderType === 'medication'
                        ? 'bg-blue-100 text-blue-700'
                        : rem.reminderType === 'lab_followup'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {rem.reminderType === 'medication' ? <Pill className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm">{rem.title}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize bg-slate-100 text-slate-700">
                        {rem.reminderType.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(rem.scheduledTime).toLocaleDateString()} at{' '}
                      {new Date(rem.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {rem.notes && <p className="text-slate-600 mt-1 italic">{rem.notes}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {rem.status !== 'completed' ? (
                    <button
                      onClick={() => handleUpdateStatus(rem._id, 'completed')}
                      className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold text-[11px] flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark Done
                    </button>
                  ) : (
                    <span className="text-emerald-700 font-semibold text-[11px]">Completed</span>
                  )}

                  <button
                    onClick={() => handleDeleteReminder(rem._id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Reminder Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Schedule Medical Reminder</h3>

            <form onSubmit={handleCreateReminder} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Consult Cardiologist for blood pressure review"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Type</label>
                  <select
                    value={reminderType}
                    onChange={(e) => setReminderType(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white outline-none"
                  >
                    <option value="appointment">Doctor Appointment</option>
                    <option value="lab_followup">Lab Test Follow-up</option>
                    <option value="medication">Medication Dose</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Doctor instructions or preparation notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Confirm Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
