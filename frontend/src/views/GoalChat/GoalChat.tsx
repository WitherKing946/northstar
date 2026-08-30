import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLearner } from '@/context/LearnerContext';
import { postGoal, createPath } from '@/api/client';
import type { GoalResponse } from '@/api/types';
import { StatusWrapper } from '@/components/StatusWrapper/StatusWrapper';
import styles from './GoalChat.module.css';

export default function GoalChat() {
  const { learner } = useLearner();
  const navigate = useNavigate();
  const [goalInput, setGoalInput] = useState('');
  const [parsedGoal, setParsedGoal] = useState<GoalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!learner) {
    return (
      <div className={styles.container}>
        <p>Please select a profile first.</p>
        <Link to="/profile" className={styles.link}>Go to Profile</Link>
      </div>
    );
  }

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await postGoal(learner.id, { goal: goalInput });
      setParsedGoal(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit goal.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    setLoading(true);
    setError(null);
    try {
      const path = await createPath(learner.id);
      navigate(`/roadmap/${path.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate roadmap.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>What do you want to learn?</h1>
        <p>Describe your learning goal in your own words.</p>
      </header>

      <StatusWrapper loading={loading} error={error} empty={false}>
        {!parsedGoal ? (
          <form className={styles.form} onSubmit={handleGoalSubmit}>
            <textarea
              className={styles.textarea}
              rows={5}
              placeholder="I want to become a data scientist in 6 months..."
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className={styles.submitBtn} disabled={loading || !goalInput.trim()}>
              Submit Goal
            </button>
          </form>
        ) : (
          <div className={styles.parsedCard}>
            <h3>Goal Analyzed</h3>
            <div className={styles.section}>
              <strong>Domain:</strong> <span>{parsedGoal.domain}</span>
            </div>
            <div className={styles.section}>
              <strong>Skills to Target:</strong>
              <div className={styles.chips}>
                {parsedGoal.skill_targets.map((skill) => (
                  <span key={skill} className={styles.chip}>{skill}</span>
                ))}
              </div>
            </div>
            <div className={styles.section}>
              <strong>Estimated Time:</strong> <span>{parsedGoal.weekly_hours} hours/week</span>
            </div>

            <button className={styles.generateBtn} onClick={handleGenerateRoadmap} disabled={loading}>
              Generate My Roadmap
            </button>
          </div>
        )}
      </StatusWrapper>
    </div>
  );
}
