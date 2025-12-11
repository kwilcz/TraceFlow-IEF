import { StoryObj } from '@storybook/react';
import Home from '@/app/page';

const meta = {
    title: 'Pages/Home',
    component: Home,
};
export default meta;

type Story = StoryObj<typeof meta>;

export const HomeStory: Story = {
    args: {},    
}