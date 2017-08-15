import './rxOperator'

import React from 'react'
import ReactDOM from 'react-dom'
import { AppContainer } from 'react-hot-loader'

import App from './components/app'

const render = (Comp: typeof App) => {
  const app = (
    <AppContainer>
      <Comp />
    </AppContainer>
  )
  ReactDOM.render(app, document.querySelector('#root')!)
}

render(App)

if (module.hot) {
  module.hot.accept('./components/app', () => {
    render(App)
  })
}
