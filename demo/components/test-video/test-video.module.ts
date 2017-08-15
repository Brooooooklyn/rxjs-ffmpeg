import { Observable } from 'rxjs/Observable'
import { merge } from 'rxjs/observable/merge'
import { createAction, handleActions, Action } from 'redux-actions'
import { ActionsObservable, combineEpics } from 'redux-observable'

import { FFmpeg, ClipArgs, FFmpegResult } from '../../../src'
export const loadWorker = createAction('LODA_WORKER')
const loadWorkerFinish = createAction<boolean>('LOAD_WORKER_FINISH')
const loadWorkerProgress = createAction<string>('LOAD_WORKER_PROGRESS')
export const ffmpegClipFrame = createAction<ClipArgs>('FFMPEG_CLIP_FRAME')
export const ffmepgClipEnd = createAction<FFmpegResult>('FFMPEG_CLIP_END')

export interface WorkerState {
  loaded: boolean
  progress: number
  results: FFmpegResult
}

const ffmpeg = new FFmpeg()

export const noopAction = createAction('NOOP_ACTION')

export const reducer = handleActions<WorkerState>({
  [loadWorkerFinish.toString()](state) {
    return { ...state, loaded: false }
  },

  [loadWorkerProgress.toString()](state, { payload }: Action<string>) {
    return { ...state, progress: parseFloat(payload!), loaded: payload === '100' }
  },

  [ffmepgClipEnd.toString()](state, { payload }) {
    const oldResults = state.results
    return { ...state, results: { ...oldResults, ...payload } }
  }
}, {
  loaded: false,
  progress: 0,
  results: Object.create(null)
})

const fetchFFmepgEpic = (action$: ActionsObservable<Action<void>>) => action$
  .ofType(loadWorker.toString())
  .flatMap(() => merge(ffmpeg.load('ffmpeg.js/ffmpeg-worker-webm.js'), ffmpeg.progress$)
  .map((r) => {
    if (typeof r === 'string') {
      return loadWorkerProgress(r)
    } else {
      return loadWorkerFinish(true)
    }
  })
  .catch(() => {
    loadWorkerFinish(false)
    return Observable.of(null)
  })
)

const clipFrame = (action$: ActionsObservable<Action<ClipArgs>>) => action$
  .ofType(ffmpegClipFrame.toString())
  .switchMap(({ payload }: Action<ClipArgs>) => {
    return Observable.from(payload!.target)
      .map(t => ffmpeg.clipFrame(t, payload!.frame))
      .mergeAll(4)
      .map((r) => ffmepgClipEnd(r))
  })

export const epic = combineEpics<any>(
  fetchFFmepgEpic,
  clipFrame,
)
