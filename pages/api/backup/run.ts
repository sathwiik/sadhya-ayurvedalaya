import type { NextApiRequest, NextApiResponse } from 'next'
import supabaseAdmin from '@/lib/supabaseAdmin'
import { drive as driveV3, auth as googleAuthLib } from '@googleapis/drive'
import { Readable } from 'stream'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify cron secret
  const auth = req.headers.authorization
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Fetch all tables + settings in parallel
    const [patients, appointments, prescriptions, billing, medicine_stock, content_posts, settingsRes] =
      await Promise.all([
        supabaseAdmin.from('patients').select('*'),
        supabaseAdmin.from('appointments').select('*'),
        supabaseAdmin.from('prescriptions').select('*'),
        supabaseAdmin.from('billing').select('*'),
        supabaseAdmin.from('medicine_stock').select('*'),
        supabaseAdmin.from('content_posts').select('*'),
        supabaseAdmin.from('settings').select('clinic_name').eq('id', 1).single(),
      ])

    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const clinicName = settingsRes.data?.clinic_name ?? 'Saadhya Ayurvedalaya'

    const backupData = {
      exported_at: now.toISOString(),
      month,
      clinic: clinicName,
      patients: patients.data ?? [],
      appointments: appointments.data ?? [],
      prescriptions: prescriptions.data ?? [],
      billing: billing.data ?? [],
      medicine_stock: medicine_stock.data ?? [],
      content_posts: content_posts.data ?? [],
    }

    // Upload to Google Drive using service account (bundled auth from @googleapis/drive)
    const googleAuth = new googleAuthLib.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    })

    const drive = driveV3({ version: 'v3', auth: googleAuth })
    const fileName = `saadhya_backup_${month.replace('-', '_')}.json`
    const body = JSON.stringify(backupData, null, 2)

    await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
      },
      media: {
        mimeType: 'application/json',
        body: Readable.from([body]),
      },
    })

    return res.status(200).json({ success: true, month, file: fileName })
  } catch (err) {
    console.error('Backup error:', err)
    return res.status(500).json({ error: 'Backup failed', detail: String(err) })
  }
}
