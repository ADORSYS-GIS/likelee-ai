/// <reference types="vite/client" />

declare namespace JSX {
    interface IntrinsicElements {
        "docuseal-builder": React.DetailedHTMLProps<
            React.HTMLAttributes<HTMLElement> & {
                "data-token"?: string;
                "data-preview"?: boolean;
                "data-language"?: string;
                "data-autosave"?: boolean;
                "data-send-button-text"?: string;
                "data-save-button-text"?: string;
                "data-save-button-text"?: string;
                "data-roles"?: string;
                "data-template-id"?: number;
            },
            HTMLElement
        >;
        "docuseal-form": React.DetailedHTMLProps<
            React.HTMLAttributes<HTMLElement> & {
                "data-src"?: string;
                "data-email"?: string;
                "data-role"?: string;
                "data-external-id"?: string;
                "data-expand"?: boolean;
            },
            HTMLElement
        >;
    }
}
