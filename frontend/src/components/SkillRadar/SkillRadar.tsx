import React from 'react';
import styles from './SkillRadar.module.css';

interface SkillRadarProps {
  skills: string[];
}

export function SkillRadar({ skills }: SkillRadarProps) {
  if (!skills || skills.length === 0) {
    return <div className={styles.empty}>No skills yet</div>;
  }

  if (skills.length < 3) {
    return (
      <div className={styles.list}>
        {skills.map(skill => <div key={skill} className={styles.listItem}>• {skill}</div>)}
      </div>
    );
  }

  const numPoints = skills.length;
  const radius = 100;
  const center = 150;
  const angleStep = (Math.PI * 2) / numPoints;

  const points = skills.map((_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
      labelX: center + (radius + 20) * Math.cos(angle),
      labelY: center + (radius + 20) * Math.sin(angle),
    };
  });

  const polygonPath = points.map(p => `${p.x},${p.y}`).join(' ');
  const ringRadii = [33, 66, 100];

  return (
    <div className={styles.container}>
      <svg viewBox="0 0 300 300" className={styles.svg}>
        {ringRadii.map(r => {
          const ringPoints = points.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(' ');
          return <polygon key={r} points={ringPoints} className={styles.ring} />;
        })}

        {points.map((p, i) => (
          <line key={`line-${i}`} x1={center} y1={center} x2={p.x} y2={p.y} className={styles.axis} />
        ))}

        <polygon points={polygonPath} className={styles.filledPolygon} />

        {points.map((p, i) => (
          <text 
            key={`text-${i}`} 
            x={p.labelX} 
            y={p.labelY} 
            className={styles.label}
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {skills[i]}
          </text>
        ))}
      </svg>
    </div>
  );
}
