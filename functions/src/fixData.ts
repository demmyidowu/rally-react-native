/**
 * Fix University Data
 * 
 * One-time fix to add missing adminCode field
 * Call via: curl "https://us-central1-ddride-didowu.cloudfunctions.net/fixUniversityData?code=YOUR_ADMIN_CODE"
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';

if (getApps().length === 0) {
    initializeApp();
}

const db = getFirestore();

export const fixUniversityData = onRequest(
    { region: 'us-central1' },
    async (req, res) => {
        try {
            const adminCode = req.query.code as string;

            if (!adminCode) {
                res.status(400).send('Please provide admin code as ?code=YOUR_CODE');
                return;
            }

            // Update KSU university with adminCode
            await db.collection('universities').doc('ksu').update({
                adminCode: adminCode,
                updatedAt: FieldValue.serverTimestamp(),
            });

            res.status(200).send(`✅ Updated KSU with adminCode: ${adminCode}`);
        } catch (error: any) {
            console.error('❌ Fix failed:', error);
            res.status(500).send(`Error: ${error.message}`);
        }
    }
);
