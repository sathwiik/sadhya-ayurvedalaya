import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

interface BillingItem { name: string; amount: number }

interface Props {
  row: {
    fee: number
    items: BillingItem[]
    payment_mode: string | null
    appointments: { appt_date: string; patients: { name: string } }
  }
  clinicName: string
  doctorName: string
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#15803d', marginBottom: 4 },
  sub: { fontSize: 9, color: '#6b7280', marginBottom: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginVertical: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: '#6b7280' },
  value: { fontFamily: 'Helvetica-Bold' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  total: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTopWidth: 2, borderTopColor: '#15803d' },
  totalLabel: { fontFamily: 'Helvetica-Bold', fontSize: 11 },
  totalValue: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: '#15803d' },
})

export default function ReceiptPDF({ row, clinicName, doctorName }: Props) {
  const patient = (row.appointments?.patients as any)?.name ?? ''
  const date = row.appointments?.appt_date ?? ''
  const items: BillingItem[] = Array.isArray(row.items) ? row.items : []

  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <Text style={styles.title}>{clinicName}</Text>
        <Text style={styles.sub}>Dr. {doctorName} · Receipt</Text>
        <View style={styles.divider} />
        <View style={styles.row}><Text style={styles.label}>Patient</Text><Text style={styles.value}>{patient}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Date</Text><Text style={styles.value}>{date}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Payment mode</Text><Text style={styles.value}>{row.payment_mode ?? '—'}</Text></View>
        <View style={styles.divider} />
        {items.length > 0
          ? items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <Text>{item.name}</Text>
                <Text>₹{item.amount}</Text>
              </View>
            ))
          : (
            <View style={styles.itemRow}>
              <Text>Consultation</Text>
              <Text>₹{row.fee}</Text>
            </View>
          )
        }
        <View style={styles.total}>
          <Text style={styles.totalLabel}>Total paid</Text>
          <Text style={styles.totalValue}>₹{row.fee}</Text>
        </View>
      </Page>
    </Document>
  )
}
