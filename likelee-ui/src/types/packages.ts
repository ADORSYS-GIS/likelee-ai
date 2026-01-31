export interface TalentPackage {
    id: string;
    agency_id: string;
    title: string;
    description?: string;
    cover_image_url?: string;
    primary_color?: string;
    secondary_color?: string;
    custom_message?: string;
    allow_comments: boolean;
    allow_favorites: boolean;
    allow_callbacks: boolean;
    expires_at?: string;
    access_token: string;
    created_at: string;
    updated_at: string;
    items?: TalentPackageItem[];
    stats?: TalentPackageStats;
}

export interface TalentPackageItem {
    id: string;
    package_id: string;
    talent_id: string;
    sort_order: number;
    created_at: string;
    talent?: any; // To be populated with talent profile
    assets?: TalentPackageAsset[];
}

export interface TalentPackageAsset {
    id: string;
    item_id: string;
    asset_id: string;
    asset_type: 'reference_image' | 'agency_file';
    sort_order: number;
    created_at: string;
    url?: string; // Signed URL or public URL
}

export interface TalentPackageStats {
    package_id: string;
    view_count: number;
    last_viewed_at: string;
    unique_visitors: number;
}

export interface TalentPackageInteraction {
    id: string;
    package_id: string;
    talent_id?: string;
    type: 'favorite' | 'comment' | 'callback';
    content?: string;
    client_name?: string;
    client_email?: string;
    created_at: string;
}
