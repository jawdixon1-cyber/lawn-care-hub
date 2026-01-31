import { useState } from 'react';
import { X, Upload } from 'lucide-react';

export default function ReportRepairModal({ equipment, currentUser, onSubmit, onClose }) {
  const [form, setForm] = useState({
    equipmentId: '',
    problemDescription: '',
    photo: null,
    urgency: 'maintenance',
    reportedBy: currentUser,
  });
  const [photoPreview, setPhotoPreview] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, photo: reader.result }));
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-8 py-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <h2 className="text-2xl font-bold text-white">Report Repair</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Equipment</label>
            <select
              required
              value={form.equipmentId}
              onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
            >
              <option value="">Select equipment...</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Problem Description</label>
            <textarea
              required
              rows={4}
              value={form.problemDescription}
              onChange={(e) => setForm({ ...form, problemDescription: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition resize-y"
              placeholder="Describe what's wrong..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Photo</label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-colors">
              <Upload size={20} className="text-gray-400" />
              <span className="text-sm text-gray-500">
                {photoPreview ? 'Photo attached — click to change' : 'Upload a photo of the issue'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
            {photoPreview && (
              <img
                src={photoPreview}
                alt="Preview"
                className="mt-2 rounded-lg max-h-32 object-cover"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Urgency</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="urgency"
                  value="critical"
                  checked={form.urgency === 'critical'}
                  onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                  className="accent-red-600"
                />
                <span className="text-sm font-medium text-red-600">Critical</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="urgency"
                  value="maintenance"
                  checked={form.urgency === 'maintenance'}
                  onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                  className="accent-amber-600"
                />
                <span className="text-sm font-medium text-amber-600">Maintenance</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Reported by</label>
            <input
              type="text"
              value={form.reportedBy}
              readOnly
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-500 bg-gray-50 cursor-not-allowed"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium hover:opacity-90 transition-opacity"
            >
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
