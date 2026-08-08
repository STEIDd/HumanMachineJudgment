import React from 'react';
import styles from './MainLayout.module.css';

export interface MainLayoutProps {
  children: React.ReactNode;
  projectId: string;
  onProjectChange: (id: string) => void;
  onNavigate: (path: string) => void;
  currentPath: string;
}

interface NavItem {
  label: string;
  hash: string;
  matchPath: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Projects', hash: '#/', matchPath: '/' },
  { label: 'Thermal Model Demo', hash: '#/thermal-model', matchPath: '/thermal-model' },
  { label: 'Components', hash: '#/components', matchPath: '/components' },
];

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  projectId,
  onProjectChange,
  onNavigate,
  currentPath,
}) => {
  const handleProjectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = e.currentTarget.value.trim();
      if (value) {
        onProjectChange(value);
        onNavigate(`#/project/${encodeURIComponent(value)}`);
      }
    }
  };

  return (
    <div className={styles['layout']}>
      <header className={styles['header']}>
        <h1 className={styles['title']}>
          <a
            className={styles['titleLink']}
            href="#/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('#/');
            }}
          >
            Judgment Points
          </a>
        </h1>

        <nav className={styles['nav']}>
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.matchPath;
            const className = [styles['navLink'], isActive ? styles['navLinkActive'] : '']
              .filter(Boolean)
              .join(' ');

            return (
              <a
                key={item.hash}
                className={className}
                href={item.hash}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.hash);
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className={styles['spacer']} />

        <div className={styles['projectField']}>
          <label htmlFor="project-id" className={styles['projectLabel']}>
            Project:
          </label>
          <input
            id="project-id"
            type="text"
            className={styles['projectInput']}
            defaultValue={projectId}
            placeholder="project ID"
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value && value !== projectId) {
                onProjectChange(value);
              }
            }}
            onKeyDown={handleProjectKeyDown}
          />
        </div>
      </header>

      <main className={styles['main']}>{children}</main>
    </div>
  );
};
