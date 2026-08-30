import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLearner } from '@/context/LearnerContext';
import { createLearner } from '@/api/client';
import type { CreateLearnerBody, LearnerOut } from '@/api/types';
import { StatusWrapper } from '@/components/StatusWrapper/StatusWrapper';
import styles from './ProfileForm.module.css';

export default function ProfileForm() {
  const { learners, setLearnerDirect, refreshLearners, loading: contextLoading } = useLearner();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<CreateLearnerBody>({
    name: '',
    interests: [],
    experience_level: 'beginner',
    learning_style: 'visual',
    time_budget: 10,
  });
  const [interestsStr, setInterestsStr] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectLearner = (learner: LearnerOut) => {
    setLearnerDirect(learner);
    navigate('/');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'time_budget' ? parseInt(value) || 0 : value,
    }));
  };

  const handleInterestsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInterestsStr(e.target.value);
    const interests = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
    setFormData((prev) => ({ ...prev, interests }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const newLearner = await createLearner(formData);
      setLearnerDirect(newLearner);
      await refreshLearners();
      navigate('/goal');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create profile.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <StatusWrapper loading={contextLoading} error={null} empty={false}>
        <div className={styles.layout}>
          <div className={styles.section}>
            <h2>Existing Profiles</h2>
            {learners.length === 0 ? (
              <p className={styles.empty}>No profiles yet. Create one below!</p>
            ) : (
              <div className={styles.cardList}>
                {learners.map((learner) => (
                  <div key={learner.id} className={styles.profileCard} onClick={() => handleSelectLearner(learner)}>
                    <h3>{learner.name}</h3>
                    <div className={styles.badges}>
                      <span className={styles.badge}>{learner.experience_level}</span>
                      <span className={styles.badge}>{learner.learning_style}</span>
                      <span className={styles.badge}>{learner.time_budget} hrs/wk</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h2>Create New Profile</h2>
            <StatusWrapper loading={loading} error={error} empty={false}>
              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.field}>
                  <label htmlFor="name">Name</label>
                  <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
                </div>

                <div className={styles.field}>
                  <label htmlFor="interests">Interests</label>
                  <input type="text" id="interests" name="interests" value={interestsStr} onChange={handleInterestsChange} placeholder="e.g. machine learning, web development" />
                </div>

                <div className={styles.field}>
                  <label htmlFor="experience_level">Experience Level</label>
                  <select id="experience_level" name="experience_level" value={formData.experience_level} onChange={handleChange}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="learning_style">Learning Style</label>
                  <select id="learning_style" name="learning_style" value={formData.learning_style} onChange={handleChange}>
                    <option value="visual">Visual</option>
                    <option value="reading">Reading</option>
                    <option value="hands_on">Hands On</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="time_budget">Hours per week</label>
                  <input type="number" id="time_budget" name="time_budget" value={formData.time_budget} onChange={handleChange} min={1} max={40} required />
                </div>

                <button type="submit" className={styles.submitBtn} disabled={loading || !formData.name}>Create Profile</button>
              </form>
            </StatusWrapper>
          </div>
        </div>
      </StatusWrapper>
    </div>
  );
}
