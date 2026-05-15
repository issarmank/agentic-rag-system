import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#e8eef7',
            '--tw-prose-body': '#e8eef7',
            '--tw-prose-headings': '#ffffff',
            '--tw-prose-lead': '#d1d9e6',
            '--tw-prose-links': '#6bb6ff',
            '--tw-prose-bold': '#ffffff',
            '--tw-prose-counters': '#9ca3af',
            '--tw-prose-bullets': '#9ca3af',
            '--tw-prose-hr': '#374151',
            '--tw-prose-quotes': '#d1d9e6',
            '--tw-prose-quote-borders': '#4a90e2',
            '--tw-prose-captions': '#9ca3af',
            '--tw-prose-code': '#6bb6ff',
            '--tw-prose-pre-code': '#e8eef7',
            '--tw-prose-pre-bg': '#1a2942',
            '--tw-prose-th-borders': '#374151',
            '--tw-prose-td-borders': '#374151',
            h1: {
              fontWeight: '700',
              fontSize: '1.875rem',
              marginTop: '1.5rem',
              marginBottom: '1rem',
            },
            h2: {
              fontWeight: '600',
              fontSize: '1.5rem',
              marginTop: '1.25rem',
              marginBottom: '0.75rem',
            },
            h3: {
              fontWeight: '600',
              fontSize: '1.25rem',
              marginTop: '1rem',
              marginBottom: '0.5rem',
            },
            p: {
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
            },
            strong: {
              color: '#ffffff',
              fontWeight: '600',
            },
            ul: {
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
            },
            ol: {
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
            },
            li: {
              marginTop: '0.25rem',
              marginBottom: '0.25rem',
            },
            code: {
              color: '#6bb6ff',
              backgroundColor: '#1a2942',
              padding: '0.125rem 0.25rem',
              borderRadius: '0.25rem',
              fontWeight: '500',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              backgroundColor: '#1a2942',
              color: '#e8eef7',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginTop: '1rem',
              marginBottom: '1rem',
            },
            blockquote: {
              borderLeftColor: '#4a90e2',
              borderLeftWidth: '4px',
              paddingLeft: '1rem',
              fontStyle: 'italic',
              color: '#d1d9e6',
            },
          },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
