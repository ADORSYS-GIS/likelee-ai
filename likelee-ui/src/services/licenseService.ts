// License API Service
// Centralized API calls for license management

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || '';

const api = (path: string) => {
    try {
        if (!API_BASE) return new URL(path, window.location.origin).toString();
        if (API_BASE.startsWith('http')) return `${API_BASE}${path}`;
        return new URL(path, new URL(API_BASE, window.location.origin)).toString();
    } catch {
        return new URL(path, window.location.origin).toString();
    }
};

export const licenseService = {
    /**
     * Fetch agency roster with all managed talent and their licenses
     * @param agencyId - UUID of the agency
     * @returns Array of talent profiles with nested licenses
     */
    getAgencyRoster: async (agencyId: string) => {
        const res = await fetch(api(`/api/agency/roster?agency_id=${agencyId}`));
        if (!res.ok) {
            throw new Error(`Failed to fetch roster: ${res.status}`);
        }
        return res.json();
    },

    /**
     * Approve a pending license (changes status from 'pending' to 'active')
     * @param licenseId - UUID of the license to approve
     */
    approveLicense: async (licenseId: string) => {
        const res = await fetch(api(`/api/licenses/${licenseId}/approve`), {
            method: 'POST',
        });
        if (!res.ok) {
            throw new Error(`Failed to approve license: ${res.status}`);
        }
        return res.json();
    },

    /**
     * Revoke an active license (changes status to 'revoked' and deletes brand access)
     * @param licenseId - UUID of the license to revoke
     */
    revokeLicense: async (licenseId: string) => {
        const res = await fetch(api(`/api/licenses/${licenseId}/revoke`), {
            method: 'POST',
        });
        if (!res.ok) {
            throw new Error(`Failed to revoke license: ${res.status}`);
        }
        return res.json();
    },
};
