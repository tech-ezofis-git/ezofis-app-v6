import { classNames as baseInputClassNames } from '@/components/base/inputs/shared/constants'
import cn from '@/utils/cn'

// One label style for every setting in the form builder's settings panels
// (the same as the shared inputs).
export const settingLabelClass = cn('block', baseInputClassNames.label)

// A group heading inside a settings panel.
export const settingHeadingClass =
  'mb-2 block text-13 font-semibold text-gray-12'
