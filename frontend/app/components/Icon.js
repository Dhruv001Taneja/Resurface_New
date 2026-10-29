
"use client";

export default function Icon({ name, size = 18, className = "" }) {
    const paths = {
        dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
        images: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
        zap: <path d="m13 2-3 8H5l6 12 3-8h5L13 2Z" />,
        calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h2M14 14h2M8 17h2" /></>,
        shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
        settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 3.1-.2-.1a1.7 1.7 0 0 0-1.8.2l-.2.1h-3.6l-.1-.2a1.7 1.7 0 0 0-1.5-1.1 1.7 1.7 0 0 0-1.6.6l-.1.1-3.1-1.8.1-.2a1.7 1.7 0 0 0-.2-1.8l-.1-.2v-3.6l.2-.1a1.7 1.7 0 0 0 1.1-1.5 1.7 1.7 0 0 0-.6-1.6l-.1-.1 1.8-3.1.2.1a1.7 1.7 0 0 0 1.8-.2l.2-.1h3.6l.1.2a1.7 1.7 0 0 0 1.5 1.1 1.7 1.7 0 0 0 1.6-.6l.1-.1 3.1 1.8-.1.2a1.7 1.7 0 0 0 .2 1.8l.1.2v3.6l-.2.1a1.7 1.7 0 0 0-.6 1.1Z" /></>,
        search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
        menu: <path d="M4 6h16M4 12h16M4 18h16" />,
        close: <path d="m18 6-12 12M6 6l12 12" />,
        upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
        logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
        check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
        clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    };

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            {paths[name] || <circle cx="12" cy="12" r="9" />}
        </svg>
    );
}
