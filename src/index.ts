import 'rxjs/add/observable/of'
import 'rxjs/add/observable/range'

import 'rxjs/add/operator/concatMap'
import 'rxjs/add/operator/do'
import 'rxjs/add/operator/filter'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/mergeMap'
import 'rxjs/add/operator/reduce'
import 'rxjs/add/operator/share'

import { Subject } from 'rxjs/Subject'
import { Observable } from 'rxjs/Observable'
import { Observer } from 'rxjs/Observer'
import { async } from 'rxjs/scheduler/Async'

export interface ClipArgs {
  frame: number
  target: File[]
}

export interface FFmpegResult {
  [ name: string ]: string
}

export interface FFmpegMsg {
  type: 'PROGRESS' | 'FREE_WORKER' | 'GET_RESULT'
  payload?: any
}

export class FFmpeg {
  private static readonly PROGRESS_NAME = 'PROGRESS'
  private static readonly FREE_WORKER_NAME = 'FREE_WORKER'
  private static readonly GET_RESULT_NAME = 'GET_RESULT'

  private eventBus$ = new Subject<FFmpegMsg>()

  progress$: Observable<string> = this.eventBus$
    .filter(a => a.type === FFmpeg.PROGRESS_NAME)
    .map(a => a.payload)
    .share()

  private freeWorker$: Observable<Worker> = this.eventBus$
    .filter(a => a.type === FFmpeg.FREE_WORKER_NAME)
    .map(a => a.payload)
    .share()

  private result$: Observable<{ result: FFmpegResult, worker: Worker }> = this.eventBus$
    .filter(a => a.type === FFmpeg.GET_RESULT_NAME)
    .map(a => a.payload)
    .share()

  private xhr = new XMLHttpRequest()
  private progress: string
  private workers: Worker[] = []

  private progressListener = (e: ProgressEvent) => {
    this.progress = (e.loaded / e.total * 0.9 * 100).toFixed(2)
    this.eventBus$.next({
      type: FFmpeg.PROGRESS_NAME,
      payload: this.progress
    })
  }

  private workerOnMassage = (event: MessageEvent) => {
    const msg = event.data
    const worker = event.target as Worker
    switch (msg.type) {
      case 'ready':
        this.progress = Number(this.progress) + (1 / this.threads) * 10 + ''
        this.eventBus$.next({
          type: FFmpeg.PROGRESS_NAME,
          payload: this.progress
        })
        break
      case 'run':
        const pos = this.workers.indexOf(worker)
        this.workers.splice(pos, 1)
        break
      case 'stdout':
        console.info(event)
        break
      case 'stderr':
        console.info(event.data.data)
        break
      case 'done':
        const data = event.data.data.MEMFS
        const result = data.reduce((acc: FFmpegResult, d: { name: string, data: Uint8Array }) => {
          const name = d.name.split('.')
            .slice(0, -1)
            .join('.')
          acc[name] = btoa(String.fromCharCode.apply(null, d.data))
          return acc
        }, { } as FFmpegResult)
        this.eventBus$.next({
          type: FFmpeg.GET_RESULT_NAME,
          payload: { result, worker }
        })
        break
      case 'exit':
        this.eventBus$.next({
          type: FFmpeg.FREE_WORKER_NAME,
          payload: worker
        })
        this.workers.push(worker)
        break
    }
  }

  private loadEnd = (e: ProgressEvent) => {
    const { threads } = this
    const jsBlob = URL.createObjectURL((e.target as XMLHttpRequest).response)
    const { workers } = this
    for (let i = 0; i < threads; i++) {
      const worker = new Worker(jsBlob)
      worker.onmessage = this.workerOnMassage
      workers.push(worker)
    }
  }

  constructor(private threads = 4, private chunkSize = 1024 * 1024 * 10) { }

  load(ffmepgUrl: string): Observable<ProgressEvent> {
    return Observable.create((observer: Observer<ProgressEvent>) => {
      const { xhr } = this
      xhr.responseType = 'blob'
      function loadEnd (e: ProgressEvent) {
        observer.next(e)
        observer.complete()
      }
      function loadError (e: ErrorEvent) {
        observer.error(e)
      }
      xhr.open('get', ffmepgUrl)
      xhr.addEventListener('load', this.progressListener)
      xhr.addEventListener('loadend', this.loadEnd)
      xhr.addEventListener('error', loadError)
      xhr.addEventListener('loadend', loadEnd)
      xhr.send()
      return () => {
        if (this.xhr.readyState !== 4) {
          this.xhr.abort()
        }
        this.xhr.removeEventListener('load', this.progressListener)
        this.xhr.removeEventListener('loadend', this.loadEnd)
        this.xhr.removeEventListener('error', loadError)
        this.xhr.removeEventListener('loadend', loadEnd)
      }
    })
  }

  clipFrame(file: File, frame: number) {
    return this.readFileToArrayBuffer(file)
      .flatMap(arrayBuffer => {
        const name = file.name
        const message = {
          type: 'run',
          arguments: ['-i', name, '-vf', `trim=start_frame=${ frame }:end_frame=${ frame + 1 }`, '-an', `${ name }.jpg`],
          MEMFS: [{ name, data: arrayBuffer }]
        }
        return this.startCommand(message)
      })
  }

  dispose() {
    this.eventBus$.complete()
    this.eventBus$.unsubscribe()
  }

  private readFileToArrayBuffer = (file: File): Observable<ArrayBuffer> => {
    const { chunkSize } = this
    const chunks = Math.ceil(file.size / chunkSize)
    return Observable.range(0, chunks, async)
      .map(chunkIndex => file.slice((chunkIndex) * chunkSize, (chunkIndex + 1) * chunkSize))
      .concatMap((blob) => {
        return Observable.create((observer: Observer<Uint8Array>) => {
          const reader = new FileReader
          function loaded () {
            observer.next(new Uint8Array(reader.result))
            observer.complete()
          }
          function error (e: Event) {
            observer.error(e)
          }
          reader.addEventListener('loadend', loaded)
          reader.addEventListener('error', error)
          reader.readAsArrayBuffer(blob)
          return () => {
            reader.abort()
            reader.removeEventListener('loadend', loaded)
            reader.removeEventListener('error', error)
          }
        })
      })
      .reduce((acc: Uint8Array, cur: Uint8Array, index) => {
        acc.set(cur, index * chunkSize)
        return acc as any
      }, new Uint8Array(file.size))
      .map((f: Uint8Array) => f.buffer)
  }

  private startCommand(command: Object) {
    return this.getFreeWorker()
      .do(worker => {
        worker.postMessage(command)
      })
      .concatMap((worker) => this.result$.filter(d => d.worker === worker))
      .map(r => r.result)
  }

  private getFreeWorker(): Observable<Worker> {
    const { workers } = this
    if (workers.length) {
      const [ worker ] = workers
      return Observable.of(worker)
    }
    return this.freeWorker$
  }
}
