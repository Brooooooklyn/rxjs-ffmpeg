import { createStore, compose, applyMiddleware } from 'redux'
import createHistory from 'history/createBrowserHistory'
import { routerMiddleware } from 'react-router-redux'
import { createEpicMiddleware } from 'redux-observable'

import reducers, { GLobalState } from './reducer'
import epics from './epics'

export const history = createHistory()
const middleware = routerMiddleware(history)

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose

export { GLobalState } from './reducer'

const epicMiddleware = createEpicMiddleware(epics)

const store = createStore<GLobalState>(reducers, composeEnhancers(
  applyMiddleware(
    epicMiddleware,
    middleware
  )
))

if (process.env.NODE_ENV === 'develop') {
  if (module.hot) {
    module.hot.accept('./epics', () => {
      const rootEpic = require('./epics').default
      epicMiddleware.replaceEpic(rootEpic)
    })

    module.hot.accept('./reducer', () => {
      const rootReducer = require('./reducer').default
      store.replaceReducer(rootReducer)
    })
  }
}

export default store
