import React from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { Progress } from 'antd'
import { chain } from 'lodash'

import { GLobalState } from 'store'
import { WorkerState, ffmpegClipFrame } from './test-video.module'

interface Props extends WorkerState {
  ffmpegClipFrame: typeof ffmpegClipFrame
}

const mapDispatchToProps = (dispatch: any) => bindActionCreators({
  ffmpegClipFrame
}, dispatch)

class TestVideo extends React.PureComponent<Props> {
  loadFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files!)
    this.props.ffmpegClipFrame({
      frame: 1,
      target: files
    })
  }

  render() {
    if (this.props.loaded) {
      return (
        <div>
          <input type='file' onChange={ this.loadFiles } multiple={ true } />
          { this.renderImages() }
        </div>
      )
    } else {
      return (
        <Progress percent={ this.props.progress } type='circle' />
      )
    }
  }

  private renderImages() {
    return chain(this.props.results)
      .values()
      .map((r: string, index: number) => (
        <img key={ index } src={ `data:image/png;base64,${ r }` } />
      ))
      .value()
  }
}

export const TestVideoContainer = connect(({ worker }: GLobalState) => {
  return worker
}, mapDispatchToProps)(TestVideo)
