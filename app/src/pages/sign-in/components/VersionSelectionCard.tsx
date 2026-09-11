import { useLingui } from '@lingui/react/macro'
import Icon from '@/components/base/icon/Icon'
import IconIllustrated from '@/components/base/icon/IconIllustrated'
import Title from '@/components/base/Title'
import { AnimateSlideLeft } from '@/components/common/animations'

interface VersionSelectionCardProps {
  onBack: () => void
  onSelectV5: () => void
  onSelectV6: () => void
}

export const VersionSelectionCard = ({
  onBack,
  onSelectV5,
  onSelectV6,
}: VersionSelectionCardProps) => {
  const { t } = useLingui()

  return (
    <div className="w-full space-y-6">
      {/* Top Brand / Header Illustration */}
      <AnimateSlideLeft delay={0.1} distance={20}>
        <div className="flex justify-center">
          <IconIllustrated icon="tabler:layers-intersect" />
        </div>
      </AnimateSlideLeft>

      {/* Header Titles */}
      <AnimateSlideLeft delay={0.15} distance={20}>
        <Title
          level={1}
          className="text-center"
          title={t`Select Platform Version`}
          description={t`Your account is available in both versions. Choose which workspace you want to launch.`}
        />
      </AnimateSlideLeft>

      {/* Vertical Card Stack */}
      <div className="space-y-3 pt-2">
        {/* V6 Recommended Option Card */}
        <AnimateSlideLeft delay={0.2} distance={30}>
          <button
            type="button"
            onClick={onSelectV6}
            className="group relative flex w-full cursor-pointer items-center justify-between rounded-xl border border-primary-5/80 bg-gradient-to-r from-white via-primary-1/40 to-primary-1/70 p-4 text-left shadow-xs transition-all duration-300 hover:border-primary-9 hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Left High-Contrast Icon Badge */}
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-3 border border-primary-5/70 shadow-2xs transition-transform duration-300 group-hover:scale-105 group-hover:bg-primary-4">
                <Icon name="tabler:sparkles" className="size-5.5 text-primary-11" />
              </div>

              {/* Center Text & Badges */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-gray-13 transition-colors duration-200 group-hover:text-primary-11">
                    {t`EZOFIS V6`}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-primary-9 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                    {t`Recommended`}
                  </span>
                </div>
                <p className="text-xs text-gray-11 leading-relaxed line-clamp-2">
                  {t`Next-gen AI workspace, dynamic forms & automation.`}
                </p>
              </div>
            </div>

            {/* Right Chevron Indicator */}
            <div className="ml-3 flex items-center shrink-0">
              <Icon
                name="tabler:chevron-right"
                className="size-5 text-gray-8 transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary-11"
              />
            </div>
          </button>
        </AnimateSlideLeft>

        {/* V5 Classic Option Card */}
        <AnimateSlideLeft delay={0.25} distance={30}>
          <button
            type="button"
            onClick={onSelectV5}
            className="group relative flex w-full cursor-pointer items-center justify-between rounded-xl border border-gray-4 bg-white p-4 text-left shadow-xs transition-all duration-300 hover:border-gray-8 hover:bg-gray-1 hover:shadow-md active:scale-[0.99]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Left Classic Icon Badge */}
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-3 border border-gray-5 shadow-2xs transition-transform duration-300 group-hover:scale-105 group-hover:bg-gray-4">
                <Icon name="tabler:layout-dashboard" className="size-5.5 text-gray-12" />
              </div>

              {/* Center Text & Badges */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-gray-13 transition-colors duration-200 group-hover:text-gray-12">
                    {t`EZOFIS V5`}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-gray-3 border border-gray-5 px-2.5 py-0.5 text-[10px] font-medium text-gray-11">
                    {t`Classic Version`}
                  </span>
                </div>
                <p className="text-xs text-gray-11 leading-relaxed line-clamp-2">
                  {t`Legacy EZOFIS platform & repository management.`}
                </p>
              </div>
            </div>

            {/* Right Chevron Indicator */}
            <div className="ml-3 flex items-center shrink-0">
              <Icon
                name="tabler:chevron-right"
                className="size-5 text-gray-8 transition-all duration-200 group-hover:translate-x-1 group-hover:text-gray-12"
              />
            </div>
          </button>
        </AnimateSlideLeft>
      </div>

      {/* Back Button */}
      <AnimateSlideLeft delay={0.3} distance={20}>
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={onBack}
            className="group flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-11 transition-colors duration-200 hover:text-primary-11"
          >
            <Icon
              name="tabler:arrow-left"
              className="size-4 text-gray-9 transition-all duration-200 group-hover:-translate-x-1 group-hover:text-primary-11"
            />
            <span>{t`Back to Sign In`}</span>
          </button>
        </div>
      </AnimateSlideLeft>
    </div>
  )
}

export default VersionSelectionCard
