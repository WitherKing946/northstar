import { api, store } from './api.js'

export async function ensureDemoLearner() {
  let learner = store.learner
  let path = store.path

  // Validate stored learner still exists in DB (handles DB reset / stale localStorage)
  if (learner) {
    try {
      await api.getLearner(learner.id)
    } catch (e) {
      if (String(e.message).includes('404') || String(e.message).toLowerCase().includes('not found')) {
        store.clear()
        learner = null
        path = null
      }
    }
  }

  if (learner && path) {
    // Validate path still exists
    try {
      await api.getPath(path.id)
      return { learner, path }
    } catch {
      store.clear()
      learner = null
      path = null
    }
  }

  try {
    if (!learner) {
      learner = await api.createLearner({
        name: 'Alicia Bobster',
        interests: ['data science'],
        experience_level: 'intermediate',
        learning_style: 'visual',
        time_budget: 8,
      })
      await api.setGoal(learner.id, 'I want to become a data scientist specializing in machine learning')
      store.learner = learner
    }

    if (!path && learner) {
      try {
        path = await api.generatePath(learner.id)
      } catch (err) {
        path = null
      }
      if (path) {
        store.path = path
      }
    }

    return { learner, path }
  } catch (error) {
    console.error('Error initializing demo learner:', error)
    return { learner: store.learner, path: store.path }
  }
}