import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import styles from './Navbar.module.css';
import { useLearner } from '@/context/LearnerContext';

export function Navbar() {
  const { learner, learners, setLearnerById } = useLearner();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.left}>
          <Link to="/" className={styles.logo}>
            ⭐ North Star
          </Link>
        </div>

        <div className={styles.center}>
          <NavLink to="/" className={({ isActive }) => isActive ? styles.activeLink : styles.link} end>Dashboard</NavLink>
          <NavLink to="/goal" className={({ isActive }) => isActive ? styles.activeLink : styles.link}>Set Goal</NavLink>
          <NavLink to="/profile" className={({ isActive }) => isActive ? styles.activeLink : styles.link}>Profile</NavLink>
        </div>

        <div className={styles.right}>
          <div className={styles.dropdownContainer}>
            <button 
              className={styles.dropdownToggle} 
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {learner ? learner.name : 'Select Profile'} ▼
            </button>
            {dropdownOpen && (
              <div className={styles.dropdownMenu}>
                {learners.map(l => (
                  <button 
                    key={l.id} 
                    className={styles.dropdownItem}
                    onClick={() => {
                      setLearnerById(l.id);
                      setDropdownOpen(false);
                    }}
                  >
                    {l.name}
                  </button>
                ))}
                <div className={styles.dropdownDivider} />
                <button 
                  className={styles.dropdownItem}
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/profile');
                  }}
                >
                  + New Learner
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
