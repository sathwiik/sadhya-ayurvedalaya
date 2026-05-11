import { PDFDownloadLink } from '@react-pdf/renderer'
import ReceiptPDF from './ReceiptPDF'

interface BillingItem { name: string; amount: number }
interface Row {
  fee: number
  items: BillingItem[]
  payment_mode: string | null
  appointments: { appt_date: string; patients: { name: string } }
}

interface Props {
  row: Row
  clinicName: string
  doctorName: string
}

export default function ReceiptDownloadButton({ row, clinicName, doctorName }: Props) {
  const patientName = (row.appointments?.patients as any)?.name ?? 'patient'
  const apptDate = row.appointments?.appt_date ?? ''
  return (
    <PDFDownloadLink
      document={<ReceiptPDF row={row} clinicName={clinicName} doctorName={doctorName} />}
      fileName={`receipt_${patientName.replace(/\s+/g, '_')}_${apptDate}.pdf`}
    >
      {(({ loading }: { loading: boolean }) => (
        <span className="text-xs text-gray-500 hover:underline cursor-pointer">
          {loading ? '…' : 'Receipt'}
        </span>
      )) as any}
    </PDFDownloadLink>
  )
}
