import React from 'react';

export type IconProps = Omit<React.SVGProps<SVGSVGElement>, 'width' | 'height'> & {
  size?: number;
};

type BaseIconProps = Omit<IconProps, 'children'> & {
  paths: string | React.ReactElement;
};

const I = ({ paths, size = 20, strokeWidth = 1.5, fill, ...p }: BaseIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill || 'none'}
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    {typeof paths === 'string' ? <path d={paths} /> : paths}
  </svg>
);

export const IconSidebar = (p: IconProps) => (
  <I {...p} paths={<g><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M9 4v16" /></g>} />
);
export const IconSearch = (p: IconProps) => (
  <I {...p} paths={<g><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></g>} />
);
export const IconArrowUp = (p: IconProps) => <I {...p} paths="M12 19V5M6 11l6-6 6 6" />;
export const IconAttach = (p: IconProps) => (
  <I {...p} paths="M21 12.5 12.5 21a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 1 1-3-3l8-8" />
);
export const IconMore = (p: IconProps) => (
  <I
    {...p}
    paths={
      <g>
        <circle cx="5" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </g>
    }
  />
);
export const IconTrash = (p: IconProps) => (
  <I
    {...p}
    paths={
      <g>
        <path d="M4 7h16" />
        <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      </g>
    }
  />
);
export const IconEdit = (p: IconProps) => (
  <I {...p} paths={<g><path d="M14 4l6 6-10 10H4v-6L14 4z" /><path d="M13 5l6 6" /></g>} />
);
export const IconCopy = (p: IconProps) => (
  <I
    {...p}
    paths={
      <g>
        <rect x="8" y="8" width="13" height="13" rx="2" />
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </g>
    }
  />
);
export const IconCheck = (p: IconProps) => <I {...p} paths="M5 12l4 4 10-10" />;
export const IconThumbUp = (p: IconProps) => (
  <I {...p} paths="M7 22V11M7 11l4-7a2 2 0 0 1 4 1v5h4a2 2 0 0 1 2 2.3l-1.3 7A2 2 0 0 1 17.7 21H7" />
);
export const IconThumbDn = (p: IconProps) => (
  <I {...p} paths="M17 2v11M17 13l-4 7a2 2 0 0 1-4-1v-5H5a2 2 0 0 1-2-2.3l1.3-7A2 2 0 0 1 6.3 3H17" />
);
export const IconRefresh = (p: IconProps) => (
  <I {...p} paths={<g><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></g>} />
);
export const IconDoc = (p: IconProps) => (
  <I
    {...p}
    paths={
      <g>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h4" />
      </g>
    }
  />
);
export const IconShare = (p: IconProps) => (
  <I
    {...p}
    paths={
      <g>
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <path d="M16 6 12 2 8 6" />
        <path d="M12 2v13" />
      </g>
    }
  />
);
export const IconSettings = (p: IconProps) => (
  <I
    {...p}
    paths={
      <g>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </g>
    }
  />
);
export const IconHelpCircle = (p: IconProps) => (
  <I
    {...p}
    paths={
      <g>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </g>
    }
  />
);
export const IconStop = (p: IconProps) => (
  <I
    {...p}
    paths={<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />}
  />
);
