import { useState, useEffect } from 'react';
import type { Invoice, UpdateFactureDto } from '@/entities/Invoice';
import Button from '@/components/ui/Button';
import InvoiceServices from '@/API/InvoiceServices';
import ApiUrls from '@/API/Urls';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onUpdate: () => void;
}

const EditFactureModal = ({ isOpen, onClose, invoice, onUpdate }: EditModalProps) => {
  const [formData, setFormData] = useState<UpdateFactureDto>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoice) {
      setFormData({
        type_facture: invoice.type_facture,
        montant_ttc: invoice.montant_ttc,
        num_client: invoice.num_client,
        siret: invoice.siret,
        code_naf: invoice.code_naf,
        adresse_site: invoice.adresse_site,
        code_postal: invoice.code_postal,
        echeance: invoice.echeance,
        pdl: invoice.pdl,
        conso_annuelle: invoice.conso_annuelle,
        prix_unitaire: invoice.prix_unitaire,
      });
    }
  }, [invoice]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'montant_ttc' || name === 'prix_unitaire' ? Number(value) : value,
    }));
  };

  const handleSubmit = async () => {
    if (!invoice) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await InvoiceServices.UpdateInvoice(ApiUrls.UPDATE_INV(invoice.id), formData);
      onUpdate();
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la mise à jour');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Modifier la Facture</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Type</label>
            <input
              type="text"
              name="type_facture"
              value={formData.type_facture || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Montant TTC</label>
            <input
              type="number"
              name="montant_ttc"
              value={formData.montant_ttc || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Numéro Client</label>
            <input
              type="text"
              name="num_client"
              value={formData.num_client || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">SIRET</label>
            <input
              type="text"
              name="siret"
              value={formData.siret || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Code NAF</label>
            <input
              type="text"
              name="code_naf"
              value={formData.code_naf || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Adresse du Site</label>
            <input
              type="text"
              name="adresse_site"
              value={formData.adresse_site || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Code Postal</label>
            <input
              type="text"
              name="code_postal"
              value={formData.code_postal || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Échéance</label>
            <input
              type="date"
              name="echeance"
              value={formData.echeance ? new Date(formData.echeance).toISOString().split('T')[0] : ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">PDL/PCE</label>
            <input
              type="text"
              name="pdl"
              value={formData.pdl || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Consommation Annuelle</label>
            <input
              type="text"
              name="conso_annuelle"
              value={formData.conso_annuelle || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Prix Unitaire</label>
            <input
              type="number"
              name="prix_unitaire"
              value={formData.prix_unitaire || ''}
              onChange={handleChange}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditFactureModal;