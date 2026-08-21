import { google } from 'googleapis';
import { createReadStream } from 'fs';
import path from 'path';

// Fix 10: credenciais carregadas via variável de ambiente (caminho fora do src/)
// No .env: GOOGLE_CREDENTIALS_PATH=./drive-credentials.json
const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH
  ? path.resolve(process.env.GOOGLE_CREDENTIALS_PATH)
  : path.resolve('./drive-credentials.json');

const auth = new google.auth.GoogleAuth({
  keyFile: credentialsPath,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

// Fix 10: FOLDER_ID via variável de ambiente
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';

export async function uploadToDrive(filePath: string): Promise<string | null> {
  if (!FOLDER_ID) {
    console.error('[Drive] GOOGLE_DRIVE_FOLDER_ID não configurado no .env');
    return null;
  }

  try {
    const fileName = path.basename(filePath);
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [FOLDER_ID],
      },
      media: {
        mimeType: 'audio/mpeg',
        body: createReadStream(filePath),
      },
      fields: 'id, webViewLink',
    });

    console.log(`✅ ${fileName} enviado pro Drive! Link: ${response.data.webViewLink}`);
    return response.data.webViewLink || null;
  } catch (error) {
    console.error('❌ Erro ao enviar pro Drive:', error);
    return null;
  }
}
