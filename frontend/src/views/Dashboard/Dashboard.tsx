import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '@/api/client';
import type { DashboardData } from '@/api/types';
import { useLearner } from '@/context/LearnerContext';
import { StatusWrapper } from '@/components/StatusWrapper/StatusWrapper';
import { SkillRadar } from '@/components/SkillRadar/SkillRadar';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { learner } = useLearner();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!learner) {
      setLoading(false);
      return;
    }

    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getDashboard(learner.id);
        setData(result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch dashboard data.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [learner]);

  if (!learner) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h2>Welcome to North Star</h2>
          <p>Select a profile to view your dashboard.</p>
          <Link to="/profile" className={styles.btn}>Select Profile</Link>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!data) return null;

    const isEmpty = data.milestones_total === 0;

    if (isEmpty) {
      return (
        <div className={styles.emptyState}>
          <h3>No activity yet!</h3>
          <p>Start your journey by setting a goal and creating a roadmap.</p>
          <Link to="/goal" className={styles.btn}>Set a Goal</Link>
        </div>
      );
    }

    const pct = data.progress_percent;
    const strokeDasharray = 283; // 2 * PI * 45
    const strokeDashoffset = strokeDasharray - (pct / 100) * strokeDasharray;

    return (
      <div className={styles.grid}>
        <div className={styles.card}>
          <h3>Overall Progress</h3>
          <div className={styles.ringContainer}>
            <svg className={styles.ring} viewBox="0 0 100 100">
              <circle className={styles.ringBg} cx="50" cy="50" r="45" />
              <circle
                className={styles.ringProgress}
                cx="50"
                cy="50"
                r="45"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className={styles.ringText}>{Math.round(pct)}%</div>
          </div>
        </div>

        <div className={styles.card}>
          <h3>Milestones</h3>
          <div className={styles.milestoneStats}>
            <div className={styles.statLarge}>
              <span className={styles.highlight}>{data.milestones_done}</span> / {data.milestones_total}
            </div>
            <p>milestones completed</p>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className={styles.card}>
          <h3>Known Skills</h3>
          {data.known_skills.length > 0 ? (
            <div className={styles.radarWrapper}>
              <SkillRadar skills={data.known_skills} />
            </div>
          ) : (
            <p className={styles.muted}>No skills acquired yet.</p>
          )}
        </div>

        <div className={styles.card}>
          <h3>Next Actions</h3>
          {data.next_actions.length > 0 ? (
            <ol className={styles.actionList}>
              {data.next_actions.map((action, idx) => (
                <li key={idx}>{action}</li>
              ))}
            </ol>
          ) : (
            <p className={styles.muted}>You're all caught up!</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Welcome back, {learner.name}!</h1>
        {learner.goal && <p className={styles.goalText}>Goal: {learner.goal}</p>}
      </header>

      <StatusWrapper loading={loading} error={error} empty={false}>
        {renderContent()}
      </StatusWrapper>
    </div>
  );
}
