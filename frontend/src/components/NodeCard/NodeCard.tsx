import React from 'react';
import styles from './NodeCard.module.css';
import { PathNode } from '@/api/types';

interface NodeCardProps {
  node: PathNode;
  onMarkDone: (position: number) => void;
  onSelect: (node: PathNode) => void;
}

export function NodeCard({ node, onMarkDone, onSelect }: NodeCardProps) {
  const resource = node.resource;
  
  let borderColor = 'var(--clr-border)';
  if (resource.type === 'course') borderColor = '#4f46e5';
  else if (resource.type === 'project') borderColor = '#10b981';
  else if (resource.type === 'assessment') borderColor = '#f59e0b';

  return (
    <div 
      className={styles.card} 
      style={{ borderLeftColor: borderColor }}
      onClick={() => onSelect(node)}
    >
      <div className={styles.header}>
        <div className={styles.milestone}>Milestone {node.position}</div>
        <div className={styles.typeBadge}>{resource.type}</div>
      </div>
      
      <div className={styles.titleWrap}>
        {resource.url ? (
          <a href={resource.url} target="_blank" rel="noopener noreferrer" className={styles.title} onClick={e => e.stopPropagation()}>
            {resource.title}
          </a>
        ) : (
          <span className={styles.title}>{resource.title}</span>
        )}
      </div>

      <div className={styles.meta}>
        <span className={styles.chip}>{resource.est_hours} hrs</span>
        {resource.skills_taught.map(skill => (
          <span key={skill} className={styles.chip}>{skill}</span>
        ))}
      </div>

      <div className={styles.reason}>
        {node.reason}
      </div>

      <div className={styles.footer}>
        <button 
          className={`${styles.doneButton} ${node.status === 'done' ? styles.done : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (node.status !== 'done') onMarkDone(node.position);
          }}
          disabled={node.status === 'done'}
        >
          {node.status === 'done' ? '✓ Done' : 'Mark Done'}
        </button>
      </div>
    </div>
  );
}
