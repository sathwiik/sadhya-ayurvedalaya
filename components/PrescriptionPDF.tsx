import {
  Document, Page, Text, View, StyleSheet, Font
} from '@react-pdf/renderer'

Font.register({
  family: 'Helvetica',
  fonts: []
})

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 14,
  },
  clinicName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#15803d',
    marginBottom: 2,
  },
  subText: {
    fontSize: 9,
    color: '#4b5563',
    marginBottom: 1,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginVertical: 10,
  },
  sectionLabel: {
    fontSize: 8,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  patientRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  patientField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 1,
  },
  fieldValue: {
    fontSize: 10,
    color: '#111827',
    fontFamily: 'Helvetica-Bold',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#15803d',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 2,
    marginBottom: 2,
  },
  tableHeaderText: {
    color: '#ffffff',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  col1: { flex: 2.5 },
  col2: { flex: 1.5 },
  col3: { flex: 2 },
  col4: { flex: 1 },
  col5: { flex: 2 },
  cellText: {
    fontSize: 9,
    color: '#1f2937',
  },
  footer: {
    marginTop: 20,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  signatureBox: {
    borderTopWidth: 1,
    borderTopColor: '#9ca3af',
    paddingTop: 4,
    width: 140,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#6b7280',
  },
  validText: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
  },
})

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
}

export default function PrescriptionPDF({
  clinicName, doctorName, address, phone,
  patientName, dob, apptDate, diagnosis, prescriptions
}: Props) {
  return (
    <Document>
      <Page size="A5" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.clinicName}>{clinicName}</Text>
          <Text style={styles.subText}>Dr. {doctorName}</Text>
          {address ? <Text style={styles.subText}>{address}</Text> : null}
          {phone ? <Text style={styles.subText}>Ph: {phone}</Text> : null}
        </View>

        <View style={styles.divider} />

        {/* Patient info */}
        <Text style={styles.sectionLabel}>Patient Details</Text>
        <View style={styles.patientRow}>
          <View style={styles.patientField}>
            <Text style={styles.fieldLabel}>Patient Name</Text>
            <Text style={styles.fieldValue}>{patientName}</Text>
          </View>
          {dob && (
            <View style={styles.patientField}>
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              <Text style={styles.fieldValue}>{dob}</Text>
            </View>
          )}
          <View style={styles.patientField}>
            <Text style={styles.fieldLabel}>Date</Text>
            <Text style={styles.fieldValue}>{apptDate}</Text>
          </View>
        </View>

        {diagnosis && (
          <View style={{ marginBottom: 10 }}>
            <Text style={styles.fieldLabel}>Diagnosis</Text>
            <Text style={styles.cellText}>{diagnosis}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Prescriptions table */}
        <Text style={[styles.sectionLabel, { marginBottom: 6 }]}>Prescriptions</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.col1]}>Drug</Text>
          <Text style={[styles.tableHeaderText, styles.col2]}>Dosage</Text>
          <Text style={[styles.tableHeaderText, styles.col3]}>Frequency</Text>
          <Text style={[styles.tableHeaderText, styles.col4]}>Days</Text>
          <Text style={[styles.tableHeaderText, styles.col5]}>Notes</Text>
        </View>
        {prescriptions.map((rx, i) => (
          <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
            <Text style={[styles.cellText, styles.col1]}>{rx.drug_name}</Text>
            <Text style={[styles.cellText, styles.col2]}>{rx.dosage}</Text>
            <Text style={[styles.cellText, styles.col3]}>{rx.frequency}</Text>
            <Text style={[styles.cellText, styles.col4]}>{rx.days}</Text>
            <Text style={[styles.cellText, styles.col5]}>{rx.notes || '—'}</Text>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Doctor&apos;s Signature</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Date: {apptDate}</Text>
            </View>
          </View>
          <Text style={styles.validText}>
            This prescription is valid for 30 days from the date of issue.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
