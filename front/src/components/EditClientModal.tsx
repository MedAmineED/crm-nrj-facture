import React, { useState, useEffect } from 'react';
import { type Client } from '@/API/ClientServices';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Client>) => Promise<void>;
  client: Client | null;
}

const EditClientModal: React.FC<EditClientModalProps> = ({ isOpen, onClose, onSave, client }) => {
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({
        profile: client.profile,
        status: client.status,
        raisonSociale: client.raisonSociale,
        comment: client.comment || '',
      });
    }
  }, [client]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving client:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Modifier le Client</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-light"
          >×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Raison Sociale
              </label>
              <input
                type="text"
                value={formData.raisonSociale || ''}
                onChange={(e) => setFormData({ ...formData, raisonSociale: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Profil
              </label>
              <input
                type="text"
                value={formData.profile || ''}
                onChange={(e) => setFormData({ ...formData, profile: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Statut
              </label>
              <select
                value={formData.status || ''}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Sélectionner...</option>
                <option value="Nouveau">Nouveau</option>
                <option value="RDV Pris">RDV Pris</option>
                <option value="A rappeler">A rappeler</option>
                <option value="En négociation">En négociation</option>
                <option value="Devis envoyé">Devis envoyé</option>
                <option value="Converti">Converti</option>
                <option value="Pas intéressé">Pas intéressé</option>
                <option value="Mort">Mort</option>
                <option value="Injoignable">Injoignable</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Commentaire
              </label>
              <textarea
                value={formData.comment || ''}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Ajouter des notes..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditClientModal;
