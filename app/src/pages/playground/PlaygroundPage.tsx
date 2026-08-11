import Title from '@/components/base/Title'

const PlayGroundPage = () => {
  return (
    <div className='space-y-6 p-6 xl:p-8'>
      <Title
        description='Lorem ipsum dolor sit amet consectetur adipisicing elit.'
        level={1}
        title='Play Ground'
      />
      <Title
        description='Lorem ipsum dolor sit amet consectetur adipisicing elit.'
        level={2}
        title='Play Ground'
      />
      <Title
        description='Lorem ipsum dolor sit amet consectetur adipisicing elit.'
        level={3}
        title='Play Ground'
      />
      <Title
        description='Lorem ipsum dolor sit amet consectetur adipisicing elit.'
        title='Play Ground'
      />
    </div>
  )
}

PlayGroundPage.displayName = 'PlayGroundPage'
export default PlayGroundPage
