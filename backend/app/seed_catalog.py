from __future__ import annotations

from sqlalchemy.orm import Session

from . import models


def _skill_by_name(db: Session, name: str) -> models.Skill:
    s = db.query(models.Skill).filter_by(name=name).one_or_none()
    assert s is not None, f"skill not found: {name}"
    return s


def _add_skill(db: Session, name: str, domain: str, difficulty: str) -> models.Skill:
    s = db.query(models.Skill).filter_by(name=name).one_or_none()
    if s is None:
        s = models.Skill(name=name, domain=domain, difficulty=difficulty)
        db.add(s)
        db.flush()
    return s


def _edge(db: Session, skill: str, prereq: str) -> None:
    s, p = _skill_by_name(db, skill), _skill_by_name(db, prereq)
    if p not in s.prereqs:
        s.prereqs.append(p)


def _resource(
    db: Session,
    type_: str,
    title: str,
    url: str,
    hours: int,
    media: str,
    skills: list[str],
) -> models.Resource:
    r = models.Resource(type=type_, title=title, url=url, est_hours=hours, media_type=media)
    r.skills_taught = [_skill_by_name(db, s) for s in skills]
    db.add(r)
    db.flush()
    return r


def seed(db: Session) -> None:
    if db.query(models.Resource).count() > 0:
        return  # already seeded

    # ---------------- Web Development ----------------
    web = "web development"
    for name, diff in {
        "HTML": "beginner",
        "CSS": "beginner",
        "JavaScript": "beginner",
        "Git": "beginner",
        "SQL": "beginner",
        "REST APIs": "intermediate",
        "React": "intermediate",
        "Node.js": "intermediate",
        "Testing": "intermediate",
        "TypeScript": "intermediate",
        "Deployment": "advanced",
    }.items():
        _add_skill(db, name, web, diff)
    for skill, prereqs in {
        "CSS": ["HTML"],
        "JavaScript": ["HTML"],
        "React": ["HTML", "CSS", "JavaScript"],
        "Node.js": ["JavaScript", "REST APIs"],
        "REST APIs": ["JavaScript"],
        "Testing": ["JavaScript", "Git"],
        "TypeScript": ["JavaScript"],
        "Deployment": ["Node.js", "Git"],
    }.items():
        for p in prereqs:
            _edge(db, skill, p)

    _resource(db, "course", "HTML & CSS Fundamentals",
              "https://www.udemy.com/course/html-css-bootcamp/", 12, "video", ["HTML", "CSS"])
    _resource(db, "course", "JavaScript Basics for Beginners",
              "https://www.udemy.com/course/javascript-basics/", 20, "video", ["JavaScript"])
    _resource(db, "course", "Git & GitHub Crash Course",
              "https://www.udemy.com/course/git-github-crash-course/", 6, "hands_on", ["Git"])
    _resource(db, "course", "SQL for Beginners",
              "https://www.udemy.com/course/sql-for-beginners/", 8, "reading", ["SQL"])
    _resource(db, "course", "REST API Design & Consumption",
              "https://www.udemy.com/course/rest-api-design/", 10, "hands_on", ["REST APIs"])
    _resource(db, "course", "React: From Zero to Hero",
              "https://www.udemy.com/course/react-zero-to-hero/", 25, "video", ["React"])
    _resource(db, "course", "Node.js Backend Development",
              "https://www.udemy.com/course/nodejs-backend/", 18, "hands_on", ["Node.js"])
    _resource(db, "course", "TypeScript Mastery",
              "https://www.udemy.com/course/typescript-mastery/", 15, "video", ["TypeScript"])
    _resource(db, "course", "Testing Modern JavaScript",
              "https://www.udemy.com/course/testing-modern-js/", 8, "reading", ["Testing"])
    _resource(db, "project", "Portfolio Project: Full-Stack App",
              "https://www.udemy.com/course/fullstack-portfolio-project/", 30, "hands_on",
              ["React", "Node.js", "Git", "Deployment"])
    _resource(db, "assessment", "Web Development Milestone Checkpoint",
              "", 1, "mixed", ["JavaScript", "React"])

    # ---------------- Data Science ----------------
    ds = "data science"
    for name, diff in {
        "Python Basics": "beginner",
        "NumPy": "beginner",
        "Pandas": "beginner",
        "Data Visualization": "beginner",
        "Statistics": "intermediate",
        "Linear Algebra": "intermediate",
        "Machine Learning": "intermediate",
        "Deep Learning": "advanced",
        "Model Deployment": "advanced",
    }.items():
        _add_skill(db, name, ds, diff)
    for skill, prereqs in {
        "Pandas": ["Python Basics"],
        "NumPy": ["Python Basics"],
        "Data Visualization": ["Python Basics"],
        "Statistics": ["Python Basics"],
        "Linear Algebra": ["Python Basics"],
        "Machine Learning": ["Pandas", "NumPy", "Statistics", "Linear Algebra"],
        "Deep Learning": ["Machine Learning"],
        "Model Deployment": ["Machine Learning"],
    }.items():
        for p in prereqs:
            _edge(db, skill, p)

    _resource(db, "course", "Python for Data Science",
              "https://www.udemy.com/course/python-for-data-science/", 15, "video", ["Python Basics"])
    _resource(db, "course", "NumPy Essentials",
              "https://www.udemy.com/course/numpy-essentials/", 8, "hands_on", ["NumPy"])
    _resource(db, "course", "Pandas for Data Wrangling",
              "https://www.udemy.com/course/pandas-wrangling/", 12, "hands_on", ["Pandas"])
    _resource(db, "course", "Data Visualization Studio",
              "https://www.udemy.com/course/data-viz-studio/", 10, "video", ["Data Visualization"])
    _resource(db, "course", "Statistics for Data Science",
              "https://www.udemy.com/course/statistics-for-ai/", 12, "reading", ["Statistics"])
    _resource(db, "course", "Linear Algebra Crash Course",
              "https://www.udemy.com/course/linear-algebra-crash/", 10, "video", ["Linear Algebra"])
    _resource(db, "course", "Machine Learning Foundations",
              "https://www.udemy.com/course/machine-learning-foundations/", 30, "hands_on", ["Machine Learning"])
    _resource(db, "course", "Deep Learning with Neural Networks",
              "https://www.udemy.com/course/deep-learning-nn/", 25, "video", ["Deep Learning"])
    _resource(db, "project", "ML Project: End-to-End Pipeline",
              "https://www.udemy.com/course/ml-end-to-end-project/", 25, "hands_on",
              ["Machine Learning", "Model Deployment"])
    _resource(db, "assessment", "Data Science Milestone Checkpoint",
              "", 1, "mixed", ["Machine Learning"])

    # ---------------- Digital Marketing ----------------
    mkt = "digital marketing"
    for name, diff in {
        "Marketing Fundamentals": "beginner",
        "Content Marketing": "beginner",
        "SEO": "beginner",
        "Social Media Marketing": "intermediate",
        "Marketing Analytics": "intermediate",
        "Email Marketing": "intermediate",
        "Paid Ads": "advanced",
        "Growth Strategy": "advanced",
    }.items():
        _add_skill(db, name, mkt, diff)
    for skill, prereqs in {
        "Content Marketing": ["Marketing Fundamentals"],
        "SEO": ["Marketing Fundamentals"],
        "Social Media Marketing": ["Marketing Fundamentals"],
        "Marketing Analytics": ["Marketing Fundamentals"],
        "Email Marketing": ["Content Marketing"],
        "Paid Ads": ["Social Media Marketing"],
        "Growth Strategy": ["SEO", "Marketing Analytics", "Email Marketing", "Paid Ads"],
    }.items():
        for p in prereqs:
            _edge(db, skill, p)

    _resource(db, "course", "Marketing Fundamentals",
              "https://www.udemy.com/course/marketing-fundamentals/", 8, "video", ["Marketing Fundamentals"])
    _resource(db, "course", "Content Marketing Strategy",
              "https://www.udemy.com/course/content-marketing-strategy/", 10, "reading", ["Content Marketing"])
    _resource(db, "course", "SEO: Search Engine Optimization",
              "https://www.udemy.com/course/seo-bootcamp/", 12, "hands_on", ["SEO"])
    _resource(db, "course", "Social Media Marketing",
              "https://www.udemy.com/course/social-media-marketing/", 10, "video", ["Social Media Marketing"])
    _resource(db, "course", "Marketing Analytics",
              "https://www.udemy.com/course/marketing-analytics/", 12, "reading", ["Marketing Analytics"])
    _resource(db, "course", "Email Marketing",
              "https://www.udemy.com/course/email-marketing/", 8, "hands_on", ["Email Marketing"])
    _resource(db, "course", "Paid Advertising Playbook",
              "https://www.udemy.com/course/paid-ads-playbook/", 12, "video", ["Paid Ads"])
    _resource(db, "course", "Growth Strategy",
              "https://www.udemy.com/course/growth-strategy/", 10, "reading", ["Growth Strategy"])
    _resource(db, "project", "Marketing Campaign Project",
              "https://www.udemy.com/course/marketing-campaign-project/", 20, "hands_on",
              ["Content Marketing", "Social Media Marketing", "Email Marketing", "Marketing Analytics"])
    _resource(db, "assessment", "Marketing Milestone Checkpoint",
              "", 1, "mixed", ["SEO", "Marketing Analytics"])

    db.commit()