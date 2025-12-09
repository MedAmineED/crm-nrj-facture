import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import type { WebsiteLead } from '@/types'

const columnHelper = createColumnHelper<WebsiteLead>()

const columns = [
  columnHelper.accessor('fullName', {
    header: 'Nom et Prénom',
  }),
  columnHelper.accessor('address', {
    header: 'Adresse',
  }),
  columnHelper.accessor('age', {
    header: 'Âge',
  }),
  columnHelper.accessor('phone', {
    header: 'Numéro de Téléphone',
  }),
  columnHelper.accessor('email', {
    header: 'Adresse Mail',
  }),
  columnHelper.accessor('company', {
    header: 'Société',
  }),
  columnHelper.accessor('energyType', {
    header: "Type d'Énergie",
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: (info) => (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleEdit(info.row.original)}
        >
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDelete(info.row.original.id)}
        >
          Delete
        </Button>
      </div>
    ),
  }),
]

const handleEdit = (lead: WebsiteLead) => {
  // Implement edit functionality
  console.log('Edit lead:', lead)
}

const handleDelete = (id: string) => {
  // Implement delete functionality
  console.log('Delete lead:', id)
}

export default function WebsiteLeads() {
  const [leads] = useState<WebsiteLead[]>([]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Website Leads</h1>
      <DataTable columns={columns} data={leads} />
    </div>
  )
}