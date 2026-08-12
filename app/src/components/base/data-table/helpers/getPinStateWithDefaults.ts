import type { ColumnPinningState } from '@tanstack/react-table'

export default function getPinStateWithDefaults(
  initialPinState?: ColumnPinningState,
): ColumnPinningState {
  const pinState: ColumnPinningState = {
    left: ['requestNo'],
    right: ['actions'],
  }

  if (initialPinState?.left && pinState.left) {
    pinState.left.push(...initialPinState.left)
  }

  if (initialPinState?.right && pinState.right) {
    pinState.right.push(...initialPinState.right)
  }

  return pinState
}
