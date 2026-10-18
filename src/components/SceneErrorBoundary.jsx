import { Component, createRef, Fragment } from 'react'

export class SceneErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, retryKey: 0, retrying: false }
    this.retryButtonRef = createRef()
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch() {
    this.retryButtonRef.current?.focus()
  }

  handleRetry = async () => {
    if (this.state.retrying) return
    this.setState({ retrying: true })
    try {
      await this.props.onRetry?.()
      this.setState((current) => ({
        hasError: false,
        retryKey: current.retryKey + 1,
        retrying: false,
      }))
    } catch {
      this.setState({ retrying: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="scene-state scene-error"
          role="alert"
          aria-labelledby="scene-error-title"
          aria-describedby="scene-error-description"
        >
          <span className="scene-state-mark" aria-hidden="true">!</span>
          <strong id="scene-error-title">3D preview stopped</strong>
          <p id="scene-error-description">The model could not finish loading or rendering. Your profile is still intact.</p>
          <button ref={this.retryButtonRef} type="button" disabled={this.state.retrying} onClick={this.handleRetry}>
            {this.state.retrying ? 'Preparing preview…' : 'Retry 3D preview'}
          </button>
        </div>
      )
    }

    return <Fragment key={this.state.retryKey}>{this.props.children}</Fragment>
  }
}
