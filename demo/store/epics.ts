import { combineEpics } from 'redux-observable'

import { epic as workerEpic } from 'components/test-video/test-video.module'

export default combineEpics(
  workerEpic,
)
