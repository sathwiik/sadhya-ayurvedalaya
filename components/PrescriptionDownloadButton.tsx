import { PDFDownloadLink } from '@react-pdf/renderer'
import PrescriptionPDF from './PrescriptionPDF'

interface Prescription {
  drug_name: string
  dosage: string
  frequency: string
  days: number
  notes?: string
}

interface Props {
  clinicName: string
  doctorName: string
  address: string
  phone: string
  patientName: string
  dob?: string
  apptDate: string
  diagnosis?: string
  prescriptions: Prescription[]
  fileName: string
}

export default function PrescriptionDownloadButton({
  clinicName, doctorName, address, phone,
  patientName, dob, apptDate, diagnosis, prescriptions, fileName,
}: Props) {
  return (
    <PDFDownloadLink
      document={
        <PrescriptionPDF
          clinicName={clinicName}
          doctorName={doctorName}
          address={address}
          phone={phone}
          patientName={patientName}
          dob={dob}
          apptDate={apptDate}
          diagnosis={diagnosis}
          prescriptions={prescriptions}
        />
      }
      fileName={fileName}
    >
      {(({ loading }: { loading: boolean }) => (
        <button className="text-sm bg-green-700 text-white px-3 py-1.5 rounded-md font-medium hover:bg-green-800">
          {loading ? 'Preparing…' : 'Download PDF'}
        </button>
      )) as any}
    </PDFDownloadLink>
  )
}
