import { api, store } from './api.js'

export async function ensureDemoLearner() {
  let learner = store.learner
  let path = store.path

  if (learner && path) {
    return { learner, path }
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
        // If path generation fails or path already exists on backend
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
