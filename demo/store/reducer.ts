import { combineReducers } from 'redux'
import { RouterState, routerReducer } from 'react-router-redux'

import { reducer as workerReducer, WorkerState } from 'components/test-video/test-video.module'

export interface GLobalState {
  ui: { }
  router: RouterState
  worker: WorkerState
}

export default combineReducers<GLobalState>({
  router: routerReducer,
  worker: workerReducer
})
