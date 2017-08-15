import React from 'react'
import { Provider } from 'react-redux'
import { Route } from 'react-router'
import { ConnectedRouter } from 'react-router-redux'

import store, { history } from 'store'
import { loadWorker } from 'components/test-video/test-video.module'
import TestVideo from 'components/test-video'

export default class AppComponent extends React.Component {

  componentWillMount() {
    store.dispatch(loadWorker())
  }

  render() {
    return (
      <Provider store={ store }>
        <ConnectedRouter history={ history }>
          <Route path='/' component={ TestVideo } />
        </ConnectedRouter>
      </Provider>
    )
  }
}
