/**
 * Seed Chapters Data
 * 
 * One-time script to populate Firestore with chapter data.
 * Run manually: npx ts-node scripts/seedChapters.ts
 */

import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// Chapter data
const kstateFraternities = [
    { id: 'ksu-acacia', name: 'Acacia', type: 'fraternity' },
    { id: 'ksu-alpha-gamma-rho', name: 'Alpha Gamma Rho', type: 'fraternity' },
    { id: 'ksu-alpha-sigma-phi', name: 'Alpha Sigma Phi', type: 'fraternity' },
    { id: 'ksu-beta-sigma-psi', name: 'Beta Sigma Psi', type: 'fraternity' },
    { id: 'ksu-beta-theta-pi', name: 'Beta Theta Pi', type: 'fraternity' },
    { id: 'ksu-delta-chi', name: 'Delta Chi', type: 'fraternity' },
    { id: 'ksu-delta-sigma-phi', name: 'Delta Sigma Phi', type: 'fraternity' },
    { id: 'ksu-delta-upsilon', name: 'Delta Upsilon', type: 'fraternity' },
    { id: 'ksu-farmhouse', name: 'FarmHouse', type: 'fraternity' },
    { id: 'ksu-kappa-alpha', name: 'Kappa Alpha', type: 'fraternity' },
    { id: 'ksu-kappa-sigma', name: 'Kappa Sigma', type: 'fraternity' },
    { id: 'ksu-lambda-chi-alpha', name: 'Lambda Chi Alpha', type: 'fraternity' },
    { id: 'ksu-phi-delta-theta', name: 'Phi Delta Theta', type: 'fraternity' },
    { id: 'ksu-phi-gamma-delta', name: 'Phi Gamma Delta', type: 'fraternity' },
    { id: 'ksu-pi-kappa-alpha', name: 'Pi Kappa Alpha', type: 'fraternity' },
    { id: 'ksu-pi-kappa-phi', name: 'Pi Kappa Phi', type: 'fraternity' },
    { id: 'ksu-sigma-alpha-epsilon', name: 'Sigma Alpha Epsilon', type: 'fraternity' },
    { id: 'ksu-sigma-chi', name: 'Sigma Chi', type: 'fraternity' },
    { id: 'ksu-sigma-phi-epsilon', name: 'Sigma Phi Epsilon', type: 'fraternity' },
    { id: 'ksu-sigma-tau-gamma', name: 'Sigma Tau Gamma', type: 'fraternity' },
    { id: 'ksu-theta-xi', name: 'Theta Xi', type: 'fraternity' },
];

const kstateSororities = [
    { id: 'ksu-alpha-chi-omega', name: 'Alpha Chi Omega', type: 'sorority' },
    { id: 'ksu-alpha-delta-pi', name: 'Alpha Delta Pi', type: 'sorority' },
    { id: 'ksu-alpha-gamma-delta', name: 'Alpha Gamma Delta', type: 'sorority' },
    { id: 'ksu-alpha-omega-epsilon', name: 'Alpha Omega Epsilon', type: 'sorority' },
    { id: 'ksu-alpha-xi-delta', name: 'Alpha Xi Delta', type: 'sorority' },
    { id: 'ksu-chi-omega', name: 'Chi Omega', type: 'sorority' },
    { id: 'ksu-delta-delta-delta', name: 'Delta Delta Delta', type: 'sorority' },
    { id: 'ksu-gamma-phi-beta', name: 'Gamma Phi Beta', type: 'sorority' },
    { id: 'ksu-kappa-alpha-theta', name: 'Kappa Alpha Theta', type: 'sorority' },
    { id: 'ksu-kappa-delta', name: 'Kappa Delta', type: 'sorority' },
    { id: 'ksu-kappa-kappa-gamma', name: 'Kappa Kappa Gamma', type: 'sorority' },
    { id: 'ksu-pi-beta-phi', name: 'Pi Beta Phi', type: 'sorority' },
    { id: 'ksu-sigma-kappa', name: 'Sigma Kappa', type: 'sorority' },
    { id: 'ksu-zeta-tau-alpha', name: 'Zeta Tau Alpha', type: 'sorority' },
];

const universities = [
    {
        id: 'ksu',
        name: 'Kansas State University',
        shortName: 'K-State',
        emailDomain: 'ksu.edu',
    },
];

async function seedChapters() {
    // Initialize Firebase Admin
    // Try to use application default credentials first, then service account
    try {
        const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
        const serviceAccount = require(serviceAccountPath) as ServiceAccount;
        initializeApp({
            credential: cert(serviceAccount),
        });
    } catch {
        // Use default credentials (works with firebase CLI login)
        initializeApp({
            projectId: 'ddride-didowu',
        });
    }

    const db = getFirestore();

    console.log('🚀 Starting chapter seed...');

    // Create universities
    for (const uni of universities) {
        console.log(`📍 Creating university: ${uni.name}`);
        await db.collection('universities').doc(uni.id).set({
            name: uni.name,
            shortName: uni.shortName,
            emailDomain: uni.emailDomain,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // Create chapters under this university
        const allChapters = [...kstateFraternities, ...kstateSororities];

        for (const chapter of allChapters) {
            console.log(`  ➡️  Creating chapter: ${chapter.name}`);
            await db
                .collection('universities')
                .doc(uni.id)
                .collection('chapters')
                .doc(chapter.id)
                .set({
                    name: chapter.name,
                    type: chapter.type,
                    universityId: uni.id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
        }

        console.log(`✅ Created ${allChapters.length} chapters for ${uni.shortName}`);
    }

    console.log('🎉 Seed complete!');
    process.exit(0);
}

seedChapters().catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
});
