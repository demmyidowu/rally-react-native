/**
 * Chapter Data - Universities and Greek Organizations
 * 
 * Contains all supported universities and their Greek life chapters.
 * Expandable to support more universities in the future.
 */

export interface Chapter {
    id: string;
    name: string;
    type: 'fraternity' | 'sorority';
}

export interface University {
    id: string;
    name: string;
    shortName: string;
    chapters: Chapter[];
}

// K-State Fraternities
const kstateFraternities: Chapter[] = [
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

// K-State Sororities
const kstateSororities: Chapter[] = [
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

// All universities
export const universities: University[] = [
    {
        id: 'ksu',
        name: 'Kansas State University',
        shortName: 'K-State',
        chapters: [...kstateFraternities, ...kstateSororities].sort((a, b) =>
            a.name.localeCompare(b.name)
        ),
    },
];

/**
 * Get university by ID
 */
export function getUniversityById(id: string): University | undefined {
    return universities.find(u => u.id === id);
}

/**
 * Get chapter by ID
 */
export function getChapterById(chapterId: string): Chapter | undefined {
    for (const uni of universities) {
        const chapter = uni.chapters.find(c => c.id === chapterId);
        if (chapter) return chapter;
    }
    return undefined;
}

/**
 * Get chapters for a university
 */
export function getChaptersForUniversity(universityId: string): Chapter[] {
    const uni = getUniversityById(universityId);
    return uni?.chapters || [];
}

/**
 * Get chapter display name with university
 */
export function getChapterDisplayName(chapterId: string): string {
    const chapter = getChapterById(chapterId);
    if (!chapter) return 'Unknown Chapter';

    // Find university
    for (const uni of universities) {
        if (uni.chapters.find(c => c.id === chapterId)) {
            return `${chapter.name} - ${uni.shortName}`;
        }
    }
    return chapter.name;
}
