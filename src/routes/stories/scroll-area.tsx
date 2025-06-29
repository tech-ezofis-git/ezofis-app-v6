import { createFileRoute } from '@tanstack/react-router'
import { ScrollArea } from '@/components/base'
import StorySubTitle from './-components/StorySubTitle'
import StoryTitle from './-components/StoryTitle'

export const Route = createFileRoute('/stories/scroll-area')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <StoryTitle>4. ScrollArea</StoryTitle>

      <div className='space-y-12'>
        <StorySubTitle># Default</StorySubTitle>
        <ScrollArea height={300} width={300}>
          <div className='space-y-6 pr-2'>
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Beatae
              dolorem corrupti ipsum porro ex quidem? Eaque, laudantium
              consectetur nemo possimus consequuntur deleniti provident maxime
              omnis optio? Amet cumque sint consequatur.
            </p>

            <p>
              Lorem, ipsum dolor sit amet consectetur adipisicing elit.
              Voluptatum sequi vitae ipsa reprehenderit in repellendus
              architecto quas eos nostrum provident. Repellat, dolorem eaque
              illo unde aliquam voluptatibus delectus nostrum a?
            </p>

            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsam
              adipisci fuga temporibus sunt laboriosam, quae soluta corrupti
              tempora dolore, sint ut esse illo dolor totam! Fugiat veritatis
              tempora illum dignissimos!
            </p>
          </div>
        </ScrollArea>

        <StorySubTitle># Horizontal</StorySubTitle>
        <ScrollArea width={300}>
          <div className='w-screen space-y-6 pb-2'>
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Beatae
              dolorem corrupti ipsum porro ex quidem? Eaque, laudantium
              consectetur nemo possimus consequuntur deleniti provident maxime
              omnis optio? Amet cumque sint consequatur.
            </p>

            <p>
              Lorem, ipsum dolor sit amet consectetur adipisicing elit.
              Voluptatum sequi vitae ipsa reprehenderit in repellendus
              architecto quas eos nostrum provident. Repellat, dolorem eaque
              illo unde aliquam voluptatibus delectus nostrum a?
            </p>

            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsam
              adipisci fuga temporibus sunt laboriosam, quae soluta corrupti
              tempora dolore, sint ut esse illo dolor totam! Fugiat veritatis
              tempora illum dignissimos!
            </p>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
