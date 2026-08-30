import React, { ReactNode } from 'react';
import styles from './StatusWrapper.module.css';

interface StatusWrapperProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}

export function StatusWrapper({
  loading = false,
  error = null,
  empty = false,
  emptyMessage = 'Nothing here yet.',
  children
}: StatusWrapperProps) {
  if (loading) {
    return (
      <div className={styles.container}>
        <div className="spinner"></div>
        <p className={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
