import { StoryObj } from '@storybook/react';
import CommentNode from "@components/nodeTypes/comment-node";
import { ReactFlowProvider } from '@xyflow/react';

const meta = {
    title: 'Components/Nodes/CommentNode',
    component: CommentNode,
};
export default meta;

type Story = StoryObj<typeof meta>;

export const CommentNodeStory: Story = {
// @ts-ignore
    args: {
        id: 'comment-node',
        type: 'CommentNode',
        data: {
            label: 'This is a comment node',
        },
    },
    decorators: [(Story) => (<ReactFlowProvider><Story/></ReactFlowProvider>)]
}