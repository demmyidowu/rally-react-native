#!/usr/bin/env node
/**
 * Seed Chapters to Firestore
 * 
 * Run: node scripts/seedChapters.js
 * 
 * Uses GOOGLE_APPLICATION_CREDENTIALS or application default credentials
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// Initialize with application default credentials
initializeApp({
    credential: applicationDefault(),
    projectId: 'ddride-didowu',
});

const db = getFirestore();

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

async function seedChapters() {
    console.log('🚀 Starting chapter seed...');

    // Create K-State university
    console.log('📍 Creating university: Kansas State University');
    await db.collection('universities').doc('ksu').set({
        name: 'Kansas State University',
        shortName: 'K-State',
        emailDomain: 'ksu.edu',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    // Create chapters
    const allChapters = [...kstateFraternities, ...kstateSororities];

    for (const chapter of allChapters) {
        console.log(`  ➡️  Creating chapter: ${chapter.name}`);
        await db
            .collection('universities')
            .doc('ksu')
            .collection('chapters')
            .doc(chapter.id)
            .set({
                name: chapter.name,
                type: chapter.type,
                universityId: 'ksu',
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
    }

    console.log(`✅ Created ${allChapters.length} chapters for K-State`);
    console.log('🎉 Seed complete!');
    process.exit(0);
}

seedChapters().catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
});
