interface Window {
  __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: Function
}

interface NodeModule {
  hot: {
    accept: (path: string, callback: () => void) => void
  }
}
